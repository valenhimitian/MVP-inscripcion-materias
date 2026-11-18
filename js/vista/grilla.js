/* =====================================================================
   GRILLA HORARIA SEMANAL
   Ubica cada comisión en su día y franja (08:00 a 22:00, filas de 30').
   Las líneas de cada hora y sus etiquetas son celdas de la misma grilla
   que los bloques: así coinciden siempre, sea cual sea el tamaño.
   items: [{ comision, clase, sub? }]
   ===================================================================== */

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const HORA_INICIO = 8, HORA_FIN = 22;
const FILAS = (HORA_FIN - HORA_INICIO) * 2;            // 28 filas de 30 minutos

// Fila de la grilla (la 1 es el encabezado de los días) para una hora "HH:MM"
const fila = hhmm => {
  const [h, m] = hhmm.split(':').map(Number);
  const n = (h - HORA_INICIO) * 2 + (m >= 30 ? 1 : 0) + 2;
  return Math.min(Math.max(n, 2), FILAS + 2);
};
const seSuperponen = (a, b) => a.dia === b.dia && a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;
const CLASE_BLOQUE = { EN_CURSO: 'en-curso', APROBADA: 'aprobada', PENDIENTE: 'pendiente' };

// Inscripciones activas del estudiante → items de la grilla
const itemsDeInscripciones = lista => lista.map(i => ({ comision: i.comision, clase: CLASE_BLOQUE[i.estado] || '' }));

function grillaSemanal(items, vistaPrevia = null, compacta = false) {
  const todos = vistaPrevia ? [...items.map(i => i.comision), vistaPrevia] : items.map(i => i.comision);
  const descripcion = todos.length
    ? 'Horario semanal: ' + todos.map(c => `${c.materia.nombre}, ${c.dia.toLowerCase()} de ${c.horaInicio} a ${c.horaFin}`).join('; ')
    : 'Horario semanal sin materias';

  let html = `<div class="grilla-marco"><div class="grilla ${compacta ? 'compacta' : ''}" role="img" aria-label="${esc(descripcion)}">
    <div class="grilla-esquina"></div>`;
  DIAS.forEach((d, i) => { html += `<div class="grilla-dia" style="grid-column:${i + 2}"><span class="dia-largo">${d.slice(0, 3)}</span><span class="dia-corto">${d[0]}</span></div>`; });
  DIAS.forEach((d, i) => { html += `<div class="grilla-col" style="grid-column:${i + 2}"></div>`; });

  // Una línea por hora y una punteada por media hora, más la etiqueta de la hora
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    const r = (h - HORA_INICIO) * 2 + 2;
    const primera = h === HORA_INICIO ? ' primera' : '';
    html += `<div class="grilla-linea${primera}" style="grid-row:${r}"></div><div class="grilla-linea media" style="grid-row:${r + 1}"></div>`;
    const mostrar = compacta ? (h - HORA_INICIO) % 2 === 0 : true;
    html += `<div class="grilla-hora${primera} ${mostrar ? '' : 'sin-texto'}" style="grid-row:${r}">${mostrar ? `${h}:00` : ''}</div>`;
  }

  const ubicar = c => `grid-column:${DIAS.indexOf(c.dia) + 2};grid-row:${fila(c.horaInicio)} / ${fila(c.horaFin)}`;
  items.forEach(({ comision: c, clase, sub }) => {
    const choca = vistaPrevia && vistaPrevia !== c && seSuperponen(c, vistaPrevia);
    html += `<div class="bloque ${clase} ${choca ? 'choque' : ''}" style="${ubicar(c)}" title="${esc(c.materia.nombre)} · ${c.codigo} · ${c.horario()} · Aula ${esc(c.aula)}">
      <b>${esc(c.materia.nombre)}</b><span>${sub || `${c.codigo} · Aula ${esc(c.aula)}`}</span></div>`;
  });
  if (vistaPrevia) {
    html += `<div class="bloque vista-previa" style="${ubicar(vistaPrevia)}" title="${esc(vistaPrevia.materia.nombre)} · ${vistaPrevia.horario()}"><b>${esc(vistaPrevia.materia.nombre)}</b><span>${vistaPrevia.codigo} · tu elección</span></div>`;
  }
  return html + '</div></div>';
}

function referenciasGrilla(conVistaPrevia) {
  return `<div class="grilla-ref">
    <span><i style="background:var(--birome)"></i>En curso</span>
    <span><i style="background:var(--birome-cl);border:1px solid #BFCBFA"></i>Aprobada</span>
    <span><i style="background:var(--resaltador-cl);border:1px solid #EFD78E"></i>Pendiente</span>
    ${conVistaPrevia ? '<span><i style="background:var(--resaltador);border:1px dashed var(--tinta)"></i>Comisión elegida</span>' : ''}
  </div>`;
}
