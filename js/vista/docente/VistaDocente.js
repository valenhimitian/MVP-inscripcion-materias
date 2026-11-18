/* =====================================================================
   PANEL DEL DOCENTE
   Inicio, comisión (notas · asistencia · avisos), notificaciones y perfil.
   La carga de notas es la PantallaCalificacion del DS02.
   ===================================================================== */

const VIGENTES = [EstadoComision.CREADA, EstadoComision.ABIERTA, EstadoComision.COMPLETA, EstadoComision.EN_CURSO];

const VistaDocente = {
  get d() { return App.sesion.usuario; },
  seleccion: null,      // inscripción elegida para cargar nota
  resultado: null,      // último resultado de registrarCalificacion

  // ---------- Inicio ----------
  inicio(main) {
    const d = this.d;
    const r = (() => { Traza.iniciar('DS02'); t('1: seleccionarOpcion("Registrar calificación")', 'titulo'); return CalificacionController.obtenerComisiones(d); })();
    const comisiones = r.ok ? r.comisiones : [];
    const vigentes = comisiones.filter(c => VIGENTES.includes(c.estado));
    if (r.ok) t(`7: mostrarComisiones(${comisiones.length})`);

    const tarjeta = c => {
      const enCurso = c.getInscripciones(EstadoInscripcion.EN_CURSO).length;
      const aprobadas = c.getInscripciones(EstadoInscripcion.APROBADA).length;
      return `<a class="panel comision-card" href="#/docente/comision/${c.id}">
        <div class="panel-titulo" style="margin-bottom:var(--e2)"><h3>${esc(c.materia.nombre)}</h3>${badgeComision(c.estado)}</div>
        <p class="tenue chico">${c.codigo} · ${c.horario()} · Aula ${esc(c.aula)}</p>
        <p class="chico" style="margin-top:var(--e3)">${c.estado === EstadoComision.EN_CURSO ? plural(enCurso, 'estudiante cursando', 'estudiantes cursando')
          : c.estado === EstadoComision.FINALIZADA ? 'Cursada cerrada' : `${plural(aprobadas, 'inscripción aprobada', 'inscripciones aprobadas')} · ${c.cupoDisponible} lugares libres`}</p>
      </a>`;
    };

    main.innerHTML = encabezado(`Hola, ${esc(d.nombre)}`, `${plural(vigentes.length, 'comisión a tu cargo', 'comisiones a tu cargo')} en el ${PERIODO.nombre}.`)
      + (r.ok ? '' : aviso('info', r.mensaje, ' La administración te asigna comisiones desde su panel.', r.codigo))
      + `<div class="inicio">
        <section class="panel">
          <div class="panel-titulo"><h2>Tu semana</h2></div>
          ${grillaSemanal(vigentes.map(c => ({ comision: c, clase: c.estado === EstadoComision.EN_CURSO ? 'en-curso' : 'aprobada' })))}
          <div class="grilla-ref"><span><i style="background:var(--birome)"></i>En curso</span><span><i style="background:var(--birome-cl);border:1px solid #BFCBFA"></i>Inscripción abierta o por empezar</span></div>
        </section>
        <div class="lado">
          <section class="panel">
            <div class="panel-titulo"><h2>Novedades</h2><a class="chico" href="#/docente/notificaciones">Ver todas</a></div>
            ${listaNotificaciones(Notificador.de(d), 4)}
          </section>
        </div>
      </div>
      <section style="margin-top:var(--e5)">
        <div class="panel-titulo"><h2>Tus comisiones</h2></div>
        <div class="tarjetas tres">${comisiones.map(tarjeta).join('') || vacio('Sin comisiones', 'Todavía no tenés comisiones asignadas.')}</div>
      </section>`;
  },

  // ---------- Comisión ----------
  comision(id, seccion) {
    const c = D.comisiones.find(x => x.id === +id);
    if (!c || !this.d.estaACargo(c)) {                   // RN1 de CU02
      $('contenido').innerHTML = encabezado('Comisión no disponible') + aviso('err', 'Acceso no autorizado a la comisión.', ' Solo podés ver las comisiones que tenés a cargo.', 'RN1 · CU02');
      return;
    }
    const base = `#/docente/comision/${c.id}`;
    const cabeza = `<a class="volver" href="#/docente">← Mis comisiones</a>`
      + encabezado(esc(c.materia.nombre), `${c.codigo} · ${c.horario()} · Aula ${esc(c.aula)} · ${badgeComision(c.estado)}`)
      + pestanas([[base, 'Estudiantes y notas'], [base + '/asistencia', 'Asistencia'], [base + '/avisos', 'Avisos y material']]);
    const main = $('contenido');
    if (seccion === 'asistencia') return this.asistencia(main, c, cabeza);
    if (seccion === 'avisos') return this.avisos(main, c, cabeza);
    this.notas(main, c, cabeza);
  },

  // DS02 – mensajes 8 a 45
  notas(main, c, cabeza) {
    if (this.seleccion && this.seleccion.comision !== c) { this.seleccion = null; this.resultado = null; }
    if (!this.seleccion) {
      Traza.iniciar('DS02');
      t('1: seleccionarOpcion("Registrar calificación")', 'titulo');
      CalificacionController.obtenerComisiones(this.d);
      t(`8: seleccionarComision(${c.nombre()})`, 'titulo');
    }
    const r = CalificacionController.obtenerInscriptos(this.d, c);
    if (r.ok && !r.vacia) t(`17: mostrarListado(${r.inscriptos.length})`);

    if (c.estado !== EstadoComision.EN_CURSO) {
      const lista = c.inscripciones.filter(i => i.estado !== EstadoInscripcion.CANCELADA && i.estado !== EstadoInscripcion.RECHAZADA);
      const mensaje = c.estado === EstadoComision.FINALIZADA ? 'La cursada finalizó: las notas están cerradas (DE04).'
        : 'La cursada todavía no empezó. Vas a poder cargar notas cuando la administración la inicie.';
      main.innerHTML = cabeza + aviso('info', mensaje, '', c.estado === EstadoComision.FINALIZADA ? 'E8.3' : 'A4') + `<section class="panel" style="margin-top:var(--e4)">
        <div class="panel-titulo"><h2>Inscriptos</h2><p>${plural(lista.length, 'estudiante', 'estudiantes')}</p></div>
        ${lista.length ? `<div class="tabla-contenedor"><table class="tabla"><thead><tr><th>Estudiante</th><th>Legajo</th><th>Estado</th><th>Nota final</th></tr></thead>
          <tbody>${lista.map(i => `<tr><td class="fuerte">${esc(i.estudiante.nombreCompleto())}</td><td>${i.estudiante.legajo}</td><td>${badgeInscripcion(i.estado)}</td><td>${i.notaFinal() ?? '—'}</td></tr>`).join('')}</tbody></table></div>`
          : vacio('Sin inscriptos', 'Todavía no hay estudiantes inscriptos en esta comisión.')}
      </section>`;
      return;
    }

    const celda = (i, tp) => {
      const cal = i.getCalificacion(tp);
      if (!cal) return '<td class="tenue">—</td>';
      return `<td><b>${cal.nota}</b>${cal.estado === EstadoCalificacion.MODIFICADA ? ` <span class="chico tenue" title="Nota anterior: ${cal.notaAnterior}">(antes ${cal.notaAnterior})</span>` : ''}</td>`;
    };
    const filas = r.inscriptos.map(i => {
      const asis = i.porcentajeAsistencia();
      return `<tr class="${this.seleccion === i ? 'sel' : ''}">
        <td><span class="fuerte">${esc(i.estudiante.nombreCompleto())}</span><br><span class="chico tenue">Legajo ${i.estudiante.legajo}</span></td>
        ${Object.values(TipoCalificacion).map(tp => celda(i, tp)).join('')}
        <td>${asis === null ? '—' : asis + '%'}</td>
        <td><button class="btn btn-secundario btn-chico" onclick="VistaDocente.elegir('${i.comprobante}')">Cargar nota</button></td></tr>`;
    }).join('');

    main.innerHTML = cabeza + `<div class="docente-notas">
      <section class="panel">
        <div class="panel-titulo"><h2>Estudiantes en curso</h2><p>${plural(r.inscriptos.length, 'estudiante', 'estudiantes')}</p></div>
        ${r.vacia ? vacio('La comisión no tiene estudiantes inscriptos', 'Cuando haya estudiantes en curso, vas a poder cargar sus notas.') : `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Estudiante</th><th>Parcial</th><th>TP</th><th>Recup.</th><th>Final</th><th>Asist.</th><th></th></tr></thead>
          <tbody>${filas}</tbody></table></div>`}
      </section>
      ${this.formNota()}
    </div>`;
    App.renderTraza();
  },

  formNota() {
    const i = this.seleccion;
    if (!i) return `<section class="panel bloqueado"><h2>Cargar nota</h2><p style="margin-top:6px">Elegí un estudiante de la lista.</p></section>`;
    const res = this.resultado;
    const tipoInicial = this.tipoNota || TipoCalificacion.PARCIAL;
    const existente = i.getCalificacion(tipoInicial);
    const historial = i.getCalificaciones().map(c => `<li>${etiquetaTipo(c.tipo)}: <b>${c.nota}</b> · ${fmtFecha(c.fecha)} ${badge(ETIQUETA_CALIFICACION[c.estado])}${c.observaciones ? `<br><span class="tenue">${esc(c.observaciones)}</span>` : ''}</li>`).join('');
    return `<section class="panel" id="formNota">
      <div class="panel-titulo"><h2>Cargar nota</h2><button class="btn-texto chico" onclick="VistaDocente.elegir(null)">Cerrar</button></div>
      <p class="fuerte">${esc(i.estudiante.nombreCompleto())}</p>
      <p class="chico tenue" style="margin-bottom:var(--e4)">Legajo ${i.estudiante.legajo}</p>
      ${res ? (res.ok ? aviso('ok', res.modificada ? 'Calificación modificada correctamente' : 'Calificación registrada correctamente', ' El estudiante recibió una notificación.')
                      : aviso('err', res.mensaje, '', res.codigo)) : ''}
      <form class="formulario" novalidate onsubmit="event.preventDefault(); VistaDocente.guardarNota(this)">
        <div class="fila-campos">
          <div class="campo"><label for="nTipo">Tipo</label>
            <select id="nTipo" name="tipo" onchange="VistaDocente.cambiarTipo(this.value)">
              ${Object.values(TipoCalificacion).map(tp => `<option value="${tp}" ${tp === tipoInicial ? 'selected' : ''}>${etiquetaTipo(tp)}</option>`).join('')}</select></div>
          <div class="campo"><label for="nNota">Nota (1 a 10)</label><input id="nNota" name="nota" type="number" step="0.5" value="${existente ? existente.nota : ''}"></div>
          <div class="campo"><label for="nFecha">Fecha</label><input id="nFecha" name="fecha" type="date" value="${valorFecha(existente ? existente.fecha : new Date())}"></div>
        </div>
        <div class="campo"><label for="nObs">Observaciones</label><textarea id="nObs" name="obs" rows="2">${esc(existente ? existente.observaciones : '')}</textarea></div>
        ${existente ? `<p class="chico" style="color:var(--warn);margin-bottom:var(--e3)">Este estudiante ya tiene ${etiquetaTipo(tipoInicial).toLowerCase()}: al guardar se modifica (A6) y queda registrada la nota anterior.</p>` : ''}
        <button class="btn btn-primario">Guardar</button>
      </form>
      ${historial ? `<h3 style="margin-top:var(--e5)">Notas registradas</h3><ul class="historial-notas">${historial}</ul>` : ''}
    </section>`;
  },

  elegir(comprobante) {
    this.resultado = null;
    this.tipoNota = null;
    if (!comprobante) { this.seleccion = null; App.navegar(); return; }
    const ins = D.estudiantes.flatMap(e => e.inscripciones).find(i => i.comprobante === comprobante);
    this.seleccion = ins;
    CalificacionController.obtenerCalificaciones(ins);
    t('22: mostrarFormulario(tipo, nota, fecha, obs)');
    App.navegar();
    $('formNota')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },
  cambiarTipo(tp) { this.tipoNota = tp; this.resultado = null; App.navegar(); },

  guardarNota(f) {
    const notaTxt = f.nota.value.trim();
    const nota = notaTxt === '' ? null : Number(notaTxt);
    this.tipoNota = f.tipo.value;
    t(`23: ingresarDatos(${f.tipo.value}, ${notaTxt || '—'}) y guardar()`, 'titulo');
    this.resultado = CalificacionController.registrarCalificacion(this.d, this.seleccion, f.tipo.value, nota, leerFecha(f.fecha.value), f.obs.value.trim());
    Repositorio.guardar();
    App.navegar();
  },

  // ---------- Asistencia ----------
  fechaAsistencia: null,
  asistencia(main, c, cabeza) {
    const inscriptos = this.d.consultarInscriptos(c);
    const fecha = this.fechaAsistencia || hoy();
    const fechas = [...new Set(inscriptos.flatMap(i => i.asistencias.map(a => a.fecha.getTime())))].sort().slice(-6).map(n => new Date(n));
    if (c.estado !== EstadoComision.EN_CURSO || !inscriptos.length) {
      main.innerHTML = cabeza + aviso('info', 'No hay estudiantes en curso', ' La asistencia se toma cuando la cursada está en curso.', 'DE01');
      return;
    }
    main.innerHTML = cabeza + `<div class="dos-col">
      <section class="panel">
        <form class="formulario" onsubmit="event.preventDefault(); VistaDocente.guardarAsistencia(this, ${c.id})">
          <div class="panel-titulo"><h2>Tomar asistencia</h2></div>
          <div class="campo"><label for="aFecha">Fecha de la clase</label>
            <input id="aFecha" name="fecha" type="date" value="${valorFecha(fecha)}" max="${valorFecha(new Date())}" onchange="VistaDocente.fechaAsistencia = leerFecha(this.value); App.navegar()"></div>
          <ul class="lista-check">${inscriptos.map(i => {
            const a = i.asistencias.find(x => x.fecha.getTime() === fecha.getTime());
            return `<li><label><input type="checkbox" name="presente" value="${i.comprobante}" ${!a || a.presente ? 'checked' : ''}>
              <span>${esc(i.estudiante.nombreCompleto())}</span><span class="chico tenue">${a ? (a.presente ? 'Presente' : 'Ausente') : 'Sin registrar'}</span></label></li>`;
          }).join('')}</ul>
          <p class="chico tenue" style="margin:var(--e3) 0">Marcado = presente.</p>
          <button class="btn btn-primario">Guardar asistencia</button>
        </form>
      </section>
      <section class="panel">
        <div class="panel-titulo"><h2>Últimas clases</h2></div>
        <div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Estudiante</th>${fechas.map(fe => `<th>${fe.getDate()}/${fe.getMonth() + 1}</th>`).join('')}<th>Total</th></tr></thead>
          <tbody>${inscriptos.map(i => `<tr><td>${esc(i.estudiante.nombreCorto())}</td>${fechas.map(fe => {
            const a = i.asistencias.find(x => x.fecha.getTime() === fe.getTime());
            return `<td>${a ? (a.presente ? '<span class="presente">P</span>' : '<span class="ausente">A</span>') : '—'}</td>`;
          }).join('')}<td class="fuerte">${i.porcentajeAsistencia() ?? '—'}${i.porcentajeAsistencia() === null ? '' : '%'}</td></tr>`).join('')}</tbody></table></div>
      </section></div>`;
  },

  guardarAsistencia(f, id) {
    const c = D.comisiones.find(x => x.id === id);
    const presentes = [...f.querySelectorAll('input[name="presente"]:checked')].map(x => x.value);
    if (intentar(() => CalificacionController.tomarAsistencia(this.d, c, leerFecha(f.fecha.value), presentes), n => `Guardaste la asistencia de ${plural(n, 'estudiante', 'estudiantes')}.`)) App.navegar();
  },

  // ---------- Avisos y material ----------
  avisos(main, c, cabeza) {
    main.innerHTML = cabeza + `<div class="dos-col">
      <section class="panel">
        <form class="formulario" onsubmit="event.preventDefault(); VistaDocente.publicar(this, ${c.id})">
          <div class="panel-titulo"><h2>Publicar</h2></div>
          <fieldset class="opciones-radio fila">
            <legend>Tipo</legend>
            <label class="opcion"><input type="radio" name="tipo" value="AVISO" checked><span><b>Aviso</b></span></label>
            <label class="opcion"><input type="radio" name="tipo" value="MATERIAL"><span><b>Material</b></span></label>
          </fieldset>
          <div class="campo"><label for="avTitulo">Título</label><input id="avTitulo" name="titulo" maxlength="80" required></div>
          <div class="campo"><label for="avTexto">Mensaje</label><textarea id="avTexto" name="texto" rows="4" required></textarea></div>
          <button class="btn btn-primario">Publicar y avisar</button>
          <p class="chico tenue" style="margin-top:var(--e3)">Les llega una notificación a los estudiantes en curso y aprobados.</p>
        </form>
      </section>
      <section class="panel">
        <div class="panel-titulo"><h2>Publicados</h2></div>
        ${c.contenidos.length ? `<ul class="avisos-materia">${c.contenidos.map(k => `<li>${badge(k.tipo === 'AVISO' ? ['Aviso', 'b-warn'] : ['Material', 'b-info'])}
          <b>${esc(k.titulo)}</b> <span class="tenue chico">${fmtFecha(k.fechaPublicacion)}</span><br>${esc(k.descripcion)}</li>`).join('')}</ul>`
          : vacio('Sin publicaciones', 'Publicá un aviso o material para tus estudiantes.')}
      </section></div>`;
  },

  publicar(f, id) {
    const c = D.comisiones.find(x => x.id === id);
    if (intentar(() => CalificacionController.publicarAviso(this.d, c, f.titulo.value, f.texto.value, f.tipo.value), n => `Publicado. Avisamos a ${plural(n, 'estudiante', 'estudiantes')}.`)) App.navegar();
  },

  // ---------- Notificaciones y perfil ----------
  notificaciones(main) {
    const lista = Notificador.de(this.d);
    main.innerHTML = encabezado('Notificaciones') + `<section class="panel">
      <div class="panel-titulo"><h2>Recientes</h2>${lista.some(n => !n.leida) ? '<button class="btn btn-secundario btn-chico" onclick="App.marcarTodas()">Marcar todas como leídas</button>' : ''}</div>
      ${listaNotificaciones(lista)}</section>`;
  },

  perfil(main) {
    const d = this.d;
    main.innerHTML = `<section class="perfil-cabeza"><span class="avatar grande docente">${iniciales(d)}</span>
      <div><h1>${esc(d.nombre)} ${esc(d.apellido)}</h1><p>Docente · Legajo ${d.legajo} · ${esc(d.especialidad)}</p></div></section>
      <div class="dos-col">
        <section class="panel"><div class="panel-titulo"><h2>Datos</h2></div>
          <dl class="datos">
            <div><dt>DNI</dt><dd>${fmtDni(d.dni)}</dd></div><div><dt>Legajo</dt><dd>${d.legajo}</dd></div>
            <div style="grid-column:1/-1"><dt>Correo</dt><dd>${esc(d.email)}</dd></div>
            <div style="grid-column:1/-1"><dt>Comisiones</dt><dd>${d.consultarComisiones().map(c => esc(c.nombre())).join('<br>') || '—'}</dd></div>
          </dl></section>
        ${formularioClave('VistaDocente')}
      </div>`;
  },
  cambiarClave(f) { cambiarClave(this.d, f); },
};
