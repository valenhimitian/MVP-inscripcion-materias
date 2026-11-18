/* =====================================================================
   UTILIDADES DE VISTA: nodos, formato, insignias de estado, íconos,
   pestañas, diálogo y avisos emergentes.
   ===================================================================== */

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtFecha = d => d ? d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtFechaLarga = d => d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
const fmtDni = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const iniciales = u => ((u.nombre || '?')[0] + (u.apellido || '?')[0]).toUpperCase();
const primerNombre = u => u.nombre.split(' ')[0];
const valorFecha = d => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
const leerFecha = v => { if (!v) return null; const [a, m, d] = v.split('-').map(Number); return new Date(a, m - 1, d); };
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function hace(d) {
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 7) return `hace ${plural(dias, 'día', 'días')}`;
  return fmtFecha(d);
}

// ---------- Insignias de estado (DE01 a DE04 y certificados) ----------
const ETIQUETA_INSCRIPCION = {
  PENDIENTE: ['Pendiente', 'b-warn'], APROBADA: ['Aprobada', 'b-ok'], RECHAZADA: ['Rechazada', 'b-err'],
  EN_CURSO: ['En curso', 'b-info'], FINALIZADA: ['Finalizada', 'b-neutro'], CANCELADA: ['Cancelada', 'b-neutro'],
};
const ETIQUETA_COMISION = {
  CREADA: ['Creada', 'b-neutro'], ABIERTA: ['Inscripción abierta', 'b-ok'], COMPLETA: ['Sin cupo', 'b-err'],
  EN_CURSO: ['En curso', 'b-info'], FINALIZADA: ['Finalizada', 'b-neutro'], DADA_DE_BAJA: ['Dada de baja', 'b-neutro'],
};
const ETIQUETA_ESTUDIANTE = {
  REGISTRADO: ['Registrado', 'b-warn'], HABILITADO: ['Habilitado', 'b-ok'],
  INHABILITADO: ['Inhabilitado', 'b-err'], EGRESADO: ['Egresado', 'b-info'],
};
const ETIQUETA_CERTIFICADO = {
  SOLICITADO: ['En revisión', 'b-warn'], GENERADO: ['Generada', 'b-info'], ENVIADO: ['Enviada', 'b-ok'], RECHAZADO: ['Rechazada', 'b-err'],
};
const ETIQUETA_CALIFICACION = {
  REGISTRADA: ['Registrada', 'b-info'], MODIFICADA: ['Modificada', 'b-warn'], CERRADA: ['Cerrada', 'b-neutro'], ANULADA: ['Anulada', 'b-err'],
};
const badge = ([texto, clase]) => `<span class="badge ${clase}">${texto}</span>`;
const badgeInscripcion = e => badge(ETIQUETA_INSCRIPCION[e]);
const badgeComision = e => badge(ETIQUETA_COMISION[e]);
const badgeEstudiante = e => badge(ETIQUETA_ESTUDIANTE[e]);
const badgeCertificado = e => badge(ETIQUETA_CERTIFICADO[e]);

// ---------- Íconos (trazo, 24×24) ----------
const ICONOS = {
  inicio: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  inscribir: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M12 13v5M9.5 15.5h5"/>',
  cursada: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/>',
  tramite: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14h6M9 17h4"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  campana: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  bandeja: '<path d="M3 13h5l1.5 3h5L16 13h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  comisiones: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  alumnos: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5c2.5 0 4.5 1.5 5.5 4"/>',
  docente: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M7 9h6M7 12h4"/>',
  guia: '<circle cx="12" cy="12" r="9"/><path d="M10 9.5a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1.3 1-1.3 1.8V14M12 17.5v.01"/>',
  descargar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.01"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.5L16 9.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
};
const icono = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS[n]}</svg>`;

function aviso(tipo, titulo, texto = '', regla = '') {
  const ico = { err: 'error', ok: 'ok', info: 'info', warn: 'info' }[tipo];
  return `<div class="aviso aviso-${tipo}" role="${tipo === 'err' ? 'alert' : 'status'}">${icono(ico)}
    <div><b>${titulo}</b>${texto ? `<span>${texto}</span>` : ''}${regla ? `<div class="regla">${regla}</div>` : ''}</div></div>`;
}

// Pestañas que navegan por hash: [[href, texto, contador?]]
function pestanas(items) {
  return `<nav class="pestanas" aria-label="Secciones">${items.map(([href, texto, n]) =>
    `<a href="${href}" ${location.hash === href ? 'aria-current="page"' : ''}>${texto}${n ? ` <span class="contador">${n}</span>` : ''}</a>`).join('')}</nav>`;
}

function encabezado(titulo, bajada = '', acciones = '') {
  return `<div class="encabezado"><div><h1>${titulo}</h1>${bajada ? `<p>${bajada}</p>` : ''}</div>${acciones ? `<div class="acciones">${acciones}</div>` : ''}</div>`;
}

function vacio(titulo, texto, accion = '') {
  return `<div class="vacio"><b>${titulo}</b>${texto}${accion ? `<br>${accion}` : ''}</div>`;
}

// Lista de notificaciones (compartida por los tres roles)
function listaNotificaciones(lista, limite) {
  const items = (limite ? lista.slice(0, limite) : lista);
  if (!items.length) return vacio('No tenés notificaciones', 'Te avisamos acá cuando haya novedades.');
  return `<ul class="notifs">${items.map(n => `<li class="${n.leida ? '' : 'nueva'}">
    <button type="button" onclick="App.abrirNotificacion(${n.id})">
      <span class="punto" aria-hidden="true"></span>
      <span><b>${esc(n.titulo)}</b><span>${esc(n.texto)}</span></span>
      <time datetime="${n.fecha.toISOString()}">${hace(n.fecha)}</time>
    </button></li>`).join('')}</ul>`;
}

// ---------- Avisos emergentes ----------
const Notificacion = {
  mostrar(texto, tipo = '') {
    const n = document.createElement('div');
    n.className = 'notificacion ' + tipo;
    n.textContent = texto;
    const cont = $('notificaciones');
    cont.appendChild(n);
    while (cont.children.length > 3) cont.firstChild.remove();
    setTimeout(() => n.remove(), 4500);
  }
};

// ---------- Diálogo (reemplaza alert / confirm / prompt) ----------
// Devuelve una promesa: false si se cancela; true o el texto ingresado si se acepta.
const Dialogo = {
  abrir({ titulo, texto = '', aceptar = 'Aceptar', cancelar = 'Volver', peligro = false, campo = null, soloAviso = false }) {
    const d = $('dialogo');
    d.innerHTML = `<form method="dialog">
      <div class="dialogo-cuerpo">
        <h2 id="dialogoTitulo">${esc(titulo)}</h2>
        ${texto ? `<p>${texto}</p>` : ''}
        ${campo ? `<label for="dialogoCampo">${esc(campo.etiqueta)}</label><textarea id="dialogoCampo" required>${esc(campo.valor || '')}</textarea>` : ''}
      </div>
      <div class="dialogo-pie">
        ${soloAviso ? '' : `<button class="btn btn-secundario" value="no" formnovalidate>${esc(cancelar)}</button>`}
        <button class="btn ${peligro ? 'btn-peligro-lleno' : 'btn-primario'}" value="si">${esc(aceptar)}</button>
      </div></form>`;
    return new Promise(resolve => {
      d.onclose = () => {
        if (d.returnValue !== 'si') return resolve(false);
        resolve(campo ? ($('dialogoCampo')?.value.trim() || campo.valor || '') : true);
      };
      d.returnValue = '';
      d.showModal();
      (campo ? $('dialogoCampo') : d.querySelector('[value="si"]')).focus();
    });
  }
};

// Ejecuta una acción, muestra el error si lo hay y guarda
function intentar(fn, exito) {
  try {
    const r = fn();
    if (exito) Notificacion.mostrar(typeof exito === 'function' ? exito(r) : exito, 'ok');
    Repositorio.guardar();
    return r ?? true;
  } catch (e) {
    Notificacion.mostrar(e.message, 'err');
    return false;
  }
}
