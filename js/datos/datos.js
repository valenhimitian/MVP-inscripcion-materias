/* =====================================================================
   DATOS DE EJEMPLO
   Se cargan la primera vez (o al reiniciar). Después, Repositorio los
   guarda en el navegador para que los cambios se conserven al recargar.
   ===================================================================== */

let D;   // repositorio en memoria

// Período lectivo en curso
const PERIODO = { nombre: '2.º cuatrimestre 2026', cierreInscripcion: new Date(2026, 10, 28) };
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function cargarDatos() {
  Contadores.comprobante = 412;      // históricas: 412–417; la primera nueva es INS-2026-00418
  Contadores.certificado = 1;
  Contadores.comision = 1;
  const f = (d, m, a) => new Date(a, m - 1, d);
  const A = EstadoComision, E = EstadoInscripcion, T = TipoCalificacion;

  // ---------- Carreras y materias ----------
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

  // ---------- Docentes ----------
  const medina  = new Docente('D-1021', '30777888', 'Laura', 'Medina', 'laura.medina@docentes.cursada.edu.ar', 'Bases de datos y diseño web');
  const ortega  = new Docente('D-1034', '27555111', 'Martín', 'Ortega', 'martin.ortega@docentes.cursada.edu.ar', 'Ingeniería de software');
  const moreno  = new Docente('D-1047', '29111444', 'Silvia', 'Moreno', 'silvia.moreno@docentes.cursada.edu.ar', 'Diseño de interfaces');
  const garcia  = new Docente('D-1052', '31222555', 'Diego', 'García', 'diego.garcia@docentes.cursada.edu.ar', 'Desarrollo web');
  const diaz    = new Docente('D-1060', '26333666', 'Pablo', 'Díaz', 'pablo.diaz@docentes.cursada.edu.ar', 'Programación');
  const sosa    = new Docente('D-1071', '32444777', 'Ricardo', 'Sosa', 'ricardo.sosa@docentes.cursada.edu.ar', 'Bases de datos');
  const benitez = new Docente('D-1083', '28666999', 'Ana', 'Benítez', 'ana.benitez@docentes.cursada.edu.ar', 'Inglés técnico');
  const ibanez  = new Docente('D-1090', '33888000', 'Carla', 'Ibáñez', 'carla.ibanez@docentes.cursada.edu.ar', 'Visualización de datos');
  const perez   = new Docente('D-1102', '25999222', 'Jorge', 'Pérez', 'jorge.perez@docentes.cursada.edu.ar', 'Matemática');

  // ---------- Comisiones ----------
  // (código, materia, día, inicio, fin, aula, docente, cupoMáximo, cupoDisponible, estado)
  const coms = [
    new Comision('COM-01', DAW, 'Lunes',     '18:00', '22:00', '102',    medina,  40, 12, A.ABIERTA),
    new Comision('COM-02', DAW, 'Martes',    '14:00', '18:00', '215',    moreno,  40,  0, A.COMPLETA),
    new Comision('COM-03', DAW, 'Jueves',    '08:00', '12:00', '310',    ortega,  40, 40, A.CREADA),
    new Comision('COM-01', PW2, 'Miércoles', '18:00', '22:00', '214',    garcia,  30,  9, A.ABIERTA),
    new Comision('COM-03', PW1, 'Sábado',    '08:00', '12:00', 'Lab. 2', diaz,    35,  6, A.ABIERTA),
    new Comision('COM-02', BD1, 'Viernes',   '18:00', '22:00', '110',    medina,  30,  0, A.EN_CURSO),
    new Comision('COM-04', BD1, 'Sábado',    '09:00', '13:00', 'Lab. 3', sosa,    30, 15, A.ABIERTA),
    new Comision('COM-01', ING, 'Martes',    '08:00', '10:00', '105',    benitez, 25,  4, A.ABIERTA),
    new Comision('COM-01', VI,  'Miércoles', '14:00', '18:00', 'Lab. 1', ibanez,  30,  1, A.ABIERTA),
    new Comision('COM-01', AM1, 'Lunes',     '14:00', '18:00', '201',    perez,   60, 25, A.ABIERTA),
  ];
  // Comisiones de cuatrimestres anteriores (historial)
  const hPR2 = new Comision('COM-01', PR2, 'Lunes',  '08:00', '12:00', 'Lab. 1', diaz, 35, 0, A.FINALIZADA);
  const hPW1 = new Comision('COM-02', PW1, 'Martes', '08:00', '12:00', 'Lab. 2', diaz, 35, 0, A.FINALIZADA);
  const C = (mat, cod) => coms.find(c => c.materia === mat && c.codigo === cod);
  const bd1 = C(BD1, 'COM-02');

  // Helper para inscripciones existentes
  const insc = (est, com, estado, fecha, extra = {}) => {
    const i = new Inscripcion(est, com, fecha);
    i.setEstado(estado);
    if (extra.motivo) i.motivoRechazo = extra.motivo;
    (extra.notas || []).forEach(([tipo, nota, fe, obs]) => i.agregarCalificacion(tipo, nota, fe, obs || ''));
    if (extra.notaFinal) i.agregarCalificacion(T.FINAL, extra.notaFinal, fecha, '', EstadoCalificacion.CERRADA);
    est.agregarInscripcion(i);
    return i;
  };

  // ---------- Estudiantes ----------
  const ivan = new Estudiante('14253', '40111222', 'Iván Nazareno', 'Avila', 'ivan.avila@alumnos.cursada.edu.ar', EstadoEstudiante.HABILITADO, f(14, 5, 1997));
  ivan.telefono = '11 5555-0142';
  ivan.matriculas.push(new Matricula(TUW, f(1, 3, 2023)));
  insc(ivan, hPR2, E.FINALIZADA, f(10, 3, 2025), { notaFinal: 7 });
  const ivanBD = insc(ivan, bd1, E.EN_CURSO, f(5, 8, 2026), { notas: [[T.PARCIAL, 7, f(9, 10, 2026)]] });
  insc(ivan, C(ING, 'COM-01'), E.APROBADA, f(4, 8, 2026));
  insc(ivan, C(PW1, 'COM-03'), E.RECHAZADA, f(2, 8, 2026), { motivo: 'Documentación de equivalencia incompleta' });

  const martina = new Estudiante('15110', '41222333', 'Martina', 'Gómez', 'martina.gomez@alumnos.cursada.edu.ar', EstadoEstudiante.HABILITADO, f(2, 9, 1999));
  martina.matriculas.push(new Matricula(TUW, f(1, 3, 2024)));
  insc(martina, hPW1, E.FINALIZADA, f(15, 3, 2025), { notaFinal: 8 });
  const martinaBD = insc(martina, bd1, E.EN_CURSO, f(4, 8, 2026), { notas: [[T.PARCIAL, 8, f(9, 10, 2026)], [T.TP, 9, f(30, 10, 2026), 'Muy buen modelo relacional']] });

  const camila = new Estudiante('13990', '38333444', 'Camila', 'Ruiz', 'camila.ruiz@alumnos.cursada.edu.ar', EstadoEstudiante.HABILITADO, f(21, 1, 1995));
  camila.matriculas.push(new Matricula(INF, f(1, 3, 2018), EstadoMatricula.EGRESADO), new Matricula(TUW, f(1, 3, 2025)));
  insc(camila, hPW1, E.FINALIZADA, f(15, 3, 2025), { notaFinal: 9 });
  const camilaBD = insc(camila, bd1, E.EN_CURSO, f(6, 8, 2026), { notas: [[T.PARCIAL, 5, f(9, 10, 2026)]] });

  const sofia = new Estudiante('15240', '42444555', 'Sofía', 'Martínez', 'sofia.martinez@alumnos.cursada.edu.ar', EstadoEstudiante.HABILITADO, f(11, 7, 2001));
  sofia.matriculas.push(new Matricula(TUW, f(1, 3, 2024)));
  insc(sofia, hPR2, E.FINALIZADA, f(10, 3, 2025), { notaFinal: 6 });
  const sofiaBD = insc(sofia, bd1, E.EN_CURSO, f(5, 8, 2026));
  insc(sofia, C(DAW, 'COM-01'), E.PENDIENTE, f(16, 11, 2026));

  const tomas = new Estudiante('12045', '39555666', 'Tomás', 'Herrera', 'tomas.herrera@alumnos.cursada.edu.ar', EstadoEstudiante.INHABILITADO, f(30, 11, 1996));
  tomas.matriculas.push(new Matricula(TUW, f(1, 3, 2022)));

  const lucia = new Estudiante('16020', '44666777', 'Lucía', 'Fernández', 'lucia.fernandez@alumnos.cursada.edu.ar', EstadoEstudiante.REGISTRADO, f(8, 4, 2003));
  lucia.matriculas.push(new Matricula(TUW, f(1, 3, 2026)));

  // Asistencias de Base de Datos I (COM-02)
  [f(16, 10, 2026), f(23, 10, 2026), f(30, 10, 2026), f(6, 11, 2026), f(13, 11, 2026)].forEach((fe, k) => {
    ivanBD.asistencias.push(new Asistencia(fe, k !== 2));
    martinaBD.asistencias.push(new Asistencia(fe, true));
    camilaBD.asistencias.push(new Asistencia(fe, k < 3));
    sofiaBD.asistencias.push(new Asistencia(fe, k !== 0));
  });
  const aviso = new ContenidoAcademico('Recuperatorio del primer parcial', 'El recuperatorio es el viernes 27/11 en el aula 110, de 18 a 20 h. Traer DNI.', TipoContenido.AVISO, f(13, 11, 2026));
  const material = new ContenidoAcademico('Guía de ejercicios: normalización', 'Ejercicios de 1FN a 3FN para practicar antes del TP final. Está en la carpeta compartida de la materia.', TipoContenido.MATERIAL, f(6, 11, 2026));
  aviso.publicar(); material.publicar();
  bd1.contenidos.push(aviso, material);

  const admin = new Administrador('admin', '28999000', 'Paula', 'Rossi', 'administracion@cursada.edu.ar');

  D = {
    carreras: [TUW, INF],
    materias: [PR2, PW1, PW2, DAW, BD1, ING, VI, AM1],
    comisiones: [...coms, hPR2, hPW1],
    docentes: [medina, ortega, moreno, garcia, diaz, sosa, benitez, ibanez, perez],
    estudiantes: [ivan, martina, camila, sofia, tomas, lucia],
    admin,
    notificaciones: [],
    correos: [],
    secuencias: { notificacion: 1, correo: 1 },
  };

  // ---------- Trámites previos ----------
  const cIvan = new Certificado(TipoCertificado.ALUMNO_REGULAR, ivan, null, 'Industrias del Oeste S.A.', null, f(20, 8, 2026));
  ivan.certificados.push(cIvan);
  cIvan.generar(); cIvan.enviarPorCorreo();
  cIvan.fechaEmision = f(21, 8, 2026); cIvan.fechaEnvio = f(21, 8, 2026);
  Correo.enviar(ivan.email, `Tu constancia ${cIvan.numero}`, 'Adjuntamos la constancia de alumno regular que pediste.', cIvan.numero);
  D.correos[0].fecha = f(21, 8, 2026);

  const cMartina = new Certificado(TipoCertificado.EXAMEN, martina, martinaBD, 'Estudio Contable Ramos', f(9, 10, 2026), f(17, 11, 2026));
  martina.certificados.push(cMartina);

  // ---------- Notificaciones iniciales ----------
  const N = (para, titulo, texto, enlace, fecha) => { const n = Notificador.notificar(para, titulo, texto, enlace, fecha); return n; };
  N(ivan, 'Tu constancia está lista', `Te enviamos la constancia ${cIvan.numero} a tu correo. También podés descargarla desde Trámites.`, '#/perfil/tramites', f(21, 8, 2026)).leida = true;
  N(ivan, 'Inscripción aprobada', 'Tu inscripción a Inglés Técnico II, COM-01, fue aprobada.', '#/perfil/cursada', f(6, 8, 2026)).leida = true;
  N(ivan, 'Nueva calificación', 'Se registró tu nota de PARCIAL en Base de Datos I: 7.', '#/perfil/cursada', f(9, 10, 2026));
  N(ivan, 'Aviso de Base de Datos I', 'Recuperatorio del primer parcial: viernes 27/11 en el aula 110.', '#/perfil/cursada', f(13, 11, 2026));
  [martina, camila, sofia].forEach(e => N(e, 'Aviso de Base de Datos I', 'Recuperatorio del primer parcial: viernes 27/11 en el aula 110.', '#/perfil/cursada', f(13, 11, 2026)));
  N(medina, 'Comisión asignada', 'Se te asignó Diseño de Aplicaciones Web/Móviles, COM-01 (lunes 18 a 22 h).', '#/docente', f(1, 8, 2026)).leida = true;
  N('A', 'Nueva solicitud de inscripción', 'Sofía Martínez pidió inscribirse a Diseño de Aplicaciones Web/Móviles, COM-01.', '#/admin/inscripciones', f(16, 11, 2026));
  N('A', 'Nueva solicitud de constancia', `Martina Gómez pidió una constancia de examen (${cMartina.numero}).`, '#/admin/tramites', f(17, 11, 2026));
}
