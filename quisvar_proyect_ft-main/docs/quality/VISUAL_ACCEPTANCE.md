# Aceptación visual

## Matriz de captura

- Viewports: 1366×768, 1440×900, 1920×1080.
- Zoom: 100%, 125%, 150%, 200%, 400%.
- Temas: claro, oscuro, alto contraste.
- Densidad: compacta, cómoda, táctil cuando corresponda.
- Estados: selección de texto/tabla/imagen, menú abierto, deshabilitado y error real.

## Assertions

- `documentElement.scrollWidth <= clientWidth`.
- todo grupo/comando queda dentro del rectángulo de cinta o su overflow.
- ningún par de controles visibles se superpone.
- menús dentro del viewport.
- galería de estilos usa scroll interno.
- foco visible y no oculto.

## Comparación

1. Captura de referencia y estado actual bajo metadatos idénticos.
2. Comparación lado a lado.
3. Superposición con opacidad.
4. Geometría automatizada.
5. Registro de diferencias fuera de ±4 px.

Las evidencias se nombran `hXX-<superficie>-<viewport>-<zoom>-<tema>.png` y se acompañan por JSON de metadatos.

## Evidencia ejecutada — Hito 01

Directorio local: `quisvar_proyect_ft-main/.agent-local/evidence/hito-01/`.

| Artefacto | Cobertura |
|---|---|
| `ribbon-1920x1080-claro-100.png` | modo completo y jerarquía de grupos |
| `ribbon-1440x900-claro-100.png` | compactación y overflow |
| `ribbon-1366x768-claro-100.png` | grupos colapsados sin clipping |
| `ribbon-1440x900-oscuro-100.png` | tema oscuro |
| `ribbon-1440x900-alto-contraste-100.png` | alto contraste forzado |
| `ribbon-1024x768-tactil-100.png` | interacción táctil, grupos colapsados y objetivos ≥24 px |
| `metadata.json` | build de referencia, SO, locale, DPI, zoom, tema y viewports |

La prueba `tests/e2e/dhyrium-writer-hito-01.spec.ts` comprueba además los equivalentes de reflow de 200 % y 400 % mediante geometría, el modo táctil a 1024×768, el árbol de accesibilidad, reduced motion, apertura de menú con `Alt+Flecha abajo` y restauración del foco con Escape. La comparación pixel a pixel contra una captura de Word bajo condiciones idénticas sigue pendiente; estas capturas validan ausencia de clipping, superposición y scroll horizontal global, no paridad visual total.
