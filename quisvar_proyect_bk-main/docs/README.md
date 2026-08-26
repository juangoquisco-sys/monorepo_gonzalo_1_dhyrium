# Documentacion tecnica y funcional

Esta carpeta centraliza la documentacion de modulos nuevos o modificados. La idea es que otra persona pueda entender que problema resuelve cada modulo, por que fue disenado asi y que piezas debe revisar para mantenerlo.

## Organizacion recomendada

- `docs/modules/`: documentacion por modulo de negocio. Cada archivo debe explicar contexto, flujos, reglas, base de datos, endpoints, frontend y decisiones importantes.
- `docs/architecture/`: estandares de arquitectura que gobiernan el backend.
- `docs/architecture/decisions/`: decisiones tecnicas transversales o ADRs cuando una decision afecte a varios modulos.
- `docs/runbooks/`: guias operativas para despliegues, migraciones, tareas manuales o recuperacion ante errores.
- `docs/integrations/`: integraciones externas, contratos, credenciales esperadas y limitaciones.

## Plantilla sugerida para modulos

1. Proposito
2. Usuarios y permisos
3. Flujos principales
4. Modelo de datos
5. Backend
6. Frontend
7. Reglas y decisiones de dominio
8. Casos especiales
9. Pruebas recomendadas
10. Pendientes o mejoras futuras

## Convenciones

- Nombrar archivos en kebab-case: `control-de-puerta.md`, `cocina.md`, `rotaciones.md`.
- Documentar la razon de las decisiones, no solo la ubicacion de archivos.
- Preferir nombres de rutas, tablas y servicios reales del sistema.
- Si el modulo tiene frontend y backend, mantener un solo documento de modulo como fuente funcional y tecnica.
