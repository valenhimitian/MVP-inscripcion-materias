/* =====================================================================
   ENUMERACIONES («enumeration») – diagrama de clases v2.0
   Cada estado coincide con su diagrama de estados (DE01 a DE04).
   ===================================================================== */

const EstadoInscripcion = Object.freeze({               // DE01
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
const EstadoCalificacion = Object.freeze({              // DE04
  REGISTRADA: 'REGISTRADA', MODIFICADA: 'MODIFICADA', CERRADA: 'CERRADA', ANULADA: 'ANULADA'
});
const EstadoMatricula = Object.freeze({ ACTIVA: 'ACTIVA', EGRESADO: 'EGRESADO', BAJA: 'BAJA' });
const TipoCalificacion = Object.freeze({ PARCIAL: 'PARCIAL', TP: 'TP', RECUPERATORIO: 'RECUPERATORIO', FINAL: 'FINAL' });
const EstadoCertificado = Object.freeze({ SOLICITADO: 'SOLICITADO', GENERADO: 'GENERADO', ENVIADO: 'ENVIADO', RECHAZADO: 'RECHAZADO' });
const TipoCertificado = Object.freeze({ ALUMNO_REGULAR: 'ALUMNO_REGULAR', EXAMEN: 'EXAMEN' });
const TipoContenido = Object.freeze({ MATERIAL: 'MATERIAL', AVISO: 'AVISO' });
const EstadoRegistro = Object.freeze({ ACTIVO: 'ACTIVO', INACTIVO: 'INACTIVO' });

// Estados que RN5 considera "activos" (estado compuesto Activa del DE01)
const ESTADOS_ACTIVOS = [EstadoInscripcion.PENDIENTE, EstadoInscripcion.APROBADA, EstadoInscripcion.EN_CURSO];
