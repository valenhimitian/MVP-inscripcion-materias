/* =====================================================================
   GENERADOR DE PDF (sin librerías)
   Arma un PDF 1.4 de una página A4 con Helvetica y genera la constancia
   del Certificado. Coordenadas en puntos, con origen arriba a la izquierda.
   ===================================================================== */

class DocumentoPDF {
  constructor() { this.ops = []; this.alto = 842; this.ancho = 595; }

  // Codifica a WinAnsi (Latin-1 + algunos signos) y escapa paréntesis y barras
  static codificar(texto) {
    const especiales = { '–': 150, '—': 151, '“': 147, '”': 148, '‘': 145, '’': 146, '•': 149, '…': 133, '€': 128 };
    let s = '';
    for (const ch of String(texto)) {
      let c = ch.charCodeAt(0);
      if (especiales[ch]) c = especiales[ch];
      else if (c > 255 || (c > 126 && c < 160)) c = 63;          // '?'
      const car = String.fromCharCode(c);
      s += (car === '(' || car === ')' || car === '\\') ? '\\' + car : car;
    }
    return s;
  }

  // Ancho aproximado de Helvetica (en unidades de 1/1000 del tamaño)
  static anchoTexto(texto, size, negrita) {
    let u = 0;
    for (const ch of String(texto)) {
      if (ch === ' ') u += 278;
      else if ('il.,:;!|\'´`'.includes(ch)) u += 250;
      else if ('fjrt()[]-/'.includes(ch)) u += 333;
      else if ('mwMW'.includes(ch)) u += 850;
      else if (/[0-9]/.test(ch)) u += 556;
      else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) u += 690;
      else u += 540;
    }
    return u * size / 1000 * (negrita ? 1.06 : 1);
  }

  static rgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => (v / 255).toFixed(3)).join(' ');
  }

  rect(x, y, w, h, color) {
    this.ops.push(`${DocumentoPDF.rgb(color)} rg ${x} ${this.alto - y - h} ${w} ${h} re f`);
  }
  linea(x1, y1, x2, y2, color = '#DDE2EC', grosor = 1) {
    this.ops.push(`${grosor} w ${DocumentoPDF.rgb(color)} RG ${x1} ${this.alto - y1} m ${x2} ${this.alto - y2} l S`);
  }
  texto(t, x, y, { size = 11, negrita = false, color = '#16213E', alinear = 'izq' } = {}) {
    let px = x;
    const w = DocumentoPDF.anchoTexto(t, size, negrita);
    if (alinear === 'der') px = x - w;
    if (alinear === 'centro') px = x - w / 2;
    this.ops.push(`BT /${negrita ? 'F2' : 'F1'} ${size} Tf ${DocumentoPDF.rgb(color)} rg 1 0 0 1 ${px.toFixed(2)} ${(this.alto - y).toFixed(2)} Tm (${DocumentoPDF.codificar(t)}) Tj ET`);
    return w;
  }
  // Escribe un párrafo con corte de línea; devuelve la y siguiente
  parrafo(t, x, y, anchoMax, { size = 11, interlineado = 1.55, negrita = false, color = '#16213E' } = {}) {
    const palabras = String(t).split(/\s+/);
    let lineaActual = '';
    for (const p of palabras) {
      const prueba = lineaActual ? lineaActual + ' ' + p : p;
      if (DocumentoPDF.anchoTexto(prueba, size, negrita) > anchoMax && lineaActual) {
        this.texto(lineaActual, x, y, { size, negrita, color });
        y += size * interlineado;
        lineaActual = p;
      } else lineaActual = prueba;
    }
    if (lineaActual) { this.texto(lineaActual, x, y, { size, negrita, color }); y += size * interlineado; }
    return y;
  }

  bytes() {
    const contenido = this.ops.join('\n');
    const objetos = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.ancho} ${this.alto}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    ];
    let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    objetos.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const b = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) b[i] = pdf.charCodeAt(i) & 255;
    return b;
  }
}


// ---------- Constancia ----------
const ConstanciaPDF = {
  MESES: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
  fecha(d) { return `${d.getDate()} de ${this.MESES[d.getMonth()]} de ${d.getFullYear()}`; },
  corta(d) { return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }); },
  dni(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },

  generar(c) {
    const e = c.estudiante;
    const mat = e.getMatriculaActiva() || e.matriculas[0];
    const carrera = mat ? mat.carrera.nombre : '—';
    const regular = c.tipo === TipoCertificado.ALUMNO_REGULAR;
    const pdf = new DocumentoPDF();
    const M = 56, W = 595 - 2 * M;

    // Banda superior de marca
    pdf.rect(0, 0, 595, 104, '#2645D6');
    pdf.rect(M, 30, 44, 44, '#1A33A8');
    for (let f = 0; f < 3; f++) for (let k = 0; k < 3; k++) {
      pdf.rect(M + 6 + k * 11.5, 36 + f * 11.5, 9, 9, f === 1 && k === 1 ? '#FFD84D' : '#5E77E6');
    }
    pdf.texto('cursada', M + 56, 58, { size: 26, negrita: true, color: '#FFFFFF' });
    pdf.texto('Autogestión universitaria', M + 57, 74, { size: 9.5, color: '#C9D3FF' });
    pdf.texto('Constancia N.º', 595 - M, 50, { size: 9, color: '#C9D3FF', alinear: 'der' });
    pdf.texto(c.numero, 595 - M, 66, { size: 13, negrita: true, color: '#FFFFFF', alinear: 'der' });
    pdf.rect(0, 104, 595, 5, '#FFD84D');

    // Título
    let y = 160;
    pdf.texto(regular ? 'Constancia de alumno regular' : 'Constancia de examen', M, y, { size: 24, negrita: true });
    y += 22;
    pdf.texto(`Emitida el ${this.fecha(c.fechaEmision || new Date())}`, M, y, { size: 10, color: '#5A6478' });

    // Cuerpo
    y += 38;
    const persona = `${e.nombre} ${e.apellido}, DNI ${this.dni(e.dni)}, legajo ${e.legajo}`;
    let cuerpo;
    if (regular) {
      cuerpo = `Por la presente se deja constancia de que ${persona}, es alumno/a regular de la carrera ${carrera}` +
        (mat ? `, con matrícula activa desde el ${this.corta(mat.fechaIngreso)}` : '') +
        `, y se encuentra cursando el ${PERIODO.nombre}.`;
    } else {
      const i = c.inscripcion;
      cuerpo = `Por la presente se deja constancia de que ${persona}, estudiante de la carrera ${carrera}, ` +
        `se presentó a la instancia de evaluación de la materia ${i.comision.materia.nombre} (comisión ${i.comision.codigo}, ` +
        `a cargo de ${i.comision.docente.nombreCorto()}) el día ${this.corta(c.fechaExamen)}.`;
    }
    y = pdf.parrafo(cuerpo, M, y, W, { size: 12 });

    // Tabla de datos
    y += 18;
    const filas = [
      ['Estudiante', `${e.apellido}, ${e.nombre}`],
      ['DNI', this.dni(e.dni)],
      ['Legajo', e.legajo],
      ['Carrera', carrera],
      ['Período', PERIODO.nombre],
    ];
    if (regular) {
      const cursando = e.inscripciones.filter(i => i.estaEnCurso() || i.estado === EstadoInscripcion.APROBADA);
      if (cursando.length) filas.push(['Materias en curso', cursando.map(i => i.comision.materia.nombre).join(', ')]);
    } else {
      filas.push(['Materia', `${c.inscripcion.comision.materia.nombre} · ${c.inscripcion.comision.codigo}`]);
      filas.push(['Fecha del examen', this.corta(c.fechaExamen)]);
    }
    filas.push(['Presentada ante', c.presentarAnte || 'quien corresponda']);
    pdf.linea(M, y, 595 - M, y, '#16213E', 1.2);
    filas.forEach(([k, v]) => {
      y += 22;
      pdf.texto(k, M, y, { size: 10, color: '#5A6478' });
      const yFin = pdf.parrafo(v, M + 150, y, W - 150, { size: 10.5, negrita: true, interlineado: 1.35 });
      y = Math.max(y, yFin - 10.5 * 1.35);
      pdf.linea(M, y + 9, 595 - M, y + 9);
    });

    // Cierre y firma
    y += 44;
    y = pdf.parrafo(`Se extiende la presente a pedido del interesado/a, para ser presentada ante ${c.presentarAnte || 'quien corresponda'}, en la Ciudad Autónoma de Buenos Aires, el ${this.fecha(c.fechaEmision || new Date())}.`, M, y, W, { size: 11, color: '#16213E' });
    y += 60;
    pdf.linea(595 - M - 200, y, 595 - M, y, '#16213E', 0.8);
    pdf.texto('Administración académica', 595 - M - 100, y + 16, { size: 10, negrita: true, alinear: 'centro' });
    pdf.texto('Firma digital', 595 - M - 100, y + 30, { size: 9, color: '#5A6478', alinear: 'centro' });

    // Pie con verificación
    pdf.rect(M, 740, W, 50, '#F5F7FB');
    pdf.texto('Código de verificación', M + 14, 760, { size: 8.5, color: '#5A6478' });
    pdf.texto(c.codigoVerificacion || '—', M + 14, 777, { size: 13, negrita: true });
    pdf.texto('Documento generado por Cursada a partir de datos de prueba.', 595 - M - 14, 760, { size: 8.5, color: '#5A6478', alinear: 'der' });
    pdf.texto('MVP académico: sin validez oficial.', 595 - M - 14, 775, { size: 8.5, color: '#5A6478', alinear: 'der' });
    return pdf.bytes();
  },

  // Descarga o abre el PDF en una pestaña nueva
  descargar(c, abrir = false) {
    const blob = new Blob([this.generar(c)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    if (abrir) { window.open(url, '_blank'); }
    else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `constancia-${c.numero}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  },
};
