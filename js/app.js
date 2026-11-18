/* =====================================================================
   APP – sesión, menú según rol, rutas, notificaciones y modo demo
   ===================================================================== */

// [patrón, rol, render(main, params)] — rol null: pública
const RUTAS = [
  ['#/inicio',                      'estudiante', m => VistaEstudiante.inicio(m)],
  ['#/inscripcion',                 'estudiante', () => PantallaInscripcion.abrir()],
  ['#/perfil',                      'estudiante', m => VistaEstudiante.datos(m)],
  ['#/perfil/cursada',              'estudiante', m => VistaEstudiante.cursada(m)],
  ['#/perfil/tramites',             'estudiante', m => VistaEstudiante.tramites(m)],
  ['#/perfil/notificaciones',       'estudiante', m => VistaEstudiante.notificaciones(m)],

  ['#/docente',                     'docente', m => VistaDocente.inicio(m)],
  ['#/docente/comision/:id',        'docente', (m, p) => VistaDocente.comision(p.id)],
  ['#/docente/comision/:id/:sec',   'docente', (m, p) => VistaDocente.comision(p.id, p.sec)],
  ['#/docente/notificaciones',      'docente', m => VistaDocente.notificaciones(m)],
  ['#/docente/perfil',              'docente', m => VistaDocente.perfil(m)],

  ['#/admin',                       'admin', m => VistaAdmin.inicio(m)],
  ['#/admin/inscripciones',         'admin', m => VistaAdmin.inscripciones(m)],
  ['#/admin/tramites',              'admin', m => VistaAdmin.tramites(m)],
  ['#/admin/cursadas',              'admin', m => VistaAdmin.cursadas(m)],
  ['#/admin/cursadas/nueva',        'admin', m => VistaAdmin.nuevaCursada(m)],
  ['#/admin/estudiantes',           'admin', m => VistaAdmin.estudiantes(m)],
  ['#/admin/estudiantes/:legajo',   'admin', (m, p) => VistaAdmin.estudiante(m, p.legajo)],
  ['#/admin/docentes',              'admin', m => VistaAdmin.docentes(m)],
  ['#/admin/notificaciones',        'admin', m => VistaAdmin.notificaciones(m)],
  ['#/admin/perfil',                'admin', m => VistaAdmin.perfil(m)],

  ['#/guia',                        null, m => VistaGuia.render(m)],
];
const INICIO_POR_ROL = { estudiante: '#/inicio', docente: '#/docente', admin: '#/admin' };
const NOTIF_POR_ROL = { estudiante: '#/perfil/notificaciones', docente: '#/docente/notificaciones', admin: '#/admin/notificaciones' };
const PERFIL_POR_ROL = { estudiante: '#/perfil', docente: '#/docente/perfil', admin: '#/admin/perfil' };

function buscarRuta(hash) {
  const partes = hash.split('/');
  for (const [patron, rol, render] of RUTAS) {
    const p = patron.split('/');
    if (p.length !== partes.length) continue;
    const params = {};
    if (p.every((seg, k) => seg.startsWith(':') ? (params[seg.slice(1)] = decodeURIComponent(partes[k]), true) : seg === partes[k])) {
      return { rol, render, params };
    }
  }
  return null;
}

const App = {
  sesion: null,          // { usuario, rol }
  demo: false,

  // ---------- Sesión ----------
  iniciarSesion(usuario, rol, destino) {
    this.sesion = { usuario, rol };
    try { sessionStorage.setItem('cursada.sesion', usuario.dni); } catch (e) { /* sin almacenamiento */ }
    PantallaInscripcion.otrasCarreras = false;
    VistaDocente.seleccion = null;
    Traza.limpiar();
    this.ir(destino || INICIO_POR_ROL[rol]);
    const n = Notificador.sinLeer(usuario);
    Notificacion.mostrar(`Hola, ${usuario.nombre.split(' ')[0]}.${n ? ` Tenés ${plural(n, 'notificación nueva', 'notificaciones nuevas')}.` : ''}`);
  },
  restaurarSesion() {
    try {
      const dni = sessionStorage.getItem('cursada.sesion');
      const r = dni && Sesion.buscarPorDni(dni);
      if (r) this.sesion = r;
    } catch (e) { /* sin almacenamiento */ }
  },
  salir() {
    this.sesion = null;
    try { sessionStorage.removeItem('cursada.sesion'); } catch (e) { /* sin almacenamiento */ }
    Traza.limpiar();
    this.ir('#/ingresar');
  },

  // ---------- Navegación ----------
  ir(hash) {
    if (location.hash !== hash) history.pushState(null, '', hash);
    this.navegar();
  },

  navegar() {
    let hash = location.hash || '#/ingresar';
    let ruta = buscarRuta(hash);

    if (!this.sesion && hash !== '#/guia') {
      if (hash !== '#/ingresar') history.replaceState(null, '', '#/ingresar');
      return this.mostrarIngreso();
    }
    if (this.sesion && (!ruta || (ruta.rol && ruta.rol !== this.sesion.rol))) {
      hash = INICIO_POR_ROL[this.sesion.rol];
      history.replaceState(null, '', hash);
      ruta = buscarRuta(hash);
    }

    $('vista-ingreso').classList.add('oculto');
    $('vista-ingreso').innerHTML = '';
    $('vista-app').classList.remove('oculto');
    const main = $('contenido');
    ruta.render(main, ruta.params);
    this.actualizarBarra();
    this.actualizarMenu();
    this.renderTraza();
    Repositorio.guardar();
    if (this._ultimo !== hash) { main.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    this._ultimo = hash;
    document.title = (main.querySelector('h1')?.textContent || 'Inicio') + ' · Cursada';
  },

  mostrarIngreso() {
    $('vista-app').classList.add('oculto');
    $('vista-ingreso').classList.remove('oculto');
    VistaIngreso.render();
    document.title = 'Ingresar · Cursada';
    this._ultimo = '#/ingresar';
  },

  // ---------- Barra superior ----------
  actualizarBarra() {
    const s = this.sesion;
    $('barraPeriodo').textContent = PERIODO.nombre;
    $('chkDemo').checked = this.demo;
    $('btnSalir').classList.toggle('oculto', !s);
    $('marcaInicio').href = s ? INICIO_POR_ROL[s.rol] : '#/ingresar';
    if (!s) { $('usuario').innerHTML = '<a class="btn btn-primario btn-chico" href="#/ingresar">Ingresar</a>'; $('campana').innerHTML = ''; return; }
    const n = Notificador.sinLeer(s.usuario);
    $('campana').innerHTML = `<a class="campana" href="${NOTIF_POR_ROL[s.rol]}" aria-label="Notificaciones${n ? `, ${n} sin leer` : ''}">${icono('campana')}${n ? `<span>${n > 9 ? '9+' : n}</span>` : ''}</a>`;
    const u = s.usuario;
    const detalle = s.rol === 'estudiante' ? `Legajo ${u.legajo}` : s.rol === 'docente' ? 'Docente' : 'Administración';
    $('usuario').innerHTML = `<a class="usuario-enlace" href="${PERFIL_POR_ROL[s.rol]}">
      <span class="avatar ${s.rol === 'admin' ? 'admin' : s.rol === 'docente' ? 'docente' : ''}">${iniciales(u)}</span>
      <span class="usuario-txt"><b>${esc(u.nombre.split(' ')[0])} ${esc(u.apellido)}</b><span>${detalle}</span></span></a>`;
  },

  // ---------- Menú lateral ----------
  actualizarMenu() {
    const s = this.sesion;
    const actual = location.hash;
    const items = [];
    const grupo = texto => items.push({ grupo: texto });
    const enlace = (href, ico, texto, n) => items.push({ href, ico, texto, n });

    if (s && s.rol === 'estudiante') {
      enlace('#/inicio', 'inicio', 'Inicio');
      enlace('#/inscripcion', 'inscribir', 'Inscripción');
      enlace('#/perfil/cursada', 'cursada', 'Mi cursada');
      enlace('#/perfil/tramites', 'tramite', 'Trámites', s.usuario.certificados.filter(c => c.estado === EstadoCertificado.SOLICITADO).length);
      enlace('#/perfil', 'perfil', 'Mi perfil');
    } else if (s && s.rol === 'docente') {
      enlace('#/docente', 'inicio', 'Inicio');
      const vig = s.usuario.consultarComisiones().filter(c => VIGENTES.includes(c.estado));
      if (vig.length) grupo('Mis comisiones');
      vig.forEach(c => enlace(`#/docente/comision/${c.id}`, 'cursada', `${c.materia.nombre} · ${c.codigo}`));
      grupo('Cuenta');
      enlace('#/docente/notificaciones', 'campana', 'Notificaciones', Notificador.sinLeer(s.usuario));
      enlace('#/docente/perfil', 'perfil', 'Mi perfil');
    } else if (s && s.rol === 'admin') {
      enlace('#/admin', 'inicio', 'Resumen');
      enlace('#/admin/inscripciones', 'bandeja', 'Inscripciones', todasLasInscripciones().filter(i => i.estado === EstadoInscripcion.PENDIENTE).length);
      enlace('#/admin/tramites', 'tramite', 'Trámites', todosLosCertificados().filter(c => c.estado === EstadoCertificado.SOLICITADO).length);
      enlace('#/admin/cursadas', 'comisiones', 'Cursadas');
      enlace('#/admin/estudiantes', 'alumnos', 'Estudiantes');
      enlace('#/admin/docentes', 'docente', 'Docentes');
      enlace('#/admin/perfil', 'perfil', 'Mi perfil');
    }
    if (this.demo || !s) { grupo('Demo'); enlace('#/guia', 'guia', 'Guía de la demo'); }

    // El enlace activo es el de prefijo más largo que coincide con la ruta
    const activo = items.filter(i => i.href && (actual === i.href || actual.startsWith(i.href + '/')))
      .sort((a, b) => b.href.length - a.href.length)[0];
    $('menu').innerHTML = items.map(i => i.grupo ? `<div class="lateral-grupo">${i.grupo}</div>`
      : `<a href="${i.href}" ${i === activo ? 'aria-current="page"' : ''}>${icono(i.ico)}<span>${esc(i.texto)}</span>${i.n ? `<span class="contador">${i.n}</span>` : ''}</a>`).join('')
      + (s ? `<div class="lateral-pie chico tenue">${PERIODO.nombre}<br>Inscripción hasta el ${fmtFechaLarga(PERIODO.cierreInscripcion)}</div>` : '');
  },

  // ---------- Notificaciones ----------
  abrirNotificacion(id) {
    const n = D.notificaciones.find(x => x.id === id);
    Notificador.marcarLeida(id);
    if (n && n.enlace && n.enlace !== location.hash) this.ir(n.enlace);
    else this.navegar();
  },
  marcarTodas() { Notificador.marcarTodas(this.sesion.usuario); this.navegar(); },

  // ---------- Modo demo y traza de los diagramas de secuencia ----------
  alternarDemo(activo) {
    this.demo = activo;
    $('chkDemo').checked = activo;
    try { localStorage.setItem('cursada.demo', activo ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    this.actualizarMenu();
    this.renderTraza();
    if (location.hash === '#/inscripcion' && this.sesion) PantallaInscripcion.render();
  },

  renderTraza() {
    const h = location.hash;
    const s = this.sesion;
    const pantalla = s && ((s.rol === 'estudiante' && h === '#/inscripcion') || (s.rol === 'docente' && /^#\/docente(\/comision\/\d+)?$/.test(h)));
    const visible = this.demo && !!pantalla;
    $('panelTraza').classList.toggle('oculto', !visible);
    $('app').classList.toggle('con-traza', visible);
    if (!visible) return;
    $('tituloTraza').textContent = `Secuencia ${Traza.diagrama}`;
    const cls = x => x === true ? 't-ok' : x === false ? 't-err' : x ? 't-' + x : '';
    $('traza').innerHTML = Traza.lineas.length
      ? Traza.lineas.map(l => `<div class="${cls(l.tipo)}">${esc(l.texto)}</div>`).join('')
      : '<div>Usá la pantalla para ver la secuencia.</div>';
    $('traza').scrollTop = 1e6;
  },

  reiniciarDatos() {
    Repositorio.reiniciar();
    this.sesion = null;
    try { sessionStorage.removeItem('cursada.sesion'); } catch (e) { /* sin almacenamiento */ }
    Traza.limpiar();
    Notificacion.mostrar('Datos de la demo reiniciados.');
    this.ir('#/guia');
  },
};

// ---------- Arranque ----------
Repositorio.cargar();
try { App.demo = localStorage.getItem('cursada.demo') === '1'; } catch (e) { App.demo = false; }
App.restaurarSesion();
window.addEventListener('hashchange', () => App.navegar());
window.addEventListener('pagehide', () => Repositorio.guardar());
window.addEventListener('storage', ev => { if (ev.key === Repositorio.CLAVE) { Repositorio.cargar(); App.restaurarSesion(); App.navegar(); } });
App.navegar();
