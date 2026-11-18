/* =====================================================================
   PANTALLA («boundary») – PantallaInscripcion y panel de administración
   Solo muestra datos y recoge acciones: las reglas las resuelven el
   controlador y las entidades.
   ===================================================================== */

let estudiante = null, carrera = null, materiaSel = null, comisionSel = null;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fecha = d => d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ---------- Etiquetas de estado ----------
const ETIQUETA_INSCRIPCION = {
  PENDIENTE: ['Pendiente', 'b-warn'], APROBADA: ['Aprobada', 'b-ok'], RECHAZADA: ['Rechazada', 'b-err'],
  EN_CURSO: ['En curso', 'b-info'], FINALIZADA: ['Finalizada', 'b-neutro'], CANCELADA: ['Cancelada', 'b-neutro'],
};
const badgeInscripcion = e => `<span class="badge ${ETIQUETA_INSCRIPCION[e][1]}">${ETIQUETA_INSCRIPCION[e][0]}</span>`;
function badgeComision(c) {
  if (c.estado === EstadoComision.ABIERTA) return `<span class="badge b-ok">Abierta (${c.cupoDisponible}/${c.cupoMaximo})</span>`;
  if (c.estado === EstadoComision.COMPLETA) return `<span class="badge b-err">Completa (0/${c.cupoMaximo})</span>`;
  return `<span class="badge b-neutro">Fuera de período</span>`;
}
function badgeEstudiante(e) {
  const cls = e === EstadoEstudiante.HABILITADO ? 'b-ok' : (e === EstadoEstudiante.EGRESADO ? 'b-info' : 'b-err');
  return `<span class="badge ${cls}">${e}</span>`;
}

// ---------- Navegación ----------
function mostrarVista(v) {
  ['est', 'adm', 'esc'].forEach(x => { $('v-' + x).classList.toggle('oculto', x !== v); $('tab-' + x).classList.toggle('act', x === v); });
  if (v === 'adm') renderAdmin();
  if (v === 'est' && estudiante) { renderMisInscripciones(); if (materiaSel) renderComisiones(); }
}
function alternarTraza() {
  const visible = $('colTraza').classList.toggle('oculto') === false;
  $('grid').classList.toggle('con-traza', visible);
  $('btnTraza').textContent = visible ? 'Ocultar secuencia (DS01)' : 'Mostrar secuencia (DS01)';
}
function renderTraza() {
  const cls = x => x === true ? 't-ok' : x === false ? 't-err' : x ? 't-' + x : '';
  $('traza').innerHTML = Traza.lineas.length ? Traza.lineas.map(l => `<div class="${cls(l.tipo)}">${esc(l.texto)}</div>`).join('') : 'Ingrese con un estudiante para ver la secuencia.';
  $('traza').scrollTop = 1e6;
}
function marcarPaso(n) {
  [1, 2, 3].forEach(i => { $('p' + i).className = i < n ? 'hecho' : (i === n ? 'actual' : ''); });
}

// ---------- Ingreso ----------
function llenarEstudiantes() {
  $('selEstudiante').innerHTML = D.estudiantes.map((e, k) =>
    `<option value="${k}">${esc(e.nombreCompleto())} – Legajo ${e.legajo} (${e.estado})</option>`).join('');
}
function ingresar() {
  estudiante = D.estudiantes[+$('selEstudiante').value];
  materiaSel = null; comisionSel = null;
  $('zonaEstudiante').classList.remove('oculto');
  $('btnSalir').disabled = false;
  $('exito').innerHTML = '';
  Traza.limpiar();
  t('1: seleccionarOpcion("Inscribirse a materia")', 'titulo');
  const r = InscripcionController.iniciarInscripcion(estudiante);
  carrera = r.carrera || estudiante.getCarreraActiva();
  $('chip').classList.remove('oculto');
  $('chipTxt').textContent = `${estudiante.nombre.split(' ')[0]} | ${carrera ? carrera.nombre.replace('Tecnicatura Universitaria en Web', 'Tecnicatura Web') : 'sin carrera'}`;
  renderContexto();
  if (!r.ok) {
    $('bloqueo').innerHTML = `<div class="msg err" style="margin:0 0 14px"><b>No es posible continuar (${r.codigo}):</b> ${esc(r.mensaje)} Su estado es ${badgeEstudiante(estudiante.estado)}. Comuníquese con el área administrativa.</div>`;
    $('asistente').classList.add('oculto');
  } else {
    $('bloqueo').innerHTML = '';
    $('asistente').classList.remove('oculto');
    cargarMaterias();
  }
  renderMisInscripciones();
  renderTraza();
}
function salir() {
  estudiante = null;
  $('zonaEstudiante').classList.add('oculto');
  $('chip').classList.add('oculto');
  $('btnSalir').disabled = true;
  Traza.limpiar(); renderTraza();
}
function renderContexto() {
  const e = estudiante;
  $('contexto').innerHTML = `<b>Estudiante:</b><span>${esc(e.nombreCompleto())}</span><b>Legajo:</b><span>${e.legajo}</span>
    <b>Carrera:</b><span>${carrera ? esc(carrera.nombre) : '—'}</span><b>Estado:</b><span>${badgeEstudiante(e.estado)}</span>`;
}

// ---------- Paso 1: materia ----------
function cargarMaterias() {
  const otras = $('chkOtraCarrera').checked;
  const lista = otras ? D.materias : carrera.consultarMaterias();
  $('selMateria').innerHTML = '<option value="">— Seleccione una materia —</option>' + lista.map(m => {
    const k = D.materias.indexOf(m);
    const ajena = !carrera.contieneMateria(m) ? ' · otra carrera' : '';
    return `<option value="${k}">${esc(m.nombre)} (Cod: ${m.codigo})${ajena}</option>`;
  }).join('');
  materiaSel = null; comisionSel = null;
  $('tablaComisiones').innerHTML = '<span class="muted">Primero seleccione una materia.</span>';
  $('mensajes').innerHTML = '';
  limpiarResumen();
  marcarPaso(1);
}
function elegirMateria() {
  const v = $('selMateria').value;
  if (v === '') { cargarMaterias(); return; }
  materiaSel = D.materias[+v];
  comisionSel = null;
  t(`12: seleccionarMateria(${materiaSel.nombre})`, 'titulo');
  const r = InscripcionController.obtenerComisiones(materiaSel);
  $('mensajes').innerHTML = r.hayAbiertas ? '' : '<div class="msg info">La materia no tiene comisiones abiertas (A4).</div>';
  renderComisiones();
  limpiarResumen();
  marcarPaso(2);
  renderTraza();
}

// ---------- Paso 2: comisiones ----------
function renderComisiones() {
  const coms = materiaSel.consultarComisionesDisponibles();
  if (!coms.length) { $('tablaComisiones').innerHTML = '<span class="muted">Sin comisiones.</span>'; return; }
  $('tablaComisiones').innerHTML = `<table>
    <tr><th>Sel.</th><th>Comisión</th><th>Día y Horario</th><th>Aula</th><th>Docente</th><th>Estado / Cupo</th></tr>
    ${coms.map((c, k) => {
      const seleccionable = c.estado === EstadoComision.ABIERTA;
      return `<tr class="clic ${comisionSel === c ? 'sel' : ''} ${seleccionable ? '' : 'nosel'}" onclick="elegirComision(${k})">
        <td><input type="radio" name="com" ${comisionSel === c ? 'checked' : ''} ${seleccionable ? '' : 'disabled'}></td>
        <td>${c.codigo}</td><td>${c.horario()}</td><td>${c.aula}</td><td>${c.docente}</td><td>${badgeComision(c)}</td></tr>`;
    }).join('')}
  </table>`;
}
function elegirComision(k) {
  comisionSel = materiaSel.consultarComisionesDisponibles()[k];
  t(`19: seleccionarComision(${comisionSel.codigo})`, 'titulo');
  const r = InscripcionController.validarRequisitos(estudiante, carrera, materiaSel, comisionSel);
  renderComisiones();
  const v = r.resultado, marca = x => x === null ? '— (no evaluada)' : (x ? '✔' : '✖');
  const resumenValidaciones = `<div class="msg info">Validaciones aplicadas: materia de su carrera ${marca(v.carrera)} · sin inscripción activa ${marca(v.inscripcion)} · correlativas ${marca(v.correlativas)} · cupo ${marca(v.cupo)}</div>`;
  if (!r.ok) {
    $('mensajes').innerHTML = `<div class="msg err"><b>No es posible continuar (${r.codigo}):</b> ${esc(r.mensaje)}</div>` + resumenValidaciones;
    comisionSel = null;
    renderComisiones();
    limpiarResumen();
    marcarPaso(2);
  } else {
    $('mensajes').innerHTML = resumenValidaciones;
    mostrarResumen();
    marcarPaso(3);
  }
  renderTraza();
}

// ---------- Paso 3: confirmación ----------
function limpiarResumen() {
  $('resumen').innerHTML = '<span class="muted">Se completa cuando la comisión elegida cumple todas las validaciones.</span>';
  $('btnConcurrencia').disabled = true;
}
function datosResumen(c, estado) {
  return `<div class="resumen">
    <div><b>Carrera:</b> ${esc(carrera.nombre)}</div><div><b>Materia:</b> ${esc(c.materia.nombre)}</div>
    <div><b>Comisión:</b> ${c.codigo} · Aula ${c.aula}</div><div><b>Día y horario:</b> ${c.horario()}</div>
    <div><b>Docente:</b> ${c.docente}</div><div><b>Estado:</b> ${estado}</div></div>`;
}
function mostrarResumen() {
  $('resumen').innerHTML = datosResumen(comisionSel, '<span class="muted">a confirmar</span>') +
    `<div class="acciones"><button class="btn gris" onclick="noConfirmar()">Cancelar</button>
     <button class="btn ok" onclick="confirmar()">Confirmar Inscripción</button></div>`;
  $('btnConcurrencia').disabled = false;
  t('32: mostrarResumen(resumen) y pedir confirmación');
}
function noConfirmar() {                                 // A8
  t('46: cancelar()  [el estudiante no confirma · A8]', 'titulo');
  t('47: mostrarComisiones(): no se registra nada');
  comisionSel = null;
  $('mensajes').innerHTML = '';
  renderComisiones(); limpiarResumen(); marcarPaso(2); renderTraza();
}
function confirmar() {
  t('33: confirmar()', 'titulo');
  const r = InscripcionController.confirmarInscripcion(estudiante, comisionSel);
  if (!r.ok) {
    $('mensajes').innerHTML = `<div class="msg err"><b>No es posible continuar (${r.codigo}):</b> ${esc(r.mensaje)} Elija otra comisión.</div>`;
    comisionSel = null;
    renderComisiones(); limpiarResumen(); marcarPaso(2);
  } else {
    const i = r.inscripcion;
    t(`45: mostrarConfirmacion(estado "Pendiente", ${i.comprobante})`, true);
    $('exito').innerHTML = `<div class="msg ok" style="margin:0 0 14px"><b>Éxito:</b> Solicitud registrada. Comprobante N° ${i.comprobante}.</div>`;
    $('resumen').innerHTML = datosResumen(i.comision, badgeInscripcion(i.estado)) +
      `<div class="acciones no-print"><button class="btn claro" onclick="window.print()">Imprimir comprobante</button>
       <button class="btn claro" onclick="nuevaInscripcion()">Nueva inscripción</button>
       <button class="btn pri" onclick="verMisInscripciones()">Ver mis inscripciones</button></div>`;
    $('mensajes').innerHTML = '';
    $('btnConcurrencia').disabled = true;
    comisionSel = null;
    renderComisiones();
    marcarPaso(3);
    renderMisInscripciones();
  }
  renderTraza();
}
function nuevaInscripcion() { $('exito').innerHTML = ''; $('selMateria').value = ''; cargarMaterias(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function verMisInscripciones() { $('misInscripciones').scrollIntoView({ behavior: 'smooth' }); }

// Panel de pruebas: otros estudiantes reservan los cupos restantes entre la validación y la confirmación
function simularConcurrencia() {
  const c = comisionSel;
  if (!c) return;
  let n = 0;
  while (c.reservarCupo()) n++;
  t(`[prueba] otros ${n} estudiante(s) reservaron cupo en ${c.codigo} → estado ${c.estado}`, 'estado');
  $('mensajes').innerHTML = `<div class="msg warn">Simulación: otros ${n} estudiante(s) ocuparon los cupos restantes de ${c.codigo}. Ahora confirme para ver qué hace el sistema.</div>`;
  renderTraza();
}

// ---------- Mis inscripciones ----------
function renderMisInscripciones() {
  const lista = estudiante.consultarInscripciones().slice().sort((a, b) => b.fecha - a.fecha);
  $('tablaMisInscripciones').innerHTML = lista.length ? `<table>
    <tr><th>Materia</th><th>Comisión</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr>
    ${lista.map(i => {
      let accion = '—';
      if (i.estado === EstadoInscripcion.PENDIENTE || i.estado === EstadoInscripcion.APROBADA) accion = `<button class="link" onclick="cancelarInscripcion('${i.comprobante}')">Cancelar</button>`;
      else if (i.estado === EstadoInscripcion.RECHAZADA) accion = `<button class="link" onclick="alert('Motivo del rechazo: ${esc(i.motivoRechazo).replace(/'/g, '')}')">Ver motivo</button>`;
      return `<tr><td>${esc(i.comision.materia.nombre)}</td><td>${i.comision.codigo}</td><td>${fecha(i.fecha)}</td><td>${badgeInscripcion(i.estado)}</td><td>${accion}</td></tr>`;
    }).join('')}</table>` : '<span class="muted">No tiene inscripciones.</span>';
}
function cancelarInscripcion(comprobante) {
  const i = estudiante.inscripciones.find(x => x.comprobante === comprobante);
  if (!confirm(`¿Cancelar la inscripción a ${i.comision.materia.nombre} (${i.comision.codigo})?`)) return;
  try { estudiante.cancelarInscripcion(i); } catch (e) { alert(e.message); }
  renderMisInscripciones();
  if (materiaSel) renderComisiones();
}

// ---------- Panel de administración ----------
function todasLasInscripciones() { return D.estudiantes.flatMap(e => e.inscripciones); }
function renderAdmin() {
  const pend = todasLasInscripciones().filter(i => i.estado === EstadoInscripcion.PENDIENTE);
  $('tablaPendientes').innerHTML = pend.length ? `<table>
    <tr><th>Comprobante</th><th>Estudiante</th><th>Materia</th><th>Comisión</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr>
    ${pend.map(i => `<tr><td>${i.comprobante}</td><td>${esc(i.estudiante.nombreCompleto())}</td><td>${esc(i.comision.materia.nombre)}</td>
      <td>${i.comision.codigo}</td><td>${fecha(i.fecha)}</td><td>${badgeInscripcion(i.estado)}</td>
      <td><button class="btn ok sm" onclick="revisar('${i.comprobante}', true)">Aprobar</button>
          <button class="btn rojo sm" onclick="revisar('${i.comprobante}', false)">Rechazar</button></td></tr>`).join('')}
  </table>` : '<div class="msg info" style="margin:0">No hay solicitudes pendientes. Registre una desde el Portal del estudiante.</div>';

  const coms = D.comisiones;
  $('tablaComisionesAdm').innerHTML = `<table>
    <tr><th>Materia</th><th>Comisión</th><th>Día y horario</th><th>Docente</th><th>Estado</th><th>Cupo disponible</th><th>Acción</th></tr>
    ${coms.map((c, k) => `<tr><td>${esc(c.materia.nombre)}</td><td>${c.codigo}</td><td>${c.horario()}</td><td>${c.docente}</td>
      <td><span class="badge ${c.estado === 'ABIERTA' ? 'b-ok' : c.estado === 'COMPLETA' ? 'b-err' : c.estado === 'EN_CURSO' ? 'b-info' : 'b-neutro'}">${c.estado}</span></td>
      <td>${c.cupoDisponible} / ${c.cupoMaximo}</td>
      <td>${c.estado === EstadoComision.CREADA ? `<button class="btn pri sm" onclick="abrirInscripcion(${k})">Abrir inscripción</button>` : '—'}</td></tr>`).join('')}
  </table>`;
}
function revisar(comprobante, aprobar) {
  const i = todasLasInscripciones().find(x => x.comprobante === comprobante);
  let motivo = '';
  if (!aprobar) {
    motivo = prompt('Motivo del rechazo:', 'Documentación incompleta');
    if (motivo === null) return;
  }
  try { D.admin.revisarSolicitud(i, aprobar, motivo || 'Sin motivo'); } catch (e) { alert(e.message); }
  renderAdmin();
}
function abrirInscripcion(k) {
  try { D.comisiones[k].abrirInscripcion(); } catch (e) { alert(e.message); }
  renderAdmin();
}

// ---------- Inicio ----------
function reiniciar() {
  cargarDatos();
  llenarEstudiantes();
  salir();
  $('chkOtraCarrera').checked = false;
  if (!$('v-adm').classList.contains('oculto')) renderAdmin();
}
cargarDatos();
llenarEstudiantes();
