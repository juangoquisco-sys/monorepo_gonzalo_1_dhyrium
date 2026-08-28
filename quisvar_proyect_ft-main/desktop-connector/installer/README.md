# Empaquetado de Dhyrium Desktop

1. Publicar `Dhyrium.Desktop.Connector.csproj` para `win-x64` en
   `desktop-connector/publish/win-x64` como aplicación autocontenida.
2. Analizar el resultado y firmar el ejecutable con el certificado de código de
   Dhyrium.
3. Compilar `DhyriumDesktop.iss` con Inno Setup y firmar el instalador generado.
4. Publicar el instalador firmado en la ruta de descarga autorizada de Dhyrium.
5. Solo entonces activar `VITE_DHYRIUM_DESKTOP_ENABLED=true` en la web
   publicada.

El instalador es por usuario de Windows y registra únicamente el protocolo
`dhyrium://` para dicho usuario. No necesita permisos de administrador.
