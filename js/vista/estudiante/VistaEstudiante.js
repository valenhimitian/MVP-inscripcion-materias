/* =====================================================================
   VISTAS DEL ESTUDIANTE
   Inicio, Mi cursada, Trámites, Notificaciones y Mi perfil.
   Cada pantalla responde una sola pregunta y deja lo secundario plegado.
   La inscripción está en PantallaInscripcion.
   ===================================================================== */

const VistaEstudiante = {
  get e() { return App.sesion.usuario; },

  // ---------- Inicio: qué tengo que hacer y qué estoy cursando ----------
  inicio(main) {
    const e = this.e;
    const car = e.getCarreraActiva();
    const activas = e.consultarInscripciones().filter(i => i.estaActiva()).sort((a, b) => DIAS.indexOf(a.comision.dia) - DIAS.indexOf(b.comision.dia));
    const pendientes = activas.filter(i => i.estado === EstadoInscripcion.PENDIENTE);
    const enRevision = e.certificados.filter(c => c.estado === EstadoCertificado.SOLICITADO);
    const noLeidas = Notificador.de(e).filter(n => !n.leida);

    const tareas = [];
    if (!e.estaHabilitado()) {
      tareas.push({ ico: 'error', tono: 'error', titulo: 'Tu cuenta no está habilitada',
        texto: `Estado: ${ETIQUETA_ESTUDIANTE[e.estado][0].toLowerCase()}. Acercate a la administración académica para regularizarla.` });
    } else {
      tareas.push({ ico: 'inscribir', tono: 'importante', titulo: `Inscripción abierta hasta el ${fmtFechaLarga(PERIODO.cierreInscripcion)}`,
        texto: 'Elegí materia y comisión en tres pasos.', accion: '<a class="btn btn-primario btn-chico" href="#/inscripcion">Inscribirme</a>' });
    }
    if (pendientes.length) tareas.push({ ico: 'reloj', titulo: `${plural(pendientes.length, 'solicitud', 'solicitudes')} de inscripción en revisión`,
      texto: 'Te avisamos cuando la administración responda.', accion: '<a class="btn btn-secundario btn-chico" href="#/perfil/cursada">Ver</a>' });
    if (enRevision.length) tareas.push({ ico: 'tramite', titulo: `${plural(enRevision.length, 'constancia', 'constancias')} en revisión`,
      texto: 'Cuando esté lista te llega por correo y la descargás desde Trámites.', accion: '<a class="btn btn-secundario btn-chico" href="#/perfil/tramites">Ver</a>' });
    noLeidas.slice(0, 3).forEach(n => tareas.push({ ico: 'campana', titulo: esc(n.titulo), texto: `${esc(n.texto)} <span class="tenue">· ${hace(n.fecha)}</span>`,
      accion: `<button class="btn btn-secundario btn-chico" onclick="App.abrirNotificacion(${n.id})">Ver</button>` }));

    const materias = activas.length ? `<ul class="filas-materia">${activas.map(i => `<li>
        <div><b>${esc(i.comision.materia.nombre)}</b>${datosConIcono([['reloj', horarioLargo(i.comision)], ['aula', `Aula ${esc(i.comision.aula)}`]])}</div>
        ${badgeInscripcion(i.estado)}</li>`).join('')}</ul>
        <a class="enlace-flecha" href="#/perfil/cursada">Ver notas, asistencia y avisos ${icono('flecha')}</a>`
      : vacio('Todavía no cursás materias', 'Cuando te inscribas, las vas a ver acá.', e.estaHabilitado() ? '<a class="btn btn-primario" href="#/inscripcion">Inscribirme a una materia</a>' : '');

    main.innerHTML = encabezado(`Hola, ${esc(primerNombre(e))}`, car ? `Estás cursando ${esc(car.nombre)}.` : 'No tenés una carrera activa.')
      + `<div class="inicio">
        <div class="columna">
          ${seccion('Para hacer', '', listaTareas(tareas))}
          ${seccion('Tus materias', `${PERIODO.nombre}`, `<div class="panel">${materias}</div>`)}
        </div>
        <div class="columna">
          ${seccion('Tu semana', '', `<div class="panel">${grillaSemanal(itemsDeInscripciones(activas), null, true)}${referenciasGrilla(false)}</div>`)}
        </div>
      </div>`;
  },

  // ---------- Mi cursada ----------
  cursada(main) {
    const e = this.e;
    const activas = e.consultarInscripciones().filter(i => i.estaActiva()).sort((a, b) => b.fecha - a.fecha);
    const historial = e.consultarHistorial().sort((a, b) => b.fecha - a.fecha);
    const otras = e.consultarInscripciones().filter(i => [EstadoInscripcion.RECHAZADA, EstadoInscripcion.CANCELADA].includes(i.estado)).sort((a, b) => b.fecha - a.fecha);

    const tarjeta = i => {
      const c = i.comision;
      const asis = i.porcentajeAsistencia();
      const notas = Object.values(TipoCalificacion).map(tp => {
        const cal = i.getCalificacion(tp);
        return `<div class="nota ${cal ? '' : 'sin'}"><span>${etiquetaCorta(tp)}</span><b>${cal ? cal.nota : '—'}</b></div>`;
      }).join('');
      let cuerpo;
      if (i.estaEnCurso()) {
        cuerpo = `<div class="bloque-dato"><h4>Notas</h4><div class="notas">${notas}</div></div>
          <div class="bloque-dato"><h4>Asistencia</h4>${asis === null ? '<p class="tenue chico">Todavía no hay clases registradas.</p>'
            : `<div class="asistencia"><span class="barra-progreso"><i style="width:${asis}%"></i></span><b>${asis}%</b><span class="tenue chico">${i.asistencias.filter(a => a.presente).length} de ${i.asistencias.length} clases</span></div>`}</div>`;
      } else {
        cuerpo = `<p class="nota-estado">${i.estado === EstadoInscripcion.PENDIENTE
          ? 'La administración está revisando tu solicitud. Te avisamos cuando responda.'
          : 'Tu lugar está confirmado. Las notas y la asistencia aparecen cuando empiece la cursada.'}</p>`;
      }
      const avisos = c.contenidos.length ? desplegable('Avisos del docente', `<ul class="avisos-materia">${c.contenidos.map(k =>
        `<li><b>${esc(k.titulo)}</b> <span class="tenue chico">${fmtFecha(k.fechaPublicacion)}</span><br>${esc(k.descripcion)}</li>`).join('')}</ul>`, { contador: c.contenidos.length, simple: true }) : '';
      return `<article class="panel materia-card">
        <header><h3>${esc(c.materia.nombre)}</h3>${badgeInscripcion(i.estado)}</header>
        ${datosConIcono([['reloj', horarioLargo(c)], ['aula', `Aula ${esc(c.aula)} · ${c.codigo}`], ['persona', esc(c.docente.nombreCorto())]])}
        ${cuerpo}
        ${avisos}
        <footer>
          ${[EstadoInscripcion.PENDIENTE, EstadoInscripcion.APROBADA].includes(i.estado) ? `<button class="btn btn-peligro btn-chico" onclick="VistaEstudiante.cancelar('${i.comprobante}')">Cancelar inscripción</button>` : ''}
          ${i.estaEnCurso() ? `<a class="btn btn-secundario btn-chico" href="#/perfil/tramites" onclick="VistaEstudiante.preTramite='${i.comprobante}'">Pedir constancia de examen</a>` : ''}
          <span class="chico tenue comprobante-txt">Comprobante ${i.comprobante}</span>
        </footer>
      </article>`;
    };

    const tablaHistorial = historial.length ? `<div class="tabla-contenedor"><table class="tabla">
        <thead><tr><th>Materia</th><th>Año</th><th>Nota final</th><th>Resultado</th></tr></thead>
        <tbody>${historial.map(i => `<tr><td class="fuerte">${esc(i.comision.materia.nombre)}</td><td>${i.fecha.getFullYear()}</td>
          <td>${i.notaFinal() ?? '—'}</td><td>${i.estaAprobada() ? badge(['Aprobada', 'b-ok']) : badge(['Desaprobada', 'b-err'])}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="tenue">Todavía no tenés materias finalizadas.</p>';
    const tablaOtras = `<div class="tabla-contenedor"><table class="tabla">
        <thead><tr><th>Materia</th><th>Fecha</th><th>Estado</th><th>Motivo</th></tr></thead>
        <tbody>${otras.map(i => `<tr><td>${esc(i.comision.materia.nombre)} <span class="tenue chico">${i.comision.codigo}</span></td><td>${fmtFecha(i.fecha)}</td>
          <td>${badgeInscripcion(i.estado)}</td><td class="chico">${esc(i.motivoRechazo || '—')}</td></tr>`).join('')}</tbody></table></div>`;

    main.innerHTML = encabezado('Mi cursada', 'Tus materias de este cuatrimestre con notas, asistencia y avisos.',
        e.estaHabilitado() ? '<a class="btn btn-primario" href="#/inscripcion">Nueva inscripción</a>' : '')
      + seccion('Este cuatrimestre', '', activas.length ? `<div class="tarjetas">${activas.map(tarjeta).join('')}</div>`
          : `<div class="panel">${vacio('No estás cursando materias', 'Cuando te inscribas, vas a ver acá tus notas, asistencia y avisos.', e.estaHabilitado() ? '<a class="btn btn-primario" href="#/inscripcion">Inscribirme</a>' : '')}</div>`)
      + seccion('Historial académico', `${plural(historial.filter(i => i.estaAprobada()).length, 'materia aprobada', 'materias aprobadas')}.`, `<div class="panel">${tablaHistorial}</div>`)
      + (otras.length ? `<div class="seccion">${desplegable('Solicitudes rechazadas o canceladas', tablaOtras, { contador: otras.length })}</div>` : '');
  },

  async cancelar(comprobante) {
    const i = this.e.inscripciones.find(x => x.comprobante === comprobante);
    const ok = await Dialogo.abrir({
      titulo: 'Cancelar inscripción',
      texto: `Vas a cancelar tu inscripción a <b>${esc(i.comision.materia.nombre)}</b> (${i.comision.codigo}). El lugar queda libre para otra persona.`,
      aceptar: 'Cancelar inscripción', cancelar: 'Mantener', peligro: true,
    });
    if (!ok) return;
    intentar(() => this.e.cancelarInscripcion(i), `Cancelaste tu inscripción a ${i.comision.materia.nombre}.`);
    App.navegar();
  },

  // ---------- Trámites ----------
  preTramite: null,
  tramites(main) {
    const e = this.e;
    const enCurso = e.inscripciones.filter(i => i.estaEnCurso());
    const pre = this.preTramite; this.preTramite = null;

    const item = c => {
      let estadoTxt, acciones = '';
      if (c.estaDisponible()) {
        estadoTxt = c.fechaEnvio ? `Te la enviamos a tu correo el ${fmtFecha(c.fechaEnvio)}.` : 'Lista para descargar.';
        acciones = `<button class="btn btn-secundario btn-chico" onclick="VistaEstudiante.descargar('${c.numero}')">${icono('descargar')} Descargar PDF</button>
          <button class="btn-texto chico" onclick="VistaEstudiante.descargar('${c.numero}', true)">Ver</button>`;
      } else if (c.estado === EstadoCertificado.RECHAZADO) estadoTxt = `Motivo: ${esc(c.motivoRechazo)}.`;
      else estadoTxt = 'La administración la está revisando.';
      return `<li class="tramite">
        <div class="tramite-cabeza"><b>${c.tipo === TipoCertificado.EXAMEN ? 'Constancia de examen' : 'Constancia de alumno regular'}</b>${badgeCertificado(c.estado)}</div>
        <p class="chico tenue">${c.numero} · pedida el ${fmtFecha(c.fechaSolicitud)}${c.inscripcion ? ` · ${esc(c.inscripcion.comision.materia.nombre)}` : ''}</p>
        <p class="chico">${estadoTxt}</p>
        ${acciones ? `<div class="acciones">${acciones}</div>` : ''}
      </li>`;
    };

    const form = e.estaHabilitado() ? `<form class="formulario" onsubmit="event.preventDefault(); VistaEstudiante.solicitar(this)">
        <fieldset class="opciones-radio">
          <legend>¿Qué constancia necesitás?</legend>
          <label class="opcion"><input type="radio" name="tipo" value="ALUMNO_REGULAR" ${pre ? '' : 'checked'} onchange="VistaEstudiante.tipoTramite(this.value)">
            <span><b>Alumno regular</b><small>Certifica que cursás este cuatrimestre.</small></span></label>
          <label class="opcion"><input type="radio" name="tipo" value="EXAMEN" ${pre ? 'checked' : ''} ${enCurso.length ? '' : 'disabled'} onchange="VistaEstudiante.tipoTramite(this.value)">
            <span><b>Examen</b><small>${enCurso.length ? 'Justifica que rendiste un examen de una materia en curso.' : 'Necesitás una materia en curso.'}</small></span></label>
        </fieldset>
        <div id="camposExamen" class="formulario ${pre ? '' : 'oculto'}">
          <div class="campo"><label for="tMateria">Materia</label>
            <select id="tMateria" name="materia">${enCurso.map(i => `<option value="${i.comprobante}" ${i.comprobante === pre ? 'selected' : ''}>${esc(i.comision.materia.nombre)} (${i.comision.codigo})</option>`).join('')}</select></div>
          <div class="campo"><label for="tFecha">Fecha del examen</label><input id="tFecha" name="fecha" type="date" max="${valorFecha(new Date())}"></div>
        </div>
        <div class="campo"><label for="tAnte">Para presentar ante <span class="opcional">(opcional)</span></label>
          <input id="tAnte" name="ante" placeholder="Por ejemplo, el nombre de tu trabajo"><small>Si lo dejás vacío dice «quien corresponda».</small></div>
        <button class="btn btn-primario">Enviar solicitud</button>
      </form>` : aviso('err', 'No podés pedir constancias', ' Tu cuenta no está habilitada.', 'RN1');

    main.innerHTML = encabezado('Trámites', `Pedí constancias y descargalas cuando estén listas. La administración las revisa y te llegan por correo a ${esc(e.email)}.`)
      + `<div class="tramites">
        ${seccion('Pedir una constancia', 'Elegí el tipo y enviá la solicitud.', `<div class="panel">${form}</div>`)}
        ${seccion('Mis trámites', plural(e.certificados.length, 'solicitud', 'solicitudes'),
          e.certificados.length ? `<ul class="lista-tramites">${e.certificados.map(item).join('')}</ul>` : `<div class="panel">${vacio('Todavía no pediste constancias', 'Cuando pidas una, vas a seguir su estado acá.')}</div>`)}
      </div>`;
  },

  tipoTramite(v) { $('camposExamen').classList.toggle('oculto', v !== 'EXAMEN'); },

  solicitar(f) {
    const tipo = f.tipo.value;
    const ins = tipo === 'EXAMEN' ? this.e.inscripciones.find(i => i.comprobante === f.materia.value) : null;
    const c = intentar(() => TramiteController.solicitarConstancia(this.e, tipo, ins, f.ante.value.trim(), tipo === 'EXAMEN' ? leerFecha(f.fecha.value) : null),
      c => `Enviamos tu solicitud ${c.numero}. Te avisamos cuando esté lista.`);
    if (c) App.navegar();
  },

  descargar(numero, abrir) {
    const c = this.e.certificados.find(x => x.numero === numero);
    ConstanciaPDF.descargar(c, abrir);
  },

  // ---------- Notificaciones ----------
  notificaciones(main) { paginaNotificaciones(main, this.e); },

  // ---------- Mi perfil ----------
  datos(main) {
    const e = this.e, mat = e.getMatriculaActiva();
    main.innerHTML = `<section class="perfil-cabeza">
        <span class="avatar grande">${iniciales(e)}</span>
        <div><h1>${esc(e.nombre)} ${esc(e.apellido)}</h1><p>Legajo ${e.legajo} ${badgeEstudiante(e.estado)}</p></div>
      </section>
      <div class="dos-col">
        <div class="columna">
          ${seccion('Datos académicos', '', `<div class="panel"><dl class="datos">
            <div><dt>DNI</dt><dd>${fmtDni(e.dni)}</dd></div>
            <div><dt>Legajo</dt><dd>${e.legajo}</dd></div>
            <div><dt>Fecha de nacimiento</dt><dd>${fmtFecha(e.fechaNacimiento)}</dd></div>
            <div><dt>Ingreso a la carrera</dt><dd>${mat ? fmtFecha(mat.fechaIngreso) : '—'}</dd></div>
            <div style="grid-column:1/-1"><dt>Carrera</dt><dd>${esc(mat ? mat.carrera.nombre : '—')}</dd></div>
            ${e.matriculas.length > 1 ? `<div style="grid-column:1/-1"><dt>Otras carreras</dt><dd>${e.matriculas.filter(m => !m.esActiva()).map(m => `${esc(m.carrera.nombre)} (${m.estado.toLowerCase()})`).join(', ')}</dd></div>` : ''}
          </dl></div>`)}
          ${seccion('Contacto', 'A este correo te llegan las constancias.', `<div class="panel">
            <form class="formulario" onsubmit="event.preventDefault(); VistaEstudiante.guardarContacto(this)">
              <div class="campo"><label for="pEmail">Correo electrónico</label><input id="pEmail" name="email" type="email" value="${esc(e.email)}" required></div>
              <div class="campo"><label for="pTel">Teléfono <span class="opcional">(opcional)</span></label><input id="pTel" name="telefono" value="${esc(e.telefono)}" placeholder="11 5555-0000"></div>
              <button class="btn btn-secundario">Guardar contacto</button>
            </form></div>`)}
        </div>
        <div class="columna">${seccion('Contraseña', '', formularioClave('VistaEstudiante'))}</div>
      </div>`;
  },

  guardarContacto(f) {
    const email = f.email.value.trim();
    intentar(() => {
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('El correo no es válido.');
      this.e.email = email;
      this.e.telefono = f.telefono.value.trim();
    }, 'Guardamos tus datos de contacto.');
  },
  cambiarClave(f) { cambiarClave(this.e, f); },
};

// ---------- Compartido por los tres roles ----------
const etiquetaCorta = tipo => ({ PARCIAL: 'Parcial', TP: 'TP', RECUPERATORIO: 'Recup.', FINAL: 'Final' }[tipo] || tipo);

function paginaNotificaciones(main, usuario) {
  const lista = Notificador.de(usuario);
  const nuevas = lista.filter(n => !n.leida);
  const leidas = lista.filter(n => n.leida);
  main.innerHTML = encabezado('Notificaciones', 'Avisos sobre tus trámites, inscripciones, notas y novedades. Tocá una para ir a su detalle.',
      nuevas.length ? '<button class="btn btn-secundario" onclick="App.marcarTodas()">Marcar todas como leídas</button>' : '')
    + seccion('Sin leer', '', `<div class="panel">${nuevas.length ? listaNotificaciones(nuevas) : '<p class="tenue">No tenés notificaciones nuevas.</p>'}</div>`)
    + (leidas.length ? `<div class="seccion">${desplegable('Leídas', listaNotificaciones(leidas), { contador: leidas.length })}</div>` : '');
}

function formularioClave(vista) {
  return `<div class="panel">
    <form class="formulario" onsubmit="event.preventDefault(); ${vista}.cambiarClave(this)">
      <div class="campo"><label for="cActual">Contraseña actual</label><input id="cActual" name="actual" type="password" autocomplete="current-password" required></div>
      <div class="campo"><label for="cNueva">Contraseña nueva</label><input id="cNueva" name="nueva" type="password" autocomplete="new-password" minlength="6" required><small>Al menos 6 caracteres.</small></div>
      <div class="campo"><label for="cRepetir">Repetí la contraseña nueva</label><input id="cRepetir" name="repetir" type="password" autocomplete="new-password" required></div>
      <button class="btn btn-secundario">Cambiar contraseña</button>
    </form></div>`;
}
function cambiarClave(usuario, f) {
  if (intentar(() => Sesion.cambiarPassword(usuario, f.actual.value, f.nueva.value, f.repetir.value), 'Cambiaste tu contraseña.')) f.reset();
}
