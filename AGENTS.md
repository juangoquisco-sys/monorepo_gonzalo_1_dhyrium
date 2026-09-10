# Reglas de trabajo — Dhyrium Software

Antes de modificar cualquier producto bajo esta raíz:

1. Leer `README.md`, este archivo y los `AGENTS.md` de frontend y backend.
2. Revisar rama y cambios locales de ambos repositorios.
3. Conservar los cambios ajenos al hito activo.
4. No ejecutar reset destructivo, commit, push, merge ni publicación sin autorización explícita.
5. Usar `PLAN.md` y los documentos de `docs/` como contrato permanente de Dhyrium Writer.
6. Trabajar un solo hito cerrado por `/goal`; no mezclar hitos.
7. No marcar paridad o verificación sin prueba funcional y evidencia visual.
8. Cuando se solicite levantar o validar todo, ejecutar `./publish-and-run.ps1` desde esta raíz.
9. Todo módulo nuevo o movimiento de navegación debe conservar una clave de permiso estable, declarar sus ubicaciones visuales y actualizar la prueba `accessControlCatalog.test.ts`. La ubicación visual no redefine ni duplica el permiso.

Usa el modelo adecuado para la petición. Reserva Sol para diseño de arquitectura e incidencias críticas de base de datos.

