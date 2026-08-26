# Recaudador Grande

`Recaudador Grande` es el flujo de frontend para revisar el avance técnico,
otorgar conformidad de etapa, crear una solicitud de liquidación y conciliar
adelantos en planilla.

## Rutas

- `/mis-tareas/tecnicas/recaudador-grande/pre-liquidacion`
- `/mis-tareas/tecnicas/recaudador-grande/pre-liquidacion/etapa/:stageId`
- `/mis-tareas/tecnicas/recaudador-grande/liquidacion`

Las rutas reutilizan el permiso existente `mis-tareas / tecnicas`. La acción
de conformidad exige el rol `MOD` de ese submenú.

## API requerida

Todas las rutas se resuelven contra la URL local ya configurada por
`axiosInstance`; el módulo no agrega secretos ni variables de entorno.

- `GET /liquidations/pre-stages`
- `GET /liquidations/pre-stages/:stageId/tasks`
- `POST /liquidations/pre-stages/:stageId/grant-conformity`
- `GET /liquidations/eligible-stages`
- `GET /liquidations/preview/:stageId`
- `POST /liquidations/create-request`
- `GET /liquidations/unamortized-advances/:userId`
- `POST /payrolls/:payrollId/reconcile-liquidation`

## Integraciones

- El acceso principal está en la cabecera de Mis tareas técnicas.
- Mis reportes incluye la categoría `Liquidación` y presenta el sustento y
  sus importes sin habilitar edición genérica del reporte.
- Planilla marca las liquidaciones pendientes y abre la conciliación en el
  sistema global de diálogos.
- Una liquidación pendiente no puede autorizarse mediante el check genérico;
  primero debe pasar por `Conciliar`.

## Validación

```powershell
npm run lint
npm run build
npx playwright test tests/e2e/recaudador-grande.spec.ts
```

La prueba E2E utiliza respuestas API controladas y verifica listado, detalle,
conformidad, vista previa y ausencia de desplazamiento horizontal global.
