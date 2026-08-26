# Backend local de Dhyrium Writer

## Servicios

| Servicio | Puerto | Persistencia |
|---|---:|---|
| Frontend desarrollo | 8001 | no aplica |
| Aplicación Docker | 8088 | volumen/build |
| API | 8081 | PostgreSQL y archivos |
| PostgreSQL | 5433 host local | volumen privado |
| Render DOCX local | 8092 | caché de previsualización |

## Contrato documental objetivo

- ID de documento y versión.
- Versiones inmutables y checksum SHA-256.
- guardado atómico y concurrencia optimista.
- borradores/autosave/recuperación.
- metadatos PostgreSQL y contenido en volumen local.
- health checks, auditoría, backup/restauración.
- límites, rutas seguras y protección ZIP bomb.

El Hito 02 completa Menú Archivo sobre este contrato. El Hito 01 no modifica el esquema de base de datos.

## Levantamiento completo

Desde la raíz:

```powershell
.\publish-and-run.ps1
```

Después se verifican 8001, 8088, 8081 y PostgreSQL saludable.

