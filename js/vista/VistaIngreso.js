/* =====================================================================
   VISTA DE INGRESO – DNI y contraseña
   Al costado se listan las cuentas de prueba: un clic completa el formulario.
   ===================================================================== */

const VistaIngreso = {
  render() {
    const alumnos = D.estudiantes.map(e => this.cuenta(e.dni, `${e.nombre.split(' ')[0]} ${e.apellido}`, ETIQUETA_ESTUDIANTE[e.estado][0], e.password)).join('');
    const docente = D.docentes[0];

    $('vista-ingreso').innerHTML = `<div class="ingreso">
      <section class="ingreso-marca">
        <a class="marca" href="#/ingresar" aria-label="Cursada">
          <svg viewBox="0 0 64 64" style="width:40px;height:40px" aria-hidden="true"><use href="#isotipo"/></svg>
          <span class="marca-nombre">cursada</span>
          <span class="marca-sub">Autogestión universitaria</span>
        </a>
        <div>
          <h1>Tu facultad, en un solo lugar.</h1>
          <p class="ingreso-bajada">Inscripciones, notas, asistencia, constancias y avisos para estudiantes, docentes y administración.</p>
        </div>
        <aside class="cuentas" aria-labelledby="tituloCuentas">
          <h2 id="tituloCuentas">Cuentas de prueba</h2>
          <p>Tocá una cuenta para completar el ingreso.</p>
          <h3>Estudiantes · contraseña alumno123</h3>
          <div class="cuentas-lista">${alumnos}</div>
          <h3>Docente · contraseña ${esc(docente.password)}</h3>
          <div class="cuentas-lista">${this.cuenta(docente.dni, docente.nombreCorto(), 'Docente', docente.password)}</div>
          <h3>Administración · contraseña ${esc(D.admin.password)}</h3>
          <div class="cuentas-lista">${this.cuenta(D.admin.dni, D.admin.nombreCorto(), 'Administración', D.admin.password)}</div>
        </aside>
      </section>

      <section class="ingreso-form">
        <form class="panel form-ingreso" onsubmit="event.preventDefault(); VistaIngreso.ingresar()" novalidate>
          <h2>Ingresá a tu cuenta</h2>
          <p class="tenue">Usá tu DNI sin puntos y tu contraseña.</p>
          <div id="errorIngreso" aria-live="assertive"></div>
          <div class="campo">
            <label for="dni">DNI</label>
            <input id="dni" name="dni" inputmode="numeric" autocomplete="username" maxlength="10" placeholder="Por ejemplo, 40111222" required>
          </div>
          <div class="campo">
            <label for="clave">Contraseña</label>
            <div class="clave">
              <input id="clave" name="clave" type="password" autocomplete="current-password" required>
              <button type="button" class="btn-texto chico" onclick="VistaIngreso.verClave(this)">Mostrar</button>
            </div>
          </div>
          <button class="btn btn-primario btn-bloque" type="submit">Ingresar</button>
          <p class="chico tenue" style="margin-top:var(--e4)">¿Olvidaste tu contraseña? Pedí el blanqueo en la administración académica con tu DNI.</p>
        </form>
        <p class="ingreso-nota">Cursada es el MVP del Ecosistema Integral de Gestión Universitaria (Diseño de Aplicaciones Web, UNLaM 2026). Los datos son ficticios y se guardan solo en este navegador. <a href="#/guia">Guía de la demo</a></p>
      </section>
    </div>`;
  },

  cuenta(dni, nombre, detalle, clave) {
    return `<button type="button" class="cuenta" onclick="VistaIngreso.completar('${dni}', '${esc(clave)}')">
      <span><b>${esc(nombre)}</b><small>${esc(detalle)}</small></span><span class="cuenta-dni">${fmtDni(dni)}</span></button>`;
  },

  completar(dni, clave) {
    $('dni').value = dni;
    $('clave').value = clave;
    $('errorIngreso').innerHTML = '';
    $('clave').focus();
  },

  verClave(btn) {
    const i = $('clave');
    i.type = i.type === 'password' ? 'text' : 'password';
    btn.textContent = i.type === 'password' ? 'Mostrar' : 'Ocultar';
  },

  ingresar() {
    try {
      const r = Sesion.autenticar($('dni').value, $('clave').value);
      App.iniciarSesion(r.usuario, r.rol);
    } catch (e) {
      $('errorIngreso').innerHTML = aviso('err', e.message);
      $('dni').setAttribute('aria-invalid', 'true');
    }
  },
};
