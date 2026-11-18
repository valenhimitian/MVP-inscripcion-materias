/* =====================================================================
   PANEL DE ADMINISTRACIÓN ACADÉMICA
   Resumen, inscripciones, trámites, cursadas (comisiones), estudiantes,
   docentes, notificaciones y perfil.
   ===================================================================== */

const todasLasInscripciones = () => D.estudiantes.flatMap(e => e.inscripciones);
const todosLosCertificados = () => D.estudiantes.flatMap(e => e.certificados);

const VistaAdmin = {
  // ---------- Resumen ----------
  inicio(main) {
    const pendIns = todasLasInscripciones().filter(i => i.estado === EstadoInscripcion.PENDIENTE).length;
    const pendTra = todosLosCertificados().filter(c => c.estado === EstadoCertificado.SOLICITADO).length;
    const cuenta = (lista, campo) => lista.reduce((m, x) => (m[x[campo]] = (m[x[campo]] || 0) + 1, m), {});
    const est = cuenta(D.estudiantes, 'estado');
    const com = cuenta(D.comisiones, 'estado');
    const fila = (texto, n, href) => `<li><a href="${href}"><span>${texto}</span><b>${n}</b></a></li>`;

    const creadas = D.comisiones.filter(c => c.estado === EstadoComision.CREADA).length;
    const registrados = D.estudiantes.filter(e => e.estado === EstadoEstudiante.REGISTRADO).length;
    const tareas = [];
    if (pendIns) tareas.push({ ico: 'bandeja', tono: 'importante', titulo: `${plural(pendIns, 'solicitud de inscripción', 'solicitudes de inscripción')} para revisar`,
      texto: 'Aprobá o rechazá cada una. Rechazar libera el lugar.', accion: '<a class="btn btn-primario btn-chico" href="#/admin/inscripciones">Revisar</a>' });
    if (pendTra) tareas.push({ ico: 'tramite', tono: 'importante', titulo: `${plural(pendTra, 'constancia', 'constancias')} por emitir`,
      texto: 'Al aprobar se genera el PDF y se envía al estudiante.', accion: '<a class="btn btn-primario btn-chico" href="#/admin/tramites">Revisar</a>' });
    if (registrados) tareas.push({ ico: 'alumnos', titulo: `${plural(registrados, 'estudiante registrado', 'estudiantes registrados')} sin habilitar`,
      texto: 'No pueden inscribirse hasta que los habilites.', accion: '<a class="btn btn-secundario btn-chico" href="#/admin/estudiantes">Ver</a>' });
    if (creadas) tareas.push({ ico: 'comisiones', titulo: `${plural(creadas, 'cursada creada', 'cursadas creadas')} sin inscripción abierta`,
      texto: 'Los estudiantes no la ven hasta que abras la inscripción.', accion: '<a class="btn btn-secundario btn-chico" href="#/admin/cursadas">Ver</a>' });

    const resumen = (titulo, href, filas) => `<div class="resumen-bloque"><div class="resumen-titulo"><h3>${titulo}</h3><a class="chico" href="${href}">Ver</a></div><ul>${filas}</ul></div>`;
    main.innerHTML = encabezado(`Hola, ${esc(D.admin.nombre)}`, `Administración académica del ${PERIODO.nombre}.`)
      + `<div class="inicio">
        <div class="columna">
          ${seccion('Para revisar', '', listaTareas(tareas, 'No hay nada pendiente de revisión.'))}
          ${seccion('Novedades', '', `<div class="panel">${listaNotificaciones(Notificador.de(D.admin), 4)}</div>`, '<a class="chico" href="#/admin/notificaciones">Ver todas</a>')}
        </div>
        <div class="columna">
          ${seccion('Estado general', '', `<div class="panel resumen-estado">
            ${resumen('Estudiantes', '#/admin/estudiantes', Object.keys(ETIQUETA_ESTUDIANTE).filter(k => est[k]).map(k => fila(badge(ETIQUETA_ESTUDIANTE[k]), est[k], '#/admin/estudiantes')).join(''))}
            ${resumen('Cursadas', '#/admin/cursadas', Object.keys(ETIQUETA_COMISION).filter(k => com[k]).map(k => fila(badge(ETIQUETA_COMISION[k]), com[k], '#/admin/cursadas')).join(''))}
            ${resumen('Docentes', '#/admin/docentes', fila('Activos', D.docentes.filter(d => d.estaActivo()).length, '#/admin/docentes'))}
          </div>`)}
        </div>
      </div>`;
  },

  // ---------- Inscripciones (CU01 · actor secundario) ----------
  inscripciones(main) {
    const todas = todasLasInscripciones();
    const pend = todas.filter(i => i.estado === EstadoInscripcion.PENDIENTE).sort((a, b) => a.fecha - b.fecha);
    const revisadas = todas.filter(i => i.fecha.getFullYear() === 2026 && i.fecha.getMonth() >= 6 && [EstadoInscripcion.APROBADA, EstadoInscripcion.RECHAZADA, EstadoInscripcion.EN_CURSO].includes(i.estado)).sort((a, b) => b.fecha - a.fecha);

    main.innerHTML = encabezado('Inscripciones', 'Aprobá o rechazá las solicitudes de los estudiantes. Al rechazar, el lugar vuelve a quedar libre en la comisión (RN8).')
      + `<section class="panel">
        <div class="panel-titulo"><h2>Pendientes de revisión</h2><p>${plural(pend.length, 'solicitud', 'solicitudes')}</p></div>
        ${pend.length ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Comprobante</th><th>Estudiante</th><th>Materia y comisión</th><th>Fecha</th><th>Acción</th></tr></thead>
          <tbody>${pend.map(i => `<tr>
            <td class="codigo">${i.comprobante}</td>
            <td><a class="fuerte" href="#/admin/estudiantes/${i.estudiante.legajo}">${esc(i.estudiante.nombreCompleto())}</a><br><span class="tenue chico">Legajo ${i.estudiante.legajo}</span></td>
            <td>${esc(i.comision.materia.nombre)}<br><span class="tenue chico">${i.comision.codigo} · ${i.comision.horario()}</span></td>
            <td>${fmtFecha(i.fecha)}</td>
            <td><div class="acciones">
              <button class="btn btn-exito btn-chico" onclick="VistaAdmin.revisarIns('${i.comprobante}', true)">Aprobar</button>
              <button class="btn btn-peligro btn-chico" onclick="VistaAdmin.revisarIns('${i.comprobante}', false)">Rechazar</button></div></td></tr>`).join('')}</tbody></table></div>`
          : vacio('No hay solicitudes pendientes', 'Cuando un estudiante confirme una inscripción, aparece acá.')}
      </section>
      <div class="seccion">${desplegable('Revisadas este cuatrimestre', revisadas.length ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Comprobante</th><th>Estudiante</th><th>Materia</th><th>Estado</th></tr></thead>
          <tbody>${revisadas.map(i => `<tr><td class="codigo">${i.comprobante}</td><td>${esc(i.estudiante.nombreCompleto())}</td>
            <td>${esc(i.comision.materia.nombre)} <span class="tenue chico">${i.comision.codigo}</span></td>
            <td>${badgeInscripcion(i.estado)}${i.motivoRechazo ? `<br><span class="tenue chico">${esc(i.motivoRechazo)}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="tenue">Sin solicitudes revisadas.</p>', { contador: revisadas.length })}</div>`;
  },

  async revisarIns(comprobante, aprobar) {
    const i = todasLasInscripciones().find(x => x.comprobante === comprobante);
    let motivo = '';
    if (aprobar) {
      if (!await Dialogo.abrir({ titulo: 'Aprobar inscripción', texto: `${esc(i.estudiante.nombreCorto())} queda inscripto/a en <b>${esc(i.comision.materia.nombre)}</b>, ${i.comision.codigo}.`, aceptar: 'Aprobar' })) return;
    } else {
      motivo = await Dialogo.abrir({ titulo: 'Rechazar inscripción', texto: 'El estudiante ve este motivo en su cursada.', campo: { etiqueta: 'Motivo del rechazo', valor: 'Documentación incompleta' }, aceptar: 'Rechazar', peligro: true });
      if (motivo === false) return;
    }
    intentar(() => GestionController.revisarInscripcion(i, aprobar, motivo || 'Sin motivo'),
      aprobar ? `Inscripción ${comprobante} aprobada.` : `Inscripción ${comprobante} rechazada. Se liberó el lugar.`);
    App.navegar();
  },

  // ---------- Trámites: constancias ----------
  tramites(main) {
    const todos = todosLosCertificados();
    const pend = todos.filter(c => c.estado === EstadoCertificado.SOLICITADO).sort((a, b) => a.fechaSolicitud - b.fechaSolicitud);
    const resueltos = todos.filter(c => c.estado !== EstadoCertificado.SOLICITADO).sort((a, b) => (b.fechaEmision || b.fechaSolicitud) - (a.fechaEmision || a.fechaSolicitud));
    const tipo = c => c.tipo === TipoCertificado.EXAMEN ? `Examen<br><span class="chico tenue">${esc(c.inscripcion.comision.materia.nombre)} · ${fmtFecha(c.fechaExamen)}</span>` : 'Alumno regular';

    main.innerHTML = encabezado('Trámites', 'Constancias que pidieron los estudiantes. Al aprobar una, se genera el PDF, se envía a su correo y queda para descargar en su perfil.')
      + `<section class="panel">
        <div class="panel-titulo"><h2>Constancias por emitir</h2><p>${plural(pend.length, 'solicitud', 'solicitudes')}</p></div>
        ${pend.length ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>N.º</th><th>Estudiante</th><th>Constancia</th><th>Presentar ante</th><th>Pedida</th><th>Acción</th></tr></thead>
          <tbody>${pend.map(c => `<tr>
            <td class="codigo">${c.numero}</td>
            <td><a class="fuerte" href="#/admin/estudiantes/${c.estudiante.legajo}">${esc(c.estudiante.nombreCompleto())}</a><br>${badgeEstudiante(c.estudiante.estado)}</td>
            <td>${tipo(c)}</td><td class="chico">${esc(c.presentarAnte)}</td><td>${fmtFecha(c.fechaSolicitud)}</td>
            <td><div class="acciones">
              <button class="btn btn-exito btn-chico" onclick="VistaAdmin.revisarCert('${c.numero}', true)">Aprobar y enviar</button>
              <button class="btn btn-peligro btn-chico" onclick="VistaAdmin.revisarCert('${c.numero}', false)">Rechazar</button></div></td></tr>`).join('')}</tbody></table></div>`
          : vacio('No hay constancias por emitir', 'Cuando un estudiante pida una constancia, aparece acá.')}
      </section>
      <div class="seccion">${desplegable('Emitidas y rechazadas', resueltos.length ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>N.º</th><th>Estudiante</th><th>Constancia</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>${resueltos.map(c => `<tr><td class="codigo">${c.numero}</td><td>${esc(c.estudiante.nombreCompleto())}</td><td>${tipo(c)}</td>
            <td>${badgeCertificado(c.estado)}${c.motivoRechazo ? `<br><span class="chico tenue">${esc(c.motivoRechazo)}</span>` : ''}</td>
            <td>${c.estaDisponible() ? `<button class="btn btn-secundario btn-chico" onclick="VistaAdmin.pdf('${c.numero}')">${icono('descargar')} PDF</button>` : '—'}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="tenue">Todavía no se emitieron constancias.</p>', { contador: resueltos.length })}</div>
      <div class="seccion">${desplegable('Correos enviados', `<p class="chico tenue" style="margin-bottom:var(--e3)">Envío simulado: el MVP registra cada correo con su adjunto.</p>` + (D.correos.length ? `<ul class="correos">${D.correos.slice(0, 8).map(m => `<li>${icono('correo')}<div>
          <b>${esc(m.asunto)}</b><span class="chico tenue">Para ${esc(m.para)} · ${fmtFecha(m.fecha)}</span>
          <p class="chico">${esc(m.cuerpo)}</p>
          ${m.adjunto ? `<button class="btn-texto chico" onclick="VistaAdmin.pdf('${m.adjunto}')">${icono('tramite')} constancia-${m.adjunto}.pdf</button>` : ''}</div></li>`).join('')}</ul>`
          : '<p class="tenue">Sin correos enviados.</p>'), { contador: D.correos.length })}</div>`;
  },

  async revisarCert(numero, aprobar) {
    const c = todosLosCertificados().find(x => x.numero === numero);
    let motivo = '';
    if (aprobar) {
      if (!await Dialogo.abrir({ titulo: 'Aprobar y enviar constancia', texto: `Se genera el PDF de la constancia ${numero} y se envía a <b>${esc(c.estudiante.email)}</b>.`, aceptar: 'Aprobar y enviar' })) return;
    } else {
      motivo = await Dialogo.abrir({ titulo: 'Rechazar constancia', texto: 'El estudiante ve este motivo en sus trámites.', campo: { etiqueta: 'Motivo', valor: 'No registra cursada en el período' }, aceptar: 'Rechazar', peligro: true });
      if (motivo === false) return;
    }
    intentar(() => GestionController.revisarConstancia(c, aprobar, motivo || 'Sin motivo'),
      aprobar ? `Constancia ${numero} enviada a ${c.estudiante.email}.` : `Constancia ${numero} rechazada.`);
    App.navegar();
  },
  pdf(numero) { ConstanciaPDF.descargar(todosLosCertificados().find(x => x.numero === numero)); },

  // ---------- Cursadas (comisiones · DE02) ----------
  filtroCursadas: 'VIGENTES',
  cursadas(main) {
    const f = this.filtroCursadas;
    const lista = D.comisiones.filter(c => f === 'TODAS' || (f === 'VIGENTES' ? VIGENTES.includes(c.estado) : c.estado === f))
      .sort((a, b) => a.materia.nombre.localeCompare(b.materia.nombre) || a.codigo.localeCompare(b.codigo));
    const acciones = c => {
      const b = [];
      if (c.estado === EstadoComision.CREADA) b.push(`<button class="btn btn-primario btn-chico" onclick="VistaAdmin.accion(${c.id}, 'abrir')">Abrir inscripción</button>`);
      if ([EstadoComision.ABIERTA, EstadoComision.COMPLETA].includes(c.estado)) b.push(`<button class="btn btn-secundario btn-chico" onclick="VistaAdmin.accion(${c.id}, 'iniciar')">Iniciar cursada</button>`);
      if (c.estado === EstadoComision.EN_CURSO) b.push(`<button class="btn btn-secundario btn-chico" onclick="VistaAdmin.accion(${c.id}, 'finalizar')">Finalizar cursada</button>`);
      if ([EstadoComision.CREADA, EstadoComision.ABIERTA, EstadoComision.COMPLETA].includes(c.estado)) b.push(`<button class="btn btn-peligro btn-chico" onclick="VistaAdmin.accion(${c.id}, 'baja')">Eliminar</button>`);
      return b.join('') || '<span class="tenue">—</span>';
    };
    const opciones = [['VIGENTES', 'Vigentes'], ['TODAS', 'Todas'], ...Object.entries(ETIQUETA_COMISION).map(([k, v]) => [k, v[0]])];

    main.innerHTML = encabezado('Cursadas', 'Cada cursada es una comisión de una materia, con su docente, horario, aula y cupo.', '<a class="btn btn-primario" href="#/admin/cursadas/nueva">Nueva cursada</a>')
      + `<section class="panel">
        <div class="filtros"><label for="fCursadas" class="chico fuerte">Mostrar</label>
          <select id="fCursadas" onchange="VistaAdmin.filtroCursadas = this.value; App.navegar()">${opciones.map(([k, v]) => `<option value="${k}" ${k === f ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <span class="chico tenue">${plural(lista.length, 'cursada', 'cursadas')}</span></div>
        <div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Materia</th><th>Comisión</th><th>Día y horario</th><th>Docente</th><th>Estado</th><th>Inscriptos</th><th>Acciones</th></tr></thead>
          <tbody>${lista.map(c => `<tr>
            <td><span class="fuerte">${esc(c.materia.nombre)}</span><br><span class="tenue chico">${c.materia.codigo}</span></td>
            <td>${c.codigo}<br><span class="tenue chico">Aula ${esc(c.aula)}</span></td>
            <td>${c.horario()}</td><td>${esc(c.docente.nombreCorto())}</td><td>${badgeComision(c.estado)}</td>
            <td>${c.inscripciones.filter(i => i.estado !== EstadoInscripcion.CANCELADA && i.estado !== EstadoInscripcion.RECHAZADA).length}
              <br><span class="tenue chico">${c.cupoDisponible} de ${c.cupoMaximo} libres</span></td>
            <td><div class="acciones">${acciones(c)}</div></td></tr>`).join('')}</tbody></table></div>
      </section>`;
  },

  async accion(id, tipo) {
    const c = D.comisiones.find(x => x.id === id);
    const activas = c.inscripciones.filter(i => i.estaActiva()).length;
    const textos = {
      abrir: ['Abrir inscripción', `${esc(c.nombre())} empieza a recibir inscripciones.`, 'Abrir inscripción', false],
      iniciar: ['Iniciar cursada', `Las inscripciones aprobadas de ${esc(c.nombre())} pasan a «en curso» y las pendientes se rechazan (DE01). La inscripción se cierra.`, 'Iniciar cursada', false],
      finalizar: ['Finalizar cursada', `Se cierran las notas de ${esc(c.nombre())} y pasan al historial académico. Necesita la nota final de cada estudiante.`, 'Finalizar cursada', false],
      baja: ['Eliminar cursada', `${esc(c.nombre())} se da de baja.${activas ? ` Se cancelan ${plural(activas, 'inscripción', 'inscripciones')} y se avisa a los estudiantes.` : ''} No se puede deshacer.`, 'Eliminar cursada', true],
    }[tipo];
    if (!await Dialogo.abrir({ titulo: textos[0], texto: textos[1], aceptar: textos[2], peligro: textos[3] })) return;
    const fn = { abrir: () => GestionController.abrirInscripcion(c), iniciar: () => GestionController.iniciarCursada(c),
      finalizar: () => GestionController.finalizarCursada(c), baja: () => GestionController.darDeBaja(c) }[tipo];
    const exito = { abrir: 'Inscripción abierta.', iniciar: r => `Cursada iniciada: ${plural(r.iniciadas.length, 'estudiante en curso', 'estudiantes en curso')}.`,
      finalizar: r => `Cursada finalizada: ${plural(r.length, 'nota cerrada', 'notas cerradas')}.`, baja: 'Cursada eliminada.' }[tipo];
    intentar(fn, exito);
    App.navegar();
  },

  nuevaCursada(main) {
    const materias = D.materias.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
    main.innerHTML = `<a class="volver" href="#/admin/cursadas">← Cursadas</a>` + encabezado('Nueva cursada', 'Se crea en estado «creada». Después la abrís para que reciba inscripciones (DE02).')
      + `<section class="panel angosto">
        <form class="formulario" onsubmit="event.preventDefault(); VistaAdmin.crear(this)">
          <div class="campo"><label for="cMateria">Materia</label><select id="cMateria" name="materia" required>
            ${materias.map(m => `<option value="${m.codigo}">${esc(m.nombre)} (${m.codigo})</option>`).join('')}</select></div>
          <div class="fila-campos">
            <div class="campo"><label for="cCodigo">Comisión</label><input id="cCodigo" name="codigo" value="COM-05" required></div>
            <div class="campo"><label for="cAula">Aula</label><input id="cAula" name="aula" placeholder="Por ejemplo, 204" required></div>
            <div class="campo"><label for="cCupo">Cupo</label><input id="cCupo" name="cupo" type="number" min="1" max="200" value="30" required></div>
          </div>
          <div class="campo"><label for="cDocente">Docente</label><select id="cDocente" name="docente" required>
            ${D.docentes.filter(d => d.estaActivo()).map(d => `<option value="${d.legajo}">${esc(d.nombreCompleto())} · ${esc(d.especialidad)}</option>`).join('')}</select></div>
          <div class="fila-campos">
            <div class="campo"><label for="cDia">Día</label><select id="cDia" name="dia">${DIAS_SEMANA.map(d => `<option ${d === 'Jueves' ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
            <div class="campo"><label for="cIni">Desde</label><input id="cIni" name="inicio" type="time" min="08:00" max="22:00" step="1800" value="18:00" required></div>
            <div class="campo"><label for="cFin">Hasta</label><input id="cFin" name="fin" type="time" min="08:00" max="22:00" step="1800" value="22:00" required></div>
          </div>
          <div class="acciones"><button class="btn btn-primario">Crear cursada</button><a class="btn btn-secundario" href="#/admin/cursadas">Cancelar</a></div>
        </form>
      </section>`;
  },

  crear(f) {
    const c = intentar(() => GestionController.crearComision({
      materia: D.materias.find(m => m.codigo === f.materia.value), codigo: f.codigo.value.trim().toUpperCase(),
      docente: D.docentes.find(d => d.legajo === f.docente.value), dia: f.dia.value, horaInicio: f.inicio.value, horaFin: f.fin.value,
      aula: f.aula.value.trim(), cupoMaximo: Number(f.cupo.value),
    }), c => `Creaste ${c.nombre()}. Abrí la inscripción cuando quieras.`);
    if (c) { this.filtroCursadas = 'VIGENTES'; App.ir('#/admin/cursadas'); }
  },

  // ---------- Estudiantes (DE03) ----------
  busqueda: '',
  estudiantes(main) {
    const q = this.busqueda.toLowerCase();
    const lista = D.estudiantes.filter(e => !q || `${e.nombre} ${e.apellido} ${e.dni} ${e.legajo}`.toLowerCase().includes(q));
    main.innerHTML = encabezado('Estudiantes', `${plural(D.estudiantes.length, 'estudiante registrado', 'estudiantes registrados')}.`)
      + `<section class="panel">
        <div class="filtros"><label for="bEst" class="solo-lector">Buscar</label>
          <input id="bEst" type="search" placeholder="Buscar por nombre, DNI o legajo" value="${esc(this.busqueda)}" oninput="VistaAdmin.buscar(this.value)"></div>
        <div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Estudiante</th><th>DNI</th><th>Carrera</th><th>Estado</th><th>Cursando</th><th></th></tr></thead>
          <tbody id="tablaEst">${lista.map(e => `<tr>
            <td><span class="fuerte">${esc(e.nombreCompleto())}</span><br><span class="chico tenue">Legajo ${e.legajo}</span></td>
            <td>${fmtDni(e.dni)}</td><td class="chico">${esc(e.getCarreraActiva()?.nombre || '—')}</td><td>${badgeEstudiante(e.estado)}</td>
            <td>${e.inscripciones.filter(i => i.estaActiva()).length}</td>
            <td><a class="btn btn-secundario btn-chico" href="#/admin/estudiantes/${e.legajo}">Ver ficha</a></td></tr>`).join('')
            || '<tr><td colspan="6" class="tenue">Ningún estudiante coincide con la búsqueda.</td></tr>'}</tbody></table></div>
      </section>`;
  },
  buscar(v) {
    this.busqueda = v;
    const pos = v.length;
    App.navegar();
    const i = $('bEst'); i.focus(); i.setSelectionRange(pos, pos);
  },

  estudiante(main, legajo) {
    const e = D.estudiantes.find(x => x.legajo === legajo);
    if (!e) { main.innerHTML = encabezado('Estudiante no encontrado'); return; }
    const mat = e.getMatriculaActiva();
    const acciones = [];
    if ([EstadoEstudiante.REGISTRADO, EstadoEstudiante.INHABILITADO].includes(e.estado)) acciones.push(`<button class="btn btn-exito" onclick="VistaAdmin.estadoEst('${e.legajo}', true)">Habilitar</button>`);
    if (e.estado === EstadoEstudiante.HABILITADO) acciones.push(`<button class="btn btn-peligro" onclick="VistaAdmin.estadoEst('${e.legajo}', false)">Inhabilitar</button>`);

    main.innerHTML = `<a class="volver" href="#/admin/estudiantes">← Estudiantes</a>
      <section class="perfil-cabeza"><span class="avatar grande">${iniciales(e)}</span>
        <div><h1>${esc(e.nombre)} ${esc(e.apellido)}</h1><p>Legajo ${e.legajo} · DNI ${fmtDni(e.dni)} · ${badgeEstudiante(e.estado)}</p></div>
        <div class="acciones" style="margin-left:auto">${acciones.join('')}</div></section>
      <div class="dos-col">
        <section class="panel"><div class="panel-titulo"><h2>Datos</h2></div>
          <dl class="datos">
            <div style="grid-column:1/-1"><dt>Correo</dt><dd>${esc(e.email)}</dd></div>
            <div><dt>Teléfono</dt><dd>${esc(e.telefono || '—')}</dd></div>
            <div><dt>Nacimiento</dt><dd>${fmtFecha(e.fechaNacimiento)}</dd></div>
            <div style="grid-column:1/-1"><dt>Matrículas</dt><dd>${e.matriculas.map(m => `${esc(m.carrera.nombre)} · ${m.estado.toLowerCase()} desde ${fmtFecha(m.fechaIngreso)}`).join('<br>')}</dd></div>
          </dl></section>
        <section class="panel"><div class="panel-titulo"><h2>Trámites</h2></div>
          ${e.certificados.length ? `<ul class="lista-simple">${e.certificados.map(c => `<li><span>${c.numero} · ${c.tipo === TipoCertificado.EXAMEN ? 'Examen' : 'Alumno regular'}</span>${badgeCertificado(c.estado)}</li>`).join('')}</ul>` : '<p class="tenue">Sin trámites.</p>'}
        </section>
      </div>
      <section class="panel" style="margin-top:var(--e4)"><div class="panel-titulo"><h2>Inscripciones</h2></div>
        ${e.inscripciones.length ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Materia</th><th>Comisión</th><th>Fecha</th><th>Estado</th><th>Nota final</th><th>Asistencia</th></tr></thead>
          <tbody>${e.inscripciones.slice().sort((a, b) => b.fecha - a.fecha).map(i => `<tr><td>${esc(i.comision.materia.nombre)}</td><td>${i.comision.codigo}</td><td>${fmtFecha(i.fecha)}</td>
            <td>${badgeInscripcion(i.estado)}</td><td>${i.notaFinal() ?? '—'}</td><td>${i.porcentajeAsistencia() ?? '—'}${i.porcentajeAsistencia() === null ? '' : '%'}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="tenue">Sin inscripciones.</p>'}
      </section>`;
  },

  async estadoEst(legajo, habilitar) {
    const e = D.estudiantes.find(x => x.legajo === legajo);
    const pend = e.inscripciones.filter(i => i.estado === EstadoInscripcion.PENDIENTE).length;
    if (!await Dialogo.abrir({
      titulo: habilitar ? 'Habilitar estudiante' : 'Inhabilitar estudiante',
      texto: habilitar ? `${esc(e.nombreCorto())} va a poder inscribirse y pedir constancias.` : `${esc(e.nombreCorto())} no va a poder inscribirse.${pend ? ` Se cancelan ${plural(pend, 'solicitud pendiente', 'solicitudes pendientes')}.` : ''} Su historial se conserva.`,
      aceptar: habilitar ? 'Habilitar' : 'Inhabilitar', peligro: !habilitar,
    })) return;
    intentar(() => habilitar ? GestionController.habilitar(e) : GestionController.inhabilitar(e), habilitar ? 'Estudiante habilitado.' : 'Estudiante inhabilitado.');
    App.navegar();
  },

  // ---------- Docentes ----------
  docentes(main) {
    main.innerHTML = encabezado('Docentes', `${plural(D.docentes.length, 'docente', 'docentes')}. Para asignar uno a una materia, creá una cursada.`)
      + `<div class="docentes-layout">
        <section class="panel">
          <div class="tabla-contenedor"><table class="tabla">
            <thead><tr><th>Docente</th><th>DNI</th><th>Cursadas vigentes</th><th>Estado</th><th></th></tr></thead>
            <tbody>${D.docentes.map(d => {
              const vig = d.comisiones.filter(c => VIGENTES.includes(c.estado));
              return `<tr><td><span class="fuerte">${esc(d.nombreCompleto())}</span><br><span class="chico tenue">${esc(d.especialidad)} · ${esc(d.email)}</span></td>
                <td>${fmtDni(d.dni)}</td><td class="chico">${vig.map(c => esc(c.nombre())).join('<br>') || '—'}</td>
                <td>${badge(d.estaActivo() ? ['Activo', 'b-ok'] : ['Inactivo', 'b-neutro'])}</td>
                <td><button class="btn btn-secundario btn-chico" onclick="VistaAdmin.estadoDoc('${d.legajo}')">${d.estaActivo() ? 'Desactivar' : 'Activar'}</button></td></tr>`;
            }).join('')}</tbody></table></div>
        </section>
        <section class="panel">
          <form class="formulario" onsubmit="event.preventDefault(); VistaAdmin.altaDocente(this)">
            <h2>Agregar docente</h2>
            <div class="campo"><label for="dDni">DNI</label><input id="dDni" name="dni" inputmode="numeric" required></div>
            <div class="fila-campos">
              <div class="campo"><label for="dNom">Nombre</label><input id="dNom" name="nombre" required></div>
              <div class="campo"><label for="dApe">Apellido</label><input id="dApe" name="apellido" required></div>
            </div>
            <div class="campo"><label for="dMail">Correo</label><input id="dMail" name="email" type="email" required></div>
            <div class="campo"><label for="dEsp">Especialidad</label><input id="dEsp" name="especialidad"></div>
            <button class="btn btn-primario">Agregar docente</button>
            <p class="chico tenue" style="margin-top:var(--e3)">Le enviamos un correo con su usuario. La contraseña inicial es docente123.</p>
          </form>
        </section></div>`;
  },
  altaDocente(f) {
    const d = intentar(() => GestionController.altaDocente({ dni: f.dni.value.trim(), nombre: f.nombre.value, apellido: f.apellido.value, email: f.email.value, especialidad: f.especialidad.value }),
      d => `Agregaste a ${d.nombreCorto()}.`);
    if (d) App.navegar();
  },
  estadoDoc(legajo) {
    const d = D.docentes.find(x => x.legajo === legajo);
    intentar(() => GestionController.cambiarEstadoDocente(d), () => `${d.nombreCorto()} quedó ${d.estaActivo() ? 'activo' : 'inactivo'}.`);
    App.navegar();
  },

  // ---------- Notificaciones y perfil ----------
  notificaciones(main) { paginaNotificaciones(main, D.admin); },
  perfil(main) {
    const a = D.admin;
    main.innerHTML = `<section class="perfil-cabeza"><span class="avatar grande admin">${iniciales(a)}</span>
      <div><h1>${esc(a.nombreCorto())}</h1><p>Administración académica · DNI ${fmtDni(a.dni)} · ${esc(a.email)}</p></div></section>
      <div class="dos-col"><div class="columna">${seccion('Contraseña', '', formularioClave('VistaAdmin'))}</div>
        <section class="panel"><div class="panel-titulo"><h2>Datos de prueba</h2></div>
          <p class="chico tenue" style="margin-bottom:var(--e4)">Los datos se guardan en este navegador. Reinicialos para volver al estado inicial de la demo.</p>
          <button class="btn btn-peligro" onclick="App.reiniciarDatos()">Reiniciar datos de la demo</button></section></div>`;
  },
  cambiarClave(f) { cambiarClave(D.admin, f); },
};
