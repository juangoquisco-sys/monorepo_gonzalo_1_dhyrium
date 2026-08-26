# Línea base de referencia — Word moderno

Esta línea base elimina la expresión ambigua “Office 2026”. La referencia primaria objetivo es **Word para Microsoft 365 de escritorio**, Current Channel, versión 2607, build 20228.20158. La instalación local es **Word LTSC 2021** y solo puede utilizarse como referencia secundaria.

## 1. Referencia primaria objetivo

| Campo | Valor contractual | Estado de observación |
|---|---|---|
| Producto | Word para Microsoft 365 de escritorio | confirmado como objetivo; no instalado localmente |
| Edición | debe extraerse de la máquina objetivo | no observada |
| Canal | Current Channel | publicación oficial confirmada |
| Versión | 2607 | publicación oficial confirmada |
| Build | 20228.20158 | publicación oficial confirmada |
| Fecha de publicación | 4 de agosto de 2026 | publicación oficial confirmada |
| Arquitectura | debe registrarse, sin asumir x64 | no observada |
| Licencia | edición y estado de licencia, sin claves | no observada |
| Cuenta | personal, empresarial o sin sesión; PII redactada | no observada |
| Windows | Windows 11 | requerido, no observado en máquina objetivo |
| Idioma de interfaz y edición | Español (Perú), `es-PE` | requerido, no observado |
| Tema de Windows/Word | Claro / Blanco | requerido, no observado |
| Escala y DPI | 100 % / 96 DPI | requerido, no observado |
| Resolución | 1920 × 1080 | requerido, no observado |
| Modo de cinta | Mostrar siempre la cinta | requerido, no observado |
| Barra de acceso rápido | posición y personalización restablecida | no observada |
| Complementos | desactivados | requerido, no observado |
| Fuente UI | Segoe UI efectiva | debe verificarse |
| Fuente predeterminada del documento | la que resuelva el fixture vacío de esa instalación | no observada; no se presupone Aptos |
| Fuentes cargadas | familias efectivas y sustituciones | no observadas |

El [historial oficial de Microsoft 365 Apps](https://learn.microsoft.com/en-us/officeupdates/update-history-microsoft365-apps-by-date) confirma que 2607 build 20228.20158 corresponde a Current Channel y fue publicado el 4 de agosto de 2026. Esa confirmación documental no demuestra disponibilidad, licencia ni configuración de una máquina de captura.

Estado de disponibilidad: `blocked_external`. No se proporcionó una máquina ni un paquete de capturas que cumpla el [protocolo](../quality/REFERENCE_CAPTURE_PROTOCOL.md).

## 2. Referencia local secundaria observada

Auditoría actualizada el 10 de agosto de 2026:

| Campo | Valor observado | Elegibilidad primaria |
|---|---|---|
| Producto | Microsoft Word LTSC 2021 por volumen | no elegible |
| Edición | `Office21Word2021VL_KMS_Client_AE` | no elegible |
| Canal | `Production::LTSC2021` | no elegible |
| Build de WINWORD.EXE | `16.0.14334.20806` | no elegible |
| Cliente Click-to-Run | `16.0.14334.20756` | no elegible |
| Arquitectura | x64 | registrado |
| Licencia | `VOLUME_KMSCLIENT`, estado `LICENSED` | distinta de Microsoft 365 |
| Cuenta | cero identidades Office detectadas; activación KMS | registrado sin PII |
| Idioma de UI/producto | Español (España), `es-ES` | no elegible |
| Idioma de edición preferido | Español (Perú), `es-PE` | registrado |
| Windows | Windows 11 Enterprise LTSC, build 26100, x64 | compatible |
| Pantallas | 2 × 1920 × 1080; área primaria 1920 × 1032 | compatible para captura primaria |
| DPI y escala | 96 DPI / 100 % | compatible |
| Tema | Windows claro; tema exacto de Word no observado | incompleto para referencia primaria |
| Cinta | expandida/no minimizada en la sonda COM | no certifica el modo de Word 2607 |
| Complementos | Nitro PDF Pro y Acrobat PDFMaker conectados | no elegible |
| Fuente UI disponible | Segoe UI Variable | referencia local únicamente |
| Estilo Normal efectivo | `+Cuerpo` resuelto como Calibri 11 | referencia local únicamente |
| Fuentes candidatas | Calibri instalada; Aptos y Carlito no detectadas en el registro de fuentes | referencia local únicamente |

El producto local puede apoyar pruebas de interoperabilidad DOCX, inventario y automatización segura, pero no es el oráculo visual moderno y no entra en el denominador de paridad de Word 2607.

## 3. Evidencia y reproducción

- Especificación canónica: [`spec/word-reference.json`](../../spec/word-reference.json).
- Índice de evidencia: [`spec/evidence-index.json`](../../spec/evidence-index.json).
- Evidencia local: [`REF-ENV-001`](../../.agent-local/evidence/h00/REF-ENV-001.json).
- Generador local: `.agent-local/scripts/capture-word-reference.ps1`.
- Protocolo: [`REFERENCE_CAPTURE_PROTOCOL.md`](../quality/REFERENCE_CAPTURE_PROTOCOL.md).

La evidencia local debe regenerarse antes de cada sesión. Solo un resultado `eligible: true`, seguido de las comprobaciones manuales exigidas, puede habilitar las capturas de la referencia primaria.

## 4. Evidencia externa aún faltante

Se requiere un conjunto firmado por checksum que incluya:

1. JSON de entorno con todos los campos de la sección 1.
2. Captura de Acerca de Word que muestre versión/build y edición, con datos personales redactados.
3. Evidencia de canal, arquitectura y licencia.
4. Captura completa a 1920 × 1080, 96 DPI, 100 %, tema Blanco y cinta completa.
5. Inventario que confirme complementos desactivados.
6. Fuente del estilo Normal y fuentes realmente utilizadas en el fixture.

Sin esos seis elementos no se puede aprobar la referencia primaria ni comenzar H00-C con evidencia comparable.

## 5. Tolerancias futuras

Estas tolerancias se aplicarán después de obtener la referencia primaria:

- geometría principal: ±4 px por bloque a 100 %;
- tipografía: misma jerarquía y altura de línea, con sustitución métrica documentada;
- cero clipping, superposición o desplazamiento horizontal global;
- iconografía Dhyrium: equivalente Fluent, nunca un recurso copiado de Word.

Una diferencia fuera de tolerancia impide marcar una fila como `verificado`.

## 6. Fuentes oficiales

- [Historial de Microsoft 365 Apps](https://learn.microsoft.com/en-us/officeupdates/update-history-microsoft365-apps-by-date).
- [Descripción de Office LTSC 2021](https://learn.microsoft.com/en-us/office/ltsc/2021/overview).
- [Mostrar u ocultar la cinta](https://support.microsoft.com/en-us/office/show-or-hide-the-ribbon-in-office-d946b26e-0c8c-402d-a0f7-c6efa296b527).
