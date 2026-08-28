# Dhyrium Desktop: desarrollo, artefactos y publicación

## Objetivo y límite de Git

El monorepo contiene el código fuente de Dhyrium Desktop, pero no sus binarios.
GitHub rechaza archivos individuales mayores de 100 MiB; cada ejecutable actual
del conector pesa aproximadamente 116 MiB. Incluso el ZIP comprimido (47 MiB)
no debe entrar al historial: cada versión aumentaría permanentemente el tamaño
de cada clon. Por eso el código vive en Git y el ZIP se publica como artefacto.

La primera entrega prevista es **`v0.1.4-pilot`**:

- Archivo: `DhyriumDesktop-0.1.4-win-x64-pilot.zip`
- Tamaño: `47,386,098` bytes
- SHA-256: `27A6E96CA4D3F29B812DA794D8D525D14AB6C3E279F89E67F7D4A54B3F75E117`
- Estado: piloto interno, no firmado. Su versión interna conocida no es
  coherente con el nombre externo; no se debe presentar como una release final.

## Dónde vive cada cosa

| Elemento | Ubicación | Uso |
| --- | --- | --- |
| Código fuente | Rama Git `feature/dhyrium-desktop-pilot` | Desarrollo en cualquier PC |
| ZIP piloto | Release pública `v0.1.4-pilot` de este monorepo | Recuperar la misma prueba en otra PC |
| ZIP servido a usuarios | `artifacts/dhyrium-desktop/` en el host | Nginx lo expone como `/desktop/...` |
| Copia Vite local | `quisvar_proyect_ft-main/public/desktop/` | Pruebas con `npm run dev` |

La Release `v0.1.4-pilot` es pública por decisión del proyecto. El ZIP es un
piloto interno no firmado: publique únicamente artefactos aprobados para
descarga pública y nunca incluya credenciales, datos de clientes ni archivos
de trabajo en ella.

Las tres carpetas de binarios están ignoradas por Git. Nunca haga `git add -f`
sobre ZIP, EXE, `work/`, `desktop-connector/bin`, `obj` o `publish`.

## Arranque en otra PC

1. Clone el monorepo y cambie a `feature/dhyrium-desktop-pilot`.
2. Instale las dependencias normales del frontend y backend.
3. Para probar el piloto sin reconstruirlo, descargue el ZIP desde la Release
   pública `v0.1.4-pilot` y compruebe su SHA-256.
4. Para Vite local, ejecute:

   ```powershell
   .\scripts\prepare-dhyrium-desktop-installer.ps1 -ZipPath C:\Descargas\DhyriumDesktop-0.1.4-win-x64-pilot.zip -Target vite
   ```

5. Para Docker/Nginx, ejecute el mismo script con `-Target server` antes de
   iniciar `docker compose up -d`. Compose monta esa carpeta como solo lectura
   en `/usr/share/nginx/html/desktop`.
6. Compruebe `http://<host>/desktop/DhyriumDesktop-0.1.4-win-x64-pilot.zip` y
   confirme que responde HTTP 200 antes de habilitar la función en la web.

No copie todo `public/` entre computadoras. El repositorio ya entrega los
archivos versionados; solo el ZIP debe recuperarse desde la Release.

## Crear una nueva versión

1. Modifique `quisvar_proyect_ft-main/desktop-connector/` y ejecute:

   ```powershell
   dotnet run --project quisvar_proyect_ft-main\desktop-connector\Dhyrium.Desktop.Connector.csproj -- --self-test
   ```

2. Publique una aplicación autocontenida `win-x64`, analícela y fírmela con el
   certificado de código de Dhyrium.
3. Compile `desktop-connector/installer/DhyriumDesktop.iss`, actualizando su
   versión y la versión de ensamblado para que coincidan con el nombre del ZIP.
   Firme también el instalador, genere el ZIP y calcule SHA-256.
4. Cree una nueva Release pública (`v0.1.5`, por ejemplo) y adjunte el ZIP.
   Los assets no se editan: cada cambio requiere una nueva versión.
5. Actualice `VITE_DHYRIUM_DESKTOP_DOWNLOAD_URL`, la documentación y el hash
   esperado del script. Descargue el nuevo asset en el host y ejecútelo con el
   script de preparación.

## Flujo Desktop y seguridad

La aplicación web solicita un ticket de apertura de un solo uso (60 segundos)
para el usuario autenticado. El conector canjea el ticket, descarga una copia
local y, al detectar un guardado de AutoCAD, sube una versión. El backend vuelve
a comprobar permiso de edición, registra usuario, fecha, número y SHA-256, y
evita sobrescrituras cuando la versión cambió en paralelo.

Las copias inmutables se guardan en `uploads/desktop-documents` y no se exponen
estáticamente. Este historial es separado del flujo legacy de `Feedback`.
Luego el backend reemplaza el archivo legacy vigente para que la siguiente
apertura use el DWG nuevo. Atención: la ruta legacy de ese archivo conserva sus
reglas de exposición previas; si debe ser privada, su descarga legacy requiere
un endpoint autenticado adicional.

## Checklist de despliegue

- Migración Desktop aplicada y backend desplegado.
- `VITE_DHYRIUM_DESKTOP_ENABLED=true` solo si el instalador disponible fue
  validado para el entorno.
- ZIP descargado desde la Release, hash validado y copiado al volumen del host.
- URL `/desktop/...` devuelve 200.
- Prueba completa: instalar, iniciar sesión, abrir un DWG autorizado, guardar,
  reabrir y confirmar la nueva versión y el autor.
