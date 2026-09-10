# Contrato de permisos y ubicación visual

## Principio

Un permiso representa una capacidad estable. La navegación representa uno o más
lugares desde los que esa capacidad puede abrirse. Mover una pestaña o un acceso
directo no crea, elimina ni cambia el permiso.

El catálogo vigente está en
`quisvar_proyect_bk-main/src/models/menuPoints.ts`. Cada capacidad que puede
moverse declara:

- `permissionKey`: identidad estable y legible;
- `presentation.group`: agrupación usada por el control de permisos;
- `presentation.order`: orden de presentación, independiente del ID legacy;
- `presentation.placements`: superficies donde puede aparecer.

Los IDs `menuId` y `subMenuId` continúan siendo el formato persistido durante la
transición. No deben reutilizarse ni cambiarse para reflejar movimientos de UI.

## Casos actuales

| Capacidad | Persistencia legacy | Ubicación visual |
|---|---|---|
| Planillas | Trámites / submenú 5 | Usuarios para jefatura; sidebar para técnicos |
| Salidas | Trámites / submenú 4 | Cumplimiento de directivas |
| Factura personalizada | Menú 16 | Cumplimiento de directivas |
| Control de asistencia | Menú 4 | Cumplimiento de directivas |
| Comidas | Menú 12 | Cumplimiento de directivas |
| Rotaciones | Menú 13 | Cumplimiento de directivas |
| Control de puerta | Menú 14 | Cumplimiento de directivas |

La matriz usa una proyección frontend para mostrar Planillas y Salidas en su
ubicación funcional, pero traduce los cambios de vuelta a los IDs legacy al
guardar.

## Regla para agentes y cambios futuros

Cuando se agregue o mueva un módulo:

1. Conservar `permissionKey` si la capacidad no cambió.
2. Actualizar únicamente `presentation` y la navegación correspondiente.
3. Añadir `permissionKey`, nivel permitido y guard frontend/backend si es una
   capacidad nueva.
4. No agregar accesos directos sin filtrar por el permiso efectivo.
5. Actualizar `tests/accessControlCatalog.test.ts` con la ubicación esperada.
6. Ejecutar la prueba del catálogo y las compilaciones de frontend y backend.

## Factura personalizada

`custom-invoice.access` es binario: `MOD` significa acceso y la ausencia del
registro significa sin acceso. El script idempotente
`prisma/manual-custom-invoice-permissions.sql` conserva inicialmente el acceso
para los roles que ya administran el centro de usuarios. Debe revisarse y
aplicarse con respaldo durante el despliegue; no se ejecuta automáticamente.

## Iteración 2: administración moderna con fallback legacy

La vista predeterminada de roles y permisos ahora está orientada a un rol por
vez. Incluye búsqueda, conteo de accesos, agrupación por módulo y nombres
legibles para los niveles de acceso. La edición usa un borrador explícito con
acciones de guardar y cancelar; ningún cambio se persiste al seleccionar una
opción hasta confirmar el guardado.

La matriz anterior permanece disponible mediante **Matriz legacy**. La creación
de roles continúa temporalmente allí para evitar duplicar ese flujo mientras se
valida la nueva experiencia. Edición y eliminación ya están disponibles en la
vista moderna y conservan los mismos endpoints y el mismo formato legacy de
persistencia.

Esta iteración no cambia el modelo de autorización. La vista moderna consume la
proyección basada en `permissionKey` y `presentation`, y traduce cada edición a
su referencia `menuId`/`subMenuId`. Por ello es reversible desde la interfaz y
compatible con los registros existentes.
