# Dhyrium Desktop Connector

La versión 0.2.0 incorpora transferencias reanudables, progreso, pausa,
cancelación y entrega explícita de paquetes ArcMap. Consulte
[LARGE-FILES.md](LARGE-FILES.md) para el contrato, despliegue y pruebas.

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
   Los archivos MPK usan «Entregar paquete actualizado» después de regenerar
   el paquete desde ArcMap; no usan guardado automático del contenido extraído.

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

### Candidata 0.3.1: sesiones y recuperación CAD

La interfaz gráfica usa un coordinador por usuario de Windows y un canal local
`CurrentUserOnly`. Cada documento tiene una sola ventana y una ruta `working`
estable, particionada por servidor y cuenta. Cerrar la ventana la oculta; el
menú de bandeja permite mostrar documentos o salir conservando los pendientes.
Salir termina el seguimiento hasta volver a iniciar Desktop.

Los manifiestos de sesión no contienen credenciales. Al reiniciar se valida el
acceso al documento en el servidor y solo se recuperan sesiones de la cuenta
actual. Un cambio de cuenta pausa los envíos anteriores. Los archivos de 0.3.0
se conservan; si siguen abiertos o tienen cambios no confirmados, se indica su
carpeta para revisión y se bloquea una apertura paralela.

El observador de AutoCAD enumera documentos y consulta la tabla COM para
instancias adicionales. Las consultas se ejecutan en un auxiliar con límite de
12 segundos (15 segundos de autodestrucción si desaparece el coordinador), con
reintentos de 1 a 15 segundos. Los errores no borran la última ruta identificada.
El cierre requiere dos observaciones completas y ausencia de archivos de bloqueo;
un estado desconocido conserva la sesión. No se cambia `SAVETIME`.

Guardar como o recuperar desde otra ruta no vincula automáticamente el archivo:
revise y entregue esa copia explícitamente mediante Recuperaciones. Los respaldos
nunca reemplazan por sí solos la versión publicada. El alcance sigue siendo un
archivo; no incluye gestión de XREF ni carpetas de proyecto.

`--self-test` incluye aislamiento de cuentas, exclusión entre versiones, conflictos,
reinicio con pendientes, actualización de cabeza sin cambiar la ruta, protección
de recuperaciones entregadas y errores COM repetidos. `--self-test-coordinator`
acepta un JSON de laboratorio con `serverUrl` exclusivamente loopback, `root` y
`ticket`; usa una cuenta ficticia y un canal separado, sin modificar el registro
ni las credenciales reales. Esa prueba puede abrir AutoCAD instalado.

La candidata no debe anunciarse como validada en AutoCAD/Civil 3D hasta completar
la prueba funcional de cierre/reapertura, autoguardado y recuperación tras fallo.

Antes de activar el botón web se deben publicar conjuntamente la migración de
base de datos, el backend, la web con `VITE_DHYRIUM_DESKTOP_ENABLED=true` y un
instalador firmado. No habilite el botón en producción antes de que exista el
instalador para Windows.
