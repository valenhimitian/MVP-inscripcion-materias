# Cursada · Autogestión universitaria (MVP)

Producto Mínimo Viable del Trabajo Práctico Integral de **Diseño de Aplicaciones Web** (UNLaM, 2.º cuatrimestre 2026) para el *Ecosistema Integral de Gestión Universitaria*.

Cubre el caso de uso principal **CU01 – Inscribirse a Materia** (DS01) y el caso elegido **CU02 – Registrar Calificación** (DS02). Además suma los flujos del diagrama de casos de uso v2.0: revisión de solicitudes, gestión de comisiones, estudiantes y docentes, asistencia, avisos y constancias (RF26). Los estados respetan los diagramas DE01 a DE04 y la enumeración EstadoCertificado.

## Resumen en PDF

El documento [docs/Resumen-Cursada-MVP.pdf](docs/Resumen-Cursada-MVP.pdf) explica en 4 páginas toda la web: roles, flujos, validaciones, estructura y trazabilidad con la segunda entrega.

## Paso a paso de la inscripción

El documento [docs/CU01-Inscribirse-a-materia-paso-a-paso.pdf](docs/CU01-Inscribirse-a-materia-paso-a-paso.pdf) resume en 2 páginas el caso de uso CU01: el flujo básico con los mensajes del DS01 y cada alternativo y excepción (E2, A2, A4, E6, E6.1 a E6.4, A8, E9) con cómo probarlo y qué muestra el sistema.

## Cómo ejecutarlo

No requiere instalación, servidor ni base de datos. Abrí `index.html` con cualquier navegador o publicalo en GitHub Pages.

Los datos se guardan en el navegador (localStorage), así que se conservan al recargar y al cambiar de usuario. Para volver al estado inicial: **Administración › Mi perfil › Reiniciar datos de la demo**, o **Guía de la demo › Reiniciar datos**.

Si abrís dos pestañas, por ejemplo un estudiante y la administración, los cambios de una se ven en la otra.

## Cuentas de prueba

Se ingresa con **DNI y contraseña**. En la pantalla de ingreso, al costado, están todas las cuentas: un clic completa el formulario.

| Rol | Usuario | DNI | Contraseña |
|---|---|---|---|
| Estudiante | Iván Avila (habilitado) | 40111222 | alumno123 |
| Estudiante | Martina Gómez (habilitada) | 41222333 | alumno123 |
| Estudiante | Camila Ruiz (habilitada, egresada de otra carrera) | 38333444 | alumno123 |
| Estudiante | Sofía Martínez (habilitada) | 42444555 | alumno123 |
| Estudiante | Tomás Herrera (inhabilitado) | 39555666 | alumno123 |
| Estudiante | Lucía Fernández (registrada) | 44666777 | alumno123 |
| Docente | Laura Medina | 30777888 | docente123 |
| Administración | Paula Rossi | 28999000 | admin123 |

## Qué puede hacer cada rol

**Estudiante**
- Inicio: su semana en una grilla horaria, novedades y trámites.
- Inscripción en 3 pasos (DS01): materia, comisión con docente, horario y cupo, validaciones y comprobante.
- Mi perfil, con pestañas:
  - **Datos**: datos personales y contacto editable; cambio de contraseña.
  - **Cursada**: notas, asistencia y avisos de cada materia; cancelar inscripción; historial académico.
  - **Trámites**: pedir una constancia de alumno regular o de examen, seguir su estado y descargar el PDF.
  - **Notificaciones**.

**Docente**
- Inicio con sus comisiones y su semana.
- Por comisión:
  - **Estudiantes y notas** (DS02): carga y modificación (A6) con las validaciones E8, E8.1, E8.2 y E8.3.
  - **Asistencia** por fecha de clase.
  - **Avisos y material**: cada publicación notifica a los estudiantes.
- Notificaciones y perfil.

**Administración**
- **Resumen**: lo pendiente de revisar y el estado general.
- **Inscripciones**: aprobar o rechazar; rechazar libera el cupo.
- **Trámites**: aprobar una constancia genera el PDF, lo envía al correo del estudiante (envío simulado, queda registrado en «Correos enviados») y lo deja para descargar en su perfil. También se puede rechazar con motivo.
- **Cursadas**: crear una cursada, abrir la inscripción, iniciar la cursada (las aprobadas pasan a en curso y las pendientes se rechazan), finalizarla (exige la nota final de todos) y eliminarla (baja lógica, solo antes de empezar).
- **Estudiantes**: buscador, ficha completa, habilitar e inhabilitar (DE03).
- **Docentes**: listado, alta y activar/desactivar.

### Modo demo

El interruptor **Modo demo** muestra al costado la secuencia ejecutada del **DS01** (inscripción) o del **DS02** (carga de notas), con la misma numeración de los diagramas. También habilita la **Guía de la demo**, donde cada escenario tiene un botón *Probar*.

## Escenarios del enunciado

| Escenario | Cómo reproducirlo | Resultado |
|---|---|---|
| 1. Inscripción exitosa | Iván → Diseño de Aplicaciones Web/Móviles → COM-01 | **Pendiente** con comprobante |
| 2. Comisión sin cupo | Diseño de Aplicaciones Web/Móviles → COM-02 | E6.1 · RN4 |
| 3. Ya inscripto | Base de Datos I → COM-04 | E6 · RN5 |
| 4. Correlativas incumplidas | Programación Web II → COM-01 | E6.3 · RN6 |
| 5. Materia de otra carrera | Modo demo → listar otras carreras → Análisis Matemático I | E6.2 · RN3 |
| Aprobada / Rechazada | Administración › Inscripciones | DE01 |

## Estructura

```
index.html
assets/                       Logo, isotipo, favicon y manifest
css/                          tokens · base · layout · componentes · vistas
js/
  modelo/enumeraciones.js     «entity» Enumeraciones (DE01–DE04, certificado)
  modelo/entidades.js         «entity» Clases del diagrama de clases v2.0
  servicios/notificaciones.js Notificaciones y correo (simulado)
  servicios/pdf.js            Generador de PDF propio y constancia
  servicios/repositorio.js    Guardado en el navegador
  control/traza.js            Registro de mensajes de DS01 / DS02
  control/InscripcionController.js   «control» CU01 (DS01)
  control/CalificacionController.js  «control» CU02 (DS02), asistencia y avisos
  control/GestionController.js       «control» Trámites, gestión y sesión
  datos/datos.js              Datos de ejemplo
  vista/                      «boundary» Pantallas por rol (estudiante, docente, admin)
  app.js                      Sesión, rutas, menú por rol y modo demo
```

## Integrantes

- Himitian, Valentín Daniel
- Avila, Iván Nazareno
- Romero, Yesica Romina

Docentes: Abal, Juan Marcelo – Moreira, Rubén Darío
