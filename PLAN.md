# PLAN MAESTRO — DHYRIUM WRITER MODERNO

Versión del contrato: 3.2

Fecha de revisión: 11 de agosto de 2026

Estado: VIGENTE COMO CONTRATO — EJECUCIÓN ÚNICAMENTE POR OBJETIVO AUTORIZADO

Producto de referencia visual/funcional: Word para Microsoft 365 de escritorio

Canal congelado: Current Channel

Versión congelada: 2607

Compilación congelada: 20228.20158

Sistema de referencia: Windows 11

Idioma de referencia: Español (Perú)
Raíz prevista del proyecto: E:\dhyrium software

---

## 0. Naturaleza del documento

Este archivo es el contrato operativo maestro canónico para transformar Dhyrium Writer en un editor documental moderno, local, verificable y extensible, con máxima fidelidad visual y funcional a Word para Microsoft 365.

Estado de gobierno:

- `E:\dhyrium software\PLAN.md` es la única copia canónica;
- su aprobación NO autoriza ejecutar todos los hitos de una vez;
- cada implementación requiere un objetivo cerrado, alcance y puerta de salida;
- no debe iniciarse código de otro hito mientras el objetivo activo permanezca abierto;
- las copias de revisión externas son históricas/no canónicas;
- cualquier cambio al contrato debe preservar requisitos vigentes o explicar la sustitución mediante decisión registrada.

Las palabras DEBE, NO DEBE, PROHIBIDO, OBLIGATORIO y BLOQUEANTE representan requisitos contractuales.

La meta no es una semejanza subjetiva ni una captura estática. La meta es:

> Alcanzar el 100 % de los requisitos P0 inventariados y aprobados en la matriz de paridad, con máxima fidelidad visual y funcional a Word para Microsoft 365 versión 2607, mediante una implementación independiente basada en Fluent 2, sin copiar recursos propietarios y sin presentar aproximaciones como funciones terminadas.

Este PLAN no autoriza:

- copiar código, CSS, imágenes, logos o iconos extraídos de Microsoft Office;
- afirmar compatibilidad total con todo Word, OOXML o VBA sin pruebas;
- realizar commit, push, merge o publicación;
- ejecutar macros;
- destruir cambios locales;
- modificar varios hitos simultáneamente;
- declarar porcentajes sin numerador, denominador y evidencia.

Cada hito se ejecuta mediante un objetivo cerrado. Solo puede existir un hito o subobjetivo activo.

El modelo de IA se elige según las instrucciones del proyecto. Un modelo Sol se reserva para diseño de arquitectura e incidencias críticas de base de datos; el trabajo común de implementación y documentación utiliza el modelo general adecuado.

### 0.1 Corrección de rumbo aprobada

El problema principal no es solo la apariencia de la cinta. Dhyrium mantiene hoy
una previsualización PDF/Canvas junto a controles que pueden parecer editables y
un pipeline DOCX→HTML→Canvas→HTML→DOCX que no preserva OOXML complejo. La
arquitectura vigente, ratificada por REV-33–REV-35, es:

1. una única superficie web editable `DhyriumWriterWorkspace` para documento,
   comandos, versión, compatibilidad, historial, exportación y estado;
2. Dhyrium Writer como motor editorial canónico, accesible desde navegadores
   autorizados de otras PC y sin depender de Microsoft Office, Microsoft 365,
   SharePoint, OneDrive, ONLYOFFICE, Collabora ni otra suite externa;
3. un único `DocumentSession`, una sola cabeza durable y una sola secuencia de
   versiones por documento;
4. original OOXML/DOCX inmutable, modelo interno tipado y bridge OOXML
   incremental/preservativo;
5. Dhyrium como dueño de parsing soportado, layout web, caret, selección,
   comandos, atajos, undo/redo, autenticación, ACL, blobs, versiones y auditoría;
6. PostgreSQL y el almacenamiento de Dhyrium como únicas fuentes operativas;
7. una cinta ejecutable únicamente para comandos reales; toda capacidad no
   implementada permanece deshabilitada con motivo accesible;
8. importación/exportación clasificada por `editable`, `preserved`, `blocked` y
   `unsupported`, sin pérdida silenciosa;
9. PDF limitado a previsualización, impresión, comparación o miniaturas;
10. Word se usa solo como referencia investigada de presentación y comportamiento,
    nunca como runtime, base de datos o dependencia del editor.

`@hufe921/canvas-editor` puede usarse encapsulado como runtime provisional MIT,
pero no es el modelo durable. Mammoth→HTML→Canvas y la exportación `altChunk`
quedan como compatibilidad básica no canónica hasta que el bridge OOXML propio
demuestre round-trip. Los ADR vigentes son
`DEC-DOCUMENT-ENGINE-DHYRIUM-NATIVE` y
`DEC-EDITOR-UI-STRATEGY-DHYRIUM-NATIVE`.

### 0.2 Evidencia incorporada

La revisión se apoya en:

- auditoría UI Automation del Word instalado, usando un documento temporal sintético;
- 30 estados/capturas limpias, 11 pestañas detectadas y 8 pestañas contextuales;
- inventario seguro de Backstage;
- catálogo oficial `wordcontrols.xlsx` de Microsoft 365 Current Channel, con 5.638 registros;
- documentación primaria de Microsoft, Fluent, W3C y motores candidatos;
- auditoría del pipeline Dhyrium actual y de su pérdida DOCX→HTML→Canvas.

Los 5.638 registros no son botones simultáneos: incluyen cinta principal, Backstage, menús contextuales, comandos fuera de cinta, tab sets, galerías y capacidades condicionadas. Son el denominador de inventario, no una orden de mostrar todo.

---

## 1. Aclaración: “Word moderno 2026”

“Office 2026” puede utilizarse como descripción informal del objetivo, pero NO DEBE utilizarse como especificación técnica.

La referencia verificable es:

| Campo | Valor congelado |
|---|---|
| Producto | Word para Microsoft 365 |
| Plataforma | Escritorio para Windows |
| Canal | Current Channel |
| Versión | 2607 |
| Compilación | 20228.20158 |
| Publicación | 4 de agosto de 2026 |
| Sistema operativo | Windows 11 |
| Idioma | Español (Perú) |
| Tema primario | `White / Blanco`, confirmado en la VM congelada |
| Cinta primaria | `Always show Ribbon / Mostrar siempre la cinta` |
| Escala primaria | 100 % / 96 DPI |
| Resolución primaria | 1920 × 1080 |
| Complementos | Desactivados |
| Personalización | Restablecida |

La compilación vigente está documentada por Microsoft en:

https://learn.microsoft.com/en-us/officeupdates/update-history-microsoft365-apps-by-date

Current Channel es una referencia móvil. Por ello:

1. la versión 2607 queda congelada para el ciclo actual;
2. una nueva compilación NO reemplaza automáticamente esta referencia;
3. cualquier cambio de baseline requiere nuevas capturas, mediciones, aprobación y registro;
4. la referencia anterior 2606 debe conservarse como histórica si ya tiene evidencias;
5. una comparación nunca debe mezclar capturas de versiones, temas o DPI diferentes.

La compilación por sí sola no garantiza que dos usuarios vean exactamente las mismas funciones, porque existen despliegues graduales, licencias, cuentas, políticas y servicios conectados. La línea base DEBE registrar también:

- fecha y hora;
- edición de Windows y arquitectura;
- escala de pantalla;
- DPI efectivo;
- tamaño de la ventana;
- zoom del navegador de Dhyrium;
- tema de Windows;
- tema de Office;
- transparencia o Mica;
- cuenta personal, empresarial o sin sesión;
- licencia;
- tenant y políticas relevantes;
- modo de cinta de escritorio (`Full-screen`, `Show tabs only` o `Always show Ribbon`); las opciones `Classic Ribbon`, `Single Line Ribbon` y `Adjust automatically` pertenecen a Word para la web y se registran por separado;
- posición de la barra de acceso rápido;
- dispositivo táctil o lápiz;
- complementos instalados;
- Copilot presente o ausente;
- personalizaciones de pestañas y grupos.

---

## 2. Definición de éxito

### 2.1 P0 — PARIDAD WORD

P0 comprende:

- encabezado y estructura general;
- barra de acceso rápido;
- nombre y estado del documento;
- búsqueda;
- pestañas;
- cinta, grupos y controles;
- Backstage o Menú Archivo;
- menús contextuales;
- mini barra de herramientas;
- paneles laterales;
- reglas horizontal y vertical;
- documento paginado;
- navegación y zoom;
- barra de estado;
- atajos y KeyTips;
- estados habilitado, activo, mixto, pendiente y deshabilitado;
- abrir, visualizar, editar, deshacer, rehacer, guardar y reabrir;
- una única sesión y canvas para visualizar, revisar y editar;
- continuidad visual entre lectura y edición;
- preservación de carátula y objetos durante la edición;
- importación y exportación;
- preservación DOCX;
- adaptabilidad;
- teclado;
- accesibilidad;
- estabilidad;
- backend local;
- recuperación y versiones;
- seguridad documental;
- pruebas y evidencia.

P0 se considera completo únicamente cuando cada requisito incluido en la matriz está en estado verificado.

### 2.2 P1 — VENTAJA DHYRIUM

P1 solo comienza después de superar la puerta P0 del área afectada.

P1 incluye:

- buscador bilingüe español/inglés;
- explicación enriquecida de comandos deshabilitados, con ubicación, alternativas y sugerencias;
- inspector de fidelidad DOCX;
- comparación visual de versiones;
- recuperación offline;
- densidades Compacta, Cómoda y Táctil;
- personalización importable y exportable;
- favoritos y barra rápida personalizable;
- command palette;
- mini toolbar configurable;
- acciones destructivas reversibles;
- privacidad local;
- diagnóstico voluntario;
- asistente Dhyrium bajo feature flag;
- perfiles por usuario y dispositivo.

Una ventaja Dhyrium NO DEBE:

- reemplazar una función P0;
- ocultar una carencia;
- romper la compatibilidad;
- presentarse como función de Microsoft;
- modificar el contenido sin consentimiento.

Separación P0/P1:

- P0 exige una razón breve y accesible cuando un control está deshabilitado; P1 añade explicación enriquecida y alternativas.
- P0 exige un manifiesto básico de incompatibilidades y una advertencia honesta; P1 añade un inspector navegable, filtros y propuestas.
- P0 exige adaptación automática a interacción táctil; P1 permite que el usuario elija y personalice densidades.
- P0 exige una barra de acceso rápido funcional y personalizable según el alcance Word; P1 añade favoritos, perfiles, importación y exportación avanzadas.

---

## 3. Clasificación de capacidades

Cada superficie y comando debe pertenecer a una clase:

| Clase | Significado |
|---|---|
| core-local | Función base que Dhyrium debe ejecutar localmente |
| optional-native | Función nativa de Word que puede estar oculta o depender del dispositivo |
| licensed-cloud | Depende de licencia, cuenta, tenant o servicio conectado |
| third-party | Proviene de complementos como Acrobat o Nitro |
| preserved-not-editable | Se conserva en DOCX pero no se edita aún |
| out-of-scope | Fuera del alcance aprobado |
| dhyrium-alternative | Alternativa propia de Dhyrium |

El inventario de Word usa además un código de disponibilidad ortogonal:

| Código | Significado |
|---|---|
| `N` | Núcleo sin selección especial ni servicio externo |
| `S` | Contextual por selección, objeto, vista o modo |
| `L` | Condicionado por licencia, cuenta, red, idioma, policy o rollout |
| `E` | Extensión que no pertenece a Word base |

Ejemplos: un comando puede ser `core-local + S`; Copilot es `licensed-cloud + L`; Acrobat es `third-party + E`.

Reglas:

- Nitro PDF, Acrobat y otras pestañas de complementos son third-party.
- Copilot es licensed-cloud en Word y una capacidad distinta si Dhyrium desarrolla su propio asistente.
- Dictado, Transcripción y algunos servicios Editor pueden requerir conectividad.
- Programador es optional-native y no aparece de manera predeterminada.
- Dibujar puede variar según dispositivo y configuración.
- Una función preserved-not-editable debe conservarse sin mostrarse como editable.
- Un control fuera de alcance debe ocultarse o aparecer deshabilitado con explicación, según la referencia aprobada.

---

## 4. Protocolo obligatorio antes de modificar

Antes de cualquier cambio, la IA DEBE:

1. leer este PLAN completo;
2. leer README.md en la raíz;
3. leer AGENTS.md de la raíz;
4. leer AGENTS.md del frontend;
5. leer AGENTS.md del backend;
6. revisar los documentos vinculados al subobjetivo;
7. inspeccionar la rama actual;
8. inspeccionar git status y git diff;
9. identificar archivos sin seguimiento;
10. preservar cambios ajenos;
11. registrar el estado real del área;
12. comprobar que no existe otro hito activo;
13. declarar el alcance exacto del subobjetivo;
14. comenzar implementación en la misma ejecución cuando el objetivo sea implementar.

PROHIBIDO:

- git reset --hard;
- descartar cambios del usuario;
- checkout destructivo;
- borrar archivos no relacionados;
- commit, push, merge o publicación sin autorización;
- modificar configuración Git global para eludir problemas;
- afirmar que un servicio está saludable sin comprobarlo;
- ejecutar publish-and-run.ps1 salvo solicitud expresa.

Cuando el usuario diga “hazlo correr”, “levántalo todo” o equivalente, ejecutar desde E:\dhyrium software:

~~~powershell
.\publish-and-run.ps1
~~~

Antes de hacerlo se debe recordar que el script puede construir y publicar imágenes. La ejecución requiere la autorización que resulte aplicable.

---

## 5. Estado técnico observado que debe verificarse

Este estado proviene de la auditoría del 9 de agosto de 2026 y NO sustituye la inspección previa de cada objetivo:

- frontend y backend se encuentran en la rama observada gonzalo_1;
- existen numerosos cambios locales;
- el editor y el módulo backend documental contienen archivos sin seguimiento;
- CanvasWordRibbon.tsx continúa siendo monolítico;
- canvasWordRibbon.css conserva estilos heredados y overflow horizontal;
- existen umbrales rígidos aproximadamente en 1200 y 1720 píxeles;
- se mezclan iconos Fluent y Lucide;
- Inicio tiene funciones reales, parciales y aproximadas;
- existe al menos un control no-op conocido;
- RibbonSchema todavía no define todos los grupos de todas las pestañas;
- Dibujar y Correspondencia no están completamente integradas en la superficie heredada;
- Tabla aparece de forma permanente en algunos estados y debe ser contextual;
- Mammoth convierte DOCX a HTML para edición;
- la exportación genera un nuevo DOCX desde HTML;
- esta ruta no es round-trip OOXML;
- existe una vista fiel mediante conversión DOCX a PDF;
- la interfaz expone una vista “Documento original” o “Original” que conserva mejor la apariencia, pero se comporta como previsualización paginada sin edición directa;
- existe un botón “Editar en Dhyrium” y, en otra superficie, un selector “Original / Editar”, lo que hace percibir dos documentos o dos versiones distintas;
- al entrar en “Editar”, el contenido se reconstruye en un editor básico y puede perder carátula, logos, formas, imágenes ancladas, tablas, relaciones espaciales, tipografía, saltos y paginación;
- la cinta aparece sobre la vista original, pero varios controles no pueden actuar sobre ese contenido, creando una promesa visual falsa;
- no existe todavía una sesión única que mantenga simultáneamente fidelidad, edición, selección, comandos, paginación y preservación OOXML;
- el backend ya implementa versiones y concurrencia optimista;
- Docker Compose observado no incluye todavía PostgreSQL local;
- algunos documentos afirman una topología distinta a la real;
- las pruebas backend documentales no están todas incluidas en el comando agregado;
- Playwright requiere hacerse hermético, con autenticación y fixtures controlados.

La primera tarea de cada hito es confirmar o corregir estas observaciones.

### 5.1 Word local auditado

La instalación local observada es:

| Campo | Valor |
|---|---|
| Producto | Microsoft Word LTSC 2021 por volumen |
| Ejecutable | `C:\Program Files\Microsoft Office\root\Office16\WINWORD.EXE` |
| Versión de archivo | `16.0.14334.20806` |
| Cliente Click-to-Run | `16.0.14334.20756` |
| Canal | `Production::LTSC2021` |
| Arquitectura | x64 |
| Idioma de producto | `es-ES` |
| Idioma de edición preferido | Español (Perú), `es-PE` |
| Pantallas | 2 × 1920 × 1080 |
| DPI/escala | 96 / 100 % |

Word LTSC sirve como referencia operativa local, pero no como oracle visual moderno. No recibe el flujo continuo de funciones de Microsoft 365. El baseline visual primario sigue siendo Word para Microsoft 365 2607 en una VM licenciada y congelada.

La auditoría abrió una instancia temporal, creó contenido sintético, deshabilitó macros, no abrió documentos personales y cerró solo su PID. Resultado limpio:

- 30 estados y 30 capturas;
- 11 pestañas detectadas;
- 8 pestañas contextuales;
- cero errores registrados;
- cero correos, rutas personales, recientes o datos de cuenta conservados.

### 5.2 Pestañas y grupos observados

| Pestaña integrada | Grupos locales observados |
|---|---|
| Inicio | Portapapeles; Fuente; Párrafo; Estilos; Edición |
| Insertar | Páginas; Tablas; Ilustraciones; Complementos; Multimedia; Vínculos; Comentarios; Encabezado y pie; Texto; Símbolos |
| Diseño | Formato del documento; Conjunto de estilos; Fondo de página |
| Disposición | Configurar página; Párrafo; Organizar |
| Referencias | Tabla de contenido; Notas al pie; Investigación; Citas y bibliografía; Títulos; Índice |
| Correspondencia | Crear; Iniciar combinación; Escribir e insertar campos; Vista previa; Finalizar |
| Revisar | Revisión; Voz; Accesibilidad; Idioma; Comentarios; Seguimiento; Cambios; Comparar; Proteger; Entrada de lápiz |
| Vista | Vistas; Inmersivo; Movimiento; Mostrar; Zoom; Ventana; Macros |
| Ayuda | Ayuda, soporte y aprendizaje según build |

`Archivo` abre Backstage, no es un TabItem normal. Backstage mostró Inicio, Nuevo, Abrir, Información, Guardar, Guardar como, Imprimir, Compartir, Exportar, Cerrar, Cuenta, Comentarios y Opciones.

Nitro PDF Pro, Acrobat y `Guardar como Adobe PDF` son extensiones, no Word base.

Contextos verificados:

- tabla: Diseño de tabla + Disposición;
- imagen: Formato de imagen;
- forma: Formato de forma;
- encabezado/pie: Encabezado y pie de página;
- gráfico: Diseño de gráfico + Formato;
- ecuación: Ecuación.

Las capturas de Navegación, Reemplazar, Estilos y Selección son exploratorias: la prueba futura debe verificar raíz semántica, foco, apertura y cierre; enviar un atajo no basta para declarar un panel verificado.

---

## 6. Documentación permanente

### 6.1 Documentos actuales obligatorios

- PLAN.md
- docs/product/WORD_REFERENCE_BASELINE.md
- docs/product/OFFICE_PARITY_MATRIX.md
- docs/product/WORD_LOCAL_AUDIT_REPORT.md
- docs/product/WORD_FUNCTIONAL_SURFACE_INVENTORY.md
- quisvar_proyect_ft-main/docs/architecture/EDITOR_ARCHITECTURE.md
- quisvar_proyect_ft-main/docs/architecture/RIBBON_ARCHITECTURE.md
- quisvar_proyect_ft-main/docs/architecture/DOCX_PIPELINE.md
- quisvar_proyect_ft-main/docs/architecture/LOCAL_BACKEND.md
- docs/quality/DEFINITION_OF_DONE.md
- docs/quality/VISUAL_ACCEPTANCE.md
- docs/quality/DOCX_TEST_CORPUS.md

### 6.2 Documentos adicionales

- docs/README.md
- docs/product/APP_HEADER_AND_BACKSTAGE_SPEC.md
- docs/product/RIBBON_TAB_GROUP_CATALOG.md
- docs/product/COMMAND_CATALOG.md
- docs/product/LICENSE_AND_VARIANT_MATRIX.md
- docs/product/CONTEXTUAL_TABS_SPEC.md
- docs/product/PANEL_CATALOG.md
- docs/product/UNIFIED_EDITING_EXPERIENCE.md
- docs/product/SUPPORTED_DOCUMENT_PROFILE.md
- docs/design/FLUENT_TOKEN_AND_ICON_SPEC.md
- docs/design/RIBBON_MEASUREMENTS.md
- quisvar_proyect_ft-main/docs/architecture/CONTEXTUAL_TABS_STATE_MACHINE.md
- quisvar_proyect_ft-main/docs/architecture/RIBBON_LAYOUT_ENGINE.md
- quisvar_proyect_ft-main/docs/architecture/PANEL_SYSTEM.md
- quisvar_proyect_ft-main/docs/architecture/OOXML_SUPPORT_MATRIX.md
- quisvar_proyect_ft-main/docs/architecture/UNIFIED_DOCUMENT_SESSION.md
- quisvar_proyect_ft-main/docs/architecture/ENGINE_ADAPTER.md
- quisvar_proyect_ft-main/docs/architecture/PANE_COORDINATION.md
- quisvar_proyect_ft-main/docs/architecture/AI_SEMANTIC_TOOLS.md
- docs/quality/KEYBOARD_KEYTIPS_MATRIX.md
- docs/quality/ACCESSIBILITY_CONFORMANCE.md
- docs/quality/REFERENCE_CAPTURE_PROTOCOL.md
- docs/quality/VISUAL_EVIDENCE_INDEX.md
- docs/quality/PERFORMANCE_BUDGETS.md
- docs/quality/EDITABLE_FIDELITY_ACCEPTANCE.md
- docs/security/DOCUMENT_THREAT_MODEL.md
- docs/operations/LOCAL_RUNBOOK.md
- docs/decisions/DEC-DB-001.md
- docs/decisions/DEC-DOC-001.md
- docs/decisions/DEC-OOXML-001.md
- docs/decisions/DEC-AUTH-001.md
- docs/decisions/DEC-STORAGE-001.md
- docs/decisions/DEC-MACRO-001.md
- docs/architecture/DOCUMENT_EDITING_ARCHITECTURE.md
- docs/decisions/DEC-DOCUMENT-ENGINE-DHYRIUM-NATIVE.md
- docs/decisions/DEC-EDITOR-UI-STRATEGY-DHYRIUM-NATIVE.md

Estos documentos no se crean todos de una sola vez. Se aplican estas reglas:

- ampliar un documento existente cuando ya tenga el mismo propietario y responsabilidad;
- crear un documento nuevo solo cuando introduzca una responsabilidad distinta;
- H00 crea únicamente baseline, perfil, catálogo, decisiones bloqueantes y harness;
- cada hito crea o amplía los documentos que necesita;
- ningún lote documental puede reemplazar la implementación y la evidencia.

### 6.3 Datos estructurados

La documentación humana debe tener una representación validable:

- spec/word-reference.json
- spec/feature-profile.json
- spec/ribbon-surfaces.json
- spec/command-identities.json
- spec/contextual-tabs.json
- spec/panels.json
- spec/evidence-index.json

Jerarquía de fuentes de verdad:

1. spec/*.json contiene identidad, orden, clase de capacidad, disponibilidad y requisitos visuales canónicos;
2. TypeScript contiene el comportamiento ejecutable, adaptadores y transacciones;
3. OFFICE_PARITY_MATRIX.md es una vista humana generada o validada desde las especificaciones;
4. evidence-index.json contiene los resultados verificables;
5. las capturas y logs son artefactos, no especificaciones.

Debe existir una validación automática entre:

1. datos estructurados;
2. OFFICE_PARITY_MATRIX.md;
3. pruebas;
4. evidencias;
5. `RibbonSchema` y `CommandRegistry` cuando `uiOwner=Dhyrium`;
6. `CapabilityManifest`, API/eventos disponibles, automatización observable y evidencia cuando `uiOwner=motor`.

`RibbonSchema`, `CommandRegistry`, `IconRegistry`, Fluent Icons y `execute` son obligatorios únicamente para controles cuyo `uiOwner` sea Dhyrium. La UI nativa del motor no requiere acceso al DOM ni sustitución de su iconografía para ser válida.

No se deben mantener seis fuentes manuales equivalentes. Más archivos Markdown por sí solos no representan avance. Crear o actualizar documentación NO cierra un objetivo de implementación.

---

## 7. Matriz de paridad

Cada comando debe tener un registro individual. Un registro por familia no sustituye la granularidad por comando.

Campos mínimos:

| Campo | Obligatorio |
|---|---|
| id estable | Sí |
| idMso/fuente oficial | Cuando exista |
| pestaña | Sí |
| grupo | Sí |
| nombre visible | Sí |
| tipo de control | Sí |
| clase de capacidad | Sí |
| código N/S/L/E | Sí |
| uiOwner: motor/Dhyrium/condicional | Sí |
| engineCapability: required/optional/unsupported | Sí |
| modo permitido: edición/revisión/visualización | Sí |
| capa: editable/preservada/referencia | Sí para elementos documentales |
| icono Regular | Sí cuando uiOwner=Dhyrium; inventariado/evidencia cuando uiOwner=motor |
| icono Filled | Cuando aplique y uiOwner=Dhyrium |
| tamaño o presentación | Sí |
| tooltip | Sí |
| KeyTip | Cuando aplique |
| atajo | Cuando exista |
| canExecute | Sí cuando uiOwner=Dhyrium; capability/estado observable cuando uiOwner=motor |
| isActive | Cuando aplique |
| isMixed | Cuando aplique |
| currentValue | Cuando aplique |
| disabledReason | Sí cuando uiOwner=Dhyrium; razón/capability del proveedor cuando esté expuesta |
| acción | Sí; `execute` propio solo cuando uiOwner=Dhyrium |
| transacción y undo | Comportamiento obligatorio; API propia solo cuando uiOwner=Dhyrium |
| persistencia | Sí |
| dependencia backend | Cuando aplique |
| licencia o feature gate | Cuando aplique |
| prueba funcional | Sí |
| prueba de persistencia | Cuando aplique |
| captura | Sí para verificado |
| estado | Sí |
| limitación | Cuando exista |
| continuidad visual entre modos | Cuando afecte layout o documento |

Estados canónicos:

- inventariado;
- pendiente;
- parcial;
- funcional;
- verificado.

Transición:

~~~text
inventariado → pendiente → parcial → funcional → verificado
~~~

El catálogo oficial analizado contiene 5.638 registros: 1.130 de cinta principal, 1.155 de menús contextuales, 977 fuera de la cinta, 318 de Backstage y cientos de herramientas contextuales para gráficos, SmartArt, formas, imágenes, WordArt, SVG, tablas, encabezados/pies, ecuaciones, 3D y tinta. La importación conserva el registro bruto y produce una vista normalizada; nunca genera automáticamente un botón por cada fila.

Reglas:

- parcial debe explicar con precisión qué falta;
- funcional significa que la acción real existe;
- verificado exige prueba verde y evidencia visual identificada;
- preserved-not-editable y out-of-scope son clases de soporte, no estados;
- ningún porcentaje puede calcularse sin denominador explícito;
- todo porcentaje indica numerador, denominador, filtros N/S/L/E, build y fecha;
- un botón visible sin acción impide verificar la pestaña.

Los campos de implementación se interpretan según `uiOwner`: Dhyrium se verifica por contratos de código; el motor se verifica por `CapabilityManifest`, API/eventos disponibles, automatización de caja negra y evidencia funcional/visual. No se inventan estados que el proveedor no expone.

---

## 8. Protocolo de referencia visual

### 8.1 Preparación de Word

1. confirmar Word 2607 build 20228.20158;
2. cerrar documentos personales;
3. usar un fixture controlado;
4. desactivar Nitro, Acrobat y demás add-ins;
5. restablecer la cinta;
6. registrar barra de acceso rápido;
7. fijar tema y transparencia;
8. fijar idioma;
9. fijar escala, DPI y resolución;
10. capturar sin notificaciones externas.

### 8.2 Estados que deben capturarse

- documento nuevo;
- documento guardado;
- documento solo lectura;
- sin conexión;
- conflicto real;
- pestaña Inicio;
- cada pestaña permanente;
- cada pestaña contextual;
- menú abierto;
- split button abierto;
- galería abierta;
- grupo colapsado;
- overflow;
- control activo;
- control mixto;
- control deshabilitado;
- foco de teclado;
- KeyTips;
- cinta completa;
- cinta de una línea solo como perfil Web/Dhyrium o si aparece en la referencia capturada; no se atribuye automáticamente a Word de escritorio;
- solo pestañas;
- panel izquierdo;
- panel derecho;
- mini toolbar;
- menú contextual;
- tema claro;
- tema oscuro con página clara;
- tema oscuro con página oscura;
- alto contraste;
- densidad ratón;
- densidad táctil.

### 8.3 Matriz mínima

Resoluciones:

- 1366 × 768;
- 1440 × 900;
- 1920 × 1080.

Zoom:

- 100 %;
- 125 %;
- 150 %;
- 200 %;
- 400 %.

Contextos:

- texto simple;
- formato mixto;
- tabla;
- imagen;
- forma;
- gráfico;
- encabezado o pie;
- ecuación cuando aplique.

La matriz no se ejecuta como un producto cartesiano de miles de capturas.

Estrategia:

- conjunto golden completo: todas las pestañas a 1920 × 1080, tema claro, 100 %;
- conjunto responsive: pares de riesgo en 1366, 1440 y 1920;
- conjunto de accesibilidad: 200 %, 400 %, alto contraste y teclado;
- conjunto contextual: una captura por aparición o combinación distinta;
- assertions geométricas automatizadas en toda la matriz;
- capturas nuevas solo cuando la variante visual cambia;
- revisión manual de lector de pantalla y alto contraste.

### 8.4 Metadatos de evidencia

Cada PNG debe tener un JSON asociado:

- id de evidencia;
- fecha;
- referencia Word;
- build Dhyrium;
- commit o hash del árbol cuando exista;
- SO;
- idioma;
- DPI;
- resolución;
- zoom;
- tema;
- modo de cinta;
- modo documental;
- renderer o capa activa;
- densidad;
- licencia o perfil;
- complementos;
- fixture;
- pestaña;
- grupo;
- selección;
- resultado de pruebas;
- diferencias conocidas.

Una evidencia puede cubrir varios comandos cuando todos son visibles y cada assertion está identificada. La relación es muchos-a-muchos:

~~~text
evidenceId → comandos cubiertos → estado/contexto → assertions
~~~

### 8.5 Comparación

La verificación visual debe incluir:

1. lado a lado;
2. overlay al 50 %;
3. comparación geométrica;
4. detección de clipping;
5. detección de solapamiento;
6. detección de scroll horizontal;
7. revisión humana.

Las tolerancias deben documentarse por componente. Cero clipping, cero solapamiento y cero scroll horizontal global son tolerancias absolutas.

---

## 9. Superficies del producto

La interfaz se divide en:

1. encabezado de aplicación;
2. barra de acceso rápido;
3. título y estado;
4. búsqueda;
5. cuenta y compartir;
6. fila de pestañas;
7. panel de cinta;
8. mini toolbar y menús contextuales;
9. reglas;
10. canvas paginado;
11. paneles laterales;
12. barra de estado;
13. Backstage;
14. diálogos;
15. barras de mensajes;
16. toasts;
17. ventanas o superficies flotantes.

Cada superficie debe tener:

- propietario de estado;
- orden de foco;
- rol ARIA;
- comportamiento responsive;
- soporte de tema;
- soporte táctil;
- prueba;
- evidencia.

### 9.1 Defecto crítico P0: vista original separada del editor

Evidencias proporcionadas por el usuario:

| ID | Observación |
|---|---|
| OBS-EDIT-001 | La vista “Documento original” presenta páginas con buena fidelidad visual, pero no permite colocar cursor, seleccionar ni editar directamente |
| OBS-EDIT-002 | La cabecera muestra “Original / Editar” y la página repite “Editar en Dhyrium”, creando dos controles para cambiar de experiencia |
| OBS-EDIT-003 | Al entrar en edición aparece otra representación básica; la carátula, composición, imágenes, objetos y paginación dejan de coincidir con la vista original |

Diagnóstico de producto:

- el usuario percibe dos documentos;
- “Original” parece una versión y “Editar” otra;
- la vista fiel se comporta como PDF o imagen;
- la cinta promete edición sobre una superficie que no responde;
- cambiar de modo produce un salto visual y estructural;
- el usuario debe elegir entre fidelidad sin edición y edición con pérdida;
- esto contradice la experiencia objetivo tipo Word.

Este defecto es BLOQUEANTE P0. No se puede declarar el editor “similar a Word moderno” mientras continúe.

### 9.2 Experiencia objetivo: una sesión documental

Dhyrium debe abrir un único DocumentSession y una única representación visible del documento.

Si el usuario tiene permiso de edición:

1. el documento abre directamente en modo Edición;
2. la página que se ve es la misma superficie en la que se edita;
3. el cursor, selección, objetos, comentarios y comandos funcionan en esa superficie;
4. no se requiere pulsar “Editar en Dhyrium”;
5. no existe un selector “Original / Editar” que cambie de motor o reconstruya el contenido;
6. la carátula y los elementos preservados permanecen visibles;
7. el guardado parte del paquete original y aplica cambios conservadores.

Si el usuario no tiene permiso:

- el mismo DocumentSession abre en modo Visualización;
- la geometría no cambia;
- el selector de modo explica los permisos;
- puede ofrecer Solicitar permiso o Guardar una copia, si están implementados;
- no debe mostrar “Editar en Dhyrium” como solución genérica.

Si el documento es riesgoso o no confiable:

- puede abrir en Vista protegida;
- se muestra una advertencia real y accionable;
- “Habilitar edición” solo aparece cuando la política de seguridad permite confiar en el archivo;
- este caso no debe confundirse con incompatibilidad de maquetación.

### 9.3 Selector de modo compatible con Word

El control superior debe representar permisos y comportamiento, no dos documentos:

- Edición;
- Revisión;
- Visualización.

Todos los modos comparten:

- DocumentId;
- VersionId;
- originalPackage;
- modelo;
- paginación;
- layout;
- zoom;
- posición de scroll;
- selección compatible;
- historial de versión.

Cambiar Edición / Revisión / Visualización NO debe:

- importar nuevamente el DOCX;
- convertirlo de nuevo a HTML;
- crear otra versión;
- cambiar la carátula;
- alterar el número de páginas;
- perder el punto de lectura;
- sustituir la superficie paginada por otro editor.

### 9.4 Vista fiel auxiliar

La vista PDF generada por Word o LibreOffice puede mantenerse con el nombre “Vista fiel”, pero:

- se ubica en Vista o en el inspector de compatibilidad;
- es una herramienta de comparación, impresión o diagnóstico;
- no se denomina “Documento original” como si fuera otro archivo;
- no es el modo primario cuando el usuario puede editar;
- no sustituye la superficie paginada editable;
- al abrirla y cerrarla conserva página, zoom y posición;
- informa el renderer utilizado;
- deja claro que es una previsualización no editable.

### 9.5 Elementos aún no editables

Un elemento OOXML todavía no editable NO debe desaparecer.

Debe:

- permanecer visible en su posición;
- conservar tamaño, ancla, orden de capas y ajuste de texto;
- identificarse como “Preservado, edición no disponible” al seleccionarlo;
- estar protegido frente a modificaciones destructivas;
- permitir abrir el inspector;
- conservarse al guardar;
- pasar a editable cuando exista un modelo real.

La página completa no debe aplanarse como imagen para resolver estos objetos. Solo se permite una capa preservada por objeto o región, con identidad y ancla, cuando no exista otra representación segura.

### 9.6 Criterio de continuidad visual

Desde la primera pintura editable:

- la carátula debe permanecer;
- logos e imágenes deben permanecer;
- tablas deben mantener geometría;
- encabezados y pies deben permanecer;
- número y orden de páginas deben coincidir dentro de la tolerancia aprobada;
- no debe existir un salto de una vista fiel a una página básica;
- la cinta debe reflejar la selección real;
- la edición de texto soportado debe ocurrir en su ubicación visible.

### 9.7 Contrato V1 — edición directa del perfil compatible

Este contrato convierte el defecto de las capturas en una puerta de primera versión. No basta conservar una vista fiel y ofrecer después otro editor básico.

Para la decisión vigente, `EditorHost` es el motor web propio montado dentro de
`DhyriumWriterWorkspace`. La primera pintura editable ocurre en el navegador,
con caret y selección reales. “Abrir directamente” prohíbe anteponer un PDF de
solo lectura, una pantalla de lanzamiento o un segundo motor editorial.

Cuando `EffectivePermissions.canEdit = true`, Dhyrium DEBE:

1. abrir directamente el `EditorHost` Dhyrium en modo Edición;
2. mostrar desde la primera pintura editable del motor la misma superficie paginada en la que funcionarán caret, selección y comandos;
3. conservar carátula, logos, imágenes, tablas, encabezados, pies, secciones y orden de páginas;
4. no anteponer una previsualización PDF, el botón “Editar en Dhyrium”, el selector “Original / Editar” ni una ruta HTML/Canvas alternativa;
5. mantener una sola `UnifiedDocumentSession` al cambiar entre Edición, Revisión y Visualización;
6. usar una cinta Dhyrium cuyos controles habilitados ejecuten comandos reales y cuyos controles pendientes estén deshabilitados con motivo accesible;
7. guardar y reabrir desde el paquete OOXML producido por el bridge preservativo mediante el pipeline durable.

Perfil `must-edit` mínimo de V1:

- texto de cuerpo y texto compatible de la carátula, con caret, selección y reflow localizado;
- familia, tamaño, negrita, cursiva, subrayado, color, alineación, listas, interlineado y estilos compatibles;
- tablas y celdas básicas: seleccionar, editar contenido y aplicar operaciones soportadas declaradas en la matriz;
- imágenes básicas: seleccionar y ejecutar al menos las operaciones soportadas de tamaño, reemplazo, posición o texto alternativo;
- contenido compatible de encabezados y pies;
- cortar, copiar, pegar, undo y redo dentro de las capacidades del motor;
- guardar, cerrar y reabrir conservando los cambios.

Los elementos fuera de `must-edit` se clasifican `must-display`, `opaque-preserve`, `semantic-preserve` o `unsupported-reject`. Formas, objetos anclados complejos, SmartArt, gráficos, ecuaciones, campos, revisiones u otras partes todavía no editables DEBEN permanecer visibles y conservarse en round-trip según su clase; no pueden desaparecer al entrar en edición.

Si el motor no puede preservar con seguridad el documento o una parte bloqueante:

- abrir en solo lectura sobre el mismo motor o en Vista fiel auxiliar;
- indicar la causa y el elemento afectado;
- ofrecer “Ver incompatibilidades” y, cuando sea seguro, “Guardar una copia”;
- no presentar un editor HTML/Canvas degradado como edición fiel;
- no permitir sobrescritura destructiva del original.

La V1 no supera esta puerta hasta aprobar con el DOCX real de la carátula: `FID-OPEN`, los criterios documentales/del motor de `FID-EDIT`, `FID-SAVE`, `FID-VISUAL` y `FID-UX`.

---

## 10. Encabezado moderno de aplicación

El encabezado debe integrar:

- estado de autoguardado;
- barra de acceso rápido;
- nombre del documento;
- ubicación o estado de almacenamiento;
- búsqueda;
- colaboradores cuando existan;
- compartir;
- cuenta o perfil;
- acciones propias de Dhyrium.

### 10.1 Autoguardado

Estados reales:

- Desactivado;
- Guardando…;
- Guardado localmente;
- Guardado en servidor;
- Sin conexión;
- Conflicto de versión;
- Error al guardar.

Dhyrium NO DEBE afirmar que usa OneDrive o SharePoint.

### 10.2 Barra de acceso rápido

Debe ser:

- independiente de la pestaña activa;
- personalizable;
- reordenable;
- ocultable;
- ubicable arriba o debajo de la cinta;
- persistente por usuario;
- navegable con teclado;
- adaptable mediante overflow;
- restaurable a valores predeterminados;
- importable y exportable en P1.

### 10.3 Búsqueda

Alt+Q debe abrir una búsqueda real que encuentre:

- comandos;
- alias en español e inglés;
- ubicación de cada comando;
- atajo;
- ayuda;
- contenido del documento;
- razón de deshabilitación.

La búsqueda ejecuta comandos mediante CommandRegistry y respeta canExecute.

### 10.4 Compartir

Solo debe habilitarse cuando exista backend y autorización real para:

- crear enlace;
- definir permiso de lectura, revisión o edición;
- revocar;
- listar participantes;
- exportar copia;
- mostrar presencia.

Si no existe colaboración, el control debe estar deshabilitado y explicar el motivo.

### 10.5 Selector de modo documental

En la zona superior derecha, cerca de Compartir, puede existir un único selector:

- Editando;
- Revisando;
- Visualizando.

El selector:

- refleja permisos;
- cambia capacidades dentro de la misma sesión;
- no muestra “Original”;
- no llama a otro editor;
- no reconstruye el DOCX;
- conserva scroll, página y zoom;
- ofrece Solicitar permiso o Guardar una copia cuando corresponda.

Eliminar del flujo normal:

- botón “Editar en Dhyrium”;
- selector duplicado “Original / Editar”;
- barra “Documento original” como modo permanente;
- cinta activa sobre un PDF que no puede responder.

Excepción:

“Habilitar edición” solo se usa en Vista protegida por una causa real de seguridad. No se utiliza para ocultar incompatibilidad del motor.

### 10.6 Límites web

La aplicación web NO DEBE simular controles nativos falsos de Windows. Minimizar, maximizar y cerrar pertenecen al contenedor nativo si en el futuro existe una aplicación de escritorio.

---

## 11. Arquitectura de la cinta

Esta sección describe el runtime de la cinta Dhyrium canónica. La V1 usa una
cinta web propia conectada al mismo `DocumentSession`; no duplica una cinta de
Office ni muestra controles decorativos sobre una previsualización.

`CommandRegistry` controla comandos editoriales, shell, Backstage y workflows
Dhyrium. La matriz inventaría únicamente capabilities demostradas; un comando
pendiente permanece deshabilitado y explica su causa.

### 11.1 Capas

~~~text
FeatureProfile
      ↓
WordReference
      ↓
RibbonSurfaceSpec
      ↓
RibbonSchema
      ↓
RibbonLayoutEngine
      ↓
Fluent controls
      ↓
CommandRegistry
      ↓
EditorStateAdapter
      ↓
TransactionManager
      ↓
EditorUiBridge / EngineAdapter
      ↓
Motor OOXML canónico
      ↓
DurableSaveCoordinator / Versions
~~~

### 11.2 Componentes

- RibbonRoot;
- RibbonTabList;
- RibbonTab;
- RibbonPanel;
- RibbonGroup;
- RibbonControl;
- RibbonGallery;
- RibbonMenu;
- RibbonSplitButton;
- RibbonComboBox;
- RibbonColorPicker;
- RibbonDialogLauncher;
- RibbonOverflow;
- RibbonCollapsedGroup;
- CommandRegistry;
- EditorStateAdapter;
- RibbonLayoutEngine;
- ContextualTabController;
- KeyTipManager;
- IconRegistry;
- FluentThemeProvider;
- FeatureProfileProvider;
- PaneCoordinator;
- MiniToolbarController.

### 11.3 Esquema declarativo

~~~ts
interface RibbonTabSpec {
  id: string;
  label: string;
  keyTip?: string;
  kind: 'core' | 'contextual' | 'optional';
  capability?: string;
  order: number;
  groups: RibbonGroupSpec[];
}

interface RibbonGroupSpec {
  id: string;
  label: string;
  icon: FluentIconId;
  priority: number;
  overflowPolicy: 'allowed' | 'last-resort' | 'never';
  variants: {
    full: GroupPresentation;
    medium: GroupPresentation;
    compact: GroupPresentation;
    collapsed: GroupPresentation;
  };
  controls: RibbonControlSpec[];
}
~~~

La composición NO DEBE quedar acoplada permanentemente a
`CanvasWordRibbon.tsx`. El componente actual se encapsula y migra hacia esquema,
layout y comandos declarativos sin alterar el hito activo.

### 11.4 Registro de comandos

~~~ts
interface CommandDefinition<TPayload = unknown> {
  id: CommandId;
  execute(context: CommandContext, payload?: TPayload): Promise<void> | void;
  canExecute(context: CommandContext): boolean;
  isActive?(context: CommandContext): boolean;
  isMixed?(context: CommandContext): boolean;
  currentValue?(context: CommandContext): unknown;
  disabledReason(context: CommandContext): string | undefined;
  pending?(context: CommandContext): boolean;
  cancel?(context: CommandContext): void;
  errorPolicy: 'inline' | 'message-bar' | 'toast' | 'dialog' | 'propagate';
  reentryPolicy: 'deny' | 'queue' | 'replace' | 'allow';
  shortcut?: string;
  keyTip?: string;
  undoTransaction: 'editor-native' | 'custom' | 'none';
  persistence: 'document' | 'preferences' | 'session' | 'none';
  savePolicy?: 'immediate' | 'autosave' | 'explicit';
  backendDependency?: string;
  requiredCapability?: string;
  requiredLicense?: string;
}
~~~

En la implementación final se prefiere una unión discriminada por tipo de comando para que un action button simple no invente valores isMixed o currentValue. Payloads persistentes deben tener esquema, validación y serialización explícita. Una transacción debe definir comienzo, commit, rollback y límite de cambios.

Todo control visible creado o gestionado por Dhyrium debe resolver un `CommandId`. Los controles nativos del motor se inventarían en la matriz y se validan mediante capabilities/automatización del proveedor; no se simula que pertenecen al `CommandRegistry` Dhyrium.

La compilación o las pruebas deben fallar cuando:

- falta el comando;
- el ID está duplicado;
- falta el icono;
- el KeyTip entra en conflicto;
- un control habilitado no tiene execute;
- una acción persistente no declara política de undo;
- la matriz no contiene el comando;
- falta la prueba obligatoria;
- un placeholder se declara funcional.

### 11.5 Estado mixto

La multiselección debe representar estado mixto. Ejemplos:

- parte del texto en negrita y parte sin negrita;
- varias celdas con alineaciones distintas;
- selección con fuentes o tamaños diferentes.

No debe convertirse un estado mixto en falso o verdadero de manera arbitraria.

### 11.6 Reglas de arquitectura frontend

- reutilizar primero componentes app-ui del proyecto;
- usar shadcn solo cuando no exista wrapper aprobado;
- aplicar Tailwind y tokens del sistema, evitando estilos dispersos;
- usar el sistema DialogStack aprobado para diálogos;
- usar React Query para estado remoto;
- usar Redux solo para estado global de cliente realmente compartido;
- usar la URL para navegación y estado enlazable;
- mantener servicios dentro del módulo propietario;
- TaskDocumentEditor compone la sesión, no concentra toda la lógica;
- `CanvasWordRibbon` se sustituye progresivamente solo si una ribbon externa fue aprobada; de lo contrario se retira del flujo editorial al integrar la UI nativa del motor;
- toda migración debe conservar temporalmente compatibilidad con el código heredado;
- una dependencia nueva requiere justificación, licencia y análisis de tamaño.

---

## 12. Tipos de controles y semántica

Estas reglas son normativas para controles que Dhyrium crea o reemplaza. La UI nativa del motor se evalúa contra el baseline y su contrato de proveedor; Dhyrium no la reimplementa solo para imponer este catálogo.

Tipos admitidos:

- action button;
- toggle button;
- split button;
- menu button;
- combobox;
- selector numérico;
- galería;
- color picker;
- checkbox;
- radio group;
- lanzador de diálogo;
- control de estado;
- grupo colapsado;
- overflow.

Reglas:

- Negrita, Cursiva y estados similares son toggles.
- Pegar puede ser split button si tiene acción dominante y alternativas.
- Fuente y tamaño son comboboxes editables.
- Una galería debe soportar vista previa, selección, teclado y scroll interno.
- Un botón deshabilitado debe explicar disabledReason.
- Un split button no repite la acción dominante dentro del menú sin motivo.
- El tooltip debe incluir nombre, descripción y atajo cuando exista.
- Los controles de icono único deben tener tooltip y nombre accesible.

---

## 13. Inventario de pestañas y grupos

El orden exacto, dimensiones y visibilidad se verifican contra las capturas congeladas. Las listas siguientes son un inventario candidato y no forman automáticamente el denominador P0.

Durante H00, cada comando recibe exactamente una clase de capacidad. Solo los comandos aprobados como core-local forman el denominador P0 local. Los optional-native se verifican en un perfil separado; los licensed-cloud no bloquean la paridad local; third-party se excluye; preserved-not-editable exige conservación; out-of-scope queda documentado.

### 13.1 Archivo

Superficies:

- Inicio de Backstage;
- Información;
- Nuevo;
- Abrir;
- Recientes;
- Compartidos o ubicaciones autorizadas;
- Guardar;
- Guardar como;
- Imprimir;
- Compartir;
- Exportar;
- Historial;
- Cuenta Dhyrium;
- Opciones;
- Cerrar.

### 13.2 Inicio

Grupos P0:

1. Portapapeles
   - Pegar;
   - opciones de pegado;
   - Cortar;
   - Copiar;
   - Copiar formato;
   - lanzador del portapapeles si se implementa panel.
2. Fuente
   - familia;
   - tamaño;
   - aumentar;
   - disminuir;
   - cambiar mayúsculas y minúsculas;
   - borrar formato;
   - negrita;
   - cursiva;
   - subrayado y variantes;
   - tachado;
   - subíndice;
   - superíndice;
   - efectos de texto;
   - resaltado;
   - color de fuente;
   - lanzador de Fuente.
3. Párrafo
   - viñetas;
   - numeración;
   - lista multinivel;
   - disminuir sangría;
   - aumentar sangría;
   - ordenar;
   - mostrar marcas;
   - alinear izquierda;
   - centrar;
   - alinear derecha;
   - justificar;
   - interlineado;
   - sombreado;
   - bordes;
   - lanzador de Párrafo.
4. Estilos
   - galería;
   - expansión;
   - crear estilo;
   - aplicar estilo;
   - modificar;
   - administrar estilos.
5. Edición
   - Buscar;
   - Reemplazar;
   - Seleccionar.

Capacidades condicionadas:

- Editor;
- Dictado;
- Sensibilidad;
- Complementos;
- Copilot o asistente.

### 13.3 Insertar

Grupos P0:

1. Páginas
   - Portada;
   - Página en blanco;
   - Salto de página.
2. Tablas
   - selector de tabla;
   - Insertar tabla;
   - Dibujar tabla;
   - Convertir texto en tabla;
   - hoja de cálculo si se aprueba;
   - tablas rápidas.
3. Ilustraciones
   - Imágenes;
   - imágenes en línea cuando exista backend;
   - Formas;
   - Iconos;
   - Modelos 3D: optional-native o preserved-not-editable hasta aprobar modelo propio;
   - SmartArt: objetivo separado; preserved-not-editable hasta aprobar edición estructural;
   - Gráfico;
   - Captura.
4. Complementos
   - solo mediante una arquitectura Dhyrium de extensiones;
   - no copiar tienda ni marca Microsoft.
5. Multimedia
   - vídeo en línea: licensed-cloud o out-of-scope hasta aprobar proveedor y seguridad.
6. Vínculos
   - Vínculo;
   - Marcador;
   - Referencia cruzada.
7. Comentarios
   - Nuevo comentario.
8. Encabezado y pie
   - Encabezado;
   - Pie de página;
   - Número de página.
9. Texto
   - Cuadro de texto;
   - elementos rápidos;
   - WordArt;
   - Letra capital;
   - Línea de firma;
   - Fecha y hora;
   - Objeto.
10. Símbolos
   - Ecuación;
   - Símbolo.

Ningún SVG de muestra puede declararse SmartArt, gráfico o forma editable.

### 13.4 Dibujar

Grupos sujetos a referencia y capacidad:

- Herramientas de selección;
- Selección con lazo;
- Borrador;
- Lápices;
- Agregar lápiz;
- Color;
- Grosor;
- Regla;
- Conversión de tinta;
- Tinta a forma;
- Tinta a texto;
- Tinta a matemáticas;
- Reproducción de tinta;
- Lienzo de dibujo cuando aplique.

Debe funcionar con ratón, puntero y táctil según la capacidad declarada.

### 13.5 Diseño

Grupos P0:

1. Formato del documento
   - Temas;
   - Colores;
   - Fuentes;
   - Espaciado de párrafos;
   - Efectos;
   - Establecer como predeterminado.
2. Fondo de página
   - Marca de agua;
   - Color de página;
   - Bordes de página.

### 13.6 Disposición

Grupos P0:

1. Configurar página
   - Márgenes;
   - Orientación;
   - Tamaño;
   - Columnas;
   - Saltos;
   - Números de línea;
   - Guiones;
   - lanzador de Configurar página.
2. Párrafo
   - Sangría izquierda;
   - Sangría derecha;
   - Espacio antes;
   - Espacio después;
   - lanzador.
3. Organizar
   - Posición;
   - Ajustar texto;
   - Traer adelante;
   - Enviar atrás;
   - Panel de selección;
   - Alinear;
   - Agrupar;
   - Girar.

### 13.7 Referencias

Grupos P0:

1. Tabla de contenido
   - Tabla de contenido;
   - Agregar texto;
   - Actualizar tabla.
2. Notas al pie
   - Insertar nota al pie;
   - Insertar nota al final;
   - Siguiente nota;
   - Mostrar notas;
   - lanzador.
3. Investigación
   - servicios disponibles y declarados.
4. Citas y bibliografía
   - Insertar cita;
   - Administrar fuentes;
   - Estilo;
   - Bibliografía.
5. Títulos
   - Insertar título;
   - Insertar tabla de ilustraciones;
   - Actualizar tabla;
   - Referencia cruzada.
6. Índice
   - Marcar entrada;
   - Insertar índice;
   - Actualizar índice.
7. Tabla de autoridades
   - Marcar cita;
   - Insertar tabla;
   - Actualizar tabla.

Los campos deben ser modelos dinámicos; no texto decorativo.

### 13.8 Correspondencia

Grupos P0:

1. Crear
   - Sobres;
   - Etiquetas.
2. Iniciar combinación
   - Iniciar combinación de correspondencia;
   - Seleccionar destinatarios;
   - Editar lista de destinatarios.
3. Escribir e insertar campos
   - Resaltar campos;
   - Bloque de direcciones;
   - Línea de saludo;
   - Insertar campo combinado;
   - Reglas;
   - Asignar campos;
   - Actualizar etiquetas.
4. Vista previa de resultados
   - Vista previa;
   - Primer registro;
   - Anterior;
   - número de registro;
   - Siguiente;
   - Último;
   - Buscar destinatario;
   - Comprobar errores.
5. Finalizar
   - Finalizar y combinar.

Requiere modelo de destinatarios, campos, filtros, vista previa y salida real.

### 13.9 Revisar

Grupos P0:

1. Revisión
   - Ortografía y gramática;
   - Editor: core-local para reglas locales aprobadas y licensed-cloud para servicios externos;
   - Diccionario;
   - Sinónimos;
   - Contar palabras.
2. Voz
   - Leer en voz alta;
   - Dictado si existe servicio.
3. Accesibilidad
   - Comprobar accesibilidad;
   - panel de resultados.
4. Idioma
   - Traducir: licensed-cloud o dhyrium-alternative según el proveedor aprobado;
   - Idioma de corrección.
5. Comentarios
   - Nuevo;
   - Eliminar;
   - Anterior;
   - Siguiente;
   - Mostrar comentarios.
6. Seguimiento
   - Control de cambios;
   - vista de revisión;
   - Mostrar marcas;
   - Panel de revisiones;
   - lanzador.
7. Cambios
   - Aceptar;
   - Rechazar;
   - Anterior;
   - Siguiente.
8. Comparar
   - Comparar;
   - Combinar.
9. Proteger
   - Restringir edición;
   - bloquear autores cuando exista colaboración.

### 13.10 Vista

Grupos P0:

1. Vistas
   - Modo lectura;
   - Diseño de impresión;
   - Diseño web;
   - Esquema;
   - Borrador: optional-native hasta aprobar soporte del motor.
2. Inmersivo
   - enfoque;
   - lector inmersivo cuando exista.
3. Movimiento de página
   - Vertical;
   - Lado a lado.
4. Mostrar
   - Regla;
   - Líneas de cuadrícula;
   - Panel de navegación.
5. Zoom
   - Zoom;
   - 100 %;
   - Una página;
   - Varias páginas;
   - Ancho de página.
6. Ventana
   - Nueva ventana: optional-native en web;
   - Organizar todo: optional-native;
   - Dividir: candidato core-local;
   - Ver en paralelo: optional-native;
   - desplazamiento sincrónico: optional-native;
   - Restablecer posición: optional-native;
   - Cambiar ventanas: optional-native.
7. Macros
   - solo si la clase optional-native se aprueba;
   - nunca ejecutar VBA importado en navegador o backend.

### 13.11 Ayuda

Grupos:

- Ayuda Dhyrium;
- Formación;
- Soporte;
- Comentarios;
- Diagnóstico voluntario;
- Atajos;
- Acerca de;
- Información de privacidad y licencias.

No debe fingir conexión con soporte Microsoft.

### 13.12 Programador

Programador no es P0 visible por defecto. Si se incorpora:

- debe habilitarse desde Opciones;
- controles de contenido requieren modelo real;
- macros se conservan pero no se ejecutan;
- XML y complementos se limitan a capacidades documentadas;
- su presencia no afecta la comparación base.

---

## 14. Pestañas contextuales

El inventario siguiente sirve para validar las pestañas nativas de Word. Solo una decisión futura explícita puede habilitar contextuales creadas por Dhyrium mediante `ContextualTabController`; el shell no duplica las contextuales internas de Word.

Conjuntos contextuales:

- Herramientas de tabla:
  - Diseño de tabla;
  - Disposición de tabla.
- Formato de imagen.
- Formato de forma.
- Herramientas de gráfico:
  - Diseño de gráfico;
  - Formato.
- Encabezado y pie de página.
- Formato de gráficos SVG cuando aplique.
- Ecuación cuando exista un modelo matemático.
- Controles de contenido si se habilita Programador.

Reglas:

- ocultas sin contexto;
- visibles al seleccionar el objeto;
- orden y color contextual documentados;
- pueden coexistir contextos;
- la selección de una imagen dentro de una tabla puede activar reglas combinadas;
- `ContextualTabController` resuelve prioridad y pestaña activa únicamente en superficies contextuales Dhyrium aprobadas;
- al perder contexto, el foco debe volver a una pestaña válida;
- ningún contexto se calcula directamente en JSX.

Máquina mínima condicional para superficies Dhyrium:

~~~text
selection.type
selection.ancestors
editor.mode
featureProfile
        ↓
ContextualTabController
        ↓
contextualTabs[]
activeTab
contextualCommands[]
~~~

---

## 15. Mini toolbar, menús contextuales y paneles

La mini toolbar y los menús editoriales pertenecen preferentemente al motor. Los requisitos 15.1–15.2 validan su comportamiento nativo y solo se implementan en Dhyrium cuando una capability/ADR autoriza una superficie propia sin duplicación.

### 15.1 Mini toolbar

Debe:

- aparecer en selección de texto si la referencia lo exige;
- reutilizar CommandRegistry;
- reflejar estados mixtos;
- desaparecer con Escape;
- no tapar la selección de manera permanente;
- ser navegable;
- usar los mismos iconos y tokens;
- respetar preferencias.

### 15.2 Menús contextuales

Cada menú debe:

- depender del contexto;
- reutilizar comandos;
- contener icono y texto;
- permanecer dentro del viewport;
- restaurar foco;
- no duplicar lógica.

### 15.3 Sistema de paneles

`PaneCoordinator` debe inventariar y coordinar:

- Panel de navegación;
- Comentarios;
- Revisión;
- Editor o corrección;
- Accesibilidad;
- Estilos;
- Portapapeles;
- Selección;
- Formato de imagen;
- Formato de forma;
- Gráfico;
- Encabezado y pie;
- Versiones;
- Compatibilidad;
- Buscar y reemplazar.

Cada panel declara:

- id;
- título;
- icono;
- lado;
- ancho mínimo y máximo;
- redimensionamiento;
- modalidad;
- contexto;
- permiso;
- persistencia;
- foco inicial;
- retorno de foco;
- prueba.

No se permite que la sección derecha quede recortada.

Ownership:

- Navegación, comentarios, revisión y formato pertenecen preferentemente al motor porque necesitan anchors reales.
- Versiones, compatibilidad, metadata e IA pertenecen a Dhyrium.
- `paneCoordination = full | observe-only | unsupported` se declara en el capability manifest.
- `full`: un panel derecho primario y restauración controlada.
- `observe-only`: la IA usa columna exterior redimensionando el iframe.
- `unsupported`: IA modal/floating no superpuesta o deshabilitada mientras haya un panel editorial.
- Nunca se promete cerrar paneles internos si el motor no expone esa capacidad.

---

## 16. RibbonLayoutEngine y adaptabilidad

Este motor de layout solo se implementa si una fase futura aprueba una ribbon Dhyrium externa. Con la UI nativa de Word, estas reglas son criterios de integración; Dhyrium no intenta gobernar el layout interno de Word.

### 16.1 Regla central

No usar scroll horizontal global como solución de diseño.

La degradación es:

~~~text
full → medium → compact → collapsed group → overflow
~~~

Los modos de producto son:

~~~text
Full ribbon — referencia Word de escritorio
Tabs only / ribbon collapsed — referencia Word de escritorio
Single-line ribbon — modo adaptable Dhyrium o perfil separado si se captura
~~~

El modo elegido por el usuario se conserva como preferencia. No es lo mismo que la degradación por ancho. Single-line no se atribuye automáticamente a Word de escritorio: la documentación oficial lo describe en otras experiencias, incluido Word web, y solo entra en la matriz de paridad de escritorio si aparece en la referencia 2607 capturada.

### 16.2 Medición

El motor debe considerar:

- ancho real disponible;
- idioma;
- tipografía cargada;
- zoom;
- DPI;
- densidad;
- nombre de grupos;
- iconos;
- galerías;
- prioridades;
- controles inseparables;
- pestañas contextuales;
- paneles abiertos;
- ancho de overflow.

Una ribbon Dhyrium debe utilizar `ResizeObserver` y medición real. Las siguientes bandas coinciden con las clases de layout publicadas por Fluent 2 y sirven para organizar la matriz de prueba; no son umbrales documentados del algoritmo interno de compresión de Word:

- 320–479;
- 480–639;
- 640–1023;
- 1024–1365;
- 1366–1919;
- 1920 o más.

Estas bandas no deciden por sí solas la variante de un grupo. La decisión se toma por medición, prioridad y capacidad real.

### 16.3 Histéresis

Debe existir histéresis para evitar oscilaciones al cambiar uno o dos píxeles. Una variante no debe alternar continuamente entre compacta y colapsada.

### 16.4 Grupos colapsados

Un grupo colapsado conserva:

- nombre;
- icono;
- todos sus comandos;
- estado habilitado;
- navegación;
- tooltips;
- KeyTips.

### 16.5 Overflow

El overflow:

- es el último control;
- muestra icono y texto;
- mantiene agrupación;
- conserva estado;
- ejecuta el mismo CommandId;
- no contiene no-op;
- permanece dentro del viewport.

### 16.6 Pantallas pequeñas

La cinta puede pasar a una línea o dropdown de pestañas según la superficie, pero:

- no pierde comandos;
- no envuelve arbitrariamente;
- no recorta;
- no genera scroll global;
- conserva acceso mediante teclado.

---

## 17. Fluent 2 y sistema visual

Fluent 2 rige el shell y las superficies creadas por Dhyrium. Microsoft confirma que la actualización visual de Office aplica principios Fluent, pero no publica todos los tokens/geometrías internos de Word; por ello la paridad se mide contra capturas. La UI nativa del motor se evalúa como unidad y no se mezcla parcialmente con componentes Fluent Dhyrium.

### 17.1 Dependencias

Usar:

- @fluentui/react-components;
- @fluentui/react-icons;
- FluentProvider;
- tokens globales;
- tokens alias semánticos.

Respetar las reglas de arquitectura del frontend: reutilizar componentes app-ui existentes antes de añadir wrappers nuevos y justificar cualquier dependencia.

### 17.2 Tokens

Debe existir una tabla token → uso → evidencia.

Categorías:

- color;
- tipografía;
- espacio;
- tamaño;
- borde;
- radio;
- elevación;
- movimiento;
- densidad;
- foco;
- opacidad.

PROHIBIDO:

- repetir hexadecimales por toda la cinta;
- repetir medidas mágicas;
- crear sombras arbitrarias;
- tener una paleta distinta por pestaña sin justificación.

### 17.3 Espaciado

Base de 4 px, usando compensaciones de 2, 6 o 10 px cuando la alineación de iconos lo exija.

### 17.4 Formas

Usar tokens semánticos Fluent para radios y bordes. Como catálogo interno pueden existir opciones 0, 2, 4, 8 y 12 px, pero NO representan por sí solas un mapeo oficial de Word.

La selección por componente se obtiene de la referencia capturada y se registra en RIBBON_MEASUREMENTS.md. Split buttons deben verse como una sola unidad y no presentar huecos involuntarios.

### 17.5 Elevación

Usar tokens de sombra consistentes:

- tooltips y menús pequeños;
- callouts y hover cards;
- diálogos.

No imitar sombras de una captura mediante imágenes.

### 17.6 Movimiento

El movimiento debe ser:

- corto;
- funcional;
- localizado;
- cancelable;
- compatible con prefers-reduced-motion.

---

## 18. Color y temas

Perfiles de paridad Word que deben capturarse cuando estén disponibles:

- Blanco;
- Gris oscuro;
- Negro;
- Colorido.
- Usar configuración del sistema.

Perfiles propios:

- Colorido Dhyrium, con marca Dhyrium y sin copiar el color de producto Word.

Alto contraste no se trata como un tema de Office. Se valida como modo de contraste de Windows y del navegador.

Word separa el tema de la interfaz y el color de la hoja. Dhyrium debe modelar:

1. tema del shell;
2. simulación de página clara u oscura;
3. color real del documento;
4. apariencia de impresión.

La página puede permanecer blanca mientras la UI está oscura. La preferencia debe recordarse.

La transparencia o efecto tipo Mica:

- es opcional;
- depende de la superficie;
- no puede reducir contraste;
- debe registrarse en la referencia;
- no debe simularse con una captura.

La barra amarilla no es parte de la paleta normal.

---

## 19. Tipografía y fuentes documentales

### 19.1 Interfaz

- Segoe UI cuando esté disponible;
- fallback al stack nativo del sistema;
- sentence case;
- alineación consistente de línea base;
- rampa tipográfica Fluent.

### 19.2 Documento

El texto dentro de la hoja usa la fuente declarada por el documento, no la fuente del shell.

Para documentos modernos nuevos:

- Aptos es el valor esperado en una instalación moderna limpia, pero `Normal.dotm`, plantilla, tema, directiva o configuración pueden cambiarlo;
- el baseline registra `defaultDocumentFont`, plantilla efectiva y, cuando sea posible, hash de `Normal.dotm`;
- la fuente predeterminada Dhyrium debe ser configurable;
- cambiar el valor predeterminado requiere decisión de producto.

Para documentos existentes:

- Calibri puede usarse si está instalada y licenciada localmente;
- Calibri no se distribuye con Dhyrium;
- Carlito es una decisión técnica de fallback de Dhyrium, no un reemplazo oficial designado por Microsoft;
- su licencia, disponibilidad y comportamiento métrico deben verificarse;
- Carlito no debe forzarse a todos los documentos;
- toda sustitución se registra en el inspector;
- una sustitución puede cambiar saltos, páginas y geometría.

La prueba visual debe registrar las fuentes efectivamente cargadas.

---

## 20. Iconografía

En superficies creadas por Dhyrium, usar una sola familia visual: Fluent System Icons. Es una elección de implementación de Dhyrium, no evidencia de que Word utilice exactamente esos glifos. La UI nativa de Word conserva su iconografía propia; no se la repinta parcialmente con una segunda familia.

Reglas:

- Regular para reposo o acción disponible;
- Filled para selección o énfasis;
- 16, 20, 24 y 32 son tamaños candidatos de la biblioteca, no una norma universal por control;
- el tamaño final se selecciona por componente, densidad, objetivo táctil y baseline medido;
- un icono pequeño no se convierte automáticamente en objetivo interactivo;
- preferir iconografía de sistema monocromática cuando corresponda, sin imponerla a activos de contenido o marca;
- contraste suficiente;
- soporte RTL;
- tooltip y nombre accesible;
- semántica literal y consistente.

PROHIBIDO:

- mezclar Lucide en una cinta Dhyrium aprobada;
- usar emojis;
- usar caracteres Unicode como iconos;
- recortar iconos de Word;
- copiar logos de Word, Microsoft 365, Acrobat o Nitro;
- usar iconos de producto como comandos.

Si no existe icono exacto:

1. seleccionar el Fluent semánticamente más próximo;
2. documentar la diferencia;
3. no dibujar una copia del icono propietario.

### 20.1 Identidad y límites legales

- la aplicación se llama Dhyrium Writer;
- debe conservar una marca visual propia;
- no debe presentarse como producto afiliado o certificado por Microsoft;
- familiaridad funcional no autoriza copiar identidad comercial;
- no distribuir fuentes propietarias;
- conservar avisos de licencia de Fluent System Icons;
- revisar legalmente cualquier activo de marca o integración antes de publicar.

---

## 21. Teclado, KeyTips y foco

Comportamiento P0:

- Alt: activar KeyTips;
- F10: candidato que debe confirmarse en Word 2607 español y en el modo de cinta capturado;
- Escape: retroceder nivel y finalmente volver al documento;
- flechas izquierda/derecha: cambiar pestaña;
- Tab y Shift+Tab: entrar o salir de la cinta y avanzar entre widgets o grupos según el patrón capturado;
- Home y End: extremos aplicables;
- Ctrl+flecha izquierda/derecha: candidato para saltar grupos, sujeto a validación en la referencia;
- Enter o Espacio: ejecutar;
- Flecha abajo o Alt+flecha abajo: abrir lista;
- Ctrl+F1: contraer o expandir cinta;
- F6: recorrer encabezado, cinta, documento, paneles y estado, después de validarlo en el shell final;
- Ctrl+F6: candidato para cambiar superficie o documento cuando aplique;
- Alt+Q: búsqueda;
- atajos estándar de Word cuando no entren en conflicto.

Reglas:

- KeyTips dependen del idioma;
- capturar KeyTips en Word español;
- no copiar secuencias inglesas;
- unicidad dentro de cada nivel;
- KeyTips de menús continúan la secuencia;
- al cerrar una superficie, el foco vuelve al disparador;
- ninguna acción requiere ratón.

Para toolbars se debe usar roving tabindex y una sola parada Tab cuando corresponda al patrón accesible.

Patrón base sin contradicción:

- Tab y Shift+Tab entran o salen del widget compuesto;
- flechas mueven el foco dentro del tablist, toolbar, galería o menú;
- Ctrl+flechas saltan grupos solo si la referencia lo confirma;
- Enter y Espacio ejecutan;
- Escape cierra y restaura foco.

Las diferencias entre la referencia Word y el patrón WAI-ARIA deben documentarse y resolverse sin dejar al usuario atrapado.

---

## 22. Accesibilidad

Meta transversal: WCAG 2.2 AA.

No se pospone hasta el Hito 08. Cada componente nuevo debe cumplir su parte desde el inicio.

Requisitos:

- uso completo sin ratón;
- foco visible;
- foco no oculto;
- orden lógico;
- roles tablist, tab, tabpanel, toolbar, menu, menuitem y dialog;
- estados ARIA;
- nombres accesibles;
- descripciones accesibles;
- tooltips para icon-only;
- contraste de texto normal 4.5:1;
- contraste de texto grande 3:1;
- contraste de iconos y componentes 3:1;
- texto al 200 % sin recortes;
- reflow al 400 % hasta 320 px sin scroll horizontal global;
- alto contraste;
- lector de pantalla;
- reduced motion;
- orientación;
- objetivos táctiles adecuados;
- objetivo contractual de 44 × 44 CSS px para controles táctiles;
- restauración de foco;
- mensajes anunciados sin interrumpir innecesariamente.

La accesibilidad de la aplicación y la accesibilidad del contenido del documento son dos sistemas separados:

1. UI accesible;
2. analizador de accesibilidad documental.

---

## 23. Estados, mensajes y barra amarilla

Estados normales discretos:

- Guardando…;
- Guardado localmente;
- Guardado en servidor;
- Solo lectura;
- Documento original;
- Sin conexión;
- Recuperado;
- Conflicto.

No deben mostrarse como advertencia amarilla permanente.

“Documento original” no es un estado de trabajo visible ni una segunda versión. El paquete original es una propiedad interna de la sesión y aparece únicamente en Información, Historial o Inspector cuando resulte útil.

Estados de modo:

- Editando;
- Revisando;
- Visualizando;
- Vista protegida.

La UI no debe usar “Original” para significar Visualización ni “Editar en Dhyrium” para significar una conversión a otro modelo.

Una Message Bar amarilla solo aparece cuando:

- existe riesgo real;
- es temporal o resoluble;
- explica la causa;
- ofrece una acción;
- puede cerrarse si no es bloqueante.

Una barra roja representa error o bloqueo real.

Ante incompatibilidad:

- identificar elemento;
- identificar ubicación;
- indicar editable, parcial o preservado;
- explicar riesgo;
- ofrecer Ver incompatibilidades;
- ofrecer vista fiel;
- conservar contenido;
- impedir sobrescritura destructiva;
- no afirmar lectura fiel si hubo pérdida.

---

## 24. Arquitectura documental

Separar:

1. modelo documental;
2. selección;
3. comandos;
4. transacciones;
5. historial undo/redo;
6. layout;
7. paginación;
8. importador;
9. exportador;
10. vista fiel;
11. persistencia;
12. sesión documental;
13. compatibilidad.

TaskDocumentEditor debe convertirse en composición de sesión y no concentrar importación, exportación, cinta, persistencia y comandos.

Cada cambio debe producir:

- transacción;
- rango afectado;
- actualización de estado;
- entrada undo cuando corresponda;
- marca de documento modificado;
- persistencia;
- invalidación de vista;
- evento de accesibilidad cuando aplique.

### 24.1 UnifiedDocumentSession

Debe existir una sola sesión y una sola superficie editable: Dhyrium Writer. La
vista del original es de solo lectura. El motor Dhyrium es dueño del modelo
interno, layout web, paginación, caret, selección, IME, objetos soportados,
undo/redo, comentarios y revisión implementados.

~~~text
DhyriumWriterWorkspace
├── Backstage, repositorio, ACL y versiones
├── Session & Capability Store
├── CommandRegistry transaccional
├── PaneCoordinator
├── AI sidecar
└── EditorHost Dhyrium
    ├── CanvasAdapter provisional
    ├── DhyriumDocumentModel
    └── Layout/Paint

Backend
├── DocumentGateway
├── DocumentSessionBroker
├── PermissionMapper
├── DurableSaveCoordinator
├── ImmutableVersionStore
├── Conversion/RenderService
├── FidelityHarness
├── AIOrchestrator
└── Audit/Telemetry
~~~

El DOCX/OOXML binario es canónico. `ReferenceRender` es PDF derivado para comparación, impresión o fallback seguro; nunca es el modelo editable.

### 24.2 Ownership

| Área | Dhyrium | Motor | Bridge |
|---|---|---|---|
| Usuarios, auth y workspace | dueño | no | mapea identidad |
| Archivo canónico y versiones | dueño | ensambla contenido | coordina save |
| Parsing OOXML | coordina/valida | bridge Dhyrium | preserva partes |
| Layout, paginado y pintura | dueño | runtime Dhyrium | expone estado |
| Caret, selección, input e IME | dueño | runtime Dhyrium | normaliza eventos |
| Imágenes, tablas, secciones, headers/footers | dueño | modelo Dhyrium | capability/comandos |
| Ribbon documental v1 | dueño | comandos Dhyrium | configura/integra |
| Backstage/repositorio | dueño | oculto, redirigido o ownership único | intercepta solicitudes |
| Undo/redo editorial | gobierna | runtime Dhyrium | transacciones |
| Comentarios y track changes | auditoría/permisos | modelo Dhyrium | eventos/mapeo |
| Colaboración | identidad/política | operación Dhyrium | sesión |
| IA | orquesta/protege | aplica comandos soportados | herramientas tipadas |
| PDF/miniaturas | solicita/almacena | renderer aislado | coordina |

El shell no inspecciona ni modifica el DOM interno del iframe. No convierte selección a HTML para reinsertarla. No mantiene un historial editorial paralelo al motor.

### 24.3 Contratos del motor

~~~ts
interface DocumentEngineProvider {
  createSessionConfig(input: SessionInput): Promise<EmbeddedEditorConfig>;
  terminateSession(sessionId: string): Promise<void>;
  getCapabilities(): EngineCapabilities;
}

interface EditorUiBridge {
  execute?(commandId: CommandId, payload?: unknown): Promise<CommandResult>;
  getCommandState?(commandId: CommandId): Promise<CommandState>;
  subscribeSelection?(listener: SelectionListener): Unsubscribe;
  subscribeDocumentState?(listener: DocumentStateListener): Unsubscribe;
  requestEngineSave?(reason: SaveReason): Promise<SaveRequestId>;
}
~~~

Cada capability se declara `required`, `optional` o `unsupported`. Si el bridge no expone un comando pero la UI nativa sí lo ejecuta, la función permanece bajo ownership nativo. Si tampoco existe en la UI nativa, se deshabilita con razón o se clasifica fuera de alcance; nunca se simula.

### 24.4 Selección y capacidades

~~~ts
type SelectionKind =
  | "none" | "caret" | "text" | "image" | "table" | "table-cell"
  | "header" | "footer" | "shape" | "chart" | "equation"
  | "hyperlink" | "comment" | "revision" | "unknown";

interface SelectionSnapshot {
  documentId: string;
  versionId: string;
  engineSessionId: string;
  editorEpoch: string;
  editorRevision: number;
  selectionGeneration: number;
  selectionToken: string;
  kind: SelectionKind;
  anchor?: EngineAnchor;
  contentHash?: string;
  capabilities: string[];
  freshness: "fresh" | "stale" | "unknown";
  capturedAt: string;
  expiresAt: string;
  singleUse: boolean;
}
~~~

`unknown` es preferible a inventar contexto. Las pestañas Dhyrium contextuales solo aparecen con selección fresca; las contextuales internas del motor siguen el estado propio del motor.

Un token se invalida ante nueva selección, mutación, undo/redo, cambio de modo/permiso, recarga, cambio de versión/epoch, pérdida de sesión, expiración o primer uso.

El `CapabilityManifest` registra comandos, estados, tipos de selección, modos, eventos, comentarios/revisión, objetos editables/preservados, exportación, accesibilidad y licencia/edición necesaria.

### 24.5 PaneCoordinator

El motor posee paneles editoriales; Dhyrium posee IA, metadata e historial. `paneCoordination` se clasifica:

- `full`: un panel derecho primario y restauración controlada;
- `observe-only`: IA usa columna exterior que redimensiona el iframe;
- `unsupported`: IA modal/floating no superpuesta o deshabilitada durante paneles editoriales.

Nunca se promete cerrar o coordinar un panel interno si el motor no expone esa capability. Todo cierre devuelve foco al disparador o a una selección válida.

### 24.6 Modo y permisos

`EditorMode = view | edit | review` controla presentación. `EffectivePermissions` controla editar, comentar, aceptar/rechazar, rellenar, copiar, descargar, imprimir, compartir y proteger.

Ambos derivan del backend/ACL y se firman en la configuración de sesión. Un selector visual, recarga del iframe o manipulación del cliente nunca eleva permisos. Cambiar modo no crea otro documento, no reimporta, no entra en PDF/HTML y no cambia la versión canónica.

### 24.7 Prohibición de falso editor híbrido

PROHIBIDO:

- PDF completo como fondo y texto editable encima;
- `Original / Editar` como dos motores editables; `Original` solo puede ser referencia protegida;
- `Editar en Dhyrium` si degrada el documento;
- DOCX complejo reconstruido completamente desde HTML;
- objetos avanzados sustituidos por SVG de demostración;
- ribbon Dhyrium que duplica comandos del motor sin estado/API real.

### 24.8 Decisión del motor

Dhyrium Writer es la única superficie canónica de edición. Conserva el original
protegido y recibe cada guardado como versión inmutable. Canvas Editor se usa
encapsulado como runtime provisional del perfil inicial; el modelo durable y el
bridge OOXML pertenecen a Dhyrium y no se basan en HTML/`altChunk`.

El gate mide:

- round-trip de 80–120 fixtures;
- carátula, imágenes flotantes, tablas, secciones, headers/footers, campos, comentarios, cambios y ecuaciones;
- selección y comandos reales;
- guardado/versionado;
- accesibilidad y foco editor/shell;
- aislamiento de navegador, compatibilidad, rendimiento y seguridad OOXML;
- concurrencia, capacidad y coste operativo;
- ownership de Archivo, Guardar como, Descargar e Imprimir;
- capability futura de selección/mutación tipada para IA como alcance P1.

El fixture de carátula debe permanecer visible y editable donde corresponda; el
DOCX exportado debe reabrir sin reparación en lectores independientes y las
partes desconocidas deben conservarse según perfil.

La arquitectura vigente se registra en `docs/architecture/DOCUMENT_EDITING_ARCHITECTURE.md`.

---

## 25. Fidelidad DOCX y OOXML

### 25.1 Prohibición central

Un DOCX complejo importado NO DEBE reconstruirse por completo desde HTML si contiene partes que podrían perderse.

La ruta actual:

~~~text
DOCX → Mammoth → HTML → Canvas
~~~

puede mantenerse únicamente para extracción, búsqueda, indexación o migración explícita de contenido básico. Nunca es el modelo de edición/guardado canónico de un DOCX importado.

### 25.2 Pipeline objetivo

~~~text
DOCX original inmutable
        ↓
Validación ZIP/OPC
        ↓
Inventario de partes y relaciones
        ↓
Manifiesto de compatibilidad
        ├── editable
        ├── parcial
        ├── preservado no editable
        ├── riesgoso
        └── bloqueante
        ↓
EngineSession sobre el OOXML canónico
        ├── parsing/modelo/layout/paginación
        ├── caret/selección/IME
        ├── objetos/contextuales/paneles
        ├── undo/redo/revisión
        └── edición
        ↓
Paquete OOXML ensamblado por el motor
        ↓
DurableSaveCoordinator
        ↓
Blob y versión inmutables + CAS
        ↓
Validación OPC
        ↓
Render/diff/inventario de partes
        ↓
Reapertura en motor y Word
~~~

Cada feature se clasifica `must-edit`, `must-display`, `opaque-preserve`, `semantic-preserve`, `allowed-rewrite` o `unsupported-reject`. El motor no se aprueba si pierde silenciosamente contenido P0 o partes del perfil de preservación.

### 25.3 Partes que deben preservarse

- [Content_Types].xml;
- relaciones;
- partes desconocidas;
- imágenes;
- temas;
- estilos;
- numeración;
- headers;
- footers;
- secciones;
- DrawingML;
- AlternateContent;
- VML;
- campos;
- comentarios;
- notas;
- track changes;
- ecuaciones;
- charts;
- custom XML cuando sea seguro;
- propiedades;
- VBA en DOCM sin ejecución.

### 25.4 Exportación

- Documentos nacidos en Dhyrium pueden usar el motor/generador aprobado.
- Documentos importados permanecen en el pipeline binario del motor seleccionado.
- Dhyrium no reconstruye el paquete desde HTML ni parchea OOXML arbitrariamente fuera de herramientas especializadas y probadas.
- Partes `opaque-preserve` conservan bytes/checksum cuando no fueron modificadas; `semantic-preserve` puede normalizar XML sin perder significado/relaciones.
- Si no es posible guardar sin pérdida, bloquear sobrescritura.
- Ofrecer Guardar una copia con informe de compatibilidad.
- Cada export registra `sourceVersionId`, hash, opciones, motor/renderizador y estado de markup; nunca parte de memoria del iframe ni de un save pendiente.

### 25.5 Vista fiel

Una conversión aislada del renderer Dhyrium/independiente → PDF → PDF.js puede
mantenerse como vista fiel auxiliar cuando:

- se identifica el renderer;
- se deshabilitan macros;
- se aísla el proceso;
- se registra checksum;
- se distingue claramente de la edición.

Vista fiel no significa edición fiel.

Microsoft Word no forma parte de este pipeline de ejecución.

---

## 26. Corpus DOCX y round-trip

Corpus dorado:

- documento de una página;
- carátula con formas e imágenes ancladas;
- carátula del proyecto proporcionada por el usuario;
- fixture prioritario observado: 02.02.02D.BLOQUE B.DOCX;
- el estado actual muestra 75 páginas; H00 debe confirmar el número esperado en Word 2607 y registrar el resultado, sin convertir 75 en constante hasta validarlo;
- documento de 75 páginas;
- documento de 150 páginas;
- documento de 300 páginas;
- tablas simples y complejas;
- celdas combinadas;
- estilos;
- listas multinivel;
- secciones;
- columnas;
- orientación mixta;
- headers y footers;
- numeración de página;
- tabla de contenido;
- campos;
- notas al pie y final;
- citas;
- bibliografía;
- referencias cruzadas;
- ecuaciones;
- imágenes inline y flotantes;
- cuadros de texto;
- WordArt;
- formas;
- gráficos;
- comentarios;
- control de cambios;
- VML;
- AlternateContent;
- DOCM.

Protocolo por archivo:

1. validar paquete original;
2. registrar checksum;
3. abrir;
4. renderizar;
5. comparar con Word;
6. editar una función soportada;
7. guardar;
8. reabrir en Dhyrium;
9. reabrir en Word o renderer de referencia;
10. verificar cambio;
11. verificar contenido no editado;
12. validar paquete exportado;
13. comparar partes desconocidas;
14. verificar persistencia backend;
15. guardar evidencia.

Una carátula que desaparece o se reordena bloquea la certificación.

---

## 27. Menú Archivo y backend local

### 27.1 Funciones

- Nuevo;
- plantillas locales;
- Abrir;
- Recientes;
- ubicaciones;
- Guardar;
- Guardar como;
- autosave;
- historial;
- restaurar;
- recuperación de sesión;
- Información;
- permisos;
- compatibilidad;
- exportar DOCX;
- exportar PDF;
- imprimir;
- compartir;
- cerrar;
- opciones.

### 27.2 Modelo backend

Debe incluir:

- DocumentId;
- VersionId;
- revision;
- versión inmutable;
- checksum SHA-256;
- nombre original;
- MIME;
- tamaño;
- tipo DOCX o DOCM;
- paquete original;
- manifiesto OPC;
- modelo editable;
- delta;
- exportación;
- renderer;
- compatibilidades;
- autor;
- fechas;
- estado de borrador;
- estado de conflicto.
- BlobId y ubicación inmutable;
- EditorSessionId y `session_expected_version_id`;
- SaveAttemptId, secuencia, hash y expectedVersionId;
- estado `accepted-durable/validating/quarantined/committed/conflict/failed`;
- VersionReceipt;
- engine/version/config/licencia;
- lineage de exportación.

### 27.3 Guardado

- atómico;
- esperado mediante expectedRevision;
- respuesta 409 en conflicto;
- reintento controlado;
- cola de autosave;
- recuperación de fallo;
- nunca sobrescribir silenciosamente una revisión nueva.
- separar `EditorSessionState` de `SaveAttemptState`;
- permitir múltiples guardados por sesión y avanzar `session_expected_version_id` tras cada commit;
- serializar saves por `document.key`/lock;
- distinguir colaboradores de una misma sesión de conflictos con sesiones externas;
- `Guardado` solo después de `VersionReceipt committed`.

### 27.4 PostgreSQL y almacenamiento

- PostgreSQL local es requisito de H01-J;
- el Compose real debe verificarse;
- metadatos en PostgreSQL;
- binarios en volumen local o almacenamiento aprobado;
- backups consistentes;
- restauración probada;
- health checks;
- volúmenes nombrados;
- secretos fuera del repositorio.

Decisión pendiente:

El estándar backend observado usa Prisma db push y puede no permitir migration files sin autorización. Registrar DEC-DB-001 antes de cambiar esta política.

DEC-DB-001 debe resolver:

- compatibilidad con la instalación existente;
- puerto y volumen;
- estrategia Prisma db push o migraciones;
- transición de datos;
- rollback;
- secretos;
- backup y restauración;
- convivencia temporal con una base externa si existe;
- recuperación sin pérdida.

### 27.5 Consistencia entre PostgreSQL y archivos

Guardar metadatos en PostgreSQL y binarios en un volumen requiere un protocolo explícito:

1. escribir archivo temporal;
2. validar tamaño y checksum;
3. sincronizar cuando el sistema lo requiera;
4. crear registro pendiente dentro de una transacción;
5. renombrar el archivo de forma atómica;
6. confirmar versión y estado;
7. usar outbox o reconciliador ante caídas;
8. detectar y limpiar huérfanos;
9. no publicar la versión hasta que DB y archivo sean coherentes.

### 27.5.1 Frontera de ACK y cierre

- La API de guardado valida el paquete, persiste blob/versión y resuelve CAS antes de responder éxito; `VersionReceipt` identifica la versión committed.
- Un callback con ACK breve solo se confirma después de crear blob inmutable y versión `accepted-durable` recuperable con identidad propia.
- Si validación posterior falla, los bytes permanecen recuperables como `quarantined/conflict/failed`; nunca quedan solo como diagnóstico volátil.
- El shell no muestra `Guardado` mientras el estado sea `accepted-durable`, `validating` o `background-saving`.
- Cerrar sigue `close-intent → flush/request → engine close → durable receipt o background-save registrado → release session`.
- Callbacks tardíos se correlacionan por sesión, secuencia, expected version y hash; nunca sobrescriben una cabeza más nueva.

### 27.6 Autorización

Autenticación no sustituye autorización.

Cada operación debe comprobar:

- pertenencia a tarea o proyecto;
- rol;
- permiso de lectura;
- permiso de edición;
- permiso de restauración;
- permiso de compartir;
- permiso de exportar cuando aplique.
- permiso de comentar;
- permiso de aceptar/rechazar cambios;
- permiso de rellenar formularios;
- permiso de copiar, descargar e imprimir;
- permiso de proteger.

`EditorMode` no equivale a permisos. `EffectivePermissions` deriva del backend/ACL y se firma en la sesión del motor; cambiar UI o recargar iframe no puede elevar autoridad.

### 27.7 Arquitectura backend

Nuevas capacidades deben seguir el estándar modular:

- src/modules/nombre-kebab-case;
- rutas;
- schemas Zod en boundary;
- controller;
- service;
- acceso Prisma;
- wiring explícito;
- sin barrels si las reglas lo prohíben;
- contratos API conservados.

---

## 28. Seguridad documental

Validaciones:

- firma ZIP;
- estructura OPC;
- Content Types;
- relaciones;
- tamaño comprimido;
- tamaño expandido;
- ratio de compresión;
- cantidad de entradas;
- profundidad;
- nombres de ruta seguros;
- path traversal;
- archivos duplicados;
- XML malformado;
- entidades externas deshabilitadas;
- vínculos externos;
- macros;
- objetos incrustados;
- contenido activo;
- timeouts;
- límites de memoria.

Reglas:

- macros preservadas como bytes, jamás ejecutadas;
- renderer aislado;
- Word COM con macros deshabilitadas;
- LibreOffice fallback identificado;
- nombres generados por servidor;
- uploads registrados;
- limpieza y retención definidas;
- no registrar contenido documental en logs;
- diagnósticos de contenido solo bajo consentimiento;
- exportaciones temporales eliminadas de forma segura.

---

## 29. Comentarios, revisión y colaboración

Comentarios modernos:

- borrador;
- publicar;
- responder;
- resolver;
- reabrir;
- eliminar;
- navegar;
- panel derecho;
- anclaje al rango;
- autor;
- fecha;
- persistencia;
- permisos.

Ctrl+Enter puede publicar cuando la referencia y accesibilidad lo permitan.

Control de cambios:

- inserciones;
- eliminaciones;
- formato;
- autor;
- fecha;
- mostrar marcas;
- aceptar;
- rechazar;
- navegación;
- persistencia;
- exportación OOXML.

Colaboración:

- solo se habilita si el backend soporta presencia y permisos;
- no simular coautoría;
- conflictos se muestran;
- @mentions requieren un directorio autorizado;
- si no existe, se deshabilitan con razón.

---

## 30. Copilot, asistente y servicios conectados

Copilot no es función universal P0.

En la referencia:

- depende de licencia;
- depende de cuenta y políticas;
- puede cambiar por despliegue;
- puede aparecer como botón dinámico en el documento;
- no debe fijarse como pestaña universal.

Dhyrium puede desarrollar un asistente propio como P1:

- nombre e identidad Dhyrium;
- feature flag;
- permisos;
- backend disponible;
- privacidad explícita;
- no entrenar con contenido sin permiso;
- acciones propuestas, no ejecutadas silenciosamente;
- historial auditable;
- capacidad de deshacer;
- deshabilitado con explicación si no está disponible.

La IA usa `AiSemanticToolRegistry`, nunca DOM, Canvas ni HTML convertido. Herramientas candidatas:

- `get_document_outline`;
- `get_selection`;
- `read_range`;
- `replace_selection`;
- `apply_style`;
- `insert_table_rows`;
- `set_image_alt_text`;
- `add_comment`;
- `create_suggestion`;
- `navigate_to_object`;
- `request_save`.

Flujo:

~~~text
SelectionToken fresco
→ plan tipado
→ validar permiso/capability/versión
→ preview cuando sea material
→ revalidar token
→ begin/apply/verify/commit o rollback
→ VersionReceipt y auditoría
~~~

Si el motor no ofrece transacción fiable, la IA opera sobre una copia/sesión clonada y solo promueve un resultado verificado. Ninguna cadena queda parcialmente aplicada en la versión principal. La aceptación mide ausencia de cambios semánticos no autorizados mediante allowlist de partes/objetos, diff estructural y tolerancia visual.

H00/H01 inventarían de forma exploratoria la capability del bridge. Si existe acceso seguro, pueden probar una mutación tipada reversible sin habilitarla como producto; si no existe, IA se clasifica `unsupported` para P1 y el motor no se rechaza por ese único motivo. El primer flujo IA de producto pertenece a H10-P1-H y exige `SelectionSnapshot` fresco, transacción o clon promovible, verificación, `VersionReceipt` y auditoría.

No copiar nombre, icono ni marca Copilot.

---

## 31. Rendimiento

Medir:

- apertura;
- primera página visible;
- latencia de escritura;
- respuesta de comandos;
- cambio de pestaña;
- apertura de menús;
- layout de cinta;
- scroll;
- memoria;
- guardado;
- reapertura;
- exportación;
- renderizado de vista fiel.

Corpus:

- 1 página;
- 10 páginas;
- 75 páginas;
- 150 páginas;
- 300 páginas.

Presupuestos provisionales:

- respuesta visual de comando: p95 menor o igual a 100 ms;
- cambio de pestaña: p95 menor o igual a 100 ms;
- eco de escritura: p95 menor o igual a 50 ms;
- no congelar el hilo principal más de 100 ms sin diagnóstico;
- no regresión mayor al 10 % respecto de la línea base aprobada.

Estos valores se ajustan tras obtener una línea base reproducible.

Cada medición debe registrar:

- CPU;
- RAM;
- GPU;
- versión del navegador;
- modo de energía;
- build frontend y backend;
- fixture exacto;
- tamaño en bytes;
- páginas;
- ejecución cold o warm;
- caché;
- cantidad de iteraciones;
- percentiles;
- memoria inicial y máxima;
- desviación;
- responsable y motivo de cualquier cambio de presupuesto.

Workers y virtualización pueden usarse si:

- no cambian paginación;
- no pierden contenido;
- no rompen selección;
- no impiden búsqueda;
- no degradan accesibilidad.

---

## 32. Estrategia de pruebas

### 32.1 Estáticas

Las comprobaciones de registro, iconos y `execute` de esta sección aplican a `uiOwner=Dhyrium`. Para `uiOwner=motor`, se sustituyen por consistencia de `CapabilityManifest`, configuración del proveedor, API/eventos disponibles, automatización observable y evidencia; nunca por acceso forzado al DOM interno.

- IDs únicos;
- control ↔ comando;
- comando ↔ matriz;
- comando ↔ prueba;
- icono ↔ IconRegistry;
- KeyTips sin conflicto;
- prohibición de no-op;
- prohibición de Lucide en cinta;
- prohibición de emoji;
- todas las variantes por grupo;
- ninguna pestaña sin definición aprobada;
- ninguna acción habilitada sin execute.

### 32.2 Unitarias

Las unitarias siguientes cubren componentes y adaptadores Dhyrium. La UI nativa se cubre con pruebas de contrato del provider, integración y caja negra.

- canExecute;
- disabledReason;
- active;
- mixed;
- currentValue;
- pending;
- transacciones;
- undo/redo;
- layout;
- histéresis;
- contexto;
- combinaciones de pestañas contextuales;
- foco;
- KeyTips;
- preferencias;
- guardado.

### 32.3 Componentes

- botones;
- toggles;
- split buttons;
- menús;
- comboboxes;
- galerías;
- color pickers;
- dialog launchers;
- grupo colapsado;
- overflow;
- paneles;
- Message Bars.

### 32.4 API e integración

- persistencia;
- expectedRevision;
- 409;
- versiones;
- restauración;
- autorización;
- upload;
- checksum;
- preview;
- exportación;
- recuperación;
- backup.

### 32.5 Playwright

Para `uiOwner=motor`, Playwright prueba flujos de usuario mediante APIs soportadas, teclado, foco, eventos y evidencia visual. No depende de selectores privados ni rompe el aislamiento de un iframe cross-origin; cuando el DOM no es accesible, la prueba se combina con contratos del provider y automatización de caja negra.

- autenticación hermética;
- fixture estable;
- cada pestaña;
- cada grupo;
- comando representativo por familia;
- menús;
- galerías;
- paneles;
- contextuales;
- mini toolbar;
- Alt/F10;
- Ctrl+F1;
- F6;
- Alt+Q;
- temas;
- densidades;
- resoluciones;
- zoom;
- guardar y recargar;
- cero errores de consola;
- cero 4xx/5xx inesperados;
- cero scroll horizontal global.

### 32.6 Accesibilidad

- axe o equivalente;
- Accessibility Insights;
- lector de pantalla;
- teclado;
- contraste;
- foco;
- 200 %;
- 400 %;
- alto contraste;
- reduced motion;
- touch.

Ningún hallazgo automatizado serious o critical puede quedar abierto. La ausencia de hallazgos en axe no demuestra por sí sola conformidad WCAG 2.2 AA.

Si la UI nativa vive en un iframe aislado, axe del shell no la certifica. Debe probarse además con teclado real, Narrator/NVDA, alto contraste y el protocolo de accesibilidad soportado por el proveedor.

La puerta requiere además:

- cero incumplimientos AA conocidos;
- pruebas manuales de teclado;
- foco;
- lector de pantalla;
- zoom y reflow;
- alto contraste;
- excepciones documentadas y aprobadas.

### 32.7 DOCX

- validez ZIP/OPC;
- manifiesto;
- round-trip;
- checksum de partes;
- Word/renderer;
- PDF;
- contenido no editado;
- macros preservadas y no ejecutadas.

### 32.8 Visuales

- capturas deterministas;
- same OS/fonts/DPI;
- lado a lado;
- overlay;
- geometría;
- clipping;
- overflow;
- revisión humana.

### 32.9 Edición unificada y fidelidad editable

Fixture principal: el DOCX real de la carátula proporcionada por el usuario.

Apertura:

1. abrir el DOCX;
2. comprobar que no aparece “Editar en Dhyrium”;
3. comprobar que no aparece selector “Original / Editar”;
4. confirmar una sola superficie;
5. confirmar la cantidad esperada de páginas según el fixture congelado;
6. confirmar carátula, logos, imágenes, formas, tablas, encabezados y pies;
7. confirmar que el texto compatible tiene caret y selección;
8. confirmar cero texto duplicado;
9. confirmar cero superposición nueva;
10. confirmar cero barra amarilla injustificada.

Edición:

- editar un título de la carátula;
- editar un párrafo normal;
- editar una celda de tabla;
- seleccionar una imagen y ejecutar al menos una operación declarada `must-edit` V1, como tamaño, reemplazo, posición o texto alternativo;
- editar contenido compatible de un encabezado o pie;
- aplicar formato desde la cinta;
- undo;
- redo;
- comprobar reflow localizado;
- comprobar que objetos no relacionados no se desplazan.

Modo:

- cambiar Edición → Revisión → Visualización → Edición;
- conservar DocumentId y VersionId;
- conservar página, zoom y scroll;
- no reimportar;
- no crear versión;
- no cambiar geometría.

Guardado:

~~~text
abrir
→ editar
→ guardar
→ cerrar
→ reabrir Dhyrium
→ renderizar
→ abrir el DOCX resultante en Word de referencia
~~~

Comprobar:

- cambios persistentes;
- Word no solicita reparación;
- carátula intacta;
- partes no tocadas intactas;
- relaciones válidas;
- objetos preservados presentes;
- tipo DOCX/DOCM sin cambio silencioso;
- macros preservadas y no ejecutadas.

Comparación:

- Word original;
- Dhyrium recién abierto y editable;
- Dhyrium después de editar;
- Word después de guardar.

Medir por página, región y objeto. Un porcentaje global de píxeles no puede ocultar la desaparición de una carátula o imagen.

### 32.10 Aplicabilidad por objetivo

No todas las pruebas aplican a todos los subobjetivos. Cada ficha de ejecución debe completar:

| Gate | Valor permitido |
|---|---|
| build frontend | obligatorio / no aplica |
| lint frontend | obligatorio / no aplica |
| build backend | obligatorio / no aplica |
| unitarias | comando exacto / no aplica |
| integración | comando exacto / no aplica |
| Playwright | spec exacta / no aplica |
| accesibilidad | escenarios / no aplica |
| visual | evidenceIds / no aplica |
| DOCX | fixtures exactos / no aplica |
| backend | endpoints y fixtures / no aplica |
| rendimiento | protocolo / no aplica |

No se permite escribir “no aplica” sin justificación.

Comandos observados que deben confirmarse en package.json antes de usarse:

~~~powershell
npm run lint
npm run build
npm run test:e2e
npm run test:task-documents
npm run test:task-document-preview
~~~

El plan no inventa nombres de scripts. Cada ficha registra el comando real descubierto y su carpeta de trabajo. Las pruebas task-documents y task-document-preview deben incorporarse al comando agregado backend cuando el hito correspondiente lo apruebe.

---

## 33. Puertas bloqueantes

Una sola falla bloquea el cierre:

### FID-OPEN

- una sola UnifiedDocumentSession;
- una sola superficie;
- carátula presente;
- páginas esperadas según fixture;
- objetos P0 visibles;
- cero duplicación;
- cero pérdida;
- incompatibilidades identificadas;
- sin botón “Editar en Dhyrium” en un documento editable.

### FID-EDIT

- caret y selección;
- texto compatible de cuerpo y carátula editable en su posición;
- una celda de tabla editable y persistente;
- imagen básica seleccionable y con al menos una operación `must-edit` V1 verificada;
- contenido compatible de encabezado o pie editable y persistente;
- comandos reales bajo ownership del motor o de Dhyrium, sin duplicación;
- estados de cinta nativa observables o estados Dhyrium verificados según `uiOwner`;
- undo/redo;
- reflow localizado;
- objetos preservados no se desplazan;
- no cambiar al editor HTML.

### FID-SAVE

- paquete OPC válido;
- lectores OOXML independientes abren sin reparación;
- edición persiste;
- partes desconocidas intactas;
- original recuperable;
- conflicto no sobrescribe;
- sin conversión destructiva;
- cada guardado tiene `saveAttemptId`, secuencia, hash, cabeza esperada y `VersionReceipt`;
- una sesión admite múltiples guardados y vuelve a `ACTIVE` después de cada commit;
- `session_expected_version_id` avanza atómicamente y los guardados de la misma sesión se serializan;
- la API no devuelve éxito ni `VersionReceipt` antes del commit durable;
- un callback solo recibe ACK positivo cuando los bytes constituyen una versión durable y recuperable;
- `Guardado` solo se muestra al recibir el receipt `committed` correspondiente;
- cerrar ejecuta flush, cierre del motor y espera de receipt o registra un background-save recuperable;
- exportar e imprimir parten exclusivamente de un `sourceVersionId` committed.

### FID-VISUAL

- geometría dentro de tolerancias aprobadas;
- ningún elemento principal desaparece;
- cero superposición adicional;
- carátula comparable;
- evidencia antes/después por región.

### FID-UX

- sin “Original / Editar” como dos representaciones;
- sin “Editar en Dhyrium” en el flujo normal;
- Edición/Revisión/Visualización comparten sesión;
- Vista fiel es auxiliar;
- sin barra amarilla normal;
- mismo zoom, scroll y página;
- fallback seguro con causa exacta.

Fallas globales:

- dos representaciones primarias del mismo documento;
- botón “Editar en Dhyrium” en el flujo normal;
- selector “Original / Editar” que cambia de motor;
- página presentada como PDF, imagen o iframe de solo lectura/previsualización sin edición documental real; solo el `EditorHost` Dhyrium puede ser la superficie editable canónica;
- desaparición de objetos al entrar en Edición;
- variación injustificada del número de páginas al cambiar de modo;
- reimportación o creación de versión por cambiar Edición/Revisión/Visualización;
- cinta habilitada sobre contenido que no puede recibir comandos;
- fallback HTML presentado como edición fiel;
- build frontend fallido;
- build backend fallido cuando aplica;
- test fallido;
- error no controlado;
- error de consola;
- 4xx o 5xx inesperado;
- icono ausente;
- icono de familia incorrecta;
- acción no-op;
- placeholder presentado como real;
- control habilitado sin acción;
- pérdida de contenido;
- pérdida de parte OOXML desconocida;
- barra amarilla injustificada;
- scroll horizontal global;
- clipping;
- solapamiento;
- menú fuera del viewport;
- foco perdido;
- regresión en abrir;
- regresión en editar;
- regresión en undo/redo;
- regresión en guardar;
- regresión en reabrir;
- ACK positivo antes de persistencia durable;
- mensaje `Guardado` antes del `VersionReceipt` committed;
- callback final perdido al cerrar;
- exportación o impresión desde memoria del iframe o un guardado pendiente;
- segundo guardado de una sesión en conflicto con su propia cabeza;
- token de selección IA vencido, reutilizado o perteneciente a otra revisión;
- mutación IA parcial sin rollback o promoción atómica;
- accesibilidad serious o critical;
- autorización incorrecta;
- macro ejecutada;
- evidencia faltante;
- matriz desactualizada.

---

## 34. Hitos y dependencias

El pipeline OOXML, el modelo documental y el almacenamiento se construyen antes de las pestañas avanzadas. Así se evita implementar formas, gráficos, campos o comentarios sobre una conversión HTML que después tendría que reescribirse.

~~~text
H00 Referencia, perfil, decisiones, threat model y harness
 ↓
H01-WEB Motor Dhyrium, DocumentSession, OOXML y backend
 ↓
H02 Runtime de cinta e Inicio sobre la sesión unificada
 ↓
H03 Encabezado, Backstage, autosave, versiones y conflictos
 ↓
H04 Insertar, Dibujar y contextuales por objeto
 ↓
H05 Diseño, Disposición y secciones
 ↓
H06 Referencias y Correspondencia
 ↓
H07 Revisar, Vista, Ayuda, comentarios y paneles
 ↓
H08 Round-trip completo y corpus DOCX
 ↓
H09 Auditoría WCAG, rendimiento, seguridad y estabilidad
 ↓
H10 Calificación interna P0 y ventajas Dhyrium opcionales
~~~

### H00 — Referencia, perfil, ADRs, threat model y harness

Prerrequisito externo:

- el usuario debe proporcionar acceso a una máquina o capturas verificables de Word 2607 build 20228.20158;
- debe existir licencia y perfil identificados;
- las capturas deben incluir metadatos;
- las capturas antiguas o de Word 2021 no se presentan como Word 2607;
- si la máquina no está disponible, puede avanzarse en inventario y harness, pero la validación visual queda bloqueada y no se declara paridad.

Subobjetivos:

- H00-A: aprobar protocolo y disponibilidad de la máquina de referencia;
- H00-B: congelar producto, perfil y variantes;
- H00-C: capturar superficies;
- H00-D: medir geometría y tokens;
- H00-E: clasificar todos los comandos por capacidad;
- H00-F: completar catálogos y denominador;
- H00-G: definir spec/*.json como fuente canónica;
- H00-H: aprobar DEC-DOC, DEC-OOXML, DEC-DB, DEC-AUTH, DEC-STORAGE y DEC-MACRO;
- H00-I: crear threat model mínimo antes de uploads y renderers;
- H00-J: crear harness visual, evidencia y validaciones 1:1;
- H00-K: registrar OBS-EDIT-001/002/003 y congelar el DOCX de carátula;
- H00-L: validar apertura, edición, guardado y reapertura con Dhyrium Writer en navegador;
- H00-M: evaluar selección segura y una mutación tipada reversible para futuras superficies/IA;
- H00-N: validar ownership de Archivo/Guardar como/Descargar/Imprimir y la política de HTTPS.

Puerta:

- baseline aprobado o bloqueo externo explícito;
- perfil de navegadores, fuentes y capacidades locales;
- denominador P0;
- fuente de verdad única;
- decisiones bloqueantes;
- threat model mínimo;
- decisión del motor basada en la carátula real, compatibilidad de navegador, guardado y reapertura;
- capability de selección/IA evaluada; si no existe bridge seguro se clasifica `unsupported` para P1 y ello no rechaza por sí solo al motor P0;
- ownership de acciones nativas conflictivas demostrado sin eludir ACL/repositorio;
- capturas y JSON disponibles cuando exista la máquina;
- pruebas de consistencia verdes.

### H01-WEB — Motor web Dhyrium, sesión, OOXML y backend

Entrada:

- decisiones H00 aprobadas;
- arquitectura Dhyrium Native validada mediante el fixture real;
- threat model mínimo;
- contratos de documento y transacción.

Subobjetivos:

- H01-A: hacer `DhyriumWriterWorkspace` la única superficie web editable;
- H01-B: vault de originales, blobs y versiones inmutables;
- H01-C: inspector ZIP/OPC con límites previos a descompresión, manifiesto de
  partes/relaciones y clasificación de contenido activo/externo;
- H01-D: `DocumentGateway`, ACL y autorización contextual por tarea/documento;
- H01-E: encapsular Canvas detrás de un adapter y definir
  `DhyriumDocumentModel`, `DocumentSession` y `CommandBus` tipados;
- H01-F: transacciones atómicas, undo/redo y `SelectionSnapshot` coherente;
- H01-G: FSM separadas de `DocumentSession` y `SaveAttempt`;
- H01-H: `accepted-durable`, frontera autoritativa de ACK y `VersionReceipt`;
- H01-I: CAS, guardados sucesivos, conflictos, ramas y cierre asíncrono;
- H01-J: PostgreSQL local/volumen, staging, sweeper, backup y restore;
- H01-K: una sola superficie editable, sin preview PDF presentado como editor ni
  sesión Office paralela;
- H01-L: `CapabilityManifest` del perfil `DHYRIUM-WEB-CORE-1`;
- H01-M: importador OOXML incremental con preservación de partes desconocidas;
- H01-N: exportador OOXML nativo sin `altChunk` y renderer aislado;
- H01-O: modos y `EffectivePermissions` firmados por backend;
- H01-P: macros/ActiveX/OLE deshabilitados y relaciones externas neutralizadas;
- H01-Q: vertical slice texto + párrafo + imagen básica + tabla/celda +
  encabezado/pie + cinta ejecutable + guardar/cerrar/reabrir;
- H01-R: corpus Tier A incremental, preservación estructural y comparación visual.

Puerta:

- una sola sesión, una sola cabeza durable y una sola superficie editable;
- edición directa en Dhyrium sin Office, WebDAV ni otro editor externo;
- ausencia de selector entre motores o de preview presentado como editor;
- cada control habilitado muta el documento y tiene undo/redo comprobado;
- carátula, logos, imágenes, formas, tablas, encabezados y pies visibles;
- texto, imagen, tabla y encabezado/pie seleccionables/editables según perfil;
- modos sin reimportación ni cambio de layout;
- objetos incompatibles preservados y bloqueados, no desaparecidos;
- original, blobs, versiones y checksums persistidos;
- paquete validado;
- manifiesto generado;
- partes desconocidas preservables;
- guardado DB/archivo recuperable, multi-save y cierre tardío;
- la API no responde guardado antes del commit durable y su recibo;
- autorización real;
- topología local comprobada;
- ninguna macro ejecutada;
- selección/capabilities sin invención cuando el provider las exponga; la falta de bridge IA se registra como `unsupported` P1;
- ninguna acción nativa elude repositorio/ACL;
- FID-OPEN y FID-SAVE aprobadas;
- criterios documentales/del motor de FID-EDIT, FID-VISUAL y FID-UX aprobados; estados de cinta, KeyTips y shell se cierran en H02/H03.

### H02 — Runtime de comandos e Inicio según estrategia UI

Entrada:

- H00 con catálogo, fuentes, comandos, geometría y gates aplicables;
- H01 con motor, capabilities, selección y sesión unificada;
- inventario Inicio aprobado;
- estrategia de UI nativa Dhyrium aprobada.

Subobjetivos:

- H02-A: verificar/configurar Inicio Dhyrium y su inventario;
- H02-B: mapear comandos/capabilities/estados a la matriz;
- H02-C: conectar `CommandRegistry` transaccional con el modelo documental;
- H02-D: probar Portapapeles, Fuente, Párrafo, Estilos y Edición en Dhyrium;
- H02-E: validar estado enabled/active/mixed/value, undo y persistencia;
- H02-F: teclado, KeyTips, tooltips, foco editor/shell y lector;
- H02-G: responsive y geometría de la UI Dhyrium integrada;
- H02-H: crear runtime declarativo para el subconjunto P0 demostrado;
- H02-I: implementar RibbonLayoutEngine, iconos, tokens, temas y overflow;
- H02-J: evidencia, regresión Tier A y cierre.

Puerta:

- Inicio 100 % inventariado dentro de su perfil;
- la cinta actúa sobre la página visible y editable;
- comandos deshabilitados explican su razón;
- acciones reales;
- estado mixto;
- undo y persistencia;
- sin no-op;
- ninguna ribbon Dhyrium duplica la del motor;
- si existe superficie Dhyrium, usa iconografía/tokens aprobados y cero Lucide/Unicode en esa superficie;
- cero scroll horizontal global;
- build, pruebas y capturas aplicables.

### H03 — Encabezado, Backstage y persistencia de usuario

Entrada:

- H01 documental y backend operativo;
- H02 estrategia UI y runtime de comandos verificados;
- contratos de documento, versión y almacenamiento;
- especificación del shell H00.

Subobjetivos:

- H03-A: encabezado y estados;
- H03-B: barra de acceso rápido;
- H03-C: búsqueda Alt+Q;
- H03-D: Backstage visual;
- H03-E: Nuevo, Abrir, Guardar y Guardar como;
- H03-F: autosave y conflictos;
- H03-G: recientes, historial y recuperación;
- H03-H: exportar e imprimir;
- H03-I: compartir según capacidad;
- H03-J: opciones y preferencias;
- H03-K: verificar que el encabezado y Backstage nuevos no reintroduzcan “Original / Editar”, “Editar en Dhyrium” ni la franja primaria “Documento original”, cuya retirada efectiva pertenece a H01-K;
- H03-L: implementar selector único Edición/Revisión/Visualización;
- H03-M: mensajes separados para permisos, compatibilidad, protección y conflicto.
- H03-N: ocultar/redirigir acciones nativas conflictivas o conservar ownership único del motor;
- H03-O: lineage de export/print desde `sourceVersionId` committed;
- H03-P: cierre con flush, receipt o background-save recuperable.

Puerta:

- operaciones reales conectadas;
- estados honestos;
- guardado y reapertura;
- conflicto 409;
- historial y restauración;
- recuperación;
- permisos;
- cambiar de modo no crea versión, no reimporta y no cambia layout;
- ningún comando Archivo elude ACL/repositorio ni duplica ownership;
- export/print nunca parten de memoria del iframe o save pendiente;
- cerrar no pierde callback final ni anuncia Guardado antes del receipt;
- visual y teclado verificados.

### H04 — Insertar, Dibujar y contextuales por objeto

Entrada:

- motor, vault, guardado durable y exportación conservadora H01;
- runtime H02;
- estrategia UI aprobada;
- Tier A del corpus verde.

Subobjetivos separados:

- H04-A: Páginas, tablas, vínculos y símbolos básicos;
- H04-B: Imagen;
- H04-C: Forma y cuadro de texto;
- H04-D: Gráfico;
- H04-E: SmartArt como modelo real o preserved-not-editable;
- H04-F: Modelos 3D según clasificación;
- H04-G: Dibujar y tinta;
- H04-H: Diseño y Disposición de tabla;
- H04-I: Formato de imagen;
- H04-J: Formato de forma;
- H04-K: Diseño y Formato de gráfico;
- H04-L: Encabezado, pie y ecuación;
- H04-M: combinaciones contextuales y evidencia;
- H04-N: incorporar cada fixture afectado al corpus regresivo permanente.

El motor conserva ownership de sus pestañas contextuales nativas. `ContextualTabController` solo gobierna superficies Dhyrium aprobadas por ADR; no duplica ni intenta reconstruir el estado interno del motor. Cada objeto tiene selección, comandos, persistencia, undo y exportación verificables según su `CapabilityManifest`.

Puerta:

- ningún recurso de demostración se presenta como función;
- contextuales solo por selección;
- objetos persistentes;
- reapertura;
- exportación sin pérdida de partes ajenas;
- pruebas por tipo de objeto;
- Tier A y fixtures afectados verdes en cada merge;
- ninguna contextual nativa duplicada por el shell.

### H05 — Diseño, Disposición y secciones

Entrada:

- modelo de documento y secciones H01;
- objetos H04 cuando sean afectados por Organizar.

Subobjetivos:

- H05-A: temas y formato documental;
- H05-B: fondo de página;
- H05-C: márgenes, tamaño y orientación;
- H05-D: columnas, saltos y secciones;
- H05-E: guiones y números de línea;
- H05-F: sangría y espaciado;
- H05-G: posición, ajuste y capas;
- H05-H: alinear, agrupar y girar.

Puerta:

- cambios en modelo real;
- paginación consistente;
- undo;
- guardado y reapertura;
- exportación y evidencia.

### H06 — Referencias y Correspondencia

Entrada:

- modelo de campos aprobado;
- pipeline conservador;
- secciones y paginación.

Subobjetivos:

- H06-A: infraestructura de campos básicos;
- H06-B: tabla de contenido;
- H06-C: notas al pie y final;
- H06-D: referencias cruzadas y numeración;
- H06-E: citas, fuentes y bibliografía;
- H06-F: títulos, tablas e índices;
- H06-G: modelo de destinatarios;
- H06-H: campos de combinación y reglas;
- H06-I: filtros y vista previa;
- H06-J: finalizar y combinar.

Puerta:

- campos dinámicos;
- actualización controlada;
- persistencia;
- destinatarios y permisos;
- salida verificable;
- DOCX válido.

### H07 — Revisar, Vista, Ayuda, comentarios y paneles

Entrada:

- `PaneCoordinator` y su capability `full | observe-only | unsupported`;
- modelo de anotaciones y revisiones;
- persistencia y autorización.

Subobjetivos:

- H07-A: sistema de paneles;
- H07-B: comentarios modernos;
- H07-C: control de cambios;
- H07-D: revisión e idioma;
- H07-E: accesibilidad del documento;
- H07-F: comparar y proteger;
- H07-G: vistas y movimiento de página;
- H07-H: navegación, zoom y ventanas aplicables;
- H07-I: Ayuda Dhyrium;
- H07-J: mini toolbar y menús contextuales.

Puerta:

- paneles no recortados;
- el fallback de coordinación de paneles está probado y no promete control inexistente;
- comentarios y revisión persistentes;
- aceptación/rechazo con undo;
- vistas reales;
- foco y lector;
- exportación OOXML aplicable.

### H08 — Round-trip completo y corpus DOCX

Entrada:

- pipeline base y sesión unificada H01;
- objetos y campos H04–H07;
- corpus aprobado.

H08 es la certificación acumulativa del corpus, no el primer momento en que se ejecuta. Tier A empieza en H01; cada objetivo H04–H07 añade y ejecuta los fixtures afectados antes de cerrar.

Subobjetivos:

- H08-A: ampliar manifiesto por elemento;
- H08-B: importación editable por capacidad;
- H08-C: validación de preservación conservadora y diff estructural del paquete producido por el motor;
- H08-D: carátula y objetos anclados;
- H08-E: DrawingML, VML y AlternateContent;
- H08-F: comentarios, revisiones, campos y ecuaciones;
- H08-G: DOCM seguro;
- H08-H: vista fiel;
- H08-I: informe e inspector básico;
- H08-J: round-trip del corpus;
- H08-K: documentos de 1/10/75/150/300 páginas;
- H08-L: continuidad visual Edición/Revisión/Visualización;
- H08-M: editar y conservar la carátula real sin segunda representación;
- H08-N: consolidar resultados incrementales y demostrar que ninguna capacidad previamente verde regresó.

Puerta:

- carátula preservada;
- paquete válido;
- partes desconocidas conservadas;
- macros no ejecutadas;
- contenido no editado intacto;
- ninguna transición a editor básico;
- diff cero entre modos fuera de caret, selección y controles de interacción, porque comparten layout;
- reapertura en Dhyrium y referencia;
- evidencia completa.

### H09 — Auditoría transversal y estabilización

Entrada:

- P0 funcional;
- suites por pestaña;
- corpus.

Subobjetivos:

- H09-A: auditoría WCAG 2.2 AA;
- H09-B: teclado y lector;
- H09-C: touch, 200 % y 400 %;
- H09-D: presupuestos de rendimiento;
- H09-E: documentos extensos;
- H09-F: auditoría de threat model;
- H09-G: backup, restore y recuperación;
- H09-H: regresión completa;
- H09-I: visual multi-tema y responsive.

Puerta:

- cero incumplimientos AA conocidos;
- presupuestos aprobados;
- seguridad probada;
- backup y rollback;
- suite estable;
- cero gates bloqueantes.

### H10 — Calificación interna y ventajas Dhyrium

H10 no se denomina certificación Microsoft.

Primera fase:

- H10-A: calificación interna de matriz P0;
- H10-B: auditoría visual;
- H10-C: auditoría funcional;
- H10-D: auditoría DOCX;
- H10-E: licencias y marcas;
- H10-F: instalación limpia;
- H10-G: informe P0.

Después de aprobar P0, objetivos P1 independientes:

- H10-P1-A: buscador bilingüe enriquecido;
- H10-P1-B: inspector avanzado;
- H10-P1-C: timeline y diff;
- H10-P1-D: densidades personalizables;
- H10-P1-E: personalización avanzada;
- H10-P1-F: offline;
- H10-P1-G: command palette;
- H10-P1-H: asistente opcional mediante `AiSemanticToolRegistry`, selección firmada y transacciones verificables;
- H10-P1-I: privacidad y diagnóstico.

P1 no bloquea una release P0 aprobada. Toda release que incluya P1 repite los gates afectados.

---

## 35. Gobierno de objetivos

Cada ejecución debe tener:

- un ID de subobjetivo;
- objetivo;
- entrada;
- alcance;
- fuera de alcance;
- archivos esperados;
- pruebas;
- evidencias;
- puerta de salida.

No mezclar subobjetivos.

Antes de ejecutar un subobjetivo, crear o actualizar una ficha en docs/goals/HXX-Y.md con:

~~~yaml
id:
estado: propuesto
prerrequisitos:
entrada:
alcance:
fuera_de_alcance:
archivos_permitidos:
archivos_prohibidos:
fixtures:
comandos_de_prueba:
gates_aplicables:
evidence_ids:
filas_de_matriz:
riesgos:
rollback:
puerta_de_salida:
~~~

La ficha debe ser aprobada o estar expresamente autorizada antes de implementar. Esto permite que el PLAN permanezca estable y que cada objetivo tenga comandos, rutas y fixtures reales descubiertos en el momento adecuado.

Ejemplo de ficha H00-A:

~~~yaml
id: H00-A
objetivo: aprobar el protocolo y la disponibilidad de Word 2607
prerrequisitos:
  - PLAN aprobado
entrada:
  - máquina o capturas propuestas por el usuario
alcance:
  - verificar versión, build, licencia, idioma, DPI, tema y complementos
fuera_de_alcance:
  - modificar frontend o backend
archivos_permitidos:
  - docs/product/WORD_REFERENCE_BASELINE.md
  - docs/quality/REFERENCE_CAPTURE_PROTOCOL.md
  - spec/word-reference.json
fixtures:
  - documento de referencia vacío
  - fixture de texto, tabla, imagen, forma y encabezado
gates_aplicables:
  build_frontend: no aplica
  build_backend: no aplica
  visual: obligatorio si la máquina está disponible
evidence_ids:
  - REF-ENV-001
puerta_de_salida:
  - entorno reproducible aprobado o bloqueo externo registrado
~~~

Ejemplo de ficha H02-A:

~~~yaml
id: H02-A
objetivo: crear el runtime declarativo sin perder funciones de Inicio
prerrequisitos:
  - H00 cerrado
  - H01 sesión unificada disponible
  - inventario Inicio aprobado
alcance:
  - componentes base del runtime
  - adaptador temporal para cinta heredada
fuera_de_alcance:
  - migrar otras pestañas
  - cambiar modelo DOCX
fixtures:
  - documento simple
  - selección con formato mixto
gates_aplicables:
  build_frontend: obligatorio
  lint_frontend: obligatorio
  unitarias: runtime y esquema
  playwright: regresión de Inicio
  visual: 1366/1440/1920
puerta_de_salida:
  - ninguna función existente perdida
  - cero error de consola
  - cero scroll horizontal global
  - matriz y evidencia actualizadas
~~~

Al terminar:

1. actualizar matriz;
2. actualizar evidencia;
3. actualizar estado;
4. registrar limitaciones;
5. cerrar solo si todas las puertas están verdes.

Si existe trabajo seguro dentro del objetivo, la IA debe continuar. No debe detenerse después de repetir el diagnóstico.

---

## 36. Formato de reporte

Cada entrega informa:

- subobjetivo;
- resultado conseguido;
- archivos modificados;
- comandos ejecutados;
- pruebas y resultados;
- capturas;
- filas de matriz;
- diferencias restantes;
- bloqueo real;
- siguiente acción dentro del mismo objetivo.

No se acepta:

- repetir el estado general;
- responder únicamente con recomendaciones;
- marcar como terminado sin pruebas;
- porcentaje sin cálculo;
- avanzar dejando defectos conocidos;
- afirmar “igual a Word” sin evidencia.

---

## 37. Prompt maestro para Codex

Este bloque se usa al iniciar cada subobjetivo autorizado. No autoriza por sí solo otro hito, commit, push, publicación ni despliegue:

~~~text
/goal

Objetivo de producto:
Convertir Dhyrium Writer en un editor documental web propio, accesible desde
otras PC autorizadas, sin depender de Microsoft Office, Microsoft 365,
SharePoint, OneDrive, ONLYOFFICE, Collabora ni otra suite o almacenamiento
externo. Debe conservar una sola cabeza durable. Word para Microsoft 365 es una
referencia investigada de presentación y comportamiento, no el runtime.

No uses “Office 2026” como especificación técnica. Toda evidencia debe indicar
producto, canal, versión, build, Windows, idioma, DPI, tema, resolución,
modo de cinta, licencia y complementos.

Antes de modificar:
1. Lee PLAN.md, README.md y todos los AGENTS.md aplicables.
2. Lee la documentación vinculada al subobjetivo.
3. Inspecciona rama, status y diff.
4. Preserva todos los cambios locales ajenos.
5. Verifica el estado real del código, servicios y pruebas.
6. Lee WORD_LOCAL_AUDIT_REPORT.md, WORD_FUNCTIONAL_SURFACE_INVENTORY.md y las filas afectadas del catálogo/matriz.
7. Registra la fila inicial de la matriz y las capabilities N/S/L/E afectadas.

Reglas:
- Trabaja únicamente en el subobjetivo indicado.
- No termines después de auditar: implementa, prueba y genera evidencia.
- Mantén un solo DocumentSession, una sola cabeza durable y `DhyriumWriterWorkspace` como única superficie paginada editable.
- El original OOXML/DOCX es inmutable; el modelo Dhyrium tipado y el bridge OOXML preservativo forman el pipeline editorial.
- HTML, PDF, `altChunk` y el estado interno de Canvas no son el formato durable canónico.
- Dhyrium es dueño de parsing soportado, layout web, caret, IME, selección, objetos soportados, comandos, undo/redo, autenticación, ACL, repositorio, versiones, guardado durable, Backstage, auditoría e IA.
- No abras, embebas ni requieras Word Desktop u otro editor externo.
- No dupliques Archivo, Guardar, Guardar como, Descargar o Imprimir: cada acción tiene un único owner y respeta ACL/repositorio.
- Todo control habilitado debe tener una acción real, transaccional y verificable sobre el documento activo.
- Los controles aún no implementados permanecen deshabilitados con motivo accesible.
- En superficies Dhyrium usa Fluent 2 y @fluentui/react-icons.
- No uses Lucide, emoji, Unicode ni activos copiados dentro de superficies Dhyrium equivalentes a Office.
- No presentes placeholders o aproximaciones como funciones.
- Distingue “Versión vigente” de “Original protegido” y no uses una pantalla de preparación para sustituir el workspace.
- Edición, Revisión y Visualización comparten motor, layout, zoom, scroll y versión; EditorMode nunca sustituye EffectivePermissions.
- Vista fiel es auxiliar y no sustituye la edición.
- Un objeto no editable permanece visible y preservado; nunca desaparece.
- Toda selección expuesta a IA usa SelectionSnapshot firmado, de vida corta, de un solo uso y ligado a sesión/revisión/generación.
- La IA usa AiSemanticToolRegistry; nunca muta DOM, Canvas o HTML y toda secuencia es atómica o se ejecuta sobre un clon promovible.
- PaneCoordinator debe respetar capability full/observe-only/unsupported y usar un fallback honesto.
- No generes scroll horizontal global, clipping ni solapamiento.
- Las pestañas y comandos editoriales pertenecen al motor Dhyrium y solo se anuncian cuando están implementados.
- El overflow conserva icono y texto.
- La barra amarilla solo representa una advertencia real y accionable.
- No destruyas DOCX importados mediante reconstrucción HTML.
- Preserva partes OOXML desconocidas y macros sin ejecutarlas.
- No muestres Guardado antes de un VersionReceipt committed.
- No exportes ni imprimas desde memoria del iframe o desde un save pendiente; usa sourceVersionId committed.
- Al cerrar, ejecuta flush y espera receipt o registra background-save recuperable.
- Cumple teclado y WCAG 2.2 AA desde este subobjetivo.
- No hagas commit, push, merge o publicación sin autorización.
- No ejecutes publish-and-run.ps1 salvo petición expresa.

Prueba:
- build aplicable;
- unitarias;
- integración;
- Playwright;
- consola y red;
- teclado;
- accesibilidad;
- resoluciones y zoom aplicables;
- abrir, editar, undo, redo, guardar y reabrir;
- guardados sucesivos, conflicto externo y cierre con callback tardío;
- token IA stale/reutilizado y rollback/clon cuando aplique;
- evidencia visual;
- persistencia cuando corresponda.

Cierra únicamente si:
- todas las pruebas están verdes;
- no hay no-op;
- no hay errores inesperados;
- no hay ACK ni estado Guardado prematuros;
- no hay ownership duplicado entre motor y shell;
- no hay clipping, solapamiento o scroll horizontal global;
- la matriz y evidencia están actualizadas;
- no quedan defectos conocidos dentro del alcance.

Si una puerta falla, corrígela y deja el objetivo abierto.
No declares porcentajes sin numerador y denominador.
~~~

Después agrega exactamente un subobjetivo. Ejemplo de arquitectura inicial:

~~~text
Subobjetivo actual: H00-L.

Validar con la carátula real y el corpus Tier A la apertura, edición, guardado y
reapertura mediante Dhyrium Writer. Canvas Editor queda encapsulado como runtime
provisional; su JSON y la exportación HTML/altChunk no son el formato canónico.

Puerta de salida:
- matriz de evaluación ponderada y evidencia reproducible;
- abrir, editar, guardar, cerrar y reabrir en dos navegadores autorizados sin
  segunda representación ni dependencia de Office;
- carátula, tabla, imagen y encabezado/pie preservados;
- selección segura y una mutación semántica reversible demostradas o IA v1 limitada explícitamente;
- ownership de Abrir/Guardar como/Descargar/Imprimir comprobado;
- accesibilidad, rendimiento, compatibilidad de navegador y riesgos documentados;
- el original permanece protegido y cada guardado crea una versión inmutable.
~~~

---

## 38. Orden de ejecución recomendado

Estado contractual actual:

- este PLAN 3.2 es el PLAN canónico vigente;
- REV-33–REV-35 registran la decisión más reciente y sustituyen cualquier regla
  que use Word Desktop, Office o un motor externo como superficie canónica;
- el objetivo de código activo es H01-WEB, limitado al primer corte seguro del
  motor Dhyrium: ACL contextual, inspector OOXML, superficie Canvas realmente
  editable y estado durable honesto;
- no se autoriza otro hito, publicación ni promoción del pipeline HTML/altChunk
  como round-trip DOCX;
- H01-WEB no se cierra hasta completar el bridge OOXML preservativo y el corpus
  de extremo a extremo del perfil aprobado.

El primer objetivo de programación debe ser el primer subobjetivo H00 no cerrado por evidencia. No se inicia directamente la cinta porque primero deben congelarse la referencia, el perfil soportado, el ownership de UI y el motor documental.

Secuencia:

1. H00-A/B/C/D/E — congelar referencia, capturar, medir y clasificar catálogo/matriz;
2. H00-F/G/H/I/J/K — fuente canónica, ADRs del motor Dhyrium, threat model, harness y defecto de doble representación;
3. H01-WEB — ACL, vault, inspector OOXML, modelo/transacciones, guardado durable y compuerta de round-trip;
4. H02 — runtime de comandos, Inicio ejecutable y estados dentro de `DhyriumWriterWorkspace`;
5. H03 — encabezado, modos/permisos, Backstage, autosave, versiones, conflictos y cierre seguro;
6. H03-F — importador/exportador OOXML preservativo y pruebas multiusuario independientes;
7. H04–H07 — objetos, secciones, referencias, correspondencia, revisión, vistas y paneles con corpus incremental;
8. H08 — certificación acumulativa de round-trip y corpus;
9. H09 — auditoría transversal y estabilización;
10. H10 — calificación interna P0; solo después, ventajas P1.

No pedir “haz todo Word” en una sola ejecución.

---

## 39. Registro de decisiones del replanteamiento

Una fila `Confirmada` forma parte del contrato aprobado. Una fila `Pendiente` requiere decisión explícita y, cuando corresponda, ADR antes de implementar el área afectada.

| ID | Decisión propuesta | Estado |
|---|---|---|
| REV-01 | Usar Word para Microsoft 365 2607 build 20228.20158 como baseline | Pendiente |
| REV-02 | Mantener 2606 solo como evidencia histórica | Pendiente |
| REV-03 | Excluir Nitro, Acrobat y add-ins del denominador | Pendiente |
| REV-04 | Clasificar Copilot y servicios conectados fuera del core-local | Pendiente |
| REV-05 | Ejecutar H01 motor documental/OOXML/backend antes de cinta funcional y pestañas avanzadas | Confirmada por el usuario |
| REV-06 | Guardar el DOCX original inmutable y validar preservación del paquete producido por el motor; prohibir parcheo OOXML arbitrario | Pendiente |
| REV-07 | Incorporar PostgreSQL local mediante transición y DEC-DB-001 | Pendiente |
| REV-08 | Mantener SmartArt y 3D como preserved-not-editable hasta disponer de modelo real | Pendiente |
| REV-09 | Usar Aptos como candidato para documentos modernos nuevos | Pendiente |
| REV-10 | Usar Carlito únicamente como decisión fallback de Dhyrium | Pendiente |
| REV-11 | Conservar marca y colores propios de Dhyrium | Pendiente |
| REV-12 | Exigir 44 × 44 CSS px en modo táctil | Pendiente |
| REV-13 | Usar spec/*.json como fuente canónica de identidad y layout | Pendiente |
| REV-14 | Crear fichas docs/goals/HXX-Y.md antes de cada ejecución | Pendiente |
| REV-15 | Proporcionar máquina o capturas verificables de Word 2607 | Pendiente |
| REV-16 | Reconciliar el replanteamiento aprobado dentro del PLAN canónico antes de programar | Confirmada por el usuario |
| REV-17 | Adoptar una sesión editable única en Word; mantener el original solo como referencia protegida y prohibir la edición simplificada con pérdida | Sustituida por REV-33–REV-35; se conserva sesión única/original protegido |
| REV-18 | Usar Microsoft Word como superficie canónica y retirar las integraciones de edición web; Canvas no es candidato canónico | Sustituida por REV-33–REV-35 |
| REV-19 | Separar `EditorMode` de `EffectivePermissions`; ambos operan sobre la misma sesión y los permisos provienen del backend | Confirmada por el usuario |
| REV-20 | Mantener UI/ribbon nativa de Microsoft Word en v1; Dhyrium controla sesión, permisos y versiones | Sustituida por REV-33–REV-35 |
| REV-21 | Retirar Mammoth→HTML→Canvas como pipeline canónico de edición/guardado; conservarlo solo para extracción o migración no destructiva | Confirmada por el usuario |
| REV-22 | Integrar IA únicamente mediante `AiSemanticToolRegistry`, `SelectionSnapshot` fresco y mutación atómica o clon promovible | Confirmada por el usuario |
| REV-23 | No reconocer guardado hasta commit durable y `VersionReceipt`; serializar multi-save y proteger cierre/callback tardío | Confirmada por el usuario |
| REV-24 | La V1 abre Microsoft Word como superficie editable canónica y cumple el perfil `must-edit` de §9.7 sin ruta Canvas intermedia | Sustituida por REV-33–REV-35 |
| REV-25 | Usar `DhyriumWriterWorkspace` como única presentación principal; selección, original, versiones, exportación y fallback se agrupan dentro de ella | Confirmada por el usuario |
| REV-26 | Mantener Microsoft Word de escritorio como fallback de fidelidad, no como superficie web principal | Sustituida por REV-29–REV-32 |
| REV-27 | Adoptar un perfil web explícito y bloquear DOCX complejos hasta demostrar round-trip OOXML y preservación | Reactivada y ampliada por REV-33–REV-35 como `DHYRIUM-WEB-CORE-1` |
| REV-28 | Mantener una sola cabeza durable y una sola línea de versiones; prohibir cabezas paralelas Canvas/JSON y DOCX | Confirmada por el usuario |
| REV-29 | Mantener `DhyriumWriterWorkspace` como shell único de selección, previsualización, versiones, exportación y estado, pero no como motor editorial | Sustituida por REV-33; se conserva el workspace único |
| REV-30 | Reactivar Microsoft Word local como única superficie canónica de edición DOCX; no integrar ONLYOFFICE ni reconstruir los comandos de Word en Canvas/HTML/PDF | Sustituida por REV-33–REV-35 |
| REV-31 | Tratar la cinta web como orientación visual no ejecutable y abrir la cinta funcional real en la ventana nativa de Word | Sustituida por REV-34 |
| REV-32 | Corregir primero el puente `ms-word:`/WebDAV, HTTPS, sesión, lock, TTL y reapertura; evaluar un bridge local firmado con complemento VSTO solo si WebDAV no supera el E2E objetivo | Sustituida por REV-33–REV-35 |
| REV-33 | Adoptar Dhyrium Writer como única superficie web editable, accesible desde otras PC y sin depender de Office, Microsoft 365, SharePoint, OneDrive, ONLYOFFICE, Collabora u otra suite/base externa | Confirmada por el usuario |
| REV-34 | Encapsular Canvas MIT como runtime provisional; habilitar solo comandos reales y construir modelo/transacciones/bridge OOXML propios sin HTML/altChunk canónico | Confirmada por el usuario |
| REV-35 | Conservar original inmutable, una sola cabeza durable y almacenamiento propio; clasificar capacidades como editable/preserved/blocked/unsupported y bloquear pérdida silenciosa | Confirmada por el usuario |

Para cada fila, el usuario puede responder:

- aprobado;
- cambiar;
- eliminar;
- dejar pendiente.

Las decisiones aprobadas se registran en el PLAN canónico y, cuando corresponda, en un ADR.

---

## 40. Fuentes oficiales

Microsoft 365 Apps, compilaciones:

https://learn.microsoft.com/en-us/officeupdates/update-history-microsoft365-apps-by-date

Modos de cinta:

https://support.microsoft.com/en-US/Office/foundations-experiences/show-or-hide-the-ribbon-in-office

Modos documentales Edición, Revisión y Visualización:

https://support.microsoft.com/en-US/Word/document-modes-in-word

Vista protegida y Habilitar edición:

https://support.microsoft.com/en-us/office/what-is-protected-view-d6f09ac7-e6b9-4495-8e43-2bbcdbcb6653

Personalización de cinta:

https://support.microsoft.com/en-us/word/customize-the-ribbon-in-word

Barra de acceso rápido:

https://support.microsoft.com/en-us/office/customize-the-quick-access-toolbar

Microsoft Search:

https://support.microsoft.com/en-us/office/foundations-experiences/find-what-you-need-with-microsoft-search

Teclado de la cinta:

https://support.microsoft.com/en-us/office/use-the-keyboard-to-work-with-the-ribbon-954cd3f7-2f77-4983-978d-c09b20e31f0e

Atajos de Word:

https://support.microsoft.com/en-gb/office/keyboard-shortcuts-in-word-95ef89dd-7142-4b50-afb2-f762f663ceb2

Patrón arquitectónico de pestañas contextuales para add-ins. Esta fuente no demuestra por sí sola la interfaz integrada de Word y actualmente tiene limitaciones de plataforma; las pestañas integradas se validan con la referencia capturada:

https://learn.microsoft.com/en-us/office/dev/add-ins/design/contextual-tabs

Identificadores de comandos:

https://github.com/OfficeDev/office-fluent-ui-command-identifiers/tree/main/Microsoft%20365/Current%20Channel

Fluent Toolbar:

https://fluent2.microsoft.design/components/web/react/core/toolbar/usage

Fluent Tablist:

https://fluent2.microsoft.design/components/web/react/core/tablist/usage

Fluent Layout:

https://fluent2.microsoft.design/layout

Fluent Tokens:

https://fluent2.microsoft.design/design-tokens

Fluent Typography:

https://fluent2.microsoft.design/typography

Fluent Iconography:

https://fluent2.microsoft.design/iconography

Fluent Accessibility:

https://fluent2.microsoft.design/accessibility

Fluent System Icons:

https://github.com/microsoft/fluentui-system-icons

Temas Microsoft 365:

https://support.microsoft.com/en-us/office/foundations-experiences/change-the-look-and-feel-of-microsoft-365

Modo oscuro de Word:

https://support.microsoft.com/en-us/word/dark-mode-in-word

Comentarios modernos:

https://support.microsoft.com/en-US/Word/modern-comments-in-word

Copilot en Word:

https://support.microsoft.com/en-us/word/welcome-to-copilot-in-word

Marca y activos Microsoft:

https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks

Fuente Aptos:

https://learn.microsoft.com/en-us/typography/font-list/aptos

Fuente Calibri:

https://learn.microsoft.com/en-us/typography/font-list/calibri

Actualización visual de Office basada en principios Fluent:

https://support.microsoft.com/en-us/office/foundations-experiences/the-new-look-of-office

Office LTSC 2021 y su diferencia respecto de Microsoft 365 Current Channel:

https://learn.microsoft.com/en-us/office/ltsc/2021/overview

Paquetes, partes y relaciones Open XML:

https://learn.microsoft.com/en-us/office/open-xml/general/overview

Esquemas URI de Microsoft Office para abrir documentos:

https://learn.microsoft.com/en-us/office/client-developer/office-uri-schemes

Mammoth, alcance declarado de conversión DOCX→HTML y limitaciones de fidelidad:

https://github.com/mwilliamson/mammoth.js/

---

## 41. Condición final

Dhyrium Writer se considera terminado para este alcance cuando:

- el 100 % del P0 tiene numerador y denominador;
- todos los elementos P0 están verificados;
- todas las funciones visibles tienen comportamiento real;
- los documentos editables abren directamente en una sola UnifiedDocumentSession;
- no existe “Original / Editar” ni “Editar en Dhyrium” en el flujo normal;
- la vista fiel es auxiliar y no una segunda representación primaria;
- la carátula, objetos y paginación no desaparecen al editar;
- Edición, Revisión y Visualización comparten layout, scroll, zoom, historial y versión;
- el motor editorial, su UI nativa y Dhyrium tienen ownership documentado y no duplican comandos conflictivos;
- las funciones condicionadas indican su capacidad;
- la cinta es adaptable;
- todos los paneles son accesibles;
- no existe scroll horizontal global;
- no existen controles recortados o superpuestos;
- no existen errores críticos conocidos;
- el backend local es reproducible;
- versiones, autosave y recuperación funcionan;
- cada estado Guardado corresponde a un `VersionReceipt` committed y el cierre no pierde callbacks tardíos;
- exportación e impresión registran lineage desde una versión committed;
- DOCX no pierde contenido silenciosamente;
- la carátula del corpus se conserva;
- las partes OOXML desconocidas se preservan;
- las macros nunca se ejecutan;
- toda acción IA usa herramientas semánticas tipadas, rechaza selecciones stale y es atómica o promueve un clon verificado;
- las pruebas funcionales, visuales, documentales, de seguridad y accesibilidad están verdes;
- las limitaciones inevitables están identificadas con precisión;
- Dhyrium conserva identidad y recursos propios.

Hasta entonces, el producto debe describirse según su evidencia real: pendiente, parcial, funcional o verificado.
