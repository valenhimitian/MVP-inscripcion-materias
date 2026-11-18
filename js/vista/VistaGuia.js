/* =====================================================================
   GUÍA DE LA DEMO – escenarios del MVP con acceso directo
   "Probar" ingresa con el usuario indicado y deja la pantalla en el
   punto donde se ve el resultado del escenario.
   ===================================================================== */

const IVAN = '40111222', TOMAS = '39555666', CAMILA = '38333444', MARTINA = '41222333', DOCENTE = '30777888', ADMIN = '28999000';

const rutaBD1 = () => '#/docente/comision/' + D.comisiones.find(c => c.materia.codigo === 'IWeb-008' && c.codigo === 'COM-02').id;

const ESCENARIOS = [
  { grupo: 'CU01 · Inscribirse a materia (DS01)' },
  { titulo: 'Inscripción exitosa', regla: 'Escenario 1 · RN7', dni: IVAN, materia: 'IWeb-012', comision: 'COM-01',
    texto: 'Iván elige Diseño de Aplicaciones Web/Móviles, COM-01. Pasa las cuatro validaciones y al confirmar queda pendiente con su comprobante.' },
  { titulo: 'Comisión sin cupo', regla: 'Escenario 2 · E6.1 · RN4', dni: IVAN, materia: 'IWeb-012', comision: 'COM-02',
    texto: 'COM-02 de Diseño de Aplicaciones Web/Móviles no tiene lugares libres.' },
  { titulo: 'Estudiante ya inscripto', regla: 'Escenario 3 · E6 · RN5', dni: IVAN, materia: 'IWeb-008', comision: 'COM-04',
    texto: 'Iván ya cursa Base de Datos I en COM-02 e intenta inscribirse en COM-04.' },
  { titulo: 'Correlativas incumplidas', regla: 'Escenario 4 · E6.3 · RN6', dni: IVAN, materia: 'IWeb-010', comision: 'COM-01',
    texto: 'Programación Web II pide Programación Web I aprobada, y Iván no la tiene.' },
  { titulo: 'Materia fuera de la carrera', regla: 'Escenario 5 · E6.2 · RN3', dni: IVAN, materia: 'INF-001', comision: 'COM-01', otras: true,
    texto: 'Con la herramienta de prueba se listan materias de otras carreras y se elige Análisis Matemático I.' },
  { titulo: 'Comisión fuera de período', regla: 'E6.4 · RN9', dni: IVAN, materia: 'IWeb-012', comision: 'COM-03',
    texto: 'COM-03 todavía no abrió su inscripción. La administración la abre desde Cursadas.' },
  { titulo: 'Último lugar y concurrencia', regla: 'RN8 · E9', dni: IVAN, materia: 'IWeb-011', comision: 'COM-01',
    texto: 'Visualización e Interfaces COM-01 tiene un lugar. Al confirmar pasa a «sin cupo». Para E9, antes de confirmar usá «Simular que otros estudiantes ocupan los lugares restantes».' },
  { titulo: 'Estudiante no habilitado', regla: 'E2 · RN1', dni: TOMAS, irA: '#/inscripcion',
    texto: 'Tomás Herrera está inhabilitado: no puede inscribirse ni pedir constancias.' },
  { titulo: 'Carrera activa por matrícula', regla: 'getCarreraActiva()', dni: CAMILA, irA: '#/inscripcion',
    texto: 'Camila egresó de Ingeniería en Informática y está activa en la Tecnicatura: solo ve materias de la Tecnicatura.' },

  { grupo: 'Revisión de la administración (DE01 · DE02)' },
  { titulo: 'Aprobar o rechazar inscripciones', regla: 'DE01 · RN8', dni: ADMIN, irA: '#/admin/inscripciones',
    texto: 'Sofía Martínez tiene una solicitud pendiente. Rechazar libera el lugar en la comisión.' },
  { titulo: 'Crear, abrir, iniciar y eliminar cursadas', regla: 'DE02 · RF14–RF16', dni: ADMIN, irA: '#/admin/cursadas',
    texto: 'Creá una cursada nueva, abrí su inscripción, iniciá la cursada (aprobadas pasan a en curso) o eliminala si todavía no empezó.' },

  { grupo: 'CU02 · Registrar calificación (DS02)' },
  { titulo: 'Cargar y modificar notas', regla: 'DS02 · DE04 · A6', dni: DOCENTE, irA: () => rutaBD1(),
    texto: 'Laura Medina carga notas en Base de Datos I. Si ya existe la nota de ese tipo se modifica (A6). Probá una nota 11 (E8.1) o una fecha futura (E8.2).' },
  { titulo: 'Asistencia y avisos', regla: 'Módulo 3', dni: DOCENTE, irA: () => rutaBD1() + '/avisos',
    texto: 'El docente toma asistencia y publica avisos. Cada aviso llega como notificación a sus estudiantes.' },

  { grupo: 'RF26 · Constancias' },
  { titulo: 'Pedir una constancia', regla: 'RF26', dni: IVAN, irA: '#/perfil/tramites',
    texto: 'Iván pide una constancia de alumno regular o de examen. Queda «en revisión» y le llega un aviso a la administración.' },
  { titulo: 'Aprobar, generar el PDF y enviarlo', regla: 'Solicitado → Generado → Enviado', dni: ADMIN, irA: '#/admin/tramites',
    texto: 'La administración aprueba la constancia de Martina: se genera el PDF, se registra el correo y Martina la descarga desde su perfil.' },
  { titulo: 'Descargar la constancia', regla: 'Perfil › Trámites', dni: MARTINA, irA: '#/perfil/tramites',
    texto: 'Después de aprobarla, Martina recibe la notificación y descarga el PDF.' },
];

const VistaGuia = {
  render(main) {
    let n = 0;
    main.innerHTML = encabezado('Guía de la demo',
      'Cada escenario ingresa con el usuario indicado y te deja frente al resultado. Activá el modo demo para ver la secuencia DS01 o DS02 al costado.',
      `<button class="btn btn-secundario" onclick="App.reiniciarDatos()">Reiniciar datos</button>${App.sesion ? '' : '<a class="btn btn-primario" href="#/ingresar">Ir al ingreso</a>'}`)
      + ESCENARIOS.map((e, k) => e.grupo ? `<h2 class="guia-grupo">${e.grupo}</h2>` : `<div class="panel escenario">
          <h3>${e.titulo} <span class="etiqueta-regla">${e.regla}</span></h3>
          <p>${e.texto}</p>
          <div class="acciones"><button class="btn btn-primario btn-chico" onclick="VistaGuia.probar(${k})">Probar</button></div>
        </div>`).join('');
  },

  probar(k) {
    const e = ESCENARIOS[k];
    App.alternarDemo(true);
    const r = Sesion.buscarPorDni(e.dni);
    App.iniciarSesion(r.usuario, r.rol, (typeof e.irA === 'function' ? e.irA() : e.irA) || (e.materia ? '#/inscripcion' : undefined));
    if (!e.materia) return;
    const P = PantallaInscripcion;
    if (e.otras) P.alternarOtras(true);
    const mat = D.materias.find(m => m.codigo === e.materia);
    P.elegirMateria(D.materias.indexOf(mat));
    const idx = mat.consultarComisionesDisponibles().findIndex(c => c.codigo === e.comision);
    if (idx >= 0) P.elegirComision(idx);
  },
};
