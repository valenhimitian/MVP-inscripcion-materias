/* =====================================================================
   PANTALLA («boundary») – PantallaInscripcion
   Solo muestra datos y recoge acciones: las reglas las resuelven
   InscripcionController y las entidades. Los mensajes 1, 11, 12, 18, 19,
   32, 33, 45, 46 y 47 del DS01 se registran desde aquí.
   ===================================================================== */

const PantallaInscripcion = {
  carrera: null,
  materia: null,
  comision: null,
  validacion: null,     // resultado de validarRequisitos()
  error: null,          // { codigo, mensaje } del último break
  aviso: null,          // aviso A4 / simulación
  bloqueo: null,        // E2 · RN1 o A2
  nueva: null,          // inscripción recién registrada
  otrasCarreras: false, // panel de pruebas: lista materias ajenas (E6.2)

  // Mensajes 1 a 11: se ejecuta cada vez que se entra a la pantalla
  abrir() {
    const est = App.sesion.usuario;
    Object.assign(this, { materia: null, comision: null, validacion: null, error: null, aviso: null, nueva: null });
    Traza.iniciar('DS01');
    t('1: seleccionarOpcion("Inscribirse a materia")', 'titulo');
    const r = InscripcionController.iniciarInscripcion(est);
    this.carrera = r.carrera || est.getCarreraActiva();
    this.bloqueo = r.ok ? null : r;
    if (r.ok) t(`11: mostrarMaterias(${r.materias.length} materias)`);
    this.render();
  },

  paso() {
    if (this.nueva) return 4;
    if (this.validacion && this.validacion.ok) return 3;
    if (this.materia) return 2;
    return 1;
  },

  render() {
    const main = $('contenido');
    const est = App.sesion.usuario;
    const encabezado = `<div class="encabezado"><div>
      <h1>Inscribirme a una materia</h1>
      <p>${esc(this.carrera ? this.carrera.nombre : 'Sin carrera activa')}, ${PERIODO.nombre}</p></div></div>`;

    if (this.bloqueo) {
      main.innerHTML = encabezado + aviso('err', 'No podés continuar con la inscripción',
        ` ${esc(this.bloqueo.mensaje)} Tu estado es ${ETIQUETA_ESTUDIANTE[est.estado][0].toLowerCase()}. Acercate a la administración académica.`, this.bloqueo.codigo);
      App.renderTraza();
      return;
    }

    const p = this.paso();
    const clase = n => n < p ? 'hecho' : n === p ? 'actual' : '';
    const activas = est.consultarInscripciones().filter(i => i.estaActiva());

    main.innerHTML = encabezado + `
      <ol class="pasos" aria-label="Pasos de la inscripción">
        <li class="${clase(1)}" ${p === 1 ? 'aria-current="step"' : ''}>Materia</li>
        <li class="${clase(2)}" ${p === 2 ? 'aria-current="step"' : ''}>Comisión</li>
        <li class="${clase(3)}" ${p === 3 ? 'aria-current="step"' : ''}>Confirmación</li>
      </ol>
      <div class="inscripcion">
        <div class="flujo">
          ${this.nueva ? this.htmlComprobante() : this.htmlMaterias() + this.htmlComisiones() + this.htmlResumen()}
          ${App.demo && !this.nueva ? this.htmlPruebas() : ''}
        </div>
        <aside class="semana panel">
          <div class="panel-titulo"><h2>Cómo queda tu semana</h2></div>
          ${grillaSemanal(itemsDeInscripciones(activas), this.nueva ? null : this.comision, true)}
          ${referenciasGrilla(!!this.comision && !this.nueva)}
          ${this.comision && !this.nueva && activas.some(i => seSuperponen(i.comision, this.comision))
            ? `<p class="chico" style="color:var(--err);margin-top:var(--e3)">Esta comisión se superpone con otra materia de tu horario. Podés inscribirte igual, pero revisá si vas a poder cursar ambas.</p>` : ''}
        </aside>
      </div>`;
    App.renderTraza();
  },

  // ---------- Paso 1: materia ----------
  htmlMaterias() {
    const lista = this.otrasCarreras ? D.materias : this.carrera.consultarMaterias();
    const items = lista.map(m => {
      const k = D.materias.indexOf(m);
      const abiertas = m.consultarComisionesDisponibles().filter(c => c.estado === EstadoComision.ABIERTA).length;
      const correl = m.correlativas.length ? `Correlativa: ${m.correlativas.map(c => esc(c.nombre)).join(', ')}` : 'Sin correlativas';
      const ajena = !this.carrera.contieneMateria(m) ? ' · <span class="ajena">otra carrera</span>' : '';
      return `<button type="button" class="materia" aria-pressed="${this.materia === m}" onclick="PantallaInscripcion.elegirMateria(${k})">
        <b>${esc(m.nombre)}</b>
        <small>${m.codigo} · ${correl}${ajena}</small>
        <span class="disp">${abiertas ? `${abiertas} comisión${abiertas > 1 ? 'es' : ''} abierta${abiertas > 1 ? 's' : ''}` : 'Sin comisiones abiertas'}</span>
      </button>`;
    }).join('');
    return `<section class="panel">
      <div class="panel-titulo"><h2>Elegí la materia</h2><p>Solo se listan las materias de tu carrera</p></div>
      <div class="materias">${items}</div>
    </section>`;
  },

  elegirMateria(k) {
    this.materia = D.materias[k];
    Object.assign(this, { comision: null, validacion: null, error: null, aviso: null });
    t(`12: seleccionarMateria(${this.materia.nombre})`, 'titulo');
    const r = InscripcionController.obtenerComisiones(this.materia);
    if (r.hayAbiertas) t(`18: mostrarComisiones(${r.comisiones.length})`);
    else { t('16: mostrarMensaje(aviso)'); this.aviso = { tipo: 'info', titulo: 'Esta materia no tiene comisiones abiertas', regla: 'A4' }; }
    this.render();
    document.getElementById('paso-comision')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // ---------- Paso 2: comisión ----------
  htmlComisiones() {
    if (!this.materia) {
      return `<section class="panel bloqueado"><h2>Elegí la comisión</h2><p style="margin-top:6px">Primero elegí una materia.</p></section>`;
    }
    const coms = this.materia.consultarComisionesDisponibles();
    const items = coms.map((c, k) => {
      const abierta = c.estado === EstadoComision.ABIERTA;
      const ocupado = Math.round((1 - c.cupoDisponible / c.cupoMaximo) * 100);
      // Las comisiones sin cupo o fuera de período se muestran atenuadas; si se eligen,
      // el controlador informa el motivo exacto (E6.1 / E6.4), como indica el DS01.
      return `<button type="button" class="comision ${abierta ? '' : 'cerrada'}" aria-pressed="${this.comision === c}" onclick="PantallaInscripcion.elegirComision(${k})">
        <span class="radio" aria-hidden="true"></span>
        <span class="com-info"><b>${c.codigo}</b> <span class="tenue chico">· ${esc(c.docente.nombreCorto())}</span>
          <small>${c.horario()} · Aula ${esc(c.aula)}</small></span>
        <span class="cupo">${badgeComision(c.estado)}
          ${abierta ? `<span class="chico tenue">${c.cupoDisponible} de ${c.cupoMaximo} lugares</span><span class="cupo-barra"><i style="width:${ocupado}%"></i></span>` : ''}
        </span>
      </button>`;
    }).join('') || '<p class="tenue">No hay comisiones para esta materia.</p>';

    let mensajes = '';
    if (this.aviso) mensajes += aviso(this.aviso.tipo, this.aviso.titulo, this.aviso.texto || '', this.aviso.regla || '');
    if (this.error) mensajes += aviso('err', 'No podés inscribirte en esta comisión', ' ' + esc(this.error.mensaje), this.error.codigo);
    if (this.validacion) mensajes += this.htmlValidaciones(this.validacion.resultado);

    return `<section class="panel" id="paso-comision">
      <div class="panel-titulo"><h2>Elegí la comisión</h2><p>${esc(this.materia.nombre)}</p></div>
      <div class="comisiones">${items}</div>
      ${mensajes ? `<div style="margin-top:var(--e4)">${mensajes}</div>` : ''}
    </section>`;
  },

  htmlValidaciones(v) {
    const item = (valor, texto, regla) => {
      const c = valor === null ? 'sd' : valor ? 'si' : 'no';
      const ic = valor === null ? '–' : valor ? '✓' : '✕';
      return `<li class="${c}"><span class="ico">${ic}</span><span>${texto}<small>${regla}${valor === null ? ' · no evaluada' : ''}</small></span></li>`;
    };
    return `<ul class="validaciones" aria-label="Validaciones aplicadas">
      ${item(v.carrera, 'Materia de tu carrera', 'RN3')}
      ${item(v.inscripcion, 'Sin inscripción activa', 'RN5')}
      ${item(v.correlativas, 'Correlativas aprobadas', 'RN6')}
      ${item(v.cupo, 'Cupo disponible', 'RN4 · RN9')}
    </ul>`;
  },

  elegirComision(k) {
    const est = App.sesion.usuario;
    this.comision = this.materia.consultarComisionesDisponibles()[k];
    this.aviso = null;
    t(`19: seleccionarComision(${this.comision.codigo})`, 'titulo');
    const r = InscripcionController.validarRequisitos(est, this.carrera, this.materia, this.comision);
    this.validacion = r;
    if (r.ok) {
      this.error = null;
      t('32: mostrarResumen(resumen) y pedir confirmación');
    } else {
      this.error = { codigo: r.codigo, mensaje: r.mensaje.charAt(0).toUpperCase() + r.mensaje.slice(1) };
      this.comision = null;
    }
    this.render();
    const destino = r.ok ? 'paso-confirmacion' : 'paso-comision';
    document.getElementById(destino)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  // ---------- Paso 3: confirmación ----------
  htmlResumen() {
    if (!this.validacion || !this.validacion.ok || !this.comision) {
      return `<section class="panel bloqueado"><h2>Confirmá la inscripción</h2><p style="margin-top:6px">Se habilita cuando la comisión elegida cumple todas las validaciones.</p></section>`;
    }
    const c = this.comision;
    return `<section class="panel" id="paso-confirmacion">
      <div class="panel-titulo"><h2>Confirmá la inscripción</h2><p>Revisá los datos antes de enviar la solicitud</p></div>
      ${this.datosResumen(c)}
      <p class="chico tenue" style="margin-bottom:var(--e4)">Tu solicitud queda pendiente hasta que la administración académica la revise. El lugar en la comisión se reserva al confirmar.</p>
      <div class="acciones derecha">
        <button class="btn btn-secundario" onclick="PantallaInscripcion.noConfirmar()">Elegir otra comisión</button>
        <button class="btn btn-exito" onclick="PantallaInscripcion.confirmar()">Confirmar inscripción</button>
      </div>
    </section>`;
  },

  datosResumen(c, estadoHtml = '') {
    return `<dl class="resumen-ins">
      <div><dt>Materia</dt><dd>${esc(c.materia.nombre)}</dd></div>
      <div><dt>Carrera</dt><dd>${esc(this.carrera.nombre)}</dd></div>
      <div><dt>Comisión</dt><dd>${c.codigo}, aula ${esc(c.aula)}</dd></div>
      <div><dt>Día y horario</dt><dd>${c.horario()}</dd></div>
      <div><dt>Docente</dt><dd>${esc(c.docente.nombreCorto())}</dd></div>
      ${estadoHtml ? `<div><dt>Estado</dt><dd>${estadoHtml}</dd></div>` : ''}
    </dl>`;
  },

  noConfirmar() {                                     // A8
    t('46: cancelar()  [el estudiante no confirma · A8]', 'titulo');
    t('47: mostrarComisiones(): no se registra nada');
    Object.assign(this, { comision: null, validacion: null, error: null });
    this.render();
  },

  confirmar() {
    const est = App.sesion.usuario;
    t('33: confirmar()', 'titulo');
    const r = InscripcionController.confirmarInscripcion(est, this.comision);
    if (!r.ok) {                                         // E9
      this.error = { codigo: r.codigo, mensaje: r.mensaje + ' Elegí otra comisión.' };
      Object.assign(this, { comision: null, validacion: null, aviso: null });
      this.render();
      return;
    }
    this.nueva = r.inscripcion;
    Repositorio.guardar();
    t(`45: mostrarConfirmacion(estado "Pendiente", ${r.inscripcion.comprobante})`, true);
    Notificacion.mostrar(`Inscripción enviada. Comprobante ${r.inscripcion.comprobante}.`, 'ok');
    App.actualizarMenu();
    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  htmlComprobante() {
    const i = this.nueva;
    return `<section class="comprobante" aria-labelledby="tituloComprobante">
      <div class="comprobante-cabeza">
        <h2 id="tituloComprobante">Inscripción enviada</h2>
        <span class="comprobante-num">N.º ${i.comprobante}</span>
      </div>
      <div class="comprobante-cuerpo">
        <p>Registramos tu solicitud el ${fmtFecha(i.fecha)}. La administración académica la va a revisar y te avisamos por notificación. También la ves en Mi cursada.</p>
        ${this.datosResumen(i.comision, badgeInscripcion(i.estado))}
        <div class="acciones no-imprimir">
          <button class="btn btn-secundario" onclick="window.print()">Imprimir comprobante</button>
          <button class="btn btn-secundario" onclick="PantallaInscripcion.abrir()">Inscribirme a otra materia</button>
          <a class="btn btn-primario" href="#/perfil/cursada">Ver mi cursada</a>
        </div>
      </div>
    </section>`;
  },

  // ---------- Panel de pruebas (modo demo) ----------
  htmlPruebas() {
    return `<section class="panel pruebas no-imprimir">
      <h2>Herramientas de prueba</h2>
      <p class="chico tenue">Visibles solo en modo demo.</p>
      <label><input type="checkbox" ${this.otrasCarreras ? 'checked' : ''} onchange="PantallaInscripcion.alternarOtras(this.checked)">
        Listar también materias de otras carreras para probar la validación RN3 (E6.2)</label>
      <button class="btn btn-secundario btn-chico btn-largo" ${this.comision && this.validacion?.ok ? '' : 'disabled'} onclick="PantallaInscripcion.simularConcurrencia()">
        Simular que otros estudiantes ocupan los lugares restantes (E9)</button>
    </section>`;
  },

  alternarOtras(v) {
    this.otrasCarreras = v;
    Object.assign(this, { materia: null, comision: null, validacion: null, error: null, aviso: null });
    this.render();
  },

  simularConcurrencia() {
    const c = this.comision;
    if (!c) return;
    let n = 0;
    while (c.reservarCupo()) n++;
    t(`[prueba] otros ${n} estudiante(s) reservaron cupo en ${c.codigo} → estado ${c.estado}`, 'estado');
    this.aviso = { tipo: 'warn', titulo: `Simulación: otros ${n} estudiante(s) ocuparon los lugares restantes de ${c.codigo}.`, texto: ' Confirmá para ver cómo responde el sistema.' };
    this.render();
  },
};
