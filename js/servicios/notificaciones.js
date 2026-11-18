/* =====================================================================
   SERVICIO DE NOTIFICACIONES Y CORREO (simulado)
   Destinatarios: 'E:<legajo>' estudiante, 'D:<legajo>' docente, 'A' administración.
   ===================================================================== */

const destinatario = u => u instanceof Estudiante ? 'E:' + u.legajo : u instanceof Docente ? 'D:' + u.legajo : 'A';

const Notificador = {
  notificar(para, titulo, texto, enlace = '', fecha = new Date()) {
    const n = { id: D.secuencias.notificacion++, para: typeof para === 'string' ? para : destinatario(para), titulo, texto, enlace, fecha, leida: false };
    D.notificaciones.unshift(n);
    return n;
  },
  de(usuario) { const k = destinatario(usuario); return D.notificaciones.filter(n => n.para === k); },
  sinLeer(usuario) { return this.de(usuario).filter(n => !n.leida).length; },
  marcarLeida(id) { const n = D.notificaciones.find(x => x.id === id); if (n) n.leida = true; },
  marcarTodas(usuario) { this.de(usuario).forEach(n => { n.leida = true; }); },
};

// Bandeja de salida: el MVP no envía correos reales, registra el envío con su adjunto.
const Correo = {
  enviar(para, asunto, cuerpo, adjunto = null) {
    const m = { id: D.secuencias.correo++, para, asunto, cuerpo, adjunto, fecha: new Date() };
    D.correos.unshift(m);
    return m;
  },
};
