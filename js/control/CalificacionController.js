/* =====================================================================
   CONTROLADOR («control») – CalificacionController
   Coordina el CU02 "Registrar Calificación" en el mismo orden que el DS02.
   Además resuelve asistencia y avisos del docente (Módulo 3 del diagrama de CU).
   ===================================================================== */

const CalificacionController = {

  // Mensajes 2 a 6: comisiones a cargo del docente
  obtenerComisiones(doc) {
    t(`2: obtenerComisiones(${doc.legajo})`, 'titulo');
    const comisiones = doc.consultarComisiones();
    t(`3: doc.consultarComisiones() → ${comisiones.length} comisiones`);
    if (!comisiones.length) {
      t('break [lista vacía · A2] → 4: aviso("No tiene comisiones asignadas")', false);
      return { ok: false, codigo: 'A2', mensaje: 'No tenés comisiones asignadas.' };
    }
    return { ok: true, comisiones };
  },

  // Mensajes 9 a 16: inscriptos EN_CURSO de una comisión a cargo
  obtenerInscriptos(doc, com) {
    t(`9: obtenerInscriptos(${com.nombre()})`, 'titulo');
    const aCargo = doc.estaACargo(com);
    t(`10: doc.estaACargo(${com.codigo}) → ${aCargo}`, aCargo);
    if (!aCargo) {                                        // break [false · RN1]
      t('break [false · RN1] → 11: error("Acceso no autorizado a la comisión")', false);
      return { ok: false, codigo: 'RN1', mensaje: 'Acceso no autorizado a la comisión.' };
    }
    t('12: doc.consultarInscriptos(com)');
    const inscriptos = doc.consultarInscriptos(com);
    t(`13: com.getInscripciones(EN_CURSO) → ${inscriptos.length}`);
    if (!inscriptos.length) {                             // break [lista vacía · A4]
      t('break [lista vacía · A4] → 15: aviso("La comisión no tiene estudiantes inscriptos")', false);
      return { ok: true, inscriptos, vacia: true };
    }
    t(`16: inscriptos (con calificaciones)`, true);
    return { ok: true, inscriptos };
  },

  // Mensajes 19 a 21
  obtenerCalificaciones(ins) {
    t(`18: seleccionarEstudiante(${ins.estudiante.nombreCompleto()})`, 'titulo');
    const cal = ins.getCalificaciones();
    t(`19: obtenerCalificaciones(ins) · 20: ins.getCalificaciones() → ${cal.length}`);
    return cal;
  },

  // Mensajes 24 a 45: validaciones, registro (alt) o modificación (A6)
  registrarCalificacion(doc, ins, tipo, nota, fecha, obs) {
    t(`24: registrarCalificacion(ins, ${tipo || '—'}, ${nota ?? '—'}, ${fecha ? fecha.toLocaleDateString('es-AR') : '—'})`, 'titulo');

    const completos = !!(tipo && nota !== null && nota !== '' && !isNaN(nota) && fecha);
    t(`25: validarObligatorios() → ${completos}`, completos);
    if (!completos) return falla(null, 'E8', 'Faltan completar campos: tipo, nota y fecha son obligatorios.');

    const fechaOk = fecha instanceof Date && !isNaN(fecha) && fecha <= new Date() && fecha.getFullYear() >= 2026;
    t(`27: validarFecha(fecha) → ${fechaOk}`, fechaOk);
    if (!fechaOk) return falla(null, 'E8.2', 'La fecha no es válida: no puede ser futura ni anterior al ciclo lectivo.');

    const existente = ins.getCalificacion(tipo);
    const admite = ins.estaEnCurso() && (!existente || existente.estaVigente());
    t(`29: ins.estaEnCurso() → ${ins.estaEnCurso()}${existente ? ` · calificación ${existente.estado}` : ''}`, admite);
    if (!admite) return falla(null, 'E8.3', 'La inscripción no admite cambios: la cursada no está en curso o la nota está cerrada.');

    if (!existente) {                                    // alt [no existe calificación de ese tipo]
      t(`31: doc.registrarCalificacion(ins, ${tipo}, ${nota})`);
      t(`32: ins.agregarCalificacion(${tipo}, ${nota}, fecha, obs) · 33: «create» Calificacion`, 'estado');
      const cal = doc.registrarCalificacion(ins, tipo, nota, fecha, obs);
      if (!cal) {                                         // alt [nota fuera de escala · E8.1]
        t('34: cal.validarNota() → false · 35: «destroy» · 36–37: null', false);
        t('38: error("La nota no es válida")', false);
        return { ok: false, codigo: 'E8.1 · RN4', mensaje: 'La nota no es válida: tiene que estar entre 1 y 10.' };
      }
      t('34: cal.validarNota() → true · estado REGISTRADA (DE04)', true);
      t('40–41: cal');
    } else {                                             // [ya existe · A6]
      if (!(nota >= 1 && nota <= 10)) {
        t('43: cal.modificarNota() → nota fuera de escala', false);
        return { ok: false, codigo: 'E8.1 · RN4', mensaje: 'La nota no es válida: tiene que estar entre 1 y 10.' };
      }
      t(`42: doc.modificarCalificacion(cal, ${nota}) [A6]`);
      doc.modificarCalificacion(existente, nota, fecha, obs);
      t(`43: cal.modificarNota(${nota}) → estado MODIFICADA (DE04), anterior ${existente.notaAnterior}`, 'estado');
    }
    t('44: ok + listado actualizado', true);
    t('45: mostrarExito("Calificación registrada correctamente")', true);
    Notificador.notificar(ins.estudiante, existente ? 'Calificación modificada' : 'Nueva calificación',
      `${ins.comision.materia.nombre}: ${etiquetaTipo(tipo)} ${nota}.`, '#/perfil/cursada');
    return { ok: true, modificada: !!existente };
  },

  tomarAsistencia(doc, com, fecha, presentes) {
    if (!doc.estaACargo(com)) throw new Error('Acceso no autorizado a la comisión.');
    if (!(fecha instanceof Date) || isNaN(fecha) || fecha > new Date()) throw new Error('Elegí una fecha válida que no sea futura.');
    const inscriptos = doc.consultarInscriptos(com);
    inscriptos.forEach(i => doc.registrarAsistencia(i, fecha, presentes.includes(i.comprobante)));
    return inscriptos.length;
  },

  publicarAviso(doc, com, titulo, descripcion, tipo) {
    if (!titulo.trim() || !descripcion.trim()) throw new Error('Completá el título y el mensaje.');
    const c = doc.publicarContenido(com, titulo.trim(), descripcion.trim(), tipo);
    const destinatarios = com.inscripciones.filter(i => [EstadoInscripcion.EN_CURSO, EstadoInscripcion.APROBADA].includes(i.estado));
    destinatarios.forEach(i => Notificador.notificar(i.estudiante,
      `${tipo === TipoContenido.MATERIAL ? 'Nuevo material' : 'Aviso'} de ${com.materia.nombre}`, `${c.titulo}: ${c.descripcion}`, '#/perfil/cursada'));
    return destinatarios.length;
  },
};

const etiquetaTipo = tipo => ({ PARCIAL: 'Parcial', TP: 'Trabajo práctico', RECUPERATORIO: 'Recuperatorio', FINAL: 'Nota final' }[tipo] || tipo);
