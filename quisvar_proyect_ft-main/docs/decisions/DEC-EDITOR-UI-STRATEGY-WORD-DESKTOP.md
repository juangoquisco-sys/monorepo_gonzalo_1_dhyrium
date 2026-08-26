# DEC-EDITOR-UI-STRATEGY-WORD-DESKTOP

Estado: sustituida por `DEC-EDITOR-UI-STRATEGY-DHYRIUM-NATIVE`
Fecha: 11 de agosto de 2026

Registro histórico. Fue aceptada para el corte Word Desktop y después sustituida
por la decisión explícita de construir una sola superficie web realmente
editable. No debe usarse como contrato vigente.

Sustituía para la superficie editorial:
`DEC-EDITOR-UI-STRATEGY-UNIFIED-WEB`. La estructura estable del workspace web
se mantiene como shell; sus controles no ejecutan comandos de edición DOCX.

## Decisión

La única superficie editorial canónica es la ventana nativa de Microsoft Word.
Dhyrium puede conservar la presentación investigada de la pestaña Inicio como
orientación visual, pero no recrea sus comandos, no superpone una cinta propia
sobre Word y no presenta HTML/Canvas/PDF como edición fiel.

El shell Dhyrium puede mostrar únicamente:

- identidad y selección del DOCX;
- estado comprobable de preparación/sesión/versión;
- launcher de Microsoft Word;
- original protegido como consulta auxiliar explícita;
- historial, restauración y exportaciones desde versiones confirmadas.

Crear una sesión o emitir `ms-word:` no demuestra que Word abrió el archivo.
Hasta recibir actividad WebDAV real, la UI debe decir “sesión preparada” o
“solicitud enviada”, nunca “documento abierto”.

El editor Canvas heredado debe permanecer detrás de una acción explícita y
rotulada como heredada. No puede montarse por defecto al entrar a una tarea.
