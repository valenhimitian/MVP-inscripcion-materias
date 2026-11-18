/* =====================================================================
   DATOS DE EJEMPLO (no hay base de datos: se instancian al iniciar)
   ===================================================================== */

let D;   // repositorio en memoria

function cargarDatos() {
  proximoComprobante = 412;          // las inscripciones históricas usan 412–417; la primera nueva es INS-2026-00418
  const f = (d, m, a) => new Date(a, m - 1, d);

  // Carreras y materias
  const TUW = new Carrera('TUW', 'Tecnicatura Universitaria en Web');
  const INF = new Carrera('INF', 'Ingeniería en Informática');

  const PR2 = new Materia('IWeb-005', 'Programación II');
  const PW1 = new Materia('IWeb-007', 'Programación Web I');
  const PW2 = new Materia('IWeb-010', 'Programación Web II');
  const DAW = new Materia('IWeb-012', 'Diseño de Aplicaciones Web/Móviles');
  const BD1 = new Materia('IWeb-008', 'Base de Datos I');
  const ING = new Materia('IWeb-009', 'Inglés Técnico II');
  const VI  = new Materia('IWeb-011', 'Visualización e Interfaces');
  const AM1 = new Materia('INF-001', 'Análisis Matemático I');

  PW2.agregarCorrelativa(PW1);
  DAW.agregarCorrelativa(PR2);
  [PR2, PW1, PW2, DAW, BD1, ING, VI].forEach(m => TUW.asociarMateria(m));
  [AM1, BD1].forEach(m => INF.asociarMateria(m));      // Base de Datos I está en las dos carreras

  // Comisiones: (código, materia, día, inicio, fin, aula, docente, cupoMáximo, cupoDisponible, estado)
  const A = EstadoComision;
  const coms = [
    new Comision('COM-01', DAW, 'Lunes',     '18:00', '22:00', '102',    'Prof. Abal',      40, 12, A.ABIERTA),
    new Comision('COM-02', DAW, 'Martes',    '14:00', '18:00', '215',    'Prof. Moreira',   40,  0, A.COMPLETA),
    new Comision('COM-03', DAW, 'Jueves',    '08:00', '12:00', '310',    'Prof. Abal',      40, 40, A.CREADA),
    new Comision('COM-01', PW2, 'Miércoles', '18:00', '22:00', '214',    'Prof. García',    30,  9, A.ABIERTA),
    new Comision('COM-03', PW1, 'Sábado',    '08:00', '12:00', 'Lab. 2', 'Prof. Díaz',      35,  6, A.ABIERTA),
    new Comision('COM-02', BD1, 'Viernes',   '18:00', '22:00', '110',    'Prof. Fernández', 30,  0, A.EN_CURSO),
    new Comision('COM-04', BD1, 'Sábado',    '09:00', '13:00', 'Lab. 3', 'Prof. Sosa',      30, 15, A.ABIERTA),
    new Comision('COM-01', ING, 'Martes',    '08:00', '10:00', '105',    'Prof. Benítez',   25,  4, A.ABIERTA),
    new Comision('COM-01', VI,  'Miércoles', '14:00', '18:00', 'Lab. 1', 'Prof. Romero',    30,  1, A.ABIERTA),
    new Comision('COM-01', AM1, 'Lunes',     '14:00', '18:00', '201',    'Prof. Pérez',     60, 25, A.ABIERTA),
  ];
  // Comisiones de cuatrimestres anteriores (historial)
  const hPR2 = new Comision('COM-01', PR2, 'Lunes', '08:00', '12:00', 'Lab. 1', 'Prof. Díaz', 35, 0, A.FINALIZADA);
  const hPW1 = new Comision('COM-02', PW1, 'Martes', '08:00', '12:00', 'Lab. 2', 'Prof. Díaz', 35, 0, A.FINALIZADA);

  const C = (mat, cod) => coms.find(c => c.materia === mat && c.codigo === cod);

  // Helper para inscripciones ya existentes
  const insc = (est, com, estado, fecha, extra = {}) => {
    const i = new Inscripcion(est, com, fecha);
    i.setEstado(estado);
    if (extra.motivo) i.motivoRechazo = extra.motivo;
    if (extra.notaFinal) i.agregarCalificacion(TipoCalificacion.FINAL, extra.notaFinal, fecha, EstadoCalificacion.CERRADA);
    est.agregarInscripcion(i);
    return i;
  };
  const E = EstadoInscripcion;

  // Estudiantes
  const ivan = new Estudiante('14253', 'Iván Nazareno', 'Avila', EstadoEstudiante.HABILITADO);
  ivan.matriculas.push(new Matricula(TUW, f(1, 3, 2023)));
  insc(ivan, hPR2, E.FINALIZADA, f(10, 8, 2025), { notaFinal: 7 });
  insc(ivan, C(BD1, 'COM-02'), E.EN_CURSO, f(5, 3, 2026));
  insc(ivan, C(ING, 'COM-01'), E.APROBADA, f(4, 3, 2026));
  insc(ivan, C(PW1, 'COM-03'), E.RECHAZADA, f(2, 3, 2026), { motivo: 'Documentación de equivalencia incompleta' });

  const martina = new Estudiante('15110', 'Martina', 'Gómez', EstadoEstudiante.HABILITADO);
  martina.matriculas.push(new Matricula(TUW, f(1, 3, 2024)));
  insc(martina, hPW1, E.FINALIZADA, f(15, 7, 2025), { notaFinal: 8 });

  const camila = new Estudiante('13990', 'Camila', 'Ruiz', EstadoEstudiante.HABILITADO);
  camila.matriculas.push(new Matricula(INF, f(1, 3, 2018), EstadoMatricula.EGRESADO), new Matricula(TUW, f(1, 3, 2025)));
  insc(camila, hPW1, E.FINALIZADA, f(15, 7, 2025), { notaFinal: 9 });

  const tomas = new Estudiante('12045', 'Tomás', 'Herrera', EstadoEstudiante.INHABILITADO);
  tomas.matriculas.push(new Matricula(TUW, f(1, 3, 2022)));

  const lucia = new Estudiante('16020', 'Lucía', 'Fernández', EstadoEstudiante.REGISTRADO);
  lucia.matriculas.push(new Matricula(TUW, f(1, 3, 2026)));

  D = {
    carreras: [TUW, INF],
    materias: [PR2, PW1, PW2, DAW, BD1, ING, VI, AM1],
    comisiones: coms,
    estudiantes: [ivan, martina, camila, tomas, lucia],
    admin: new Administrador('admin'),
  };
}
