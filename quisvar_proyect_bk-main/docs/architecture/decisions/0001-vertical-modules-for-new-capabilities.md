# ADR-0001: Módulos verticales para capacidades nuevas

## Estado

Aceptado.

## Contexto

El backend está organizado históricamente en carpetas horizontales de routes, controllers y services. Algunos dominios complejos ya incorporan application, domain e infrastructure dentro de services. Migrar todo el sistema produciría un cambio grande sin beneficio proporcional y exigiría una red amplia de tests que hoy no existe.

Al mismo tiempo, las capacidades nuevas necesitan límites más visibles, validación uniforme y una ruta de crecimiento que evite services monolíticos.

El repositorio prohíbe los barrel files y recientemente eliminó sus `index.ts`, por lo que un estándar basado en APIs públicas mediante reexportaciones no es compatible.

## Decisión

- Crear cada capacidad de negocio completamente nueva como módulo vertical en `src/modules/<kebab-case>/`.
- Mantener las extensiones de capacidades existentes en su estructura actual para no dividir la propiedad del dominio.
- Aplicar las responsabilidades, validación y límites del estándar a todo código nuevo, aunque pertenezca a una capacidad existente.
- Migrar una capacidad existente solo mediante una tarea explícita con tests de caracterización.
- Registrar routers e importar contratos directamente desde el archivo propietario; no crear `index.ts` ni barrels.
- Empezar cada módulo con route, controller, schema y service, agregando capas solo ante complejidad demostrable.

## Alternativas consideradas

### Mantener únicamente carpetas horizontales

Reduce cambios iniciales, pero conserva baja cohesión y facilita que dominios nuevos crezcan en services centrales demasiado grandes.

### Migración gradual de todo archivo tocado

Converge hacia una sola estructura, pero mezcla cambios funcionales con movimientos, divide dominios durante la transición y aumenta el riesgo de regresión.

### Migración masiva inmediata

Produce uniformidad rápida, pero su costo y riesgo no están respaldados por la cobertura actual.

## Consecuencias

- Existirán temporalmente dos formas de ubicación, con una frontera explícita: legado existente y capacidades nuevas.
- Los dominios nuevos serán más cohesivos y fáciles de extraer o probar.
- No se obtiene uniformidad total sin una decisión posterior de migración.
- Los imports directos preservan la regla contra barrels, aunque requieren documentar claramente qué archivos son contratos entre módulos.
