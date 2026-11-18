/* =====================================================================
   GRILLA HORARIA SEMANAL
   Ubica cada comisión en su día y franja (08:00 a 22:00, filas de 30').
   items: [{ comision, clase, sub? }]
   ===================================================================== */

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORA_INICIO = 8;
const fila = hhmm => { const [h, m] = hhmm.split(':').map(Number); return Math.max(2, (h - HORA_INICIO) * 2 + (m >= 30 ? 1 : 0) + 2); };
const seSuperponen = (a, b) => a.dia === b.dia && a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;
const CLASE_BLOQUE = { EN_CURSO: 'en-curso', APROBADA: 'aprobada', PENDIENTE: 'pendiente' };

// Inscripciones activas del estudiante → items de la grilla
const itemsDeInscripciones = lista => lista.map(i => ({ comision: i.comision, clase: CLASE_BLOQUE[i.estado] || '' }));

function grillaSemanal(items, vistaPrevia = null, compacta = false) {
  let html = `<div class="grilla ${compacta ? 'compacta' : ''}" role="img" aria-label="Horario semanal">
    <div class="grilla-esquina"></div>`;
  DIAS.forEach((d, i) => { html += `<div class="grilla-dia" style="grid-column:${i + 2}">${d.slice(0, 3)}</div>`; });
  DIAS.forEach((d, i) => { html += `<div class="grilla-col" style="grid-column:${i + 2}"></div>`; });
  for (let h = HORA_INICIO; h < 22; h += 2) {
    html += `<div class="grilla-hora" style="grid-row:${(h - HORA_INICIO) * 2 + 2}">${h}:00</div>`;
  }
  const ubicar = c => `grid-column:${DIAS.indexOf(c.dia) + 2};grid-row:${fila(c.horaInicio)} / ${fila(c.horaFin)}`;
  items.forEach(({ comision: c, clase, sub }) => {
    const choca = vistaPrevia && vistaPrevia !== c && seSuperponen(c, vistaPrevia);
    html += `<div class="bloque ${clase} ${choca ? 'choque' : ''}" style="${ubicar(c)}" title="${esc(c.materia.nombre)} · ${c.horario()}">
      <b>${esc(c.materia.nombre)}</b><span>${sub || `${c.codigo} · Aula ${esc(c.aula)}`}</span></div>`;
  });
  if (vistaPrevia) {
    html += `<div class="bloque vista-previa" style="${ubicar(vistaPrevia)}"><b>${esc(vistaPrevia.materia.nombre)}</b><span>${vistaPrevia.codigo} · tu elección</span></div>`;
  }
  return html + '</div>';
}

function referenciasGrilla(conVistaPrevia) {
  return `<div class="grilla-ref">
    <span><i style="background:var(--birome)"></i>En curso</span>
    <span><i style="background:var(--birome-cl);border:1px solid #BFCBFA"></i>Aprobada</span>
    <span><i style="background:var(--resaltador-cl);border:1px solid #EFD78E"></i>Pendiente</span>
    ${conVistaPrevia ? '<span><i style="background:var(--resaltador);border:1px dashed var(--tinta)"></i>Comisión elegida</span>' : ''}
  </div>`;
}
