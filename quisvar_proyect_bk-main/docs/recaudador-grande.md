# Recaudador Grande: contrato backend local

El dominio vive en `src/modules/liquidations/`. La API usa autenticacion JWT,
Prisma y PostgreSQL locales; no depende de servicios externos.

## Endpoints

| Metodo | Ruta                                                 | Acceso                        | Funcion                                                                       |
| ------ | ---------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/liquidations/pre-stages`                           | Usuario autenticado           | Lista etapas propias; un MOD tecnico ve las que puede moderar.                |
| GET    | `/liquidations/pre-stages/:stageId/tasks`            | Usuario autenticado           | Detalle y estado de conformidad de la etapa.                                  |
| POST   | `/liquidations/pre-stages/:stageId/grant-conformity` | MOD de `mis-tareas/tecnicas`  | Convierte tareas revisadas a terminadas.                                      |
| GET    | `/liquidations/eligible-stages`                      | Usuario autenticado           | Etapas propias con conformidad completa.                                      |
| GET    | `/liquidations/preview/:stageId`                     | Usuario autenticado           | Calcula alcance y monto bruto sin escribir datos.                             |
| POST   | `/liquidations/create-request`                       | Usuario autenticado           | Crea reporte, tramite y archivos PDF atomicamente.                            |
| GET    | `/liquidations/unamortized-advances/:userId`         | Propietario o MOD de planilla | Adelantos pagados aun no amortizados.                                         |
| POST   | `/payrolls/:payrollId/reconcile-liquidation`         | MOD de `tramites/planilla`    | Amortiza adelantos y autoriza la liquidacion en una transaccion serializable. |

`create-request` recibe `multipart/form-data`: `data` contiene JSON y
`mainProcedure` contiene el PDF obligatorio. `fileMail` admite hasta diez PDF
adicionales. Cada archivo tiene un limite de 20 MiB.

## Persistencia

`Reports` conserva el tipo y snapshot del alcance, monto amortizado, estado de
amortizacion y etapa de origen. `LiquidationAdvanceAmortization` registra cada
adelanto consumido y su restriccion unica impide amortizarlo dos veces.

Este repositorio usa `prisma db push`. Despues de respaldar la base local:

```powershell
npm run generate
npm run dbpush
```

No se agregan variables de entorno nuevas.
