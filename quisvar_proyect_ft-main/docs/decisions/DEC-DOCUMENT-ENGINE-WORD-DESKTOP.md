# DEC-DOCUMENT-ENGINE-WORD-DESKTOP

Estado: sustituida por `DEC-DOCUMENT-ENGINE-DHYRIUM-NATIVE`
Fecha: 11 de agosto de 2026

Registro histórico. Fue aceptada para el corte Word Desktop y después sustituida
por la decisión explícita de construir un editor web propio sin dependencias de
Office. No debe usarse como contrato vigente.

Sustituía como motor editorial: `DEC-DOCUMENT-ENGINE-UNIFIED-WEB`. El workspace
web de aquella decisión se conserva únicamente como shell de repositorio,
previsualización, versiones y estado.

## Decisión

Microsoft Word de escritorio es el único motor canónico de edición para DOCX
complejos en V1. Dhyrium conserva el binario OOXML, crea una sesión temporal y
emite `ms-word:ofe|u|URL`; Word lee y guarda mediante el canal WebDAV controlado
por Dhyrium.

Canvas/HTML queda limitado a contenido heredado o utilidades no destructivas.
No se integra una segunda cinta ni un editor web que pretenda imitar Word.

## Responsabilidades

- Microsoft Word: parsing OOXML, layout, paginación, selección, caret, objetos,
  revisión, comandos, undo/redo y ribbon editorial.
- Dhyrium: identidad del adjunto, ACL, lease, TTL, URL temporal, blobs,
  versiones inmutables, restauración, auditoría y exportaciones confirmadas.
- El original nunca se reemplaza; cada guardado distinto crea una versión.

## Alcance de “igual al Word instalado”

La igualdad proviene de abrir ese ejecutable de Word, no de reproducirlo en el
navegador. Solo se puede afirmar para la estación, versión, idioma, licencia,
complementos y políticas que se prueben. No implica paridad universal entre
PC, versiones de Office o configuraciones de impresión.

## Compuertas antes de producción

- HTTPS real con certificado confiable y URL alcanzable desde Word.
- Cero tokens temporales en logs de Node, Nginx, proxy y observabilidad.
- Validación de token/TTL antes de recibir cuerpos PUT grandes.
- Semántica WebDAV y precondiciones compatibles probadas con la versión objetivo.
- Renovación o recuperación segura para sesiones superiores al TTL.
- Validación ZIP/OPC, defensa contra zip bombs y política de malware/contenido activo.
- E2E real: abrir, LOCK, guardar, versionar, cerrar/UNLOCK, reconectar y expirar.
- Pruebas con Trust Center, GPO, proxy, licencia y asociaciones `ms-word:` de cada
  perfil de estación soportado.

Hasta cerrar estas compuertas el flujo es experimental de desarrollo y no debe
publicarse como listo para producción.
