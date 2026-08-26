# Arquitectura del editor

## Capas

1. Modelo documental Dhyrium: estructura serializable independiente de UI/DOM.
2. Selección: rango, contexto, generación y estado mixto.
3. Comandos/transacciones: única puerta de modificación.
4. Historial: undo/redo y límites atómicos de transacción.
5. Maquetación: páginas, secciones, medidas y flujo.
6. Render paginado: adapter Canvas provisional, sustituible.
7. Inspector/importador OOXML: interpreta lo soportado y registra riesgos.
8. Exportador OOXML: actualiza partes compatibles y preserva lo desconocido.
9. Preview auxiliar: nunca sustituye la superficie editable.
10. Persistencia: API, PostgreSQL, versiones y almacenamiento privado.

## Regla de dependencia

`Ribbon UI → CommandRegistry → TransactionCoordinator → DhyriumDocumentModel → RendererAdapter`.

La UI no muta Canvas, DOM u OOXML directamente. Cada comando declara payload,
habilitación, estado, motivo de bloqueo, atajo, KeyTip y frontera transaccional.

## Runtime H01-WEB

- Edición: Canvas Editor OSS encapsulado detrás de `RendererAdapter`.
- Modelo durable: Dhyrium, no el JSON interno del runtime.
- DOCX: bridge OOXML propio, incremental y preservativo.
- Persistencia: Express/Prisma/PostgreSQL y almacenamiento Dhyrium.
- Referencia visual: Word investigado, sin dependencia de ejecución.

Un control habilitado necesita acción real, undo/redo, persistencia y prueba. Un
objeto fuera del perfil se preserva o se bloquea; nunca desaparece en silencio.

