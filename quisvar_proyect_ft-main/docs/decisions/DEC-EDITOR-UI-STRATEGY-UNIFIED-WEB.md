# DEC-EDITOR-UI-STRATEGY-UNIFIED-WEB

Estado: sustituida por `DEC-EDITOR-UI-STRATEGY-DHYRIUM-NATIVE`

Fecha: 11 de agosto de 2026

Registro histórico. Sustituida finalmente el 11 de agosto de 2026 por la
decisión explícita de usar una superficie web editable propia. Antes fue
sustituida por la decisión de ejecutar los
comandos en Microsoft Word local. La estructura `DhyriumWriterWorkspace` sigue
vigente solo para identidad, previsualización, versiones, exportación y sesión.

## Decisión

`DhyriumWriterWorkspace` será la presentación principal del gestor documental,
no el editor DOCX. La entrada a una tarea documental conserva una sola estructura:

```text
DhyriumWriterWorkspace
├── WriterHeader
├── WriterRibbon
├── DocumentViewport
└── WriterStatusBar
```

El workspace no se reemplaza por una tarjeta de selección, una pantalla de
preparación de Word ni un estado vacío a pantalla completa. Carga, ausencia de
archivo, error, solo lectura, conflicto y preparación se expresan dentro del
viewport o mediante superficies transitorias accesibles.

## Agrupación de acciones

- La identidad del DOCX y `Cambiar documento` pertenecen al encabezado.
- Las acciones propias de la tarea, como archivos modelo, encargado, evaluador
  y comentario, permanecen en el encabezado Dhyrium.
- `Guardar`, estado durable y versiones tienen un único owner visible.
- Original protegido, restauración, descarga, exportación, impresión y
  `Abrir en Word` se agrupan en Archivo y, cuando la prioridad lo justifique, en
  accesos compactos del encabezado.
- Una acción no debe repetirse con semánticas distintas entre encabezado,
  Backstage y barra de estado.
- Word Desktop es la acción editorial primaria y se abre en su ventana nativa;
  no se simula dentro del viewport web.

## Cinta y presentación

La cinta web usa el sistema visual de Dhyrium y Fluent 2. Word LTSC 2021 local
es una referencia de investigación para jerarquía, agrupación, estados y flujo
de trabajo, no una licencia para copiar código, CSS, iconos o activos de Office.

La cinta debe:

- consumir esquema, registro de comandos, adaptador de estado y motor de layout;
- conservar estados habilitado, deshabilitado, activo, mixto, pendiente y valor;
- degradar `full → compact → collapsed → overflow` sin scroll horizontal global;
- mantener teclado, KeyTips, foco, lector de pantalla, alto contraste y zoom;
- mostrar únicamente funciones reales del perfil web o una limitación explícita;
- no describirse como idéntica a Word sin evidencia completa del denominador.

## Estado de documento

El viewport conserva su geometría al cambiar de documento, abrir Versiones o
consultar acciones de Archivo. Se definen al menos los estados `BOOTING`,
`NO_DOCUMENT`, `LOADING_DOCUMENT`, `READY`, `DIRTY`, `SAVING`, `SAVED`,
`READ_ONLY`, `CONFLICT` y `ERROR`. Ninguno autoriza mostrar `Guardado` antes del
recibo durable definido por el ADR del motor.

## Criterios de aceptación de la unificación visual

La estrategia se considera implementada, pero todavía no funcionalmente
certificada, cuando:

1. entrar a la tarea muestra directamente el workspace;
2. seleccionar o cambiar el DOCX ocurre dentro del encabezado;
3. no se renderizan como pantallas completas la selección de Word ni la
   preparación de Microsoft Word;
4. todas las acciones retiradas siguen disponibles una sola vez dentro del
   workspace y respetan permisos y estado;
5. la cinta, página, regla y barra de estado permanecen estables durante carga,
   error y ausencia de archivo;
6. no existen controles recortados, solapados, sin acción o presentados como
   verificados sin prueba;
7. existen pruebas y capturas identificadas en resoluciones, zoom, temas,
   teclado y accesibilidad aprobados.

La unificación visual no acredita por sí sola fidelidad DOCX, paridad funcional
con Word ni preparación para producción.
