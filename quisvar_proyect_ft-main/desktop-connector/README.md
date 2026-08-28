# Dhyrium Desktop Connector

Este proyecto es un conector de Windows separado de Dhyrium Web. La persona
continúa viendo proyectos, permisos y documentos en Dhyrium Web; el conector
solo recibe una orden temporal para abrir el archivo con la aplicación local y
guardar una nueva versión al detectar cambios.

## Cómo funciona

1. La persona inicia sesión en Dhyrium Desktop con su usuario y contraseña
   habituales de Dhyrium.
2. El navegador entrega a Desktop un permiso temporal de un solo uso, sin
   incluir contraseña ni token de sesión en el enlace.
3. Desktop descarga una copia administrada en la carpeta local de la
   aplicación y Windows la abre con la asociación existente: AutoCAD, Revit,
   Word, Excel, S10, Acrobat u otra.
4. Al guardar, Desktop detecta el cambio y lo envía al servidor como una nueva
   versión. Si alguien publicó una versión antes, evita sobrescribirla.

La copia local es necesaria para que los programas de Windows puedan trabajar;
no se presenta como una descarga manual ni se pide al usuario elegir una
carpeta. Dhyrium sigue siendo el origen y el historial del archivo.

## Red local y acceso externo

La prioridad es que funcione dentro de la red local mientras la computadora
pueda comunicarse con el servidor de Dhyrium. También puede operar desde fuera
de la empresa cuando la dirección de Dhyrium sea accesible de forma segura; la
publicación debe usar HTTPS y los controles de acceso que defina la empresa
(VPN cuando corresponda).

## Extensiones

El servidor permite extensiones generales de trabajo, incluidas DWG, DXF, RVT,
DOCX, XLSX, PDF, PSD y S10. Por seguridad, bloquea archivos ejecutables,
scripts, accesos directos y otros tipos que Windows podría ejecutar.

Los proyectos que dependen de varios archivos o carpetas (por ejemplo XREF de
AutoCAD) requieren una fase posterior de espacio de trabajo con manifiesto.
La primera versión gestiona con seguridad un archivo por apertura.

## Prueba sin servidor real

La prueba integrada usa un servidor simulado y no toca usuarios, archivos de
empresa, el registro de Windows ni AutoCAD:

```powershell
dotnet run --project desktop-connector\Dhyrium.Desktop.Connector.csproj -- --self-test
```

Comprueba inicio de sesión, enlace temporal de un solo uso, descarga, apertura
local simulada, dos guardados versionados y protección contra duplicados.

## Publicación

Antes de activar el botón web se deben publicar conjuntamente la migración de
base de datos, el backend, la web con `VITE_DHYRIUM_DESKTOP_ENABLED=true` y un
instalador firmado. No habilite el botón en producción antes de que exista el
instalador para Windows.
