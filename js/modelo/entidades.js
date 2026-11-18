/* =====================================================================
   ENTIDADES DEL DOMINIO («entity») – diagrama de clases v2.0
   Las operaciones que cambian estados siguen los diagramas DE01 a DE04:
   si una transición no está permitida, se lanza un Error con el motivo.
   ===================================================================== */

// Numeradores (se guardan junto con los datos)
const Contadores = { comprobante: 418, certificado: 1, comision: 1 };
const numero = (prefijo, n) => `${prefijo}-2026-${String(n).padStart(5, '0')}`;
const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };


// ---------- Carrera ----------
class Carrera {
  constructor(codigo, nombre) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.materias = [];                                  // agregación Carrera ◇— Materia
  }
  asociarMateria(m) { if (!this.materias.includes(m)) this.materias.push(m); }
  desasociarMateria(m) { this.materias = this.materias.filter(x => x !== m); }
  consultarMaterias() { return this.materias.slice(); }
  contieneMateria(m) { return this.materias.includes(m); }          // RN3
}


// ---------- Matricula (vínculo Estudiante–Carrera) ----------
class Matricula {
  constructor(carrera, fechaIngreso, estado = EstadoMatricula.ACTIVA) {
    this.carrera = carrera;
    this.fechaIngreso = fechaIngreso;
    this.estado = estado;
  }
  esActiva() { return this.estado === EstadoMatricula.ACTIVA; }
}


// ---------- Materia ----------
class Materia {
  constructor(codigo, nombre) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.correlativas = [];                              // autoasociación 0..*
    this.comisiones = [];
  }
  agregarCorrelativa(m) { this.correlativas.push(m); }

  // Oferta visible: no se listan las comisiones finalizadas, dadas de baja ni las que ya están en curso
  consultarComisionesDisponibles() {
    return this.comisiones.filter(c => [EstadoComision.CREADA, EstadoComision.ABIERTA, EstadoComision.COMPLETA].includes(c.estado));
  }

  // RN6: devuelve la lista de correlativas faltantes (E6.3 debe informarlas)
  verificarCorrelativas(est, traza) {
    const faltantes = [];
    for (const c of this.correlativas) {                // loop [para cada correlativa]
      const ok = est.tieneMateriaAprobada(c);
      traza && traza(`26: est.tieneMateriaAprobada(${c.nombre}) → ${ok}`, ok);
      if (!ok) faltantes.push(c);
    }
    return faltantes;
  }
}


// ---------- Docente ----------
class Docente {
  constructor(legajo, dni, nombre, apellido, email, especialidad, estado = EstadoRegistro.ACTIVO) {
    Object.assign(this, { legajo, dni, nombre, apellido, email, especialidad, estado });
    this.password = 'docente123';
    this.telefono = '';
    this.comisiones = [];                                // Docente 1 — 1..* Comision ("dicta")
  }
  nombreCompleto() { return `${this.apellido}, ${this.nombre}`; }
  nombreCorto() { return `${this.nombre} ${this.apellido}`; }
  estaActivo() { return this.estado === EstadoRegistro.ACTIVO; }

  consultarComisiones() { return this.comisiones.filter(c => c.estado !== EstadoComision.DADA_DE_BAJA); }
  estaACargo(com) { return this.comisiones.includes(com); }          // RN1 de CU02
  consultarInscriptos(com) { return com.getInscripciones(EstadoInscripcion.EN_CURSO); }

  registrarCalificacion(ins, tipo, nota, fecha, obs) { return ins.agregarCalificacion(tipo, nota, fecha, obs); }
  modificarCalificacion(cal, nota, fecha, obs) { cal.modificarNota(nota, fecha, obs); }

  registrarAsistencia(ins, fecha, presente) {
    if (!ins.estaEnCurso()) throw new Error('Solo se toma asistencia de inscripciones en curso.');
    const existente = ins.asistencias.find(a => a.fecha.getTime() === fecha.getTime());
    if (existente) { existente.modificar(presente); return existente; }
    const a = new Asistencia(fecha, presente);
    ins.asistencias.push(a);
    return a;
  }

  publicarContenido(com, titulo, descripcion, tipo) {
    if (!this.estaACargo(com)) throw new Error('Solo el docente a cargo puede publicar en la comisión.');
    const c = new ContenidoAcademico(titulo, descripcion, tipo, new Date());
    c.publicar();
    com.contenidos.unshift(c);
    return c;
  }
}


// ---------- Comision ----------
class Comision {
  constructor(codigo, materia, dia, horaInicio, horaFin, aula, docente, cupoMaximo, cupoDisponible, estado, id) {
    this.id = id || Contadores.comision++;
    Object.assign(this, { codigo, materia, dia, horaInicio, horaFin, aula, docente, cupoMaximo, cupoDisponible, estado });
    this.inscripciones = [];                             // Comision 1 — 0..* Inscripcion ("recibe")
    this.contenidos = [];
    materia.comisiones.push(this);
    docente.comisiones.push(this);
  }
  horario() { return `${this.dia} ${this.horaInicio} a ${this.horaFin}`; }
  nombre() { return `${this.materia.nombre} · ${this.codigo}`; }
  getInscripciones(estado) { return this.inscripciones.filter(i => !estado || i.estado === estado); }

  // RN4 + RN9: hay cupo y la comisión está en período de inscripción
  verificarCupo() { return this.estado === EstadoComision.ABIERTA && this.cupoDisponible > 0; }

  // RN8 – operación atómica (región critical del DS01, mensajes 35 a 39)
  reservarCupo(traza) {
    if (!this.verificarCupo()) return false;
    this.decrementarCupo();
    traza && traza('36: com.decrementarCupo() → cupoDisponible = ' + this.cupoDisponible);
    if (this.cupoDisponible === 0) {                    // opt [cupoDisponible == 0]
      this.setEstado(EstadoComision.COMPLETA);
      traza && traza('37: com.setEstado(COMPLETA)  (DE02: Abierta → Completa)', 'estado');
    }
    return true;
  }
  decrementarCupo() { this.cupoDisponible--; }

  // RN8: se libera al rechazar o cancelar (DE02: Completa → Abierta)
  liberarCupo() {
    this.cupoDisponible = Math.min(this.cupoDisponible + 1, this.cupoMaximo);
    if (this.estado === EstadoComision.COMPLETA) this.setEstado(EstadoComision.ABIERTA);
  }

  // DE02: Creada → Abierta
  abrirInscripcion() {
    if (this.estado !== EstadoComision.CREADA) throw new Error('Solo se puede abrir la inscripción de una comisión creada.');
    this.setEstado(this.cupoDisponible > 0 ? EstadoComision.ABIERTA : EstadoComision.COMPLETA);
  }

  // DE02: Período de inscripción → En curso. Aprobadas → EN_CURSO, Pendientes → RECHAZADA (DE01)
  iniciarCursada() {
    if (![EstadoComision.ABIERTA, EstadoComision.COMPLETA].includes(this.estado)) {
      throw new Error('Solo se puede iniciar la cursada de una comisión con la inscripción abierta.');
    }
    const iniciadas = [], rechazadas = [];
    this.getInscripciones(EstadoInscripcion.APROBADA).forEach(i => { i.iniciarCursada(); iniciadas.push(i); });
    this.getInscripciones(EstadoInscripcion.PENDIENTE).forEach(i => { i.rechazar('Cierre del período de inscripción sin revisión'); rechazadas.push(i); });
    this.setEstado(EstadoComision.EN_CURSO);
    return { iniciadas, rechazadas };
  }

  // DE02: En curso → Finalizada [notas finales cargadas]
  finalizarCursada() {
    if (this.estado !== EstadoComision.EN_CURSO) throw new Error('Solo se puede finalizar una comisión en curso.');
    const enCurso = this.getInscripciones(EstadoInscripcion.EN_CURSO);
    const sinFinal = enCurso.filter(i => !i.getCalificacion(TipoCalificacion.FINAL));
    if (sinFinal.length) {
      throw new Error(`Falta cargar la nota final de ${sinFinal.length} estudiante${sinFinal.length > 1 ? 's' : ''}: ${sinFinal.map(i => i.estudiante.nombreCompleto()).join('; ')}.`);
    }
    enCurso.forEach(i => i.finalizar());
    this.setEstado(EstadoComision.FINALIZADA);
    return enCurso;
  }

  // DE02: baja lógica (RF16), solo si la cursada no se inició
  darDeBaja() {
    if ([EstadoComision.EN_CURSO, EstadoComision.FINALIZADA].includes(this.estado)) {
      throw new Error('No se puede dar de baja una comisión en curso o finalizada: sus estudiantes quedarían sin calificación.');
    }
    if (this.estado === EstadoComision.DADA_DE_BAJA) throw new Error('La comisión ya está dada de baja.');
    const afectadas = this.inscripciones.filter(i => i.estaActiva());
    afectadas.forEach(i => i.cancelar());
    this.setEstado(EstadoComision.DADA_DE_BAJA);
    return afectadas;
  }
  setEstado(e) { this.estado = e; }
}


// ---------- Calificacion (DE04) ----------
class Calificacion {
  constructor(tipo, nota, fecha, observaciones = '', estado = EstadoCalificacion.REGISTRADA) {
    Object.assign(this, { tipo, nota, fecha, observaciones, estado });
    this.notaAnterior = null;
    this.motivoAnulacion = '';
  }
  validarNota() { return typeof this.nota === 'number' && !isNaN(this.nota) && this.nota >= 1 && this.nota <= 10; }   // RN4 CU02
  estaVigente() { return [EstadoCalificacion.REGISTRADA, EstadoCalificacion.MODIFICADA].includes(this.estado); }

  modificarNota(nota, fecha, obs) {
    if (!this.estaVigente()) throw new Error('La calificación está cerrada y no admite cambios.');
    if (!(nota >= 1 && nota <= 10)) throw new Error('La nota debe estar entre 1 y 10.');
    this.notaAnterior = this.nota;
    Object.assign(this, { nota, fecha, observaciones: obs ?? this.observaciones, estado: EstadoCalificacion.MODIFICADA });
  }
  cerrar() { if (this.estaVigente()) this.estado = EstadoCalificacion.CERRADA; }
  anular(motivo) {
    if (!this.estaVigente()) throw new Error('Solo se anula una calificación vigente.');
    this.estado = EstadoCalificacion.ANULADA;
    this.motivoAnulacion = motivo;
  }
}


// ---------- Asistencia ----------
class Asistencia {
  constructor(fecha, presente, observaciones = '') { Object.assign(this, { fecha, presente, observaciones }); }
  registrar(presente) { this.presente = presente; }
  modificar(presente) { this.presente = presente; }
}


// ---------- ContenidoAcademico ----------
class ContenidoAcademico {
  constructor(titulo, descripcion, tipo, fechaPublicacion) {
    Object.assign(this, { titulo, descripcion, tipo, fechaPublicacion });
    this.publicado = false;
  }
  publicar() { this.publicado = true; }
}


// ---------- Inscripcion (DE01) ----------
class Inscripcion {
  constructor(est, com, fecha = new Date(), comprobante) {
    this.estudiante = est;
    this.comision = com;
    this.fecha = fecha;
    this.estado = null;
    this.motivoRechazo = '';
    this.calificaciones = [];                            // composición
    this.asistencias = [];
    this.comprobante = comprobante || numero('INS', Contadores.comprobante++);
    com.inscripciones.push(this);
  }

  // Privada en el diagrama de clases: solo la usan las operaciones del ciclo de vida (DE01)
  #cambiarEstado(nuevo) { this.estado = nuevo; }
  setEstado(e) { this.#cambiarEstado(e); }             // usada al crearla (mensaje 42)

  #transicion(desde, hacia) {
    if (!desde.includes(this.estado)) throw new Error(`Transición no permitida por el DE01: ${this.estado} → ${hacia}`);
    this.#cambiarEstado(hacia);
  }
  aprobar() { this.#transicion([EstadoInscripcion.PENDIENTE], EstadoInscripcion.APROBADA); }
  rechazar(motivo) {
    this.#transicion([EstadoInscripcion.PENDIENTE], EstadoInscripcion.RECHAZADA);
    this.motivoRechazo = motivo;
    this.comision.liberarCupo();                         // entry / com.liberarCupo()
  }
  cancelar() {
    this.#transicion([EstadoInscripcion.PENDIENTE, EstadoInscripcion.APROBADA], EstadoInscripcion.CANCELADA);
    this.comision.liberarCupo();
  }
  iniciarCursada() { this.#transicion([EstadoInscripcion.APROBADA], EstadoInscripcion.EN_CURSO); }
  finalizar() {
    this.#transicion([EstadoInscripcion.EN_CURSO], EstadoInscripcion.FINALIZADA);
    this.calificaciones.forEach(c => c.cerrar());       // entry / cerrar calificaciones
  }

  estaActiva() { return ESTADOS_ACTIVOS.includes(this.estado); }      // RN5
  estaEnCurso() { return this.estado === EstadoInscripcion.EN_CURSO; }

  // RN6: Finalizada con calificación FINAL aprobada (4 o más) y Cerrada
  estaAprobada() {
    return this.estado === EstadoInscripcion.FINALIZADA &&
      this.calificaciones.some(c => c.tipo === TipoCalificacion.FINAL && c.nota >= 4 && c.estado === EstadoCalificacion.CERRADA);
  }
  getCalificaciones() { return this.calificaciones.filter(c => c.estado !== EstadoCalificacion.ANULADA); }
  getCalificacion(tipo) { return this.getCalificaciones().find(c => c.tipo === tipo) || null; }
  notaFinal() { const f = this.getCalificacion(TipoCalificacion.FINAL); return f ? f.nota : null; }

  // Composición: la Inscripción crea sus calificaciones. Si la nota no es válida se descarta (E8.1)
  agregarCalificacion(tipo, nota, fecha, obs = '', estado = EstadoCalificacion.REGISTRADA) {
    const c = new Calificacion(tipo, nota, fecha, obs, estado);
    if (!c.validarNota()) return null;
    this.calificaciones.push(c);
    return c;
  }

  porcentajeAsistencia() {
    if (!this.asistencias.length) return null;
    return Math.round(this.asistencias.filter(a => a.presente).length * 100 / this.asistencias.length);
  }
}


// ---------- Certificado (RF26 · EstadoCertificado) ----------
class Certificado {
  constructor(tipo, estudiante, inscripcion = null, presentarAnte = '', fechaExamen = null, fechaSolicitud = new Date(), numeroCert) {
    Object.assign(this, { tipo, estudiante, inscripcion, presentarAnte, fechaExamen, fechaSolicitud });
    this.numero = numeroCert || numero('CON', Contadores.certificado++);
    this.estado = EstadoCertificado.SOLICITADO;
    this.motivoRechazo = '';
    this.fechaEmision = null;
    this.fechaEnvio = null;
    this.codigoVerificacion = '';
  }
  // SOLICITADO → GENERADO
  generar() {
    if (this.estado !== EstadoCertificado.SOLICITADO) throw new Error('Solo se genera un certificado solicitado.');
    this.fechaEmision = new Date();
    let h = 0;
    for (const ch of this.numero + this.estudiante.dni + this.fechaEmision.getTime()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    this.codigoVerificacion = h.toString(36).toUpperCase().padStart(7, '0').slice(0, 8);
    this.estado = EstadoCertificado.GENERADO;
  }
  // GENERADO → ENVIADO
  enviarPorCorreo() {
    if (this.estado !== EstadoCertificado.GENERADO) throw new Error('El certificado debe estar generado para enviarlo.');
    this.fechaEnvio = new Date();
    this.estado = EstadoCertificado.ENVIADO;
  }
  // SOLICITADO → RECHAZADO
  rechazar(motivo) {
    if (this.estado !== EstadoCertificado.SOLICITADO) throw new Error('Solo se rechaza un certificado solicitado.');
    this.estado = EstadoCertificado.RECHAZADO;
    this.motivoRechazo = motivo;
  }
  estaDisponible() { return [EstadoCertificado.GENERADO, EstadoCertificado.ENVIADO].includes(this.estado); }
}


// ---------- Estudiante (DE03) ----------
class Estudiante {
  constructor(legajo, dni, nombre, apellido, email, estado, fechaNacimiento = null) {
    Object.assign(this, { legajo, dni, nombre, apellido, email, estado, fechaNacimiento });
    this.password = 'alumno123';
    this.telefono = '';
    this.matriculas = [];                                // Estudiante 1 — 1..* Matricula
    this.inscripciones = [];
    this.certificados = [];
  }
  nombreCompleto() { return `${this.apellido}, ${this.nombre}`; }
  nombreCorto() { return `${this.nombre.split(' ')[0]} ${this.apellido}`; }

  estaHabilitado() { return this.estado === EstadoEstudiante.HABILITADO; }   // RN1 / DE03

  // Recorre sus matrículas y devuelve la carrera de la matrícula ACTIVA
  getCarreraActiva() {
    const m = this.matriculas.find(x => x.esActiva());
    return m ? m.carrera : null;
  }
  getMatriculaActiva() { return this.matriculas.find(x => x.esActiva()) || null; }

  tieneInscripcionActiva(m) {                           // RN5
    return this.inscripciones.some(i => i.comision.materia === m && i.estaActiva());
  }
  tieneMateriaAprobada(m) {                             // RN6
    return this.inscripciones.some(i => i.comision.materia === m && i.estaAprobada());
  }
  agregarInscripcion(ins) { this.inscripciones.push(ins); }    // DS01 mensaje 43
  cancelarInscripcion(ins) { ins.cancelar(); }
  consultarInscripciones() { return this.inscripciones.slice(); }
  consultarHistorial() { return this.inscripciones.filter(i => i.estado === EstadoInscripcion.FINALIZADA); }

  // RF26: solicita un certificado de alumno regular o de examen
  solicitarCertificado(tipo, inscripcion, presentarAnte, fechaExamen) {
    if (!this.estaHabilitado()) throw new Error('Tu cuenta no está habilitada para pedir constancias.');
    if (!this.getCarreraActiva()) throw new Error('Necesitás una matrícula activa para pedir una constancia.');
    if (tipo === TipoCertificado.EXAMEN) {
      if (!inscripcion || !inscripcion.estaEnCurso()) throw new Error('La constancia de examen es para una materia que estés cursando.');
      if (!fechaExamen) throw new Error('Indicá la fecha del examen.');
    }
    const repetida = this.certificados.find(c => c.estado === EstadoCertificado.SOLICITADO && c.tipo === tipo && c.inscripcion === (inscripcion || null));
    if (repetida) throw new Error(`Ya tenés una solicitud igual en revisión (${repetida.numero}).`);
    const c = new Certificado(tipo, this, inscripcion || null, presentarAnte || 'quien corresponda', fechaExamen || null);
    this.certificados.unshift(c);
    return c;
  }

  // DE03: Registrado → Habilitado [matrícula activa]
  habilitar() {
    if (![EstadoEstudiante.REGISTRADO, EstadoEstudiante.INHABILITADO].includes(this.estado)) throw new Error('El estudiante ya está habilitado o egresó.');
    if (!this.getCarreraActiva()) throw new Error('Para habilitarlo necesita al menos una matrícula activa.');
    this.estado = EstadoEstudiante.HABILITADO;
  }
  // DE03: Habilitado → Inhabilitado / entry: cancelar inscripciones Pendientes
  darDeBaja() {
    if (this.estado !== EstadoEstudiante.HABILITADO) throw new Error('Solo se inhabilita a un estudiante habilitado.');
    const canceladas = this.inscripciones.filter(i => i.estado === EstadoInscripcion.PENDIENTE);
    canceladas.forEach(i => i.cancelar());
    this.estado = EstadoEstudiante.INHABILITADO;
    return canceladas;
  }
}


// ---------- Administrador (actor secundario de CU01) ----------
class Administrador {
  constructor(usuario, dni, nombre, apellido, email) {
    Object.assign(this, { usuario, dni, nombre, apellido, email });
    this.password = 'admin123';
  }
  nombreCorto() { return `${this.nombre} ${this.apellido}`; }

  revisarSolicitud(i, aprobar, motivo) {
    if (aprobar) {
      if (!i.estudiante.estaHabilitado()) throw new Error('El estudiante ya no está habilitado: no se puede aprobar.');
      i.aprobar();
    } else {
      i.rechazar(motivo);
    }
  }

  revisarCertificado(c, aprobar, motivo) {
    if (aprobar) { c.generar(); c.enviarPorCorreo(); }
    else c.rechazar(motivo);
  }

  // RF14: alta de comisión en estado CREADA
  crearComision({ materia, codigo, docente, dia, horaInicio, horaFin, aula, cupoMaximo }) {
    if (!materia || !docente || !codigo || !dia || !horaInicio || !horaFin || !aula || !cupoMaximo) throw new Error('Completá todos los campos.');
    if (!docente.estaActivo()) throw new Error('El docente elegido no está activo.');
    if (horaFin <= horaInicio) throw new Error('El horario de fin tiene que ser posterior al de inicio.');
    if (!(cupoMaximo >= 1 && cupoMaximo <= 200)) throw new Error('El cupo tiene que estar entre 1 y 200.');
    if (materia.comisiones.some(c => c.codigo === codigo && c.estado !== EstadoComision.DADA_DE_BAJA && c.estado !== EstadoComision.FINALIZADA)) {
      throw new Error(`Ya existe la comisión ${codigo} para ${materia.nombre}.`);
    }
    const choque = docente.consultarComisiones().find(c =>
      [EstadoComision.CREADA, EstadoComision.ABIERTA, EstadoComision.COMPLETA, EstadoComision.EN_CURSO].includes(c.estado) &&
      c.dia === dia && c.horaInicio < horaFin && horaInicio < c.horaFin);
    if (choque) throw new Error(`${docente.nombreCorto()} ya dicta ${choque.nombre()} en ese horario.`);
    return new Comision(codigo, materia, dia, horaInicio, horaFin, aula, docente, cupoMaximo, cupoMaximo, EstadoComision.CREADA);
  }
}
