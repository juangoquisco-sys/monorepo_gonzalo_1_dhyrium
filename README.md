# Dhyrium Software

## Desarrollo local

Inicia cada servicio desde su carpeta:

```powershell
# Backend: E:\dhyrium software\quisvar_proyect_bk-main
npm run dev

# Frontend: E:\dhyrium software\quisvar_proyect_ft-main
npm run dev
```

El frontend queda disponible en `http://localhost:8001` y en
`http://172.16.10.177:8001`. En desarrollo, `VITE_API_URL` puede apuntar al
backend local del puerto `8081`.

## Docker: entorno similar a producción

Inicia Docker Desktop. Desde esta carpeta raíz ejecuta:

```powershell
docker compose up -d
```

La aplicación queda disponible en `http://localhost:8088/#/home` y
`http://172.16.10.177:8088/#/home`.

El frontend, la API, Socket.IO y los archivos usan el mismo host. La imagen no
lleva una IP privada grabada y puede publicarse detrás de un dominio o proxy
HTTPS sin recompilarla. PostgreSQL permanece en la red privada y nunca debe
exponerse directamente a Internet.

## Publicar y actualizar las imágenes

Autentícate una sola vez con una cuenta autorizada:

```powershell
docker login
```

Después ejecuta desde esta carpeta:

```powershell
.\publish-and-run.ps1
```

El comando crea una etiqueta inmutable `production-YYYYMMDD-HHmmss`, actualiza
`production-latest`, publica las imágenes y reinicia los servicios locales.

## Documentos Word

`DhyriumWriterWorkspace` es la única superficie editorial canónica. El usuario
edita directamente en el navegador y puede entrar desde otra PC autorizada de
la red sin instalar Microsoft Office, ONLYOFFICE, Collabora u otra suite. La
cinta, el caret, la selección, el paginado, los atajos y undo/redo pertenecen al
motor web de Dhyrium; un control solo se habilita cuando ejecuta una operación
real y comprobada.

Dhyrium conserva el original DOCX inmutable, una sola cabeza durable y un
historial de versiones en su propio backend, PostgreSQL y almacenamiento de
archivos. Microsoft 365, SharePoint, OneDrive y Office no son base de datos ni
dependencias de ejecución. Word se usa únicamente como referencia de producto
para investigar presentación y comportamiento.

El runtime Canvas actual es una base MIT encapsulada para el primer corte, no el
formato canónico. La conversión Mammoth → HTML → Canvas y la exportación
`altChunk` desde HTML quedan clasificadas como importación/exportación básica y
no pueden sustituir el futuro bridge OOXML preservativo. Un DOCX incompatible se
bloquea o abre en modo de preservación; nunca se guarda silenciosamente con
pérdida.

Producción permanece bloqueada hasta cerrar autorización contextual, inspección
ZIP/OPC, modelo/transacciones durables, importación y exportación OOXML del
perfil aprobado, pruebas de round-trip, seguridad y E2E multiusuario. Las
decisiones vigentes están en `quisvar_proyect_ft-main/docs/decisions/`.
