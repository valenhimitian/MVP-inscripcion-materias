# Portal de Autogestión – Inscripción a Materias (MVP)

Producto Mínimo Viable del Trabajo Práctico Integral de **Diseño de Aplicaciones Web** (UNLaM · 2.º cuatrimestre 2026) para el *Ecosistema Integral de Gestión Universitaria*.

Implementa el caso de uso principal, **CU01 – Inscribirse a Materia**, siguiendo la especificación, las reglas de negocio, el diagrama de clases, el diagrama de secuencia DS01 y los diagramas de estado DE01 a DE03 del TP.

## Cómo ejecutarlo

No requiere instalación, servidor ni base de datos: los datos de ejemplo se cargan al iniciar.

- Abrir `index.html` con cualquier navegador, o
- entrar a la versión publicada en GitHub Pages.

## Qué se puede probar

| Escenario | Cómo reproducirlo | Resultado |
|---|---|---|
| Inscripción exitosa | Iván Avila → Diseño de Aplicaciones Web/Móviles → COM-01 | Inscripción **Pendiente** con comprobante |
| Revisión del Administrador | Panel de administración → Aprobar / Rechazar | **Aprobada** o **Rechazada** (libera el cupo) |
| Comisión sin cupo | Diseño de Aplicaciones Web/Móviles → COM-02 | E6.1 · RN4 |
| Comisión fuera de período | Diseño de Aplicaciones Web/Móviles → COM-03 | E6.4 · RN9 |
| Ya inscripto | Base de Datos I → COM-04 | E6 · RN5 |
| Correlativas incumplidas | Programación Web II → COM-01 | E6.3 · RN6 |
| Materia de otra carrera | Panel de pruebas → Análisis Matemático I | E6.2 · RN3 |
| Último cupo / concurrencia | Visualización e Interfaces → COM-01 | La comisión pasa a **Completa**; variante E9 |
| Estudiante no habilitado | Tomás Herrera o Lucía Fernández | E2 · RN1 |

El botón **Mostrar secuencia (DS01)** muestra los mensajes ejecutados con la misma numeración del diagrama de secuencia.

## Estructura

```
index.html          Pantalla de inscripción y panel de administración
css/estilos.css     Estilos (basados en el mockup de la pantalla v2)
js/modelo.js        «entity»   Clases y enumeraciones del diagrama de clases
js/controlador.js   «control»  InscripcionController (orden del DS01)
js/pantalla.js      «boundary» Interacción con el usuario
js/datos.js         Datos de ejemplo
```

## Integrantes

- Himitian, Valentín Daniel
- Avila, Iván Nazareno
- Romero, Yesica Romina

Docentes: Abal, Juan Marcelo – Moreira, Rubén Darío
