import * as ExcelJS from 'exceljs';
import type { UserAttendance } from '@/types/types';

// Tipos de fuentes soportadas (Office 2019+)
export const EXCEL_FONTS = {
  // Fuentes predeterminadas Office 2026
  'Aptos': 'Aptos',
  'Aptos Narrow': 'Aptos Narrow',
  'Aptos Display': 'Aptos Display',

  // Fuentes serif (con remates)
  'Times New Roman': 'Times New Roman',
  'Cambria': 'Cambria',
  'Georgia': 'Georgia',
  'Garamond': 'Garamond',
  'Palatino Linotype': 'Palatino Linotype',
  'Century': 'Century',
  'Century Schoolbook': 'Century Schoolbook',
  'Constantia': 'Constantia',
  'Perpetua': 'Perpetua',
  'Sylfaen': 'Sylfaen',
  'Lucida Fax': 'Lucida Fax',

  // Fuentes sans-serif principales
  'Arial': 'Arial',
  'Arial Black': 'Arial Black',
  'Arial Narrow': 'Arial Narrow',
  'Arial Rounded MT Bold': 'Arial Rounded MT Bold',
  'Arial Unicode MS': 'Arial Unicode MS',
  'Arial Nova': 'Arial Nova',
  'Calibri': 'Calibri',
  'Calibri Light': 'Calibri Light',
  'Cambria Math': 'Cambria Math',
  'Segoe UI': 'Segoe UI',
  'Segoe UI Symbol': 'Segoe UI Symbol',
  'Segoe Print': 'Segoe Print',
  'Verdana': 'Verdana',
  'Trebuchet MS': 'Trebuchet MS',
  'Tahoma': 'Tahoma',
  'Lucida Grande': 'Lucida Grande',
  'Lucida Sans Unicode': 'Lucida Sans Unicode',
  'Lucida Sans': 'Lucida Sans',
  'Corbel': 'Corbel',
  'Gill Sans': 'Gill Sans',
  'Gill Sans MT': 'Gill Sans MT',
  'Gill Sans Nova': 'Gill Sans Nova',
  'Franklin Gothic': 'Franklin Gothic',
  'Franklin Gothic Medium': 'Franklin Gothic Medium',
  'Franklin Gothic Book': 'Franklin Gothic Book',
  'Franklin Gothic Demi': 'Franklin Gothic Demi',

  // Fuentes Monospace
  'Courier New': 'Courier New',
  'Consolas': 'Consolas',
  'Lucida Console': 'Lucida Console',
  'Courier': 'Courier',
  'OCR-A': 'OCR-A',
  'Fixedsys': 'Fixedsys',

  // Fuentes decorativas/especiales
  'Comic Sans MS': 'Comic Sans MS',
  'Impact': 'Impact',
  'Lucida Handwriting': 'Lucida Handwriting',
  'Broadway': 'Broadway',
  'Jokerman': 'Jokerman',
  'Playbill': 'Playbill',
  'Stencil': 'Stencil',
  'Showcard Gothic': 'Showcard Gothic',
  'Colonna MT': 'Colonna MT',
  'Cooper Black': 'Cooper Black',
  'Copperplate': 'Copperplate',
  'Copperplate Gothic Bold': 'Copperplate Gothic Bold',
  'Copperplate Gothic Light': 'Copperplate Gothic Light',
  'Curlz MT': 'Curlz MT',
  'Engravers MT': 'Engravers MT',
  'Footlight MT Light': 'Footlight MT Light',
  'Forte': 'Forte',
  'French Script MT': 'French Script MT',
  'Gigi': 'Gigi',
  'Harrington': 'Harrington',
  'Habibi': 'Habibi',
  'Informal Roman': 'Informal Roman',
  'Inscribe': 'Inscribe',

  // Fuentes adicionales Microsoft Office
  'Agency FB': 'Agency FB',
  'Algerian': 'Algerian',
  'Baskerville Old Face': 'Baskerville Old Face',
  'Bauhaus 93': 'Bauhaus 93',
  'Bell MT': 'Bell MT',
  'Berlin Sans FB': 'Berlin Sans FB',
  'Berlin Sans FB Demi': 'Berlin Sans FB Demi',
  'Bernard MT Condensed': 'Bernard MT Condensed',
  'Blackadder ITC': 'Blackadder ITC',
  'Bodoni MT': 'Bodoni MT',
  'Bodoni MT Black': 'Bodoni MT Black',
  'Bodoni MT Poster Compressed': 'Bodoni MT Poster Compressed',
  'Book Antiqua': 'Book Antiqua',
  'Bookman Old Style': 'Bookman Old Style',
  'Braggadocio': 'Braggadocio',
  'Britannic Bold': 'Britannic Bold',
  'Brush Script MT': 'Brush Script MT',
  'Californian FB': 'Californian FB',
  'Calisto MT': 'Calisto MT',
  'Castellar': 'Castellar',
  'Century Gothic': 'Century Gothic',
  'Chiller': 'Chiller',
  'Freestyle Script': 'Freestyle Script',
  'Gloucester MT Extra Condensed': 'Gloucester MT Extra Condensed',
  'Goudy Old Style': 'Goudy Old Style',
  'Goudy Stout': 'Goudy Stout',
  'Hagin': 'Hagin',
  'Harlow Solid Italic': 'Harlow Solid Italic',
  'High Tower Text': 'High Tower Text',
  'Matura MT Script Capitals': 'Matura MT Script Capitals',
  'Microsoft Himalaya': 'Microsoft Himalaya',
  'Microsoft JhengHei': 'Microsoft JhengHei',
  'Microsoft JhengHei Light': 'Microsoft JhengHei Light',
  'Microsoft JhengHei UI': 'Microsoft JhengHei UI',
  'Microsoft JhengHei UI Light': 'Microsoft JhengHei UI Light',
  'Microsoft New Tai Lue': 'Microsoft New Tai Lue',
  'Microsoft PhagsPa': 'Microsoft PhagsPa',
  'Microsoft Sans Serif': 'Microsoft Sans Serif',
  'Microsoft Tai Le': 'Microsoft Tai Le',
  'Microsoft Uighur': 'Microsoft Uighur',
  'Microsoft YaHei': 'Microsoft YaHei',
  'Microsoft YaHei Light': 'Microsoft YaHei Light',
  'Microsoft YaHei Mono': 'Microsoft YaHei Mono',
  'Microsoft YaHei UI': 'Microsoft YaHei UI',
  'Microsoft YaHei UI Light': 'Microsoft YaHei UI Light',
  'Mistral': 'Mistral',
  'Monotype Corsiva': 'Monotype Corsiva',
  'Monotype Sorts': 'Monotype Sorts',
  'MT Extra': 'MT Extra',
  'Niagara Engraved': 'Niagara Engraved',
  'Niagara Solid': 'Niagara Solid',
  'Old English Text': 'Old English Text',
  'Palace Script MT': 'Palace Script MT',
  'Papyrus': 'Papyrus',
  'Parchment': 'Parchment',
  'Perpetua Titling MT': 'Perpetua Titling MT',
  'Ravie': 'Ravie',
  'Rockwell': 'Rockwell',
  'Rockwell Condensed': 'Rockwell Condensed',
  'Rockwell Extra Bold': 'Rockwell Extra Bold',
  'Script MT Bold': 'Script MT Bold',
  'SimSun': 'SimSun',
  'SimSun-ExtB': 'SimSun-ExtB',
  'Snap ITC': 'Snap ITC',
  'Symbol': 'Symbol',
  'Tempus Sans ITC': 'Tempus Sans ITC',
  'Terminal': 'Terminal',
  'Tw Cen MT': 'Tw Cen MT',
  'Tw Cen MT Condensed': 'Tw Cen MT Condensed',
  'Tw Cen MT Condensed Extra Bold': 'Tw Cen MT Condensed Extra Bold',
  'Viner Hand ITC': 'Viner Hand ITC',
  'Vivaldi': 'Vivaldi',
  'Vladimir Script': 'Vladimir Script',
  'Webdings': 'Webdings',
  'Wingdings': 'Wingdings',
  'Wingdings 2': 'Wingdings 2',
  'Wingdings 3': 'Wingdings 3',

  // Fuentes de símbolo
  'Marlett': 'Marlett',
  'Segoe MDL2 Assets': 'Segoe MDL2 Assets',

  // Fuentes internacionales
  'Noto Sans': 'Noto Sans',
  'Noto Serif': 'Noto Serif',
  'Liberation Sans': 'Liberation Sans',
  'Liberation Serif': 'Liberation Serif',
  'Liberation Mono': 'Liberation Mono',
  'DejaVu Sans': 'DejaVu Sans',
  'DejaVu Serif': 'DejaVu Serif',
  'DejaVu Sans Mono': 'DejaVu Sans Mono',
  'Courier 10 Pitch': 'Courier 10 Pitch',
  'Bitstream Vera Sans': 'Bitstream Vera Sans',
  'Bitstream Vera Serif': 'Bitstream Vera Serif',
  'Bitstream Vera Sans Mono': 'Bitstream Vera Sans Mono',
} as const;

export type ExcelFontType = keyof typeof EXCEL_FONTS;

export interface FontExcelStyle {
  row: ExcelJS.Row;
  positions: string;
  color: string;
  isBold: boolean;
  size: number;
  name: string;
  italic?: boolean;
  underline?: boolean;
}

export interface AdvancedFontStyle {
  row: ExcelJS.Row;
  startCol: number;
  endCol: number;
  fontName?: ExcelFontType;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

export interface TableHeaderStyle {
  row: ExcelJS.Row;
  startCol: number;
  endCol: number;
  fontName?: ExcelFontType;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
}

export const moneyFormat =
  '_-"S/"* #,##0.00_-;-"S/"* #,##0.00_-;_-"S/"* "-"??_-;_-@_-';
interface formatExcelStyleProp {
  row: ExcelJS.Row;
  positions: string;
  format: string;
}
interface mergeCellRange {
  wk: ExcelJS.Worksheet;
  positions: string;
  rowNumber: number;
  rowNumber2?: number;
}
interface BorderExcelStyleWithNumber {
  row: ExcelJS.Row;
  initPosition: number;
  finishPosition: number;
  border: Partial<ExcelJS.Borders>;
  counter?: number;
}
interface FillContractStyleWithNumber {
  row: ExcelJS.Row;
  initPosition: number;
  arrColor: string[][];
  counter?: number;
}
export const fillRows = (
  row: ExcelJS.Row,
  posInit: number,
  posFinish: number,
  color: string
) => {
  for (let col = posInit; col <= posFinish; col++) {
    const projectCell = row.getCell(col);
    projectCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
  }
};
export const borderProjectStyle = (row: ExcelJS.Row) => {
  row.getCell('B').border = {
    left: { style: 'medium' },
    right: { style: 'medium' },
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('C').border = {
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('D').border = {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('E').border = {
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('F').border = {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('G').border = {
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('H').border = {
    left: { style: 'thin' },
    right: { style: 'thin' },
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('I').border = {
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
  row.getCell('J').border = {
    left: { style: 'thin' },
    right: { style: 'medium' },
    top: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
    bottom: {
      style: 'thin',
      color: {
        argb: 'ffffff',
      },
    },
  };
};
export const borderReportStyle = (row: ExcelJS.Row) => {
  row.getCell('B').border = {
    left: { style: 'medium' },
    right: { style: 'medium' },
  };
  row.getCell('J').border = {
    left: { style: 'thin' },
    right: { style: 'medium' },
  };
  row.getCell('D').border = {
    left: { style: 'thin' },
    right: { style: 'thin' },
  };
  row.getCell('F').border = {
    left: { style: 'thin' },
    right: { style: 'thin' },
  };
  row.getCell('H').border = {
    left: { style: 'thin' },
    right: { style: 'thin' },
  };
};

export const formatExcelStyle = ({
  row,
  positions,
  format,
}: formatExcelStyleProp) => {
  const splitPositions = positions.split('');
  splitPositions.forEach(pos => {
    row.getCell(pos).numFmt = format;
  });
};
export const formatExcelStyleOtherSeparation = ({
  row,
  positions,
  format,
}: formatExcelStyleProp) => {
  const splitPositions = positions.split(',');
  splitPositions.forEach(pos => {
    row.getCell(pos).numFmt = format;
  });
};

export const mergeCellRange = ({
  wk,
  positions,
  rowNumber,
  rowNumber2,
}: mergeCellRange) => {
  const splitPositions = positions.split('');
  splitPositions.forEach(pos => {
    wk.mergeCells(`${pos}${rowNumber}:${pos}${rowNumber2}`);
  });
};
export const mergeCellRangeWithRow = ({
  wk,
  positions,
  rowNumber,
}: mergeCellRange) => {
  const splitPositions = positions.split(',');
  splitPositions.forEach(pos => {
    const [value1, value2] = pos.split('-');
    wk.mergeCells(`${value1}${rowNumber}:${value2}${rowNumber}`);
  });
};

export const borderExcelStyleWithNumber = ({
  row,
  initPosition,
  finishPosition,
  border,
  counter = 1,
}: BorderExcelStyleWithNumber) => {
  for (let i = initPosition; i < finishPosition; i += counter) {
    row.getCell(i).border = border;
    if (counter) {
      row.getCell(i + 1).border = border;
    }
  }
};
export const fillContractStyleWithNumber = ({
  row,
  initPosition,
  arrColor,
}: FillContractStyleWithNumber) => {
  let j = 0;
  for (let i = initPosition; i < arrColor.length * 3 + initPosition; i += 3) {
    row.getCell(i).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: arrColor[j][0] },
    };
    row.getCell(i + 1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: arrColor[j][1] },
    };
    j++;
  }
  // for (let i = initPosition; i < finishPosition; i += 3) {
  //   const [color1, color2] = arrColor;
  //   row.getCell(i).fill = {
  //     type: 'pattern',
  //     pattern: 'solid',
  //     fgColor: { argb: color1 },
  //   };
  //   row.getCell(i + 1).fill = {
  //     type: 'pattern',
  //     pattern: 'solid',
  //     fgColor: { argb: color2 },
  //   };
  // }
};

export const exportExcel = async (name: string, workbook: ExcelJS.Workbook) => {
  const editedBuffer = await workbook.xlsx.writeBuffer();
  const editedBlob = new Blob([editedBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const editedUrl = URL.createObjectURL(editedBlob);
  const a = document.createElement('a');
  a.href = editedUrl;
  a.download = name;
  a.click();
  //funcion futura para que el reporte se agrega auntomaticamente
  //  isGenerateExcelReport$.setSubject = editedUrl;
  URL.revokeObjectURL(editedUrl);
};
export const fontExcelStyle = ({
  row,
  positions,
  color,
  isBold,
  size,
  name,
}: FontExcelStyle) => {
  const splitPositions = positions.split('');
  splitPositions.forEach(pos => {
    row.getCell(pos).font = {
      color: { argb: color },
      bold: isBold,
      size,
      name,
    };
  });
};

export const getPrice = (counts: UserAttendance, isAdmin?: boolean) => {
  const T = isAdmin ? 1 : 0.5;
  const F = isAdmin ? 20 : 10;
  const G = isAdmin ? 40 : 20;
  const M = isAdmin ? 160 : 80;

  const tarde = counts?.TARDE ?? 0;
  const simple = counts?.SIMPLE ?? 0;
  const grave = counts?.GRAVE ?? 0;
  const muygrave = counts?.MUY_GRAVE ?? 0;

  const result = T * tarde + F * simple + G * grave + M * muygrave;

  return result;
};

/**
 * ========================================
 * NUEVAS FUNCIONES MEJORADAS CON MÁS FUENTES
 * ========================================
 */

/**
 * Convierte color hex a ARGB para Excel
 */
export const hexToArgb = (hex: string): string => {
  const cleanHex = hex.replace('#', '');
  return `FF${cleanHex.toUpperCase()}`;
};

/**
 * Aplica estilos de fuente avanzados a un rango de celdas
 */
export const applyAdvancedFontStyle = ({
  row,
  startCol,
  endCol,
  fontName = 'Calibri',
  fontSize = 11,
  bold = false,
  italic = false,
  underline = false,
  color,
  backgroundColor,
  alignment = 'left',
}: AdvancedFontStyle) => {
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    const selectedFont = fontName && EXCEL_FONTS[fontName] ? EXCEL_FONTS[fontName] : 'Calibri';
    
    // Aplicar fuente
    cell.font = {
      name: selectedFont,
      size: fontSize,
      bold,
      italic,
      underline: underline ? 'single' : undefined,
      color: color ? { argb: hexToArgb(color) } : undefined,
    };

    // Aplicar relleno de fondo
    if (backgroundColor) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: hexToArgb(backgroundColor) },
      };
    }

    // Aplicar alineación
    cell.alignment = {
      horizontal: alignment as any,
      vertical: 'middle',
      wrapText: true,
    };
  }
};

/**
 * Aplica estilos de encabezado de tabla
 */
export const applyTableHeaderStyle = ({
  row,
  startCol,
  endCol,
  fontName = 'Cambria',
  fontSize = 12,
  backgroundColor = '#1b74e4',
  textColor = '#FFFFFF',
}: TableHeaderStyle) => {
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    const selectedFont = fontName && EXCEL_FONTS[fontName] ? EXCEL_FONTS[fontName] : 'Cambria';
    
    cell.font = {
      name: selectedFont,
      size: fontSize,
      bold: true,
      color: { argb: hexToArgb(textColor) },
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(backgroundColor) },
    };

    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };

    // Agregar borde
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  }
};

/**
 * Aplica estilos de cuerpo de tabla
 */
export const applyTableBodyStyle = ({
  row,
  startCol,
  endCol,
  fontName = 'Calibri',
  fontSize = 11,
  backgroundColor = '#FFFFFF',
  textColor = '#000000',
  alignment = 'left',
}: Omit<AdvancedFontStyle, 'row'> & { row: ExcelJS.Row; textColor?: string }) => {
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    const selectedFont = fontName && EXCEL_FONTS[fontName as ExcelFontType] 
      ? EXCEL_FONTS[fontName as ExcelFontType] 
      : 'Calibri';
    
    cell.font = {
      name: selectedFont,
      size: fontSize,
      color: { argb: hexToArgb(textColor || '#000000') },
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(backgroundColor || '#FFFFFF') },
    };

    cell.alignment = {
      horizontal: alignment as any,
      vertical: 'middle',
      wrapText: true,
    };

    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    };
  }
};

/**
 * Aplica estilos de fila alternada para tablas
 */
export const applyAlternateRowStyle = (
  row: ExcelJS.Row,
  startCol: number,
  endCol: number,
  isEvenRow: boolean,
  fontName: ExcelFontType = 'Calibri',
  fontSize: number = 11
) => {
  const bgColor = isEvenRow ? '#F9F9F9' : '#FFFFFF';
  const selectedFont = EXCEL_FONTS[fontName] ? EXCEL_FONTS[fontName] : 'Calibri';
  
  for (let col = startCol; col <= endCol; col++) {
    const cell = row.getCell(col);
    
    cell.font = {
      name: selectedFont,
      size: fontSize,
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: hexToArgb(bgColor) },
    };

    cell.alignment = {
      horizontal: 'left',
      vertical: 'middle',
      wrapText: true,
    };
  }
};

/**
 * Obtiene lista de todas las fuentes disponibles
 */
export const getAvailableFonts = (): ExcelFontType[] => {
  return Object.keys(EXCEL_FONTS) as ExcelFontType[];
};

/**
 * Aplica estilos predefinidos a celdas
 */
export const applyPredefinedStyle = (
  row: ExcelJS.Row,
  startCol: number,
  endCol: number,
  styleType: 'titulo' | 'subtitulo' | 'encabezado' | 'cuerpo' | 'nota' | 'destacado'
) => {
  const styles = {
    titulo: {
      fontName: 'Calibri' as ExcelFontType,
      fontSize: 18,
      bold: true,
      color: '#1b74e4',
      alignment: 'center' as const,
    },
    subtitulo: {
      fontName: 'Calibri' as ExcelFontType,
      fontSize: 14,
      bold: true,
      color: '#2C3E50',
      alignment: 'left' as const,
    },
    encabezado: {
      fontName: 'Cambria' as ExcelFontType,
      fontSize: 12,
      bold: true,
      color: '#FFFFFF',
      backgroundColor: '#1b74e4',
      alignment: 'center' as const,
    },
    cuerpo: {
      fontName: 'Calibri' as ExcelFontType,
      fontSize: 11,
      bold: false,
      color: '#000000',
      alignment: 'left' as const,
    },
    nota: {
      fontName: 'Calibri' as ExcelFontType,
      fontSize: 9,
      bold: false,
      color: '#7F8C8D',
      alignment: 'left' as const,
      italic: true,
    },
    destacado: {
      fontName: 'Cambria' as ExcelFontType,
      fontSize: 12,
      bold: true,
      color: '#FFFFFF',
      backgroundColor: '#E74C3C',
      alignment: 'center' as const,
    },
  };

  const style = styles[styleType];
  applyAdvancedFontStyle({
    row,
    startCol,
    endCol,
    ...style,
  });
};

/**
 * Obtiene disposiciones predefinidas para tablas
 */
export const getTableLayoutPresets = () => {
  return {
    // Ancho de columna de datos
    'datos_estrecho': 8,
    'datos_normal': 15,
    'datos_ancho': 25,
    'datos_muy_ancho': 35,
    
    // Ancho para columnas específicas
    'numero': 8,
    'fecha': 12,
    'descripcion': 30,
    'email': 25,
    'telefono': 15,
    'moneda': 15,
    'porcentaje': 10,
  } as const;
};

