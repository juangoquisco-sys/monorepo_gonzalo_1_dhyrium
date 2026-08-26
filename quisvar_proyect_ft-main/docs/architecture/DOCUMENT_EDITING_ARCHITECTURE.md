# Arquitectura de edición documental de Dhyrium

## Diagnóstico

La ruta heredada convierte DOCX con Mammoth a HTML/JSON de Canvas y reconstruye
Word con `html-docx-js`. Esa transformación pierde semántica OOXML de secciones,
encabezados, pies, formas, anclajes, estilos y métricas tipográficas. Es útil
para importación básica, pero no constituye un round-trip canónico.

La ruta Word Desktop/WebDAV también queda como antecedente histórico. La
decisión vigente exige un editor web propio que funcione desde otras PC sin
Office ni otro motor documental externo.

## Arquitectura vigente

```text
Adjunto DOCX de una tarea (original inmutable)
                 |
                 v
Inspector ZIP/OPC seguro + CapabilityManifest
                 |
                 v
Importador OOXML preservativo
                 |
                 v
DhyriumDocumentModel + DocumentSession
                 |
                 v
CommandBus transaccional <-> CanvasAdapter provisional
                 |
                 v
DurableSaveCoordinator + CAS + VersionReceipt
                 |
                 v
Exportador OOXML nativo + versiones inmutables
```

Dhyrium controla identidad, permisos, modelo, layout web, caret, selección,
comandos, undo/redo, blobs, versiones, estados y auditoría. Ninguna ruta física
de almacenamiento se entrega al cliente y ninguna dependencia Microsoft sirve
como runtime o base de datos.

## Responsabilidades

| Área | Responsabilidad canónica |
|---|---|
| Workspace | `TaskPrincipal.tsx` + editor nativo |
| Runtime provisional | adapter de `@hufe921/canvas-editor` |
| UI de comandos | cinta Dhyrium → `CommandRegistry` |
| Modelo durable | `DhyriumDocumentModel`, independiente de Canvas/DOM |
| OOXML | inspector, importador y exportador preservativo |
| Autorización | política contextual backend por usuario/tarea/documento |
| Persistencia | Express/Prisma/PostgreSQL + almacenamiento privado |
| Versiones | original inmutable, una cabeza y `VersionReceipt` |

`contentHtml`, `contentJson` de Canvas y `altChunk` no son fuente canónica de un
DOCX complejo. Se mantienen solo como compatibilidad básica durante la
migración.

## Flujo H01-WEB

1. La API verifica usuario, tarea y adjunto antes de entregar cualquier byte.
2. Conserva una vez el original, calcula SHA-256 y registra su procedencia.
3. El inspector valida el ZIP/OPC sin descompresión insegura y produce un
   manifiesto de partes, relaciones y riesgos.
4. La UI muestra qué es editable, preservado, bloqueado o no soportado.
5. El importador carga solo el perfil soportado y conserva aparte las partes no
   comprendidas que sea seguro preservar.
6. Cada edición pasa por un comando tipado y una transacción reversible.
7. Guardar ensambla OOXML, valida el resultado, resuelve CAS y crea una versión
   inmutable antes de emitir el recibo durable.
8. Cerrar y reabrir usa esa versión committed; no reconstruye desde una vista
   PDF ni mantiene una cabeza paralela.

## Seguridad y producción

- Límites ZIP se aplican a entradas, tamaños, ratio, rutas, cifrado y duplicados
  antes de inflar contenido.
- Macros, ActiveX, OLE y relaciones externas nunca se ejecutan.
- Assets nuevos se sirven por rutas autenticadas/autorizadas, no por un static
  público predecible.
- Los permisos efectivos proceden del backend.
- Un objeto no editable se preserva o bloquea; nunca desaparece al guardar.
- H01-WEB sigue bloqueado para producción hasta demostrar round-trip del corpus,
  aislamiento multiusuario, seguridad, accesibilidad y recuperación.

