/* =====================================================================
   CONTROLADOR («control») – InscripcionController
   Coordina el CU01 "Inscribirse a Materia" en el mismo orden que el DS01.
   Los números de la traza son los números de mensaje del diagrama.
   ===================================================================== */

const InscripcionController = {

  // Mensajes 2 a 10: habilitación, carrera activa y materias
  iniciarInscripcion(est) {
    t(`2: iniciarInscripcion(legajo ${est.legajo})`, 'titulo');
    const habilitado = est.estaHabilitado();
    t(`3: est.estaHabilitado() → ${habilitado}`, habilitado);
    if (!habilitado) {                                   // break [E2 / RN1]
      t('break [estado != HABILITADO] → 4: error("Estudiante no habilitado")', false);
      return { ok: false, codigo: 'E2 · RN1', mensaje: 'Estudiante no habilitado.' };
    }
    const carrera = est.getCarreraActiva();
    t(`6: est.getCarreraActiva() → ${carrera ? carrera.nombre : 'ninguna'}`, !!carrera);
    const materias = carrera ? carrera.consultarMaterias() : [];
    t(`7: car.consultarMaterias() → ${materias.length} materias`);
    if (materias.length === 0) {                        // break [A2]
      t('break [lista vacía] → 8: aviso("Sin materias disponibles para su carrera")', false);
      return { ok: false, codigo: 'A2', mensaje: 'Sin materias disponibles para su carrera.' };
    }
    return { ok: true, carrera, materias };
  },

  // Mensajes 13 a 17
  obtenerComisiones(mat) {
    t(`13: obtenerComisiones(${mat.nombre})`, 'titulo');
    const comisiones = mat.consultarComisionesDisponibles();
    t(`14: mat.consultarComisionesDisponibles() → ${comisiones.map(c => c.codigo + ' ' + c.estado).join(', ') || 'ninguna'}`);
    const hayAbiertas = comisiones.some(c => c.estado === EstadoComision.ABIERTA);
    if (!hayAbiertas) t('break [sin comisiones ABIERTAS · A4] → 15: aviso("La materia no tiene comisiones abiertas")', false);
    return { comisiones, hayAbiertas };
  },

  // Mensajes 20 a 31: "Validar requisitos". Cada validación es un break:
  // si falla, el caso de uso no sigue y se informa el motivo.
  validarRequisitos(est, carrera, mat, com) {
    t(`20: validarRequisitos(est, ${mat.nombre}, ${com.codigo})`, 'titulo');
    const resultado = { carrera: null, inscripcion: null, correlativas: null, cupo: null };

    const pertenece = carrera.contieneMateria(mat);              // RN3
    t(`21: car.contieneMateria(${mat.nombre}) → ${pertenece}`, pertenece);
    resultado.carrera = pertenece;
    if (!pertenece) return falla(resultado, 'E6.2 · RN3', 'la materia no pertenece a su carrera.');

    const yaInscripto = est.tieneInscripcionActiva(mat);         // RN5
    t(`23: est.tieneInscripcionActiva(${mat.nombre}) → ${yaInscripto}`, !yaInscripto);
    resultado.inscripcion = !yaInscripto;
    if (yaInscripto) return falla(resultado, 'E6 · RN5', 'ya existe una inscripción activa a la materia.');

    t(`25: mat.verificarCorrelativas(est)`);
    const faltantes = mat.verificarCorrelativas(est, t);         // RN6 (loop, mensaje 26)
    t(`27: correlativasFaltantes → [${faltantes.map(f => f.nombre).join(', ')}]`, faltantes.length === 0);
    resultado.correlativas = faltantes.length === 0;
    if (faltantes.length) {
      const lista = faltantes.map(f => f.nombre).join(', ');
      return falla(resultado, 'E6.3 · RN6', `debe tener aprobada la correlativa ${lista}.`);
    }

    const hayCupo = com.verificarCupo();                         // RN4 y RN9
    t(`29: com.verificarCupo() → ${hayCupo}  (estado ${com.estado}, cupo ${com.cupoDisponible}/${com.cupoMaximo})`, hayCupo);
    resultado.cupo = hayCupo;
    if (!hayCupo) {
      if (com.estado === EstadoComision.COMPLETA) return falla(resultado, 'E6.1 · RN4', 'la comisión no tiene cupos disponibles.');
      return falla(resultado, 'E6.4 · RN9', 'la comisión no está en período de inscripción.');
    }

    t('31: resumen(est, carrera, mat, com, docente)', true);
    return { ok: true, resultado };
  },

  // Mensajes 34 a 44: confirmación con región crítica
  confirmarInscripcion(est, com) {
    t(`34: confirmarInscripcion(est, ${com.codigo})`, 'titulo');
    t('critical [verificación y descuento atómico del cupo · RN8]', 'titulo');
    t('35: com.reservarCupo()  {atómica}');
    const reservado = com.reservarCupo(t);
    t(reservado ? '38: true' : '39: false  [otro estudiante ocupó el último cupo · E9]', reservado);
    if (!reservado) {
      t('40: error("La comisión se quedó sin cupo")', false);
      return { ok: false, codigo: 'E9', mensaje: 'La comisión se quedó sin cupo: otro estudiante ocupó el último lugar.' };
    }
    const ins = new Inscripcion(est, com);
    t(`41: «create» Inscripcion(est, ${com.codigo})`, 'estado');
    ins.setEstado(EstadoInscripcion.PENDIENTE);
    t('42: ins.setEstado(PENDIENTE)  (RN7: toda inscripción nace Pendiente)', 'estado');
    est.agregarInscripcion(ins);
    t('43: est.agregarInscripcion(ins)');
    t(`44: comprobante(${ins.comprobante})`, true);
    // La solicitud queda disponible para el Administrador (actor secundario de CU01)
    Notificador.notificar('A', 'Nueva solicitud de inscripción',
      `${est.nombreCorto()} pidió inscribirse a ${com.materia.nombre}, ${com.codigo}.`, '#/admin/inscripciones');
    return { ok: true, inscripcion: ins };
  }
};
