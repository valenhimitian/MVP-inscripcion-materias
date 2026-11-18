/* =====================================================================
   REPOSITORIO – guarda y recupera los datos en el navegador (localStorage)
   Convierte el grafo de objetos en JSON con referencias por código y lo
   reconstruye con las mismas clases del modelo.
   ===================================================================== */

const Repositorio = {
  CLAVE: 'cursada.datos.v2',

  guardar() {
    if (!D) return;
    try { localStorage.setItem(this.CLAVE, JSON.stringify(this.serializar())); } catch (e) { /* sin almacenamiento */ }
  },

  cargar() {
    try {
      const txt = localStorage.getItem(this.CLAVE);
      if (txt) { this.deserializar(JSON.parse(txt)); return true; }
    } catch (e) { console.warn('No se pudieron recuperar los datos guardados, se cargan los de ejemplo.', e); }
    cargarDatos();
    return false;
  },

  reiniciar() {
    try { localStorage.removeItem(this.CLAVE); } catch (e) { /* sin almacenamiento */ }
    cargarDatos();
    this.guardar();
  },

  serializar() {
    const fecha = d => d ? d.toISOString() : null;
    const cal = c => ({ tipo: c.tipo, nota: c.nota, fecha: fecha(c.fecha), obs: c.observaciones, estado: c.estado, ant: c.notaAnterior, motivo: c.motivoAnulacion });
    return {
      contadores: { ...Contadores },
      secuencias: D.secuencias,
      carreras: D.carreras.map(c => ({ codigo: c.codigo, nombre: c.nombre, materias: c.materias.map(m => m.codigo) })),
      materias: D.materias.map(m => ({ codigo: m.codigo, nombre: m.nombre, correlativas: m.correlativas.map(x => x.codigo) })),
      docentes: D.docentes.map(d => ({ legajo: d.legajo, dni: d.dni, nombre: d.nombre, apellido: d.apellido, email: d.email, especialidad: d.especialidad, estado: d.estado, password: d.password, telefono: d.telefono })),
      comisiones: D.comisiones.map(c => ({
        id: c.id, codigo: c.codigo, materia: c.materia.codigo, dia: c.dia, horaInicio: c.horaInicio, horaFin: c.horaFin, aula: c.aula,
        docente: c.docente.legajo, cupoMaximo: c.cupoMaximo, cupoDisponible: c.cupoDisponible, estado: c.estado,
        contenidos: c.contenidos.map(x => ({ titulo: x.titulo, descripcion: x.descripcion, tipo: x.tipo, fecha: fecha(x.fechaPublicacion) })),
      })),
      estudiantes: D.estudiantes.map(e => ({
        legajo: e.legajo, dni: e.dni, nombre: e.nombre, apellido: e.apellido, email: e.email, estado: e.estado,
        nacimiento: fecha(e.fechaNacimiento), password: e.password, telefono: e.telefono,
        matriculas: e.matriculas.map(m => ({ carrera: m.carrera.codigo, ingreso: fecha(m.fechaIngreso), estado: m.estado })),
        inscripciones: e.inscripciones.map(i => ({
          comprobante: i.comprobante, comision: i.comision.id, fecha: fecha(i.fecha), estado: i.estado, motivo: i.motivoRechazo,
          calificaciones: i.calificaciones.map(cal),
          asistencias: i.asistencias.map(a => ({ fecha: fecha(a.fecha), presente: a.presente })),
        })),
        certificados: e.certificados.map(c => ({
          numero: c.numero, tipo: c.tipo, inscripcion: c.inscripcion ? c.inscripcion.comprobante : null, ante: c.presentarAnte,
          examen: fecha(c.fechaExamen), solicitud: fecha(c.fechaSolicitud), estado: c.estado, motivo: c.motivoRechazo,
          emision: fecha(c.fechaEmision), envio: fecha(c.fechaEnvio), codigo: c.codigoVerificacion,
        })),
      })),
      admin: { usuario: D.admin.usuario, dni: D.admin.dni, nombre: D.admin.nombre, apellido: D.admin.apellido, email: D.admin.email, password: D.admin.password },
      notificaciones: D.notificaciones.map(n => ({ ...n, fecha: fecha(n.fecha) })),
      correos: D.correos.map(m => ({ ...m, fecha: fecha(m.fecha) })),
    };
  },

  deserializar(s) {
    const F = v => v ? new Date(v) : null;
    const carreras = s.carreras.map(c => new Carrera(c.codigo, c.nombre));
    const materias = s.materias.map(m => new Materia(m.codigo, m.nombre));
    const materia = cod => materias.find(m => m.codigo === cod);
    s.materias.forEach((m, k) => m.correlativas.forEach(c => materias[k].agregarCorrelativa(materia(c))));
    s.carreras.forEach((c, k) => c.materias.forEach(m => carreras[k].asociarMateria(materia(m))));

    const docentes = s.docentes.map(d => {
      const o = new Docente(d.legajo, d.dni, d.nombre, d.apellido, d.email, d.especialidad, d.estado);
      o.password = d.password; o.telefono = d.telefono || '';
      return o;
    });
    const comisiones = s.comisiones.map(c => {
      const o = new Comision(c.codigo, materia(c.materia), c.dia, c.horaInicio, c.horaFin, c.aula,
        docentes.find(d => d.legajo === c.docente), c.cupoMaximo, c.cupoDisponible, c.estado, c.id);
      o.contenidos = c.contenidos.map(x => { const k = new ContenidoAcademico(x.titulo, x.descripcion, x.tipo, F(x.fecha)); k.publicar(); return k; });
      return o;
    });

    const estudiantes = s.estudiantes.map(e => {
      const o = new Estudiante(e.legajo, e.dni, e.nombre, e.apellido, e.email, e.estado, F(e.nacimiento));
      o.password = e.password; o.telefono = e.telefono || '';
      o.matriculas = e.matriculas.map(m => new Matricula(carreras.find(c => c.codigo === m.carrera), F(m.ingreso), m.estado));
      e.inscripciones.forEach(i => {
        const ins = new Inscripcion(o, comisiones.find(c => c.id === i.comision), F(i.fecha), i.comprobante);
        ins.setEstado(i.estado);
        ins.motivoRechazo = i.motivo || '';
        ins.calificaciones = i.calificaciones.map(c => {
          const k = new Calificacion(c.tipo, c.nota, F(c.fecha), c.obs, c.estado);
          k.notaAnterior = c.ant; k.motivoAnulacion = c.motivo || '';
          return k;
        });
        ins.asistencias = i.asistencias.map(a => new Asistencia(F(a.fecha), a.presente));
        o.inscripciones.push(ins);
      });
      o.certificados = e.certificados.map(c => {
        const k = new Certificado(c.tipo, o, c.inscripcion ? o.inscripciones.find(i => i.comprobante === c.inscripcion) : null, c.ante, F(c.examen), F(c.solicitud), c.numero);
        Object.assign(k, { estado: c.estado, motivoRechazo: c.motivo || '', fechaEmision: F(c.emision), fechaEnvio: F(c.envio), codigoVerificacion: c.codigo || '' });
        return k;
      });
      return o;
    });

    const a = s.admin;
    const admin = new Administrador(a.usuario, a.dni, a.nombre, a.apellido, a.email);
    admin.password = a.password;

    Object.assign(Contadores, s.contadores);
    D = {
      carreras, materias, comisiones, docentes, estudiantes, admin,
      notificaciones: s.notificaciones.map(n => ({ ...n, fecha: F(n.fecha) })),
      correos: s.correos.map(m => ({ ...m, fecha: F(m.fecha) })),
      secuencias: s.secuencias,
    };
  },
};
