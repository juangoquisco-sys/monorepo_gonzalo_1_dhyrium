# Protocolo de captura de la referencia Word

## Propósito

Producir evidencia reproducible y auditable de **Word para Microsoft 365 de escritorio, Current Channel, versión 2607, build 20228.20158**. Word LTSC 2021 puede registrarse como referencia secundaria, pero nunca se etiqueta como Microsoft 365 2607.

Una publicación oficial prueba que la versión existe; no prueba que la máquina, licencia, cuenta o configuración de captura estén disponibles.

## 1. Sonda local previa

Desde `E:\dhyrium software\quisvar_proyect_ft-main`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .agent-local/scripts/capture-word-reference.ps1
```

Validar el resultado:

```powershell
Get-Content .agent-local/evidence/h00/REF-ENV-001.json -Raw | ConvertFrom-Json | Out-Null
```

La captura visual primaria solo puede continuar si `eligibility.eligible` es `true` y la revisión manual de los campos no automatizables también es satisfactoria. Un resultado `false` se conserva como evidencia secundaria o bloqueo externo.

## 2. Metadatos obligatorios

Cada sesión registra, aunque el valor sea `unknown` o `not_observed`:

- producto y plataforma;
- edición;
- canal, versión y build;
- arquitectura;
- tipo y estado de licencia, sin claves;
- tipo de cuenta (personal, empresarial o sin sesión), tenant/políticas relevantes y datos personales redactados;
- edición/build/arquitectura de Windows;
- idioma de Windows, interfaz de Office y edición preferida;
- tema de Windows y de Word;
- DPI, escala, resolución total y área útil;
- zoom de Dhyrium cuando exista comparación;
- modo de cinta y posición de la barra de acceso rápido;
- personalizaciones;
- complementos instalados, cargados y estado de conexión;
- fuente de interfaz disponible;
- fuente predeterminada efectiva del fixture, fuentes cargadas y sustituciones;
- nombre, tamaño y checksum SHA-256 del fixture;
- fecha, hora y zona horaria;
- método y herramienta de captura.

No guardar correos, nombres de cuenta, claves de producto, tokens ni rutas personales. La evidencia de cuenta se limita a su clase y disponibilidad.

## 3. Verificar la referencia objetivo

1. Abrir **Archivo → Cuenta → Acerca de Word**.
2. Confirmar Word para Microsoft 365, Current Channel, versión 2607, build 20228.20158.
3. Registrar edición, arquitectura y licencia; redactar PII.
4. Confirmar Windows 11 y Español (Perú).
5. Fijar 1920 × 1080, 96 DPI y escala 100 %.
6. Seleccionar tema Blanco y “Mostrar siempre la cinta”.
7. Restablecer la cinta y la barra de acceso rápido; registrar su posición.
8. Deshabilitar todos los complementos, incluidos Nitro y Acrobat, y reiniciar Word.
9. Crear el fixture vacío y registrar la fuente que resuelve el estilo Normal; no asumir Aptos.
10. Calcular el checksum de cada JSON, PNG y fixture.

Si cualquiera de los pasos 1–9 no puede demostrarse, la máquina queda `candidate_requires_manual_check` o `blocked_external`, nunca `eligible` definitivo.

## 4. Preparar el fixture

Utilizar únicamente documentos controlados:

- documento vacío para estado base y fuente predeterminada;
- fixture con texto y formato mixto;
- tabla;
- imagen inline y flotante;
- forma/cuadro de texto;
- encabezado y pie.

Cerrar documentos personales y notificaciones. Deshabilitar macros. No abrir Recientes durante la captura salvo con una cuenta/fixture de laboratorio sin PII.

## 5. Capturas de H00-C

H00-A no ejecuta este inventario; solo deja el protocolo preparado. Cuando H00-C esté autorizado se capturan:

- documento vacío con Inicio;
- cada pestaña principal;
- grupos colapsados y overflow;
- controles activos, mixtos, deshabilitados y con tooltip;
- tabla, imagen, forma y encabezado/pie seleccionados;
- Backstage sin PII;
- tema claro, oscuro y alto contraste;
- cinta completa y solo pestañas;
- resoluciones 1366 × 768, 1440 × 900 y 1920 × 1080 según la matriz aprobada.

Nitro, Acrobat y otros complementos no pertenecen al baseline Word y no deben aparecer.

## 6. Convención y paquete de evidencia

```text
REF-ENV-M365-2607-<sesion>.json
REF-WORD-2607-<superficie>-<estado>-<ancho>x<alto>-<dpi>-<tema>.png
REF-WORD-2607-<superficie>-<estado>-<ancho>x<alto>-<dpi>-<tema>.json
```

El JSON contiguo debe incluir el ID del PNG, su SHA-256 y todos los metadatos de la sección 2. El índice `spec/evidence-index.json` registra artefacto, checksum, assertions cubiertas y limitaciones.

## 7. Comparación y aceptación

Cada captura Dhyrium se genera con el mismo tamaño, idioma, tema, DPI, escala, modo de cinta y estado. La aceptación utiliza:

1. comparación lado a lado;
2. superposición semitransparente;
3. comprobaciones geométricas;
4. detección de clipping, superposición y overflow;
5. revisión humana identificada.

No se declara paridad si falta un metadato, el build no coincide, la captura contiene complementos, existe PII sin redactar o una diferencia excede la tolerancia aprobada.

## 8. Resultado actual

`REF-ENV-001` fue regenerado el 10 de agosto de 2026 y sigue sin ser elegible:

- Word LTSC 2021 Volume, no Microsoft 365;
- WINWORD.EXE `16.0.14334.20806` y cliente Click-to-Run `16.0.14334.20756`;
- canal `Production::LTSC2021`;
- x64 y licencia Volume KMS Client en estado licenciado;
- interfaz `es-ES`, edición preferida `es-PE`;
- dos pantallas 1920 × 1080, 96 DPI, 100 %;
- cinta no minimizada, pero tema exacto de Word sin evidencia visual elegible;
- Nitro PDF Pro y Acrobat PDFMaker conectados;
- Calibri 11 como estilo Normal; Segoe UI Variable disponible; Aptos y Carlito no detectadas como fuentes instaladas.

La referencia primaria está `blocked_external` hasta recibir el paquete descrito en la sección 6.
