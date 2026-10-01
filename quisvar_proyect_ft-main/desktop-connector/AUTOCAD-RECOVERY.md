# Desktop 0.3.0 — AutoCAD 2025 y Civil 3D 2025

## Guardar sin cerrar

Desktop vigila el DWG y toma una copia cuando termina el guardado. Permite el
handle de escritura que conserva AutoCAD, compara tamaño, fecha y SHA-256 en
una segunda lectura y solo envía una captura estable. Reintenta cada diez
segundos los archivos modificados o las entregas pendientes. La ventana muestra
la hora confirmada por el servidor. Hay que mantener Desktop abierto.

## Autoguardados y error fatal

La detección usa ActiveX, en un hilo STA separado, sin instalar plugins ni
ejecutar comandos en AutoCAD. Consulta `FullName`, `SAVETIME`, `SAVEFILE` y
`SAVEFILEPATH` del dibujo activo y exige que la ruta completa coincida con el
documento administrado. No asocia archivos únicamente por su nombre en TEMP.
Las interfaces se liberan después de consultarlas; no se inicia ni se cierra
AutoCAD mediante COM.

Una vez identificada la ruta del SV$, Desktop la conserva para poder recogerlo
si AutoCAD se cierra. Comprueba cambios cada dos segundos, conserva cada contenido
distinto como DWG inmutable local y envía las copias pendientes cada quince
segundos. Fallar la conexión no elimina la copia. Un encabezado DWG y SHA-256
verifican formato básico e integridad; no demuestran que AutoCAD pueda reparar
o abrir un dibujo dañado.

`GetActiveObject` puede devolver solo la primera instancia registrada para una
versión. Si AutoCAD y Civil 3D están abiertos simultáneamente o ActiveX no expone
el dibujo, use **Recuperaciones de AutoCAD → Seleccionar autoguardado** y elija
el SV$ indicado por ese dibujo. No se cambia SAVETIME ni SAVEFILEPATH. Un valor
SAVETIME=0 desactiva el autoguardado: Desktop no puede conservar cambios que
AutoCAD aún no haya escrito. Un SV$ creado y eliminado entre dos comprobaciones
puede no capturarse; guardar normalmente sigue protegido por el seguimiento DWG.

## Recuperar

1. Abra el documento desde la web, con la misma cuenta en web y Desktop.
2. En **Recuperaciones de AutoCAD**, actualice la lista. Las copias del servidor
   se limitan al autor autenticado y al documento autorizado; también aparecen
   las copias locales disponibles en esa PC.
3. **Abrir copia** crea una copia de trabajo, preservando el respaldo. Revísela
   con AutoCAD/Civil 3D y guarde el DWG recuperado.
4. **Entregar DWG revisado** crea una versión mediante el flujo normal y su
   control de conflictos. Una actualización de otro usuario no se sobrescribe.
   Después de entregar, el dibujo viejo deja de sincronizarse: ciérrelo y abra
   la nueva versión desde la web.

Los respaldos no sustituyen automáticamente el plano publicado. Tampoco
incluyen referencias externas, imágenes o archivos de proyecto de Civil 3D.
No hay purga automática de copias de recuperación en esta versión; se deduplican
por contenido y deben incluirse en el control de espacio y respaldo del servidor.

## API y despliegue

- `GET /api/v1/desktop/documents/:documentId/recoveries`
- `PUT /api/v1/desktop/documents/:documentId/recoveries/:checksum`
  con `application/octet-stream` y `X-Base-Version-Id`.
- `GET /api/v1/desktop/documents/:documentId/recoveries/:checksum/content`

Las rutas autentican y aplican el permiso contextual existente del documento.
Solo se admiten documentos DWG. El almacenamiento está dentro del vault privado,
en `.recoveries/<documentId>/<userId>`. Se valida tamaño máximo, encabezado y
checksum antes de publicar el manifiesto. Los temporales se eliminan al fallar
una petición. No cambia el esquema de base de datos ni se crea otro permiso.
El PUT de recuperación transmite un stream completo; si falla se reenvía desde
la copia local. El guardado normal conserva las transferencias por bloques.

Publicar API, configuración web/proxy y ZIP 0.3.0 juntos. El archivo de la
descarga debe colocarse en `artifacts/dhyrium-desktop` durante el despliegue
autorizado; cambiar solo el enlace produce un 404. El paquete de este trabajo
queda preparado en `.agent-local/desktop-autocad`, no en el volumen publicado.

## Evidencia y límites

Se probaron guardados con handle de escritura y DWL abiertos, un fallo HTTP
transitorio con reintento, integridad y persistencia de SV$, aislamiento por
autor/documento, rechazo de capturas cambiantes y protección ante sobrescritura
por el dibujo antiguo después de entregar una recuperación. La prueba local de
interfaz usa archivos artificiales y lanzamiento de editor simulado.
La detección COM y apertura/recuperación semántica requieren prueba piloto real
en AutoCAD 2025 y Civil 3D 2025; no se afirman verificadas en esta máquina.

Referencias oficiales:
- https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-Core/files/GUID-2C7A305A-951E-49F3-9804-4C9CD23270E5.htm
- https://help.autodesk.com/cloudhelp/2021/ENU/AutoCAD-ActiveX-Reference/files/GUID-2D00EF00-0579-4424-85C3-BEABB329CBAD.htm
- https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/Understanding-AutoCAD-backup-and-autosave-files.html
