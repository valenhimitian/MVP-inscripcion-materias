/* =====================================================================
   CONTROLADORES DE GESTIÓN
   TramiteController: el estudiante pide constancias (RF26).
   GestionController: operaciones de la administración académica
   (revisar solicitudes, trámites, comisiones, estudiantes y docentes).
   Cada operación aplica la regla en la entidad y avisa a los afectados.
   ===================================================================== */

const nombreCertificado = tipo => tipo === TipoCertificado.EXAMEN ? 'constancia de examen' : 'constancia de alumno regular';

const TramiteController = {
  solicitarConstancia(est, tipo, inscripcion, presentarAnte, fechaExamen) {
    const c = est.solicitarCertificado(tipo, inscripcion, presentarAnte, fechaExamen);
    Notificador.notificar('A', 'Nueva solicitud de constancia',
      `${est.nombreCorto()} pidió una ${nombreCertificado(tipo)} (${c.numero}).`, '#/admin/tramites');
    Notificador.notificar(est, 'Recibimos tu solicitud',
      `Tu ${nombreCertificado(tipo)} (${c.numero}) quedó en revisión. Te avisamos cuando esté lista.`, '#/perfil/tramites');
    return c;
  },
};

const GestionController = {
  // ---------- Inscripciones (CU01 · actor secundario) ----------
  revisarInscripcion(ins, aprobar, motivo) {
    D.admin.revisarSolicitud(ins, aprobar, motivo);
    const c = ins.comision;
    Notificador.notificar(ins.estudiante, aprobar ? 'Inscripción aprobada' : 'Inscripción rechazada',
      aprobar ? `Tu inscripción a ${c.materia.nombre}, ${c.codigo}, fue aprobada.`
              : `Tu inscripción a ${c.materia.nombre}, ${c.codigo}, fue rechazada. Motivo: ${motivo}.`, '#/perfil/cursada');
    if (aprobar) Notificador.notificar(c.docente, 'Nuevo estudiante en tu comisión', `${ins.estudiante.nombreCorto()} se sumó a ${c.nombre()}.`, `#/docente/comision/${c.id}`);
  },

  // ---------- Constancias: generar, enviar por correo y notificar ----------
  revisarConstancia(cert, aprobar, motivo) {
    D.admin.revisarCertificado(cert, aprobar, motivo);
    const e = cert.estudiante;
    if (aprobar) {
      Correo.enviar(e.email, `Tu ${nombreCertificado(cert.tipo)} ${cert.numero}`,
        `Hola ${e.nombre.split(' ')[0]}: adjuntamos la ${nombreCertificado(cert.tipo)} que pediste. Código de verificación: ${cert.codigoVerificacion}.`, cert.numero);
      Notificador.notificar(e, 'Tu constancia está lista',
        `Te enviamos la ${nombreCertificado(cert.tipo)} ${cert.numero} a ${e.email}. También podés descargarla desde Trámites.`, '#/perfil/tramites');
    } else {
      Notificador.notificar(e, 'Constancia rechazada', `Tu solicitud ${cert.numero} fue rechazada. Motivo: ${motivo}.`, '#/perfil/tramites');
    }
  },

  // ---------- Comisiones / cursadas (DE02) ----------
  crearComision(datos) {
    const c = D.admin.crearComision(datos);
    D.comisiones.push(c);
    Notificador.notificar(c.docente, 'Comisión asignada', `Se te asignó ${c.nombre()} (${c.horario()}).`, `#/docente/comision/${c.id}`);
    return c;
  },
  abrirInscripcion(c) { c.abrirInscripcion(); },
  iniciarCursada(c) {
    const r = c.iniciarCursada();
    r.iniciadas.forEach(i => Notificador.notificar(i.estudiante, 'Empezó la cursada', `${c.nombre()} ya está en curso.`, '#/perfil/cursada'));
    r.rechazadas.forEach(i => Notificador.notificar(i.estudiante, 'Inscripción rechazada',
      `Tu solicitud a ${c.nombre()} no se revisó antes del inicio de la cursada.`, '#/perfil/cursada'));
    Notificador.notificar(c.docente, 'Empezó tu cursada', `${c.nombre()}: ${r.iniciadas.length} estudiantes en curso.`, `#/docente/comision/${c.id}`);
    return r;
  },
  finalizarCursada(c) {
    const fin = c.finalizarCursada();
    fin.forEach(i => Notificador.notificar(i.estudiante, 'Cursada finalizada',
      `${c.materia.nombre}: nota final ${i.notaFinal()} (${i.estaAprobada() ? 'aprobada' : 'desaprobada'}).`, '#/perfil/cursada'));
    return fin;
  },
  darDeBaja(c) {
    const afectadas = c.darDeBaja();
    afectadas.forEach(i => Notificador.notificar(i.estudiante, 'Comisión dada de baja',
      `${c.nombre()} se dio de baja y tu inscripción quedó cancelada. Podés inscribirte en otra comisión.`, '#/inscripcion'));
    Notificador.notificar(c.docente, 'Comisión dada de baja', `${c.nombre()} se dio de baja.`, '#/docente');
    return afectadas;
  },

  // ---------- Estudiantes (DE03) ----------
  habilitar(e) {
    e.habilitar();
    Notificador.notificar(e, 'Cuenta habilitada', 'Ya podés inscribirte a materias y pedir constancias.', '#/inicio');
  },
  inhabilitar(e) {
    const canceladas = e.darDeBaja();
    Notificador.notificar(e, 'Cuenta inhabilitada',
      `Tu cuenta fue inhabilitada${canceladas.length ? ` y se cancelaron ${canceladas.length} solicitudes pendientes` : ''}. Acercate a la administración.`, '#/inicio');
    return canceladas;
  },

  // ---------- Docentes ----------
  altaDocente({ dni, nombre, apellido, email, especialidad }) {
    if (!/^\d{7,8}$/.test(dni)) throw new Error('El DNI tiene que tener 7 u 8 números.');
    if (!nombre.trim() || !apellido.trim()) throw new Error('Completá nombre y apellido.');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('El correo no es válido.');
    if (Sesion.buscarPorDni(dni)) throw new Error('Ya existe un usuario con ese DNI.');
    const legajo = 'D-' + (1000 + D.docentes.length * 11 + 21);
    const d = new Docente(legajo, dni, nombre.trim(), apellido.trim(), email.trim(), especialidad.trim() || 'Sin especificar');
    D.docentes.push(d);
    Correo.enviar(d.email, 'Tu cuenta de Cursada', `Hola ${d.nombre}: ya podés ingresar con tu DNI y la contraseña docente123.`);
    return d;
  },
  cambiarEstadoDocente(d) {
    if (d.estaActivo() && d.consultarComisiones().some(c => [EstadoComision.ABIERTA, EstadoComision.COMPLETA, EstadoComision.EN_CURSO, EstadoComision.CREADA].includes(c.estado))) {
      throw new Error('El docente tiene comisiones vigentes. Dalas de baja o reasignalas antes de desactivarlo.');
    }
    d.estado = d.estaActivo() ? EstadoRegistro.INACTIVO : EstadoRegistro.ACTIVO;
  },
};

// ---------- Sesión: autenticación por DNI y contraseña ----------
const Sesion = {
  buscarPorDni(dni) {
    const e = D.estudiantes.find(x => x.dni === dni);
    if (e) return { usuario: e, rol: 'estudiante' };
    const d = D.docentes.find(x => x.dni === dni);
    if (d) return { usuario: d, rol: 'docente' };
    if (D.admin.dni === dni) return { usuario: D.admin, rol: 'admin' };
    return null;
  },
  autenticar(dni, password) {
    dni = String(dni).replace(/\D/g, '');
    if (!/^\d{7,8}$/.test(dni)) throw new Error('Ingresá tu DNI sin puntos: 7 u 8 números.');
    if (!password) throw new Error('Ingresá tu contraseña.');
    const r = this.buscarPorDni(dni);
    if (!r || r.usuario.password !== password) throw new Error('El DNI o la contraseña no son correctos.');
    if (r.rol === 'docente' && !r.usuario.estaActivo()) throw new Error('Tu usuario docente está inactivo. Consultá con la administración.');
    return r;
  },
  cambiarPassword(usuario, actual, nueva, repetida) {
    if (usuario.password !== actual) throw new Error('La contraseña actual no es correcta.');
    if (nueva.length < 6) throw new Error('La contraseña nueva tiene que tener al menos 6 caracteres.');
    if (nueva !== repetida) throw new Error('Las contraseñas nuevas no coinciden.');
    usuario.password = nueva;
  },
};
