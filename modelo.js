/* =====================================================================
   MODELO DE DOMINIO («entity»)
   Clases, atributos, operaciones y enumeraciones del diagrama de clases
   (versión 2.0) del TP – Segundo Parcial.
   ===================================================================== */

// ---------- Enumeraciones ----------
const EstadoInscripcion = Object.freeze({
  PENDIENTE: 'PENDIENTE', APROBADA: 'APROBADA', RECHAZADA: 'RECHAZADA',
  EN_CURSO: 'EN_CURSO', FINALIZADA: 'FINALIZADA', CANCELADA: 'CANCELADA'
});
const EstadoComision = Object.freeze({                  // DE02
  CREADA: 'CREADA', ABIERTA: 'ABIERTA', COMPLETA: 'COMPLETA',
  EN_CURSO: 'EN_CURSO', FINALIZADA: 'FINALIZADA', DADA_DE_BAJA: 'DADA_DE_BAJA'
});
const EstadoEstudiante = Object.freeze({                // DE03
  REGISTRADO: 'REGISTRADO', HABILITADO: 'HABILITADO', INHABILITADO: 'INHABILITADO', EGRESADO: 'EGRESADO'
});
const EstadoMatricula = Object.freeze({ ACTIVA: 'ACTIVA', EGRESADO: 'EGRESADO', BAJA: 'BAJA' });
const EstadoCalificacion = Object.freeze({              // DE04
  REGISTRADA: 'REGISTRADA', MODIFICADA: 'MODIFICADA', CERRADA: 'CERRADA', ANULADA: 'ANULADA'
});
const TipoCalificacion = Object.freeze({ PARCIAL: 'PARCIAL', TP: 'TP', RECUPERATORIO: 'RECUPERATORIO', FINAL: 'FINAL' });

// Estados que RN5 considera "activos" (estado compuesto Activa del DE01)
const ESTADOS_ACTIVOS = [EstadoInscripcion.PENDIENTE, EstadoInscripcion.APROBADA, EstadoInscripcion.EN_CURSO];


// ---------- Carrera ----------
class Carrera {
  constructor(codigo, nombre) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.materias = [];                                  // agregación Carrera ◇— Materia
  }
  asociarMateria(m) { this.materias.push(m); }
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

  // Comisiones que se muestran en la oferta (no se listan las ya finalizadas)
  consultarComisionesDisponibles() {
    return this.comisiones.filter(c => c.estado !== EstadoComision.FINALIZADA && c.estado !== EstadoComision.DADA_DE_BAJA);
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


// ---------- Comision ----------
class Comision {
  constructor(codigo, materia, dia, horaInicio, horaFin, aula, docente, cupoMaximo, cupoDisponible, estado) {
    Object.assign(this, { codigo, materia, dia, horaInicio, horaFin, aula, docente, cupoMaximo, cupoDisponible, estado });
    materia.comisiones.push(this);
  }
  horario() { return `${this.dia} ${this.horaInicio} a ${this.horaFin}`; }

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
    if (this.estado !== EstadoComision.CREADA) throw new Error('Solo se puede abrir una comisión en estado CREADA (DE02).');
    this.setEstado(this.cupoDisponible > 0 ? EstadoComision.ABIERTA : EstadoComision.COMPLETA);
  }
  setEstado(e) { this.estado = e; }
}


// ---------- Calificacion ----------
class Calificacion {
  constructor(tipo, nota, fecha, estado = EstadoCalificacion.REGISTRADA) {
    Object.assign(this, { tipo, nota, fecha, estado });
  }
  validarNota() { return Number.isInteger(this.nota) && this.nota >= 1 && this.nota <= 10; }
}


// ---------- Inscripcion ----------
let proximoComprobante = 418;

class Inscripcion {
  constructor(est, com, fecha = new Date()) {
    this.estudiante = est;
    this.comision = com;
    this.fecha = fecha;
    this.estado = null;
    this.motivoRechazo = '';
    this.calificaciones = [];                            // composición
    this.comprobante = 'INS-2026-' + String(proximoComprobante++).padStart(5, '0');
  }

  // Privada en el diagrama de clases: solo la usan las operaciones del ciclo de vida (DE01)
  #cambiarEstado(nuevo) { this.estado = nuevo; }
  setEstado(e) { this.#cambiarEstado(e); }             // usada al crearla (mensaje 42)

  #transicion(desde, hacia) {
    if (!desde.includes(this.estado)) {
      throw new Error(`Transición no permitida por el DE01: ${this.estado} → ${hacia}`);
    }
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

  estaActiva() { return ESTADOS_ACTIVOS.includes(this.estado); }      // RN5
  estaEnCurso() { return this.estado === EstadoInscripcion.EN_CURSO; }

  // RN6: Finalizada con calificación FINAL aprobada (4 o más) y Cerrada
  estaAprobada() {
    return this.estado === EstadoInscripcion.FINALIZADA &&
      this.calificaciones.some(c => c.tipo === TipoCalificacion.FINAL && c.nota >= 4 && c.estado === EstadoCalificacion.CERRADA);
  }
  agregarCalificacion(tipo, nota, fecha, estado) {
    const c = new Calificacion(tipo, nota, fecha, estado);
    this.calificaciones.push(c);
    return c;
  }
}


// ---------- Estudiante ----------
class Estudiante {
  constructor(legajo, nombre, apellido, estado) {
    Object.assign(this, { legajo, nombre, apellido, estado });
    this.matriculas = [];                                // Estudiante 1 — 1..* Matricula
    this.inscripciones = [];
  }
  nombreCompleto() { return `${this.apellido}, ${this.nombre}`; }

  estaHabilitado() { return this.estado === EstadoEstudiante.HABILITADO; }   // RN1 / DE03

  // Recorre sus matrículas y devuelve la carrera de la matrícula ACTIVA
  getCarreraActiva() {
    const m = this.matriculas.find(x => x.esActiva());
    return m ? m.carrera : null;
  }

  tieneInscripcionActiva(m) {                           // RN5
    return this.inscripciones.some(i => i.comision.materia === m && i.estaActiva());
  }
  tieneMateriaAprobada(m) {                             // RN6
    return this.inscripciones.some(i => i.comision.materia === m && i.estaAprobada());
  }
  agregarInscripcion(ins) { this.inscripciones.push(ins); }    // DS01 mensaje 43
  cancelarInscripcion(ins) { ins.cancelar(); }
  consultarInscripciones() { return this.inscripciones.slice(); }
}


// ---------- Administrador (actor secundario de CU01) ----------
class Administrador {
  constructor(usuario) { this.usuario = usuario; }
  revisarSolicitud(i, aprobar, motivo) {
    if (aprobar) {
      if (!i.estudiante.estaHabilitado()) throw new Error('El estudiante ya no está habilitado: no se puede aprobar.');
      i.aprobar();
    } else {
      i.rechazar(motivo);
    }
  }
}
