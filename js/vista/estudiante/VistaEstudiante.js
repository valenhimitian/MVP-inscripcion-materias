/* =====================================================================
   VISTAS DEL ESTUDIANTE
   Inicio y Mi perfil, con pestañas: Datos, Cursada, Trámites y
   Notificaciones. La inscripción está en PantallaInscripcion.
   ===================================================================== */

const VistaEstudiante = {
  get e() { return App.sesion.usuario; },

  // ---------- Inicio ----------
  inicio(main) {
    const e = this.e;
    const activas = e.consultarInscripciones().filter(i => i.estaActiva());
    const habilitado = e.estaHabilitado();
    const tramitesAbiertos = e.certificados.filter(c => c.estado === EstadoCertificado.SOLICITADO).length;
    const listas = e.certificados.filter(c => c.estaDisponible()).length;

    main.innerHTML = encabezado(`Hola, ${esc(primerNombre(e))}`,
      habilitado ? `La inscripción del ${PERIODO.nombre} está abierta hasta el ${fmtFechaLarga(PERIODO.cierreInscripcion)}.`
                 : 'Tu cuenta no está habilitada para inscribirte ni pedir constancias.')
    + (habilitado ? '' : aviso('err', 'Tu cuenta no está habilitada',
        ` Estado: ${ETIQUETA_ESTUDIANTE[e.estado][0].toLowerCase()}. Acercate a la administración académica para regularizar tu situación.`, 'E2 · RN1'))
    + `<div class="inicio" style="${habilitado ? '' : 'margin-top:var(--e4)'}">
        <section class="panel">
          <div class="panel-titulo"><h2>Tu semana</h2><p>${plural(activas.length, 'materia', 'materias')} en tu horario</p></div>
          ${grillaSemanal(itemsDeInscripciones(activas))}
          ${referenciasGrilla(false)}
        </section>
        <div class="lado">
          ${habilitado ? `<section class="panel llamado">
            <h2>Inscribite a una materia</h2>
            <p>Te mostramos las materias de tu carrera con comisiones, docentes, horarios y cupos.</p>
            <a class="btn btn-primario" href="#/inscripcion">Empezar inscripción</a>
          </section>` : ''}
          <section class="panel">
            <div class="panel-titulo"><h2>Trámites</h2><a class="chico" href="#/perfil/tramites">Ver todos</a></div>
            <p class="tenue chico" style="margin-bottom:var(--e3)">${tramitesAbiertos ? plural(tramitesAbiertos, 'constancia en revisión', 'constancias en revisión') : 'No tenés constancias en revisión'}${listas ? ` · ${plural(listas, 'lista para descargar', 'listas para descargar')}` : ''}.</p>
            <a class="btn btn-secundario" href="#/perfil/tramites">Pedir una constancia</a>
          </section>
          <section class="panel">
            <div class="panel-titulo"><h2>Novedades</h2><a class="chico" href="#/perfil/notificaciones">Ver todas</a></div>
            ${listaNotificaciones(Notificador.de(e), 4)}
          </section>
        </div>
      </div>`;
  },

  // ---------- Perfil: encabezado y pestañas ----------
  cabecera() {
    const e = this.e, car = e.getCarreraActiva();
    const n = Notificador.sinLeer(e);
    return `<section class="perfil-cabeza">
        <span class="avatar grande">${iniciales(e)}</span>
        <div><h1>${esc(e.nombre)} ${esc(e.apellido)}</h1>
          <p>Legajo ${e.legajo} · ${esc(car ? car.nombre : 'Sin carrera activa')} · ${badgeEstudiante(e.estado)}</p></div>
      </section>` + pestanas([
        ['#/perfil', 'Datos'], ['#/perfil/cursada', 'Cursada'], ['#/perfil/tramites', 'Trámites'],
        ['#/perfil/notificaciones', 'Notificaciones', n],
      ]);
  },

  // ---------- Datos personales ----------
  datos(main) {
    const e = this.e, mat = e.getMatriculaActiva();
    main.innerHTML = this.cabecera() + `<div class="dos-col">
      <section class="panel">
        <div class="panel-titulo"><h2>Datos personales</h2></div>
        <dl class="datos">
          <div><dt>Nombre</dt><dd>${esc(e.nombre)} ${esc(e.apellido)}</dd></div>
          <div><dt>DNI</dt><dd>${fmtDni(e.dni)}</dd></div>
          <div><dt>Legajo</dt><dd>${e.legajo}</dd></div>
          <div><dt>Fecha de nacimiento</dt><dd>${fmtFecha(e.fechaNacimiento)}</dd></div>
          <div><dt>Carrera</dt><dd>${esc(mat ? mat.carrera.nombre : '—')}</dd></div>
          <div><dt>Ingreso</dt><dd>${mat ? fmtFecha(mat.fechaIngreso) : '—'}</dd></div>
        </dl>
        ${e.matriculas.length > 1 ? `<p class="chico tenue" style="margin-top:var(--e4)">Otras carreras: ${e.matriculas.filter(m => !m.esActiva()).map(m => `${esc(m.carrera.nombre)} (${m.estado.toLowerCase()})`).join(', ')}</p>` : ''}
        <form class="formulario" style="margin-top:var(--e5)" onsubmit="event.preventDefault(); VistaEstudiante.guardarContacto(this)">
          <h3>Contacto</h3>
          <div class="campo"><label for="pEmail">Correo electrónico</label><input id="pEmail" name="email" type="email" value="${esc(e.email)}" required></div>
          <div class="campo"><label for="pTel">Teléfono</label><input id="pTel" name="telefono" value="${esc(e.telefono)}" placeholder="11 5555-0000"></div>
          <button class="btn btn-secundario">Guardar contacto</button>
        </form>
      </section>
      ${formularioClave('VistaEstudiante')}
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

  // ---------- Cursada ----------
  cursada(main) {
    const e = this.e;
    const activas = e.consultarInscripciones().filter(i => i.estaActiva()).sort((a, b) => b.fecha - a.fecha);
    const historial = e.consultarHistorial().sort((a, b) => b.fecha - a.fecha);
    const otras = e.consultarInscripciones().filter(i => [EstadoInscripcion.RECHAZADA, EstadoInscripcion.CANCELADA].includes(i.estado)).sort((a, b) => b.fecha - a.fecha);

    const tarjeta = i => {
      const c = i.comision;
      const notas = Object.values(TipoCalificacion).map(tp => {
        const cal = i.getCalificacion(tp);
        return `<div class="nota ${cal ? '' : 'sin'}"><span>${etiquetaTipo(tp)}</span><b>${cal ? cal.nota : '—'}</b></div>`;
      }).join('');
      const asis = i.porcentajeAsistencia();
      const avisos = c.contenidos.slice(0, 2).map(k => `<li><b>${esc(k.titulo)}</b> <span class="tenue">${fmtFecha(k.fechaPublicacion)}</span><br>${esc(k.descripcion)}</li>`).join('');
      return `<article class="panel materia-card">
        <header>
          <div><h3>${esc(c.materia.nombre)}</h3>
            <p class="tenue chico">${c.codigo} · ${c.horario()} · Aula ${esc(c.aula)} · ${esc(c.docente.nombreCorto())}</p></div>
          ${badgeInscripcion(i.estado)}
        </header>
        ${i.estaEnCurso() ? `<div class="notas">${notas}<div class="nota"><span>Asistencia</span><b>${asis === null ? '—' : asis + '%'}</b></div></div>`
          : `<p class="chico tenue">${i.estado === EstadoInscripcion.PENDIENTE ? 'Tu solicitud está en revisión por la administración.' : 'Inscripción aprobada. Las notas aparecen cuando empiece la cursada.'}</p>`}
        ${avisos ? `<ul class="avisos-materia">${avisos}</ul>` : ''}
        <div class="acciones">
          ${[EstadoInscripcion.PENDIENTE, EstadoInscripcion.APROBADA].includes(i.estado) ? `<button class="btn btn-peligro btn-chico" onclick="VistaEstudiante.cancelar('${i.comprobante}')">Cancelar inscripción</button>` : ''}
          ${i.estaEnCurso() ? `<a class="btn btn-secundario btn-chico" href="#/perfil/tramites" onclick="VistaEstudiante.preTramite='${i.comprobante}'">Pedir constancia de examen</a>` : ''}
          <span class="chico tenue">Comprobante ${i.comprobante}</span>
        </div>
      </article>`;
    };

    main.innerHTML = this.cabecera() + `
      <section>
        <div class="panel-titulo"><h2>Este cuatrimestre</h2>${e.estaHabilitado() ? '<a class="btn btn-primario btn-chico" href="#/inscripcion">Nueva inscripción</a>' : ''}</div>
        ${activas.length ? `<div class="tarjetas">${activas.map(tarjeta).join('')}</div>`
          : `<div class="panel">${vacio('No estás cursando materias', 'Cuando te inscribas, vas a ver acá tus notas, asistencia y avisos.', e.estaHabilitado() ? '<a class="btn btn-primario" href="#/inscripcion">Inscribirme</a>' : '')}</div>`}
      </section>
      <section class="panel" style="margin-top:var(--e5)">
        <div class="panel-titulo"><h2>Historial académico</h2><p>${plural(historial.filter(i => i.estaAprobada()).length, 'materia aprobada', 'materias aprobadas')}</p></div>
        ${historial.length ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Materia</th><th>Comisión</th><th>Año</th><th>Nota final</th><th>Resultado</th></tr></thead>
          <tbody>${historial.map(i => `<tr><td class="fuerte">${esc(i.comision.materia.nombre)}</td><td>${i.comision.codigo}</td><td>${i.fecha.getFullYear()}</td>
            <td>${i.notaFinal() ?? '—'}</td><td>${i.estaAprobada() ? badge(['Aprobada', 'b-ok']) : badge(['Desaprobada', 'b-err'])}</td></tr>`).join('')}</tbody></table></div>`
          : '<p class="tenue">Todavía no tenés materias finalizadas.</p>'}
      </section>
      ${otras.length ? `<section class="panel">
        <div class="panel-titulo"><h2>Solicitudes rechazadas o canceladas</h2></div>
        <div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>Materia</th><th>Comisión</th><th>Fecha</th><th>Estado</th><th>Motivo</th></tr></thead>
          <tbody>${otras.map(i => `<tr><td>${esc(i.comision.materia.nombre)}</td><td>${i.comision.codigo}</td><td>${fmtFecha(i.fecha)}</td>
            <td>${badgeInscripcion(i.estado)}</td><td class="chico">${esc(i.motivoRechazo || '—')}</td></tr>`).join('')}</tbody></table></div>
      </section>` : ''}`;
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
    const fila = c => {
      let accion = '';
      if (c.estaDisponible()) accion = `<button class="btn btn-secundario btn-chico" onclick="VistaEstudiante.descargar('${c.numero}')">${icono('descargar')} Descargar PDF</button>
        <button class="btn-texto chico" onclick="VistaEstudiante.descargar('${c.numero}', true)">Ver</button>`;
      else if (c.estado === EstadoCertificado.RECHAZADO) accion = `<span class="chico">${esc(c.motivoRechazo)}</span>`;
      else accion = '<span class="chico tenue">La administración la está revisando</span>';
      return `<tr>
        <td class="codigo">${c.numero}</td>
        <td><span class="fuerte">${c.tipo === TipoCertificado.EXAMEN ? 'Constancia de examen' : 'Alumno regular'}</span>
          ${c.inscripcion ? `<br><span class="chico tenue">${esc(c.inscripcion.comision.materia.nombre)}</span>` : ''}</td>
        <td>${fmtFecha(c.fechaSolicitud)}</td>
        <td>${badgeCertificado(c.estado)}${c.fechaEnvio ? `<br><span class="chico tenue">Enviada a tu correo el ${fmtFecha(c.fechaEnvio)}</span>` : ''}</td>
        <td><div class="acciones">${accion}</div></td></tr>`;
    };

    const form = e.estaHabilitado() ? `<form class="formulario" onsubmit="event.preventDefault(); VistaEstudiante.solicitar(this)">
        <fieldset class="opciones-radio">
          <legend>¿Qué constancia necesitás?</legend>
          <label class="opcion"><input type="radio" name="tipo" value="ALUMNO_REGULAR" ${pre ? '' : 'checked'} onchange="VistaEstudiante.tipoTramite(this.value)">
            <span><b>Alumno regular</b><small>Certifica que cursás este cuatrimestre.</small></span></label>
          <label class="opcion"><input type="radio" name="tipo" value="EXAMEN" ${pre ? 'checked' : ''} ${enCurso.length ? '' : 'disabled'} onchange="VistaEstudiante.tipoTramite(this.value)">
            <span><b>Examen</b><small>${enCurso.length ? 'Justifica que rendiste un examen de una materia en curso.' : 'Necesitás una materia en curso.'}</small></span></label>
        </fieldset>
        <div id="camposExamen" class="${pre ? '' : 'oculto'}">
          <div class="campo"><label for="tMateria">Materia</label>
            <select id="tMateria" name="materia">${enCurso.map(i => `<option value="${i.comprobante}" ${i.comprobante === pre ? 'selected' : ''}>${esc(i.comision.materia.nombre)} · ${i.comision.codigo}</option>`).join('')}</select></div>
          <div class="campo"><label for="tFecha">Fecha del examen</label><input id="tFecha" name="fecha" type="date" max="${valorFecha(new Date())}"></div>
        </div>
        <div class="campo"><label for="tAnte">Para presentar ante</label>
          <input id="tAnte" name="ante" placeholder="Por ejemplo, el nombre de tu trabajo"><small>Si lo dejás vacío dice «quien corresponda».</small></div>
        <button class="btn btn-primario">Enviar solicitud</button>
        <p class="chico tenue" style="margin-top:var(--e3)">La revisa la administración académica. Cuando la apruebe, te llega por correo a ${esc(e.email)} y la podés descargar desde acá.</p>
      </form>` : aviso('err', 'No podés pedir constancias', ' Tu cuenta no está habilitada.', 'RN1');

    main.innerHTML = this.cabecera() + `<div class="tramites">
      <section class="panel"><div class="panel-titulo"><h2>Pedir una constancia</h2></div>${form}</section>
      <section class="panel">
        <div class="panel-titulo"><h2>Mis trámites</h2><p>${plural(e.certificados.length, 'solicitud', 'solicitudes')}</p></div>
        ${e.certificados.length ? `<div class="tabla-contenedor"><table class="tabla">
          <thead><tr><th>N.º</th><th>Constancia</th><th>Pedida</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>${e.certificados.map(fila).join('')}</tbody></table></div>`
          : vacio('Todavía no pediste constancias', 'Cuando pidas una, vas a seguir su estado acá.')}
      </section></div>`;
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
  notificaciones(main) {
    const lista = Notificador.de(this.e);
    main.innerHTML = this.cabecera() + `<section class="panel">
      <div class="panel-titulo"><h2>Notificaciones</h2>
        ${lista.some(n => !n.leida) ? '<button class="btn btn-secundario btn-chico" onclick="App.marcarTodas()">Marcar todas como leídas</button>' : ''}</div>
      ${listaNotificaciones(lista)}
    </section>`;
  },
};

// ---------- Compartido por los tres roles ----------
function formularioClave(vista) {
  return `<section class="panel">
    <form class="formulario" onsubmit="event.preventDefault(); ${vista}.cambiarClave(this)">
      <h2>Cambiar contraseña</h2>
      <div class="campo"><label for="cActual">Contraseña actual</label><input id="cActual" name="actual" type="password" autocomplete="current-password" required></div>
      <div class="campo"><label for="cNueva">Contraseña nueva</label><input id="cNueva" name="nueva" type="password" autocomplete="new-password" minlength="6" required><small>Al menos 6 caracteres.</small></div>
      <div class="campo"><label for="cRepetir">Repetí la contraseña nueva</label><input id="cRepetir" name="repetir" type="password" autocomplete="new-password" required></div>
      <button class="btn btn-secundario">Cambiar contraseña</button>
    </form></section>`;
}
function cambiarClave(usuario, f) {
  if (intentar(() => Sesion.cambiarPassword(usuario, f.actual.value, f.nueva.value, f.repetir.value), 'Cambiaste tu contraseña.')) f.reset();
}
