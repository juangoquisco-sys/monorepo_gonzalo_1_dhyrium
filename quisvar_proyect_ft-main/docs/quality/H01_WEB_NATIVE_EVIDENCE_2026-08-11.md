# Evidencia H01-WEB — editor web independiente de Dhyrium

Fecha de corte: 11 de agosto de 2026  
Entorno: desarrollo local  
Producción: no publicada ni modificada

## Resultado

Se ejecutó un primer subcorte funcional del editor web propio de Dhyrium. La
superficie permite editar contenido nativo, aplicar comandos admitidos de la
pestaña Inicio, guardar y volver a cargar sin invocar Microsoft Office,
Microsoft 365, ONLYOFFICE, WebDAV ni `ms-word:`.

Este resultado **no cierra H01-WEB ni acredita paridad completa con Microsoft
Word**. La importación DOCX queda bloqueada hasta conectar inspección OPC,
preservación inmutable del original y una conversión que no pierda partes
OOXML.

## Cambios demostrados

- Identidad visible: `Dhyrium Writer · editor web independiente`.
- Motor editorial web basado provisionalmente en Canvas Editor.
- Pestaña Inicio funcional para los comandos soportados por el motor.
- Estado de guardado durable visible y control de revisión en Dhyrium.
- Cinco operaciones de párrafo permanecen deshabilitadas con motivo explícito:
  lista multinivel, disminuir/aumentar sangría, sombreado y bordes.
- Recursos Canvas privados con autorización contextual, carga autenticada y
  serialización de `blob:` efímero a una ruta durable.
- Rechazo de recursos externos, recursos de otra tarea, protocolos inseguros,
  videos no protegidos e iframes; texto e hipervínculos normales se conservan.
- Rutas estáticas históricas de assets cerradas; lectura heredada solo mediante
  el endpoint autorizado.
- Contrato Canvas v2 alineado entre frontend y backend.

## Verificación ejecutada

| Puerta                                         | Resultado                             |
| ---------------------------------------------- | ------------------------------------- |
| Backend `test:task-documents`                  | 15/15                                 |
| Backend `test:task-document-office`            | 22/22; legado sin consumidor canónico |
| Inspector `test:task-document-opc`             | 19/19                                 |
| ESLint focal backend                           | correcto                              |
| Build backend                                  | correcto                              |
| Prettier y ESLint focal frontend               | correctos                             |
| Build frontend                                 | correcto                              |
| Playwright `dhyrium-writer-native-web.spec.ts` | 2/2                                   |

El E2E focal comprueba dos contratos. El primero selecciona un DOCX adjunto,
verifica que la importación y sus controles estén bloqueados, y registra cero
descargas DOCX, cero importaciones y cero autoguardados. El segundo abre dos
páginas en un mismo contexto, modifica alineación y negrita, guarda y recarga,
autentica el asset privado, preserva un hipervínculo externo como texto,
bloquea recursos inseguros y registra cero llamadas a Office y cero solicitudes
al dominio atacante.

## Evidencia visual

Captura de desarrollo a 1440 × 900:

`.agent-local/h01-web-native/dhyrium-writer-native-1440.png`

La captura acredita presentación y superficie editable nativa; no acredita
round-trip DOCX fiel ni pruebas multiusuario.

## Inspector DOCX/OPC

El núcleo puro inspecciona el ZIP/OPC antes de inflar partes, aplica límites de
tamaño, entradas, expansión, ratio, rutas, XML y relaciones, y bloquea macros,
ActiveX, OLE, relaciones externas, atributos/namespaces ambiguos, cifrado ZIP,
ZIP64 y paquetes dañados. La lista de diagnósticos no controla por sí sola el
gate, por lo que un hallazgo bloqueante no se pierde al truncar mensajes.

Fixture real inspeccionado sin reconstrucción:

- tamaño: 22.968 bytes;
- SHA-256: `62491c4a1ae66775028a6063907195f63ff24ab8732ac9a2ed400062a4df1daa`;
- Transitional, 19 partes, sin contenido activo detectado;
- no-op con la misma referencia, bytes y hash;
- resultado `preserved`: requiere un futuro motor preservativo para editar las
  partes opacas.

## Puertas abiertas antes de producción

1. Conectar el inspector al endpoint de importación **antes** de Mammoth,
   JSZip o cualquier descompresión en el navegador.
2. Guardar el DOCX original como binario inmutable y presentar un reporte de
   compatibilidad antes de crear una copia editable.
3. Sustituir el modelo Canvas provisional por un modelo documental durable y
   un pipeline OOXML preservativo; el exportador `html-docx-js` basado en
   `altChunk` no constituye round-trip fiel.
4. Añadir pruebas con backend y PostgreSQL reales: dos usuarios y dos PCs,
   permisos HTTP, conflicto de revisión, reapertura y recuperación.
5. Validar firma binaria y dimensiones reales de imágenes inline, además del
   MIME, base64 y límite de 2 MiB ya aplicados.
6. Migrar o reportar documentos históricos que contengan referencias ahora
   rechazadas.
7. Resolver la deuda global de lint ajena al módulo antes de usar el lint total
   como gate de producto.

## Decisión de publicación

No se ejecutó `publish-and-run.ps1`, no se realizó `dbpush`, no se modificó la
base de datos y no se publicó a producción. Este documento acredita un subcorte
de desarrollo observable, no una liberación productiva.
