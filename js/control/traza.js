/* =====================================================================
   TRAZA DE LOS DIAGRAMAS DE SECUENCIA
   Registra los mensajes ejecutados con la numeración del DS01 o del DS02
   (se muestra en el modo demo).
   ===================================================================== */

const Traza = {
  diagrama: 'DS01',
  lineas: [],
  iniciar(diagrama) { this.diagrama = diagrama; this.lineas = []; },
  limpiar() { this.lineas = []; },
  // tipo: true = ok, false = falla, 'titulo', 'estado' o undefined (neutro)
  agregar(texto, tipo) { this.lineas.push({ texto, tipo }); }
};
const t = (texto, tipo) => Traza.agregar(texto, tipo);

// Corta la validación (marco break del diagrama) e informa el motivo
function falla(resultado, codigo, mensaje) {
  t(`break [${codigo}] → error("${mensaje}")`, false);
  return { ok: false, resultado, codigo, mensaje };
}
