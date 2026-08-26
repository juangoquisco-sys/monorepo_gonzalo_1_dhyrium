# 📋 Guía de Mejoras en Estilos y Fuentes

## 🎯 Resumen General

Se han agregado mejoras significativas al sistema de estilos y fuentes en toda la aplicación, con más opciones compatibles con **Office 2019** y disposiciones mejoradas.

---

## 📁 Archivos Modificados y Creados

### 1. **`src/utils/fontStyles.ts`** (Backend) - NUEVO
Sistema centralizado de configuración de fuentes y estilos para toda la aplicación.

#### Características:
- ✅ **18+ tipos de fuentes** (Calibri, Cambria, Arial, Times New Roman, etc.)
- ✅ **Tamaños de fuente predefinidos** (pequeño, normal, grande, títulos, etc.)
- ✅ **Pesos de fuente** (ligero, normal, semibold, bold, extra_bold, negro)
- ✅ **Alineaciones de texto** (izquierda, centro, derecha, justificado)
- ✅ **Espaciados de línea** (simple, 1.5, doble, minimizado, expandido)
- ✅ **Paleta de colores corporativos** (primario, secundario, éxito, error, etc.)
- ✅ **Disposiciones predefinidas** (normal, compacto, amplio, horizontal)
- ✅ **Estilos de documento** (títulos, secciones, cuerpo, tablas, etc.)

#### Uso:
```typescript
import { 
  StyleGenerator, 
  FONT_FAMILIES, 
  DOCUMENT_STYLES 
} from '@/utils/fontStyles';

// Generar estilos HTML
const htmlStyle = StyleGenerator.generateHtmlStyle({
  fontFamily: 'Calibri',
  fontSize: 'normal',
  fontWeight: 'bold',
  color: 'primario',
  alignment: 'centro',
});

// Generar estilos Excel
const excelStyle = StyleGenerator.generateExcelStyle({
  fontFamily: 'Cambria',
  fontSize: 12,
  color: 'primario',
  isBold: true,
});

// Usar estilos predefinidos
const titleStyle = StyleGenerator.getDocumentStyle('titulo_documento');
```

---

### 2. **`src/utils/excelGenerate/utils/excelTools.ts`** (Frontend) - MEJORADO

#### Nuevas Características:
- ✅ **14+ tipos de fuentes Excel** (compatible con Office 2019)
- ✅ **Función `applyAdvancedFontStyle()`** - Aplica estilos complejos a rangos
- ✅ **Función `applyTableHeaderStyle()`** - Estilos automáticos para encabezados
- ✅ **Función `applyTableBodyStyle()`** - Estilos para cuerpo de tablas
- ✅ **Función `applyAlternateRowStyle()`** - Filas alternadas (cebra)
- ✅ **Función `applyPredefinedStyle()`** - Estilos predefinidos (título, subtítulo, etc.)
- ✅ **Función `getTableLayoutPresets()`** - Anchos de columna predefinidos
- ✅ **Conversión de color HEX a ARGB** - `hexToArgb()`

#### Ejemplo de Uso:
```typescript
import { 
  applyAdvancedFontStyle, 
  applyTableHeaderStyle,
  EXCEL_FONTS 
} from '@/utils/excelGenerate/utils/excelTools';

// Aplicar estilos de fuente avanzados
applyAdvancedFontStyle({
  row: worksheet.getRow(1),
  startCol: 1,
  endCol: 5,
  fontName: 'Calibri',
  fontSize: 12,
  bold: true,
  color: '#1b74e4',
  alignment: 'center',
  backgroundColor: '#F0F0F0',
});

// Aplicar estilo de encabezado de tabla
applyTableHeaderStyle({
  row: worksheet.getRow(1),
  startCol: 1,
  endCol: 5,
  fontName: 'Cambria',
  fontSize: 12,
  backgroundColor: '#1b74e4',
  textColor: '#FFFFFF',
});

// Aplicar estilos predefinidos
applyPredefinedStyle(
  worksheet.getRow(2),
  1,
  5,
  'titulo'
);

// Obtener anchos de columna recomendados
const layouts = getTableLayoutPresets();
worksheet.getColumn(1).width = layouts.numero; // 8
worksheet.getColumn(2).width = layouts.fecha;  // 12
```

---

### 3. **`src/utils/htmlString.ts`** (Backend) - MEJORADO

#### Nuevas Características:
- ✅ **15+ tipos de fuentes HTML**
- ✅ **Clase `HtmlStyleBuilder`** - Constructor de estilos fluido
- ✅ **`getPredefinedEmailStyles()`** - Estilos predefinidos para emails
- ✅ **`emailConfirmationHtml()`** - Template mejorado de confirmación
- ✅ **`notificationHtml()`** - Notificaciones con tipos (info, success, warning, error)
- ✅ **`generateHtmlTable()`** - Generador de tablas HTML con estilos
- ✅ **Función original preservada** - `recoveryPasswordHtmlLegacy()`

#### Ejemplo de Uso:
```typescript
import { 
  HtmlStyleBuilder, 
  getPredefinedEmailStyles,
  emailConfirmationHtml,
  notificationHtml,
  generateHtmlTable
} from '@/utils/htmlString';

// Constructor de estilos fluido
const customStyle = new HtmlStyleBuilder()
  .setFont('Calibri')
  .setFontSize(14)
  .setFontWeight('bold')
  .setColor('primario')
  .setAlignment('center')
  .setPadding(10, 10, 10, 10)
  .build();

// Usar estilos predefinidos
const styles = getPredefinedEmailStyles();
console.log(styles.titulo);    // Estilo para título
console.log(styles.cuerpo);    // Estilo para cuerpo
console.log(styles.boton);     // Estilo para botones

// Generar email de confirmación
const html = emailConfirmationHtml(
  'Juan Pérez',
  'https://app.com/confirm/123',
  30 // 30 minutos de expiración
);

// Generar notificación
const notification = notificationHtml(
  '¡Operación exitosa!',
  'Tu solicitud ha sido procesada correctamente.',
  'success'
);

// Generar tabla HTML
const table = generateHtmlTable(
  ['Nombre', 'Edad', 'Email'],
  [
    ['Juan', 30, 'juan@example.com'],
    ['María', 28, 'maria@example.com'],
  ]
);
```

---

### 4. **`src/utils/generateFile.ts`** (Backend) - MEJORADO

#### Nuevas Características:
- ✅ **12 fuentes PDF estándar** con variantes (regular, bold, italic, bold-italic)
- ✅ **6 disposiciones PDF predefinidas** (A4, A4-compact, A4-wide, Letter, Tabloid, Landscape)
- ✅ **10+ colores predefinidos** para PDFs
- ✅ **Clase `PdfStyleHelper`** - Utilidades para estilos PDF
- ✅ **Métodos para cálculo de ancho de texto**
- ✅ **Métodos para dibujar texto con estilos**

#### Ejemplo de Uso:
```typescript
import { 
  PdfStyleHelper,
  PDF_STANDARD_FONTS,
  PDF_LAYOUTS,
  PDF_COLORS,
  PDFFontType
} from '@/utils/generateFile';

// Usar ayudante de estilos
const font = await pdfDoc.embedFont(
  PdfStyleHelper.getFont('Times-Bold')
);

const color = PdfStyleHelper.getColor('primario');

// Dibujar texto con estilos
PdfStyleHelper.drawStyledText(
  page,
  'Título del Documento',
  50,
  750,
  font,
  {
    fontSize: 24,
    fontType: 'Times-Bold',
    color: 'primario',
    alignment: 'center',
    maxWidth: 500,
  }
);

// Acceder a disposiciones
const layout = PDF_LAYOUTS['A4'];
console.log(layout.marginTop);    // 40
console.log(layout.marginBottom); // 40

// Acceder a colores
const myColor = PDF_COLORS['verde'];
```

---

## 🎨 Fuentes Disponibles

### Por Formato:

| Formato | Fuentes |
|---------|---------|
| **Excel** | Arial, Calibri, Cambria, Times New Roman, Courier New, Georgia, Trebuchet MS, Verdana, Segoe UI, Garamond, Tahoma, Consolas, Comic Sans MS, Impact |
| **HTML** | Calibri, Arial, Times New Roman, Cambria, Georgia, Verdana, Trebuchet MS, Courier New, Segoe UI, Tahoma, Helvetica, Consolas, Garamond, Impact, Lucida Console |
| **PDF** | Helvetica (regular, bold, oblique, boldoblique), Times Roman (regular, bold, italic, bolditalic), Courier (regular, bold, oblique, boldoblique) |

---

## 📐 Disposiciones (Layouts)

### PDF:
- **A4** - Disposición estándar (márgenes 50px)
- **A4-compact** - Compacta (márgenes 30px)
- **A4-wide** - Amplia (márgenes 70px)
- **Letter** - Formato Carta USA
- **Tabloid** - Formato Tabloid
- **Landscape** - Horizontal

### Página (fontStyles.ts):
- **normal** - Márgenes estándar
- **compacto** - Márgenes reducidos
- **amplio** - Márgenes amplios
- **horizontal** - Orientación horizontal

---

## 🎯 Ejemplos Prácticos

### Ejemplo 1: Generar Excel con múltiples estilos

```typescript
import { applyAdvancedFontStyle, applyTableHeaderStyle } from '@/utils/excelGenerate/utils/excelTools';

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Reporte');

// Agregar encabezado
const headerRow = worksheet.getRow(1);
applyTableHeaderStyle({
  row: headerRow,
  startCol: 1,
  endCol: 4,
  fontName: 'Cambria',
  fontSize: 12,
  backgroundColor: '#1b74e4',
  textColor: '#FFFFFF',
});

// Agregar datos con estilos alternativos
[2, 3, 4, 5].forEach((rowNum, index) => {
  const row = worksheet.getRow(rowNum);
  applyAlternateRowStyle(row, 1, 4, index % 2 === 0, 'Calibri', 11);
});
```

### Ejemplo 2: Generar email con nuevo template

```typescript
import { emailConfirmationHtml } from '@/utils/htmlString';

const emailContent = emailConfirmationHtml(
  'Usuario',
  'https://tuapp.com/verify/token123',
  60
);

// Enviar email
sendEmail({
  to: 'user@example.com',
  subject: 'Confirma tu email',
  html: emailContent,
});
```

### Ejemplo 3: Generar PDF con estilos

```typescript
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { PdfStyleHelper } from '@/utils/generateFile';

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage();

const font = await pdfDoc.embedFont(
  PdfStyleHelper.getFont('Times-Bold')
);

PdfStyleHelper.drawStyledText(
  page,
  'Reporte Mensual',
  50,
  750,
  font,
  {
    fontSize: 20,
    fontType: 'Times-Bold',
    color: 'primario',
    alignment: 'center',
    maxWidth: 500,
  }
);
```

---

## 🔄 Migración desde Código Anterior

### Para Excel:
**Antes:**
```typescript
fontExcelStyle({
  row: worksheet.getRow(1),
  positions: 'ABCD',
  color: 'FF1b74e4',
  isBold: true,
  size: 12,
  name: 'Calibri',
});
```

**Ahora (Recomendado):**
```typescript
applyAdvancedFontStyle({
  row: worksheet.getRow(1),
  startCol: 1,
  endCol: 4,
  fontName: 'Calibri',
  fontSize: 12,
  bold: true,
  color: '#1b74e4',
});
```

### Para HTML:
**Antes:**
```typescript
recoveryPasswordHtml('Juan', 'link')
```

**Ahora:**
```typescript
recoveryPasswordHtml('Juan', 'link') // Automáticamente usa nuevos estilos
// O usar nuevo template específico
emailConfirmationHtml('Juan', 'link', 30)
```

---

## ✅ Checklist de Implementación

- [ ] Revisar `fontStyles.ts` para fuentes disponibles
- [ ] Actualizar generadores Excel usando `applyAdvancedFontStyle()`
- [ ] Reemplazar templates HTML antigos con `emailConfirmationHtml()` o `notificationHtml()`
- [ ] Usar `PdfStyleHelper` para PDFs generados
- [ ] Testear todos los formatos (Excel, PDF, HTML/Email)
- [ ] Validar que los emails se ven correctamente en diferentes clientes

---

## 📚 Referencias

- **Fuentes Office 2019**: [Microsoft Office Font Support](https://support.microsoft.com/en-us/office)
- **PDF-lib Documentation**: https://pdf-lib.js.org/
- **ExcelJS**: https://github.com/exceljs/exceljs

---

## 🆘 Soporte

Si encuentras problemas al usar estas mejoras:
1. Verifica que estés importando desde los archivos correctos
2. Consulta los tipos TypeScript disponibles
3. Revisa los ejemplos en los comentarios del código
4. Valida que los colores usen formato HEX (#RRGGBB)

---

**Última actualización**: Agosto 2026
**Versión**: 1.0
