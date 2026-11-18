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
    const activas = est.consultarInscripciones().filter(i => i.estaActiva());
    // Un paso por vez: los pasos ya hechos se pueden tocar para volver
    const paso = (n, texto, volver) => {
      const estado = n < p ? 'hecho' : n === p ? 'actual' : '';
      const contenido = n < p && p < 4 ? `<button type="button" onclick="${volver}">${texto}</button>` : `<span>${texto}</span>`;
      return `<li class="${estado}" ${n === p ? 'aria-current="step"' : ''}>${contenido}</li>`;
    };
    const contenidoPaso = this.nueva ? this.htmlComprobante() : p === 1 ? this.htmlMaterias() : p === 2 ? this.htmlComisiones() : this.htmlResumen();

    main.innerHTML = encabezado + `
      <ol class="pasos" aria-label="Pasos de la inscripción">
        ${paso(1, 'Materia', 'PantallaInscripcion.volverAMaterias()')}
        ${paso(2, 'Comisión', 'PantallaInscripcion.noConfirmar()')}
        ${paso(3, 'Confirmación', '')}
      </ol>
      <div class="inscripcion">
        <div class="flujo">
          ${contenidoPaso}
          ${App.demo && !this.nueva ? this.htmlPruebas() : ''}
        </div>
        <aside class="semana panel">
          <div class="panel-titulo"><div><h2>Cómo queda tu semana</h2>${this.comision && !this.nueva ? '<p>En amarillo, la comisión que elegiste.</p>' : ''}</div></div>
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
      return `<button type="button" class="materia ${abiertas ? '' : 'sin-oferta'}" aria-pressed="${this.materia === m}" onclick="PantallaInscripcion.elegirMateria(${k})">
        <b>${esc(m.nombre)}</b>
        <small>${correl}${ajena}</small>
        <span class="disp">${abiertas ? `${abiertas} ${abiertas > 1 ? 'comisiones abiertas' : 'comisión abierta'}` : 'Sin comisiones abiertas'}</span>
        <span class="materia-codigo">${m.codigo}</span>
      </button>`;
    }).join('');
    return `<section class="panel">
      <div class="panel-titulo"><div><h2>¿A qué materia te querés inscribir?</h2><p>Estas son las materias de tu carrera.</p></div></div>
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
    this.subir();
  },

  volverAMaterias() {
    Object.assign(this, { materia: null, comision: null, validacion: null, error: null, aviso: null });
    this.render();
    this.subir();
  },

  // Vuelve al principio de la pantalla al cambiar de paso
  subir() { window.scrollTo({ top: 0, behavior: 'smooth' }); },

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
        <span class="com-info"><b>${c.codigo}</b>
          ${datosConIcono([['reloj', horarioLargo(c)], ['aula', `Aula ${esc(c.aula)}`], ['persona', esc(c.docente.nombreCorto())]])}</span>
        <span class="cupo">${badgeComision(c.estado)}
          ${abierta ? `<span class="chico tenue">${c.cupoDisponible} de ${c.cupoMaximo} lugares</span><span class="cupo-barra"><i style="width:${ocupado}%"></i></span>` : ''}
        </span>
      </button>`;
    }).join('') || '<p class="tenue">No hay comisiones para esta materia.</p>';

    let mensajes = '';
    if (this.aviso) mensajes += aviso(this.aviso.tipo, this.aviso.titulo, this.aviso.texto || '', this.aviso.regla || '');
    if (this.error) mensajes += aviso('err', 'No podés inscribirte en esta comisión', ' ' + esc(this.error.mensaje), this.error.codigo);
    // El detalle de las validaciones solo aparece cuando alguna falla
    if (this.validacion && !this.validacion.ok) mensajes += this.htmlValidaciones(this.validacion.resultado);

    return `<section class="panel" id="paso-comision">
      <div class="panel-titulo"><div><h2>Elegí la comisión</h2><p>${esc(this.materia.nombre)}: compará horario, aula, docente y lugares libres.</p></div>
        <button class="btn btn-secundario btn-chico" onclick="PantallaInscripcion.volverAMaterias()">Cambiar materia</button></div>
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
    if (r.ok) this.subir();
    else document.querySelector('#paso-comision .aviso')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },

  // ---------- Paso 3: confirmación ----------
  htmlResumen() {
    if (!this.validacion || !this.validacion.ok || !this.comision) {
      return `<section class="panel bloqueado"><h2>Confirmá la inscripción</h2><p style="margin-top:6px">Se habilita cuando la comisión elegida cumple todas las validaciones.</p></section>`;
    }
    const c = this.comision;
    return `<section class="panel" id="paso-confirmacion">
      <div class="panel-titulo"><div><h2>Revisá y confirmá</h2><p>Chequeá que los datos sean los que querés.</p></div></div>
      ${this.datosResumen(c)}
      <div class="requisitos-ok">${icono('ok')}<span>Cumplís los cuatro requisitos para inscribirte.</span></div>
      ${desplegable('Ver requisitos verificados', this.htmlValidaciones(this.validacion.resultado), { simple: true })}
      <p class="chico tenue" style="margin:var(--e4) 0">Al confirmar se reserva tu lugar. La solicitud queda pendiente hasta que la administración académica la revise, y te avisamos el resultado.</p>
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
      <div><dt>Día y horario</dt><dd>${horarioLargo(c)}</dd></div>
      <div><dt>Docente</dt><dd>${esc(c.docente.nombreCorto())}</dd></div>
      ${estadoHtml ? `<div><dt>Estado</dt><dd>${estadoHtml}</dd></div>` : ''}
    </dl>`;
  },

  noConfirmar() {                                     // A8
    t('46: cancelar()  [el estudiante no confirma · A8]', 'titulo');
    t('47: mostrarComisiones(): no se registra nada');
    Object.assign(this, { comision: null, validacion: null, error: null });
    this.render();
    this.subir();
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
