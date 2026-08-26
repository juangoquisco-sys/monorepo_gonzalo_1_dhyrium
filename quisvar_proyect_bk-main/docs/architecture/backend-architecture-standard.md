# Estándar de arquitectura backend

> Versión: 1.0
> Alcance: `quisvar_proyect_bk`
> Objetivo: mantener un monolito modular explícito, con complejidad proporcional por capacidad de negocio.

## 1. Principio rector

Elegir la solución menos compleja que resuelva correctamente el problema y proteja seguridad, mantenibilidad y operación.

No se premian más carpetas, capas, clases o interfaces. Cada abstracción debe justificar un beneficio concreto en claridad, cohesión, testabilidad, aislamiento, transacciones o reducción de riesgo.

Estas reglas son prospectivas:

- Aplicarlas a todo flujo nuevo.
- Crear módulos verticales solo para capacidades de negocio completamente nuevas.
- Mantener las extensiones de capacidades existentes con su propietario actual.
- No migrar archivos existentes por estética. Una migración necesita alcance explícito y tests de caracterización.

La decisión y sus consecuencias están registradas en `decisions/0001-vertical-modules-for-new-capabilities.md`.

## 2. Estructura proporcional

### Capacidad nueva y simple

```text
src/modules/<dominio-en-kebab-case>/
  <dominioEnCamelCase>.routes.ts
  <dominioEnCamelCase>.controller.ts
  <dominioEnCamelCase>.schema.ts
  <dominioEnCamelCase>.service.ts
```

Agregar `<dominioEnCamelCase>.types.ts` solo cuando `z.infer`, un tipo Prisma o un tipo existente no representen correctamente el contrato.

Un service simple puede usar Prisma directamente. No crear un repository que solo delegue una llamada trivial.

### Capacidad con complejidad real

Agregar únicamente las carpetas necesarias:

```text
src/modules/<dominio-en-kebab-case>/
  <dominioEnCamelCase>.routes.ts
  <dominioEnCamelCase>.controller.ts
  <dominioEnCamelCase>.schema.ts
  application/
    <operacionEnCamelCase>.useCase.ts
  domain/
    <reglaEnCamelCase>.policy.ts
  infrastructure/
    <dominioEnCamelCase>.repository.ts
  integrations/
    <proveedorEnCamelCase>.client.ts
```

Señales válidas para aumentar complejidad:

- Invariantes o transiciones de estado.
- Coordinación de varias escrituras o fuentes de datos.
- Transacciones, concurrencia o idempotencia.
- Consultas grandes o reutilizadas.
- Integraciones externas y reintentos.
- Riesgo de negocio alto o dificultad real de testing.

No crear carpetas vacías ni capas preventivas.

## 3. Responsabilidades

### Routes

- Configuran paths, autenticación, autorización gruesa, uploads y controller.
- No contienen lógica de negocio, Prisma, transacciones ni integraciones.
- Se registran mediante import directo en `src/routes/routeRegistry.ts`.

### Controllers

- Adaptan HTTP: actor, body, params, query, headers, archivos, status y respuesta.
- Validan la entrada con el schema Zod del flujo antes de llamar a aplicación.
- No acceden a Prisma, no contienen consultas y no deciden autorización de recurso.
- No mutan `req.body` para completar reglas de negocio; construyen un input explícito.

Patrón esperado:

```ts
const input = createResourceRequestSchema.parse({
  body: req.body,
  params: req.params,
  query: req.query,
});

const result = await createResource({
  actorId: res.locals.userInfo.id,
  ...input.body,
});

res.status(201).json(result);
```

Express 5 propaga automáticamente los rechazos async al middleware global. No agregar wrappers o `try/catch` cuyo único propósito sea llamar a `next(error)`.

### Services y casos de uso

- Reciben inputs explícitos y datos ya validados.
- No reciben `Request`, `Response`, `NextFunction` ni importan Express.
- Aplican reglas, autorización de negocio, ownership, elegibilidad y estado del recurso.
- Un caso de uso se crea para una operación compleja, transaccional o crítica; no para CRUD trivial.

### Domain

- Contiene políticas, invariantes, estados y tipos de negocio cuando aporten aislamiento real.
- No depende de HTTP, middleware, controllers, routes, Prisma ni infraestructura.
- Zod valida forma y formato; las reglas de negocio permanecen aquí o en aplicación.

### Repositories

Crear un repository solo para encapsular persistencia no trivial, transacciones, consultas reutilizadas, traducción de errores o aislamiento real de Prisma.

Un archivo que solo declara `select` o `include` debe llamarse `*.selectors.ts` o `*.queries.ts`, no `*.repository.ts`.

### Integraciones

Encapsular URL, autenticación, timeout, parseo, validación de respuesta, traducción de errores y mapeo del proveedor. La aplicación no debe conocer `fetch`, SDKs ni formatos propietarios.

Evaluar retries e idempotencia según el contrato del proveedor; no activarlos indiscriminadamente.

## 4. Validación y tipos

Cada endpoint nuevo debe validar con Zod:

- `body`.
- `params`.
- `query`.
- Headers relevantes y metadata de archivos cuando aplique.

Definir un schema de request que agrupe las partes utilizadas por el endpoint. Usar coerción explícita para números, fechas o booleanos de params/query.

```ts
export const updateResourceRequestSchema = z.object({
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({ notify: z.coerce.boolean().optional() }),
  body: z.object({ name: z.string().trim().min(1) }).strict(),
});

export type UpdateResourceRequest = z.infer<typeof updateResourceRequestSchema>;
```

- Usar `.strict()` en bodies de endpoints nuevos para prevenir mass assignment.
- No duplicar schema, DTO, interface y type cuando representan lo mismo.
- Separar el input HTTP del input de aplicación solo cuando exista una transformación real.
- No usar `refine` o `superRefine` para esconder reglas que dependen de base de datos o estado de negocio.

Los `ZodError` se traducen globalmente a HTTP 400 con código `VALIDATION_ERROR`. La respuesta pública conserva el contrato existente y no expone detalles en producción.

## 5. Dependencias y límites

- No crear `index.ts` ni barrel exports.
- Importar cada símbolo desde el archivo que lo define.
- Una capacidad no importa routes, controllers, schemas, repositories ni modelos de persistencia internos de otra.
- Para colaboración entre capacidades, importar directamente una operación de aplicación, service, política o tipo que el módulo propietario documente como contrato.
- Mantener esos contratos pequeños y evitar dependencias circulares.
- Preferir una llamada directa cuando el flujo sea obligatorio y lineal. No introducir eventos por defecto.

Los middlewares existentes de autenticación, auditoría y contexto pueden conservar su acceso transversal a datos. No agregar persistencia específica de un dominio en middleware nuevo.

## 6. Errores, seguridad y autorización

- Usar `AppError` para fallos operacionales mientras una categoría de dominio distinta no aporte comportamiento reutilizable.
- Mantener la traducción HTTP en el normalizador global.
- No exponer stack, SQL, tokens, secrets, URLs internas, payloads sensibles ni detalles de proveedores en producción.
- El middleware protege acceso grueso a la ruta; el service o caso de uso protege permiso, ownership, empresa, sucursal, estado y contexto del recurso.
- Evitar mass assignment: mapear campos permitidos de forma explícita.
- Validar tipo, tamaño, ruta y limpieza de archivos.

Para pagos, asistencia, salidas, inventario, documentos, webhooks y otras operaciones críticas revisar explícitamente:

- Transacción.
- Transición atómica de estado.
- Restricción única o clave de idempotencia.
- Reintentos seguros y detección de duplicados.
- Auditoría sin datos sensibles.

## 7. Testing y observabilidad

Agregar tests proporcionales al riesgo:

- Unitarios para políticas, reglas, mappers y casos de uso.
- Integración para repositories, Prisma, restricciones, transacciones y concurrencia.
- End-to-end para contrato HTTP, validación, autenticación y autorización cuando el riesgo lo requiera.

Antes de refactorizar un flujo crítico, capturar primero su comportamiento actual.

En operaciones críticas registrar request ID, actor, recurso, transición, intento y resultado sin incluir secretos. Toda integración externa debe definir timeout y contexto de error suficiente para diagnóstico.

## 8. Definition of Done

Un flujo nuevo está terminado cuando:

- Su estructura es proporcional a su complejidad.
- Todos sus inputs HTTP están validados con Zod.
- Controller y route no acceden a Prisma.
- Aplicación y dominio no dependen de Express.
- Autorización y estado del recurso se verifican en backend.
- Errores públicos son consistentes y seguros.
- Transacciones, concurrencia e idempotencia fueron evaluadas cuando aplican.
- Tiene tests proporcionales al riesgo y documentación de contrato actualizada.
- `npm run lint`, `npm run build` y los tests relevantes terminan correctamente.

Las excepciones importantes deben registrar regla omitida, motivo, alternativas, riesgo y condición de revisión mediante un ADR.
