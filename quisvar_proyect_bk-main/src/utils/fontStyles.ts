/**
 * Configuración centralizada de fuentes y estilos
 * Compatible con Office 2019 y más opciones profesionales
 */

export const FONT_FAMILIES = {
  // Fuentes predeterminadas Office 2026
  'Aptos': 'Aptos, sans-serif',
  'Aptos Narrow': 'Aptos Narrow, sans-serif',
  'Aptos Display': 'Aptos Display, sans-serif',

  // Fuentes serif (con remates) - Classic
  'Times New Roman': 'Times New Roman, serif',
  'Cambria': 'Cambria, serif',
  'Georgia': 'Georgia, serif',
  'Garamond': 'Garamond, serif',
  'Palatino Linotype': 'Palatino Linotype, serif',
  'Book Antiqua': 'Book Antiqua, serif',

  // Fuentes sans-serif (sin remates) - Versatile
  'Arial': 'Arial, sans-serif',
  'Arial Black': 'Arial Black, sans-serif',
  'Arial Narrow': 'Arial Narrow, sans-serif',
  'Arial Rounded MT Bold': 'Arial Rounded MT Bold, sans-serif',
  'Arial Unicode MS': 'Arial Unicode MS, sans-serif',
  'Arial Nova': 'Arial Nova, sans-serif',
  'Arial Nova Cond': 'Arial Nova Cond, sans-serif',
  'Calibri': 'Calibri, Carlito, sans-serif',
  'Cambria Math': 'Cambria Math, sans-serif',
  'Segoe UI': 'Segoe UI, sans-serif',
  'Segoe UI Symbol': 'Segoe UI Symbol, sans-serif',
  'Segoe Print': 'Segoe Print, sans-serif',
  'Verdana': 'Verdana, sans-serif',
  'Trebuchet MS': 'Trebuchet MS, sans-serif',
  'Tahoma': 'Tahoma, sans-serif',
  'Lucida Grande': 'Lucida Grande, sans-serif',
  'Lucida Sans Unicode': 'Lucida Sans Unicode, sans-serif',
  'Lucida Sans': 'Lucida Sans, sans-serif',

  // Fuentes Monospace
  'Courier New': 'Courier New, monospace',
  'Lucida Console': 'Lucida Console, monospace',
  'Courier': 'Courier, monospace',
  'OCR-A': 'OCR-A, monospace',

  // Fuentes modernas/contemporáneas
  'Helvetica': 'Helvetica Neue, Helvetica, sans-serif',
  'Helvetica Neue': 'Helvetica Neue, sans-serif',
  'Segoe Nova': 'Segoe Nova, sans-serif',
  'Corbel': 'Corbel, sans-serif',
  'Calibri Light': 'Calibri Light, sans-serif',
  'Constantia': 'Constantia, serif',
  'Consolas': 'Consolas, monospace',

  // Fuentes decorativas/especiales - Script & Display
  'Comic Sans MS': 'Comic Sans MS, cursive',
  'Impact': 'Impact, sans-serif',
  'Lucida Handwriting': 'Lucida Handwriting, cursive',
  'Broadway': 'Broadway, sans-serif',
  'Century Schoolbook': 'Century Schoolbook, serif',

  // Fuentes más pesadas/artísticas
  'Artifakt Element': 'Artifakt Element, sans-serif',
  'Artifakt Element Heavy': 'Artifakt Element Heavy, sans-serif',

  // Fuentes adicionales de Microsoft Office
  'Century': 'Century, serif',
  'Century Gothic': 'Century Gothic, sans-serif',
  'Footlight MT Light': 'Footlight MT Light, sans-serif',
  'Gill Sans': 'Gill Sans, sans-serif',
  'Gill Sans Nova': 'Gill Sans Nova, sans-serif',
  'Gill Sans MT': 'Gill Sans MT, sans-serif',
  'Jokerman': 'Jokerman, cursive',
  'Lucida Fax': 'Lucida Fax, serif',
  'Perpetua': 'Perpetua, serif',
  'Perpetua Titling MT': 'Perpetua Titling MT, serif',
  'Sylfaen': 'Sylfaen, serif',

  // Más fuentes técnicas/temáticas
  'Franklin Gothic': 'Franklin Gothic, sans-serif',
  'Franklin Gothic Medium': 'Franklin Gothic Medium, sans-serif',
  'Habibi': 'Habibi, serif',
  'Helvetica Kondensed': 'Helvetica Kondensed, sans-serif',
  'Informal Roman': 'Informal Roman, serif',
  'Inscribe': 'Inscribe, serif',

  // Fuentes de simbolos y especiales
  'Wingdings': 'Wingdings, sans-serif',
  'Wingdings 2': 'Wingdings 2, sans-serif',
  'Wingdings 3': 'Wingdings 3, sans-serif',
  'Webdings': 'Webdings, sans-serif',
  'Symbol': 'Symbol, sans-serif',
  'Marlett': 'Marlett, sans-serif',

  // Más fuentes artísticas
  'Monotype Corsiva': 'Monotype Corsiva, cursive',
  'Monotype Sorts': 'Monotype Sorts, sans-serif',
  'MT Extra': 'MT Extra, sans-serif',
  'Old English Text': 'Old English Text, serif',
  'Playbill': 'Playbill, serif',
  'Showcard Gothic': 'Showcard Gothic, sans-serif',
  'Stencil': 'Stencil, sans-serif',
  'Tempus Sans ITC': 'Tempus Sans ITC, sans-serif',

  // Adicionales encontradas en Office 2026
  'Agency FB': 'Agency FB, sans-serif',
  'Algerian': 'Algerian, sans-serif',
  'Baskerville Old Face': 'Baskerville Old Face, serif',
  'Bauhaus 93': 'Bauhaus 93, sans-serif',
  'Bell MT': 'Bell MT, serif',
  'Berlin Sans FB': 'Berlin Sans FB, sans-serif',
  'Berlin Sans FB Demi': 'Berlin Sans FB Demi, sans-serif',
  'Bernard MT Condensed': 'Bernard MT Condensed, sans-serif',
  'Blackadder ITC': 'Blackadder ITC, serif',
  'Bodoni MT': 'Bodoni MT, serif',
  'Bodoni MT Black': 'Bodoni MT Black, serif',
  'Bodoni MT Poster Compressed': 'Bodoni MT Poster Compressed, serif',
  'Bookman Old Style': 'Bookman Old Style, serif',
  'Braggadocio': 'Braggadocio, serif',
  'Britannic Bold': 'Britannic Bold, sans-serif',
  'Brush Script MT': 'Brush Script MT, cursive',
  'Californian FB': 'Californian FB, serif',
  'Calisto MT': 'Calisto MT, serif',
  'Candara': 'Candara, sans-serif',
  'Candara Light': 'Candara Light, sans-serif',
  'Cantarell': 'Cantarell, sans-serif',
  'Castellar': 'Castellar, serif',
  'Catch Me If You Can': 'Catch Me If You Can, cursive',
  'Caveat': 'Caveat, cursive',
  'Caveat Brush': 'Caveat Brush, cursive',
  'Chiller': 'Chiller, cursive',
  'Colonna MT': 'Colonna MT, serif',
  'Cooper Black': 'Cooper Black, sans-serif',
  'Copperplate': 'Copperplate, serif',
  'Copperplate Gothic Bold': 'Copperplate Gothic Bold, serif',
  'Copperplate Gothic Light': 'Copperplate Gothic Light, serif',
  'Cordia New': 'Cordia New, cursive',
  'Curlz MT': 'Curlz MT, cursive',
  'Cutive': 'Cutive, serif',
  'Cutive Mono': 'Cutive Mono, monospace',
  'DejaVu Sans': 'DejaVu Sans, sans-serif',
  'DejaVu Sans Condensed': 'DejaVu Sans Condensed, sans-serif',
  'DejaVu Sans Mono': 'DejaVu Sans Mono, monospace',
  'DejaVu Serif': 'DejaVu Serif, serif',
  'DejaVu Serif Condensed': 'DejaVu Serif Condensed, serif',
  'Dosis': 'Dosis, sans-serif',
  'Double Pica': 'Double Pica, serif',
  'Eras ITC': 'Eras ITC, sans-serif',
  'Estrangelo Edessa': 'Estrangelo Edessa, serif',
  'Eustace': 'Eustace, serif',
  'Eurostile': 'Eurostile, sans-serif',
  'Eurostile Extended': 'Eurostile Extended, sans-serif',
  'Fangzheng Fang Song': 'Fangzheng Fang Song, serif',
  'Felix Titling': 'Felix Titling, sans-serif',
  'Fine Hand': 'Fine Hand, cursive',
  'Fixedsys': 'Fixedsys, monospace',
  'Forte': 'Forte, cursive',
  'Franklin Gothic Book': 'Franklin Gothic Book, sans-serif',
  'Franklin Gothic Demi': 'Franklin Gothic Demi, sans-serif',
  'Franklin Gothic Demi Cond': 'Franklin Gothic Demi Cond, sans-serif',
  'Franklin Gothic Heavy': 'Franklin Gothic Heavy, sans-serif',
  'Franklin Gothic Medium Cond': 'Franklin Gothic Medium Cond, sans-serif',
  'Freesia': 'Freesia, cursive',
  'French Script MT': 'French Script MT, cursive',
  'Garuda': 'Garuda, sans-serif',
  'Gaur Brahmi': 'Gaur Brahmi, serif',
  'Gautami': 'Gautami, sans-serif',
  'Geeza Pro': 'Geeza Pro, serif',
  'Geometric 415': 'Geometric 415, sans-serif',
  'Geometric 706': 'Geometric 706, sans-serif',
  'Georgiana': 'Georgiana, serif',
  'Gigi': 'Gigi, cursive',
  'Gill Sans MT Condensed': 'Gill Sans MT Condensed, sans-serif',
  'Gill Sans MT Ext Condensed': 'Gill Sans MT Ext Condensed, sans-serif',
  'Gill Sans Ultra Bold': 'Gill Sans Ultra Bold, sans-serif',
  'Gill Sans Ultra Bold Condensed': 'Gill Sans Ultra Bold Condensed, sans-serif',
  'Gisha': 'Gisha, sans-serif',
  'Gloucester MT Extra Condensed': 'Gloucester MT Extra Condensed, serif',
  'Go Mono': 'Go Mono, monospace',
  'Go Regular': 'Go Regular, sans-serif',
  'Goudy Old Style': 'Goudy Old Style, serif',
  'Goudy Stout': 'Goudy Stout, serif',
  'Grandstand': 'Grandstand, sans-serif',
  'Grantha': 'Grantha, serif',
  'Graphik': 'Graphik, sans-serif',
  'Graycliff': 'Graycliff, cursive',
  'Greasepaint': 'Greasepaint, cursive',
  'Grenze': 'Grenze, serif',
  'Grenze Gotisch': 'Grenze Gotisch, serif',
  'Grey': 'Grey, sans-serif',
  'Grifter': 'Grifter, sans-serif',
  'Gripen': 'Gripen, sans-serif',
  'Grouch': 'Grouch, cursive',
  'Hadley': 'Hadley, cursive',
  'Hagin': 'Hagin, serif',
  'Hagin Caps': 'Hagin Caps, serif',
  'Hagin Single Caps': 'Hagin Single Caps, serif',
  'HairlineGothicFLF': 'HairlineGothicFLF, sans-serif',
  'HallFetica': 'HallFetica, serif',
  'Hampshire': 'Hampshire, serif',
  'Handmade Egyptian': 'Handmade Egyptian, serif',
  'Hanuman': 'Hanuman, serif',
  'Happy Monotype': 'Happy Monotype, cursive',
  'Harlow Solid Italic': 'Harlow Solid Italic, cursive',
  'Harrington': 'Harrington, cursive',
  'Harvest': 'Harvest, cursive',
  'Harvesta': 'Harvesta, cursive',
  'Hausman': 'Hausman, sans-serif',
  'Havana': 'Havana, serif',
  'Havelange': 'Havelange, serif',
  'Hawking': 'Hawking, cursive',
  'Haymaker': 'Haymaker, cursive',
  'Hddbtvn': 'Hddbtvn, serif',
  'Headliner No. 45': 'Headliner No. 45, sans-serif',
  'Headliners Black': 'Headliners Black, sans-serif',
  'Headliners Gothic': 'Headliners Gothic, sans-serif',
  'Headway': 'Headway, sans-serif',
  'Headway Black': 'Headway Black, sans-serif',
  'Headway Gothic': 'Headway Gothic, sans-serif',
  'Heatwave': 'Heatwave, cursive',
  'Hebrew': 'Hebrew, serif',
  'Heisei Kaku Gothic': 'Heisei Kaku Gothic, sans-serif',
  'Heisei Kaku Gothic W5': 'Heisei Kaku Gothic W5, sans-serif',
  'Heiti SC': 'Heiti SC, sans-serif',
  'Heiti TC': 'Heiti TC, sans-serif',
  'Helix': 'Helix, sans-serif',
  'Hellenic': 'Hellenic, serif',
  'Helvetica Narrow': 'Helvetica Narrow, sans-serif',
  'Helvetica Neue Condensed': 'Helvetica Neue Condensed, sans-serif',
  'Helvetica Neue Light': 'Helvetica Neue Light, sans-serif',
  'Helvetica Neue Thin': 'Helvetica Neue Thin, sans-serif',
  'Helvetica Neue Ultra Light': 'Helvetica Neue Ultra Light, sans-serif',
  'Helvetica Neue UltraLight': 'Helvetica Neue UltraLight, sans-serif',
  'Helvetica Neue World': 'Helvetica Neue World, sans-serif',
  'Helvetica Neue World UI': 'Helvetica Neue World UI, sans-serif',
  'Helvetica Neue World UI Condensed': 'Helvetica Neue World UI Condensed, sans-serif',
  'Helvetica Neue World UI Light': 'Helvetica Neue World UI Light, sans-serif',
  'Helvetica Neue World UI Thin': 'Helvetica Neue World UI Thin, sans-serif',
  'Helvetica Neue World UI UltraLight': 'Helvetica Neue World UI UltraLight, sans-serif',
  'HelveticaNeueDeskUI': 'HelveticaNeueDeskUI, sans-serif',
  'HelveticaNeueW01-45Ligh': 'HelveticaNeueW01-45Ligh, sans-serif',
  'HelveticaNeueW01-47CondHv': 'HelveticaNeueW01-47CondHv, sans-serif',
  'HelveticaNeueW01-55Roma': 'HelveticaNeueW01-55Roma, sans-serif',
  'HelveticaNeueW01-65Medi': 'HelveticaNeueW01-65Medi, sans-serif',
  'HelveticaNeueW01-67MediCond': 'HelveticaNeueW01-67MediCond, sans-serif',
  'HelveticaNeueW01-75Bold': 'HelveticaNeueW01-75Bold, sans-serif',
  'HelveticaNeueW01-85HeavyExt': 'HelveticaNeueW01-85HeavyExt, sans-serif',
  'HelveticaNeueW01-95Black': 'HelveticaNeueW01-95Black, sans-serif',
  'Henkel Fraktur': 'Henkel Fraktur, serif',
  'Herb': 'Herb, cursive',
  'Hermes': 'Hermes, serif',
  'Hermes Bold': 'Hermes Bold, serif',
  'Hermit': 'Hermit, monospace',
  'Hermon': 'Hermon, serif',
  'Herondus': 'Herondus, serif',
  'HersheysComplex': 'HersheysComplex, serif',
  'HersheyComplexSmall': 'HersheyComplexSmall, serif',
  'HersheyDuplexComplex': 'HersheyDuplexComplex, serif',
  'HersheyDuplexComplexItalic': 'HersheyDuplexComplexItalic, serif',
  'HersheyDuplexComplexSmall': 'HersheyDuplexComplexSmall, serif',
  'HersheyDuplexSimple': 'HersheyDuplexSimple, serif',
  'HersheyDuplexSimpleSmall': 'HersheyDuplexSimpleSmall, serif',
  'HersheyGothicEnglish': 'HersheyGothicEnglish, serif',
  'HersheyGothicGerman': 'HersheyGothicGerman, serif',
  'HersheyGothicItalian': 'HersheyGothicItalian, serif',
  'HersheyItalic': 'HersheyItalic, serif',
  'HersheyMarathon': 'HersheyMarathon, serif',
  'HersheyMonoComplex': 'HersheyMonoComplex, monospace',
  'HersheyMonoComplexSmall': 'HersheyMonoComplexSmall, monospace',
  'HersheyMonoSimple': 'HersheyMonoSimple, monospace',
  'HersheyMonoSimpleSmall': 'HersheyMonoSimpleSmall, monospace',
  'HersheySans1': 'HersheySans1, sans-serif',
  'HersheySans1Bold': 'HersheySans1Bold, sans-serif',
  'HersheySans1BoldItalic': 'HersheySans1BoldItalic, sans-serif',
  'HersheySans1Italic': 'HersheySans1Italic, sans-serif',
  'HersheySans1Medium': 'HersheySans1Medium, sans-serif',
  'HersheySans1MediumItalic': 'HersheySans1MediumItalic, sans-serif',
  'HersheySans1SmallCaps': 'HersheySans1SmallCaps, sans-serif',
  'HersheySerif1': 'HersheySerif1, serif',
  'HersheySerif1Bold': 'HersheySerif1Bold, serif',
  'HersheySerif1BoldItalic': 'HersheySerif1BoldItalic, serif',
  'HersheySerif1Italic': 'HersheySerif1Italic, serif',
  'HersheySerif1Medium': 'HersheySerif1Medium, serif',
  'HersheySerif1MediumItalic': 'HersheySerif1MediumItalic, serif',
  'HersheySerif1SmallCaps': 'HersheySerif1SmallCaps, serif',
  'HersheySimplComplex': 'HersheySimplComplex, serif',
  'HersheySimplComplexSmall': 'HersheySimplComplexSmall, serif',
  'HersheySimplDuplex': 'HersheySimplDuplex, serif',
  'HersheySimplDuplexSmall': 'HersheySimplDuplexSmall, serif',
  'HersheySimplGothic': 'HersheySimplGothic, serif',
  'HersheySimplGothicSmall': 'HersheySimplGothicSmall, serif',
  'HersheySimplGothicSmallItalic': 'HersheySimplGothicSmallItalic, serif',
  'HersheySimplItalic': 'HersheySimplItalic, serif',
  'HersheySimplItalicSmall': 'HersheySimplItalicSmall, serif',
  'HersheySimplMarathon': 'HersheySimplMarathon, serif',
  'HersheySimplMarathonSmall': 'HersheySimplMarathonSmall, serif',
  'HersheySimplMarathonSmallItalic': 'HersheySimplMarathonSmallItalic, serif',
  'HersheySimplSmall': 'HersheySimplSmall, serif',
  'HersheySimplSmallItalic': 'HersheySimplSmallItalic, serif',
  'HersheyTriplex': 'HersheyTriplex, serif',
  'HersheyTriplexItalic': 'HersheyTriplexItalic, serif',
  'HersheyTriplexSmall': 'HersheyTriplexSmall, serif',
  'HersheyTriplexSmallItalic': 'HersheyTriplexSmallItalic, serif',
} as const;

export type FontFamily = keyof typeof FONT_FAMILIES;

export const FONT_SIZES = {
  'pequeño': 10,
  'pequeño_medio': 11,
  'normal': 12,
  'medio': 13,
  'grande': 14,
  'muy_grande': 16,
  'titulo_pequeño': 18,
  'titulo': 20,
  'titulo_grande': 22,
  'titulo_xl': 24,
  'titulo_2xl': 28,
  'titulo_3xl': 32,
  'titulo_4xl': 36,
  'titulo_5xl': 44,
  'titulo_6xl': 48,
} as const;

export type FontSize = keyof typeof FONT_SIZES;

export const FONT_WEIGHTS = {
  'ligero': 300,
  'normal': 400,
  'semibold': 600,
  'bold': 700,
  'extra_bold': 800,
  'negro': 900,
} as const;

export type FontWeight = keyof typeof FONT_WEIGHTS;

export const TEXT_ALIGNMENTS = {
  'izquierda': 'left',
  'centro': 'center',
  'derecha': 'right',
  'justificado': 'justify',
} as const;

export type TextAlignment = keyof typeof TEXT_ALIGNMENTS;

export const LINE_SPACINGS = {
  'sencillo': 1.0,
  'uno_punto_cinco': 1.5,
  'doble': 2.0,
  'minimizado': 0.8,
  'expandido': 2.5,
} as const;

export type LineSpacing = keyof typeof LINE_SPACINGS;

export const COLOR_PALETTES = {
  // Colores neutros
  'negro': '#000000',
  'gris_oscuro': '#2C3E50',
  'gris': '#7F8C8D',
  'gris_claro': '#BDC3C7',
  'blanco': '#FFFFFF',

  // Colores corporativos (ajusta según tu marca)
  'primario': '#1b74e4',
  'secundario': '#141823',
  'éxito': '#27AE60',
  'advertencia': '#F39C12',
  'error': '#E74C3C',
  'info': '#3498DB',

  // Colores adicionales
  'azul': '#0066CC',
  'rojo': '#CC0000',
  'verde': '#008000',
  'naranja': '#FF9900',
} as const;

export type ColorPalette = keyof typeof COLOR_PALETTES;

/**
 * Estilos predefinidos para documentos
 */
export const DOCUMENT_STYLES = {
  titulo_documento: {
    fontFamily: 'Calibri',
    fontSize: 24,
    fontWeight: 'bold',
    color: 'primario',
    alignment: 'centro',
    lineSpacing: 'sencillo',
  },
  titulo_seccion: {
    fontFamily: 'Calibri',
    fontSize: 18,
    fontWeight: 'bold',
    color: 'secundario',
    alignment: 'izquierda',
    lineSpacing: 'sencillo',
  },
  titulo_subseccion: {
    fontFamily: 'Calibri',
    fontSize: 14,
    fontWeight: 'semibold',
    color: 'secundario',
    alignment: 'izquierda',
    lineSpacing: 'sencillo',
  },
  cuerpo: {
    fontFamily: 'Calibri',
    fontSize: 12,
    fontWeight: 'normal',
    color: 'negro',
    alignment: 'justificado',
    lineSpacing: 'uno_punto_cinco',
  },
  nota: {
    fontFamily: 'Calibri',
    fontSize: 10,
    fontWeight: 'normal',
    color: 'gris',
    alignment: 'izquierda',
    lineSpacing: 'sencillo',
  },
  encabezado_tabla: {
    fontFamily: 'Cambria',
    fontSize: 12,
    fontWeight: 'bold',
    color: 'blanco',
    alignment: 'centro',
    lineSpacing: 'sencillo',
  },
  cuerpo_tabla: {
    fontFamily: 'Calibri',
    fontSize: 11,
    fontWeight: 'normal',
    color: 'negro',
    alignment: 'izquierda',
    lineSpacing: 'sencillo',
  },
  destacado: {
    fontFamily: 'Cambria',
    fontSize: 14,
    fontWeight: 'bold',
    color: 'error',
    alignment: 'izquierda',
    lineSpacing: 'sencillo',
  },
  enfasis: {
    fontFamily: 'Calibri',
    fontSize: 12,
    fontWeight: 'semibold',
    color: 'primario',
    alignment: 'izquierda',
    lineSpacing: 'sencillo',
  },
} as const;

/**
 * Clase auxiliar para generar estilos HTML
 */
export class StyleGenerator {
  /**
   * Genera un string de estilo CSS a partir de propiedades
   */
  static generateHtmlStyle(props: {
    fontFamily?: FontFamily;
    fontSize?: FontSize | number;
    fontWeight?: FontWeight | number;
    color?: ColorPalette | string;
    alignment?: TextAlignment;
    lineHeight?: LineSpacing | number;
    marginTop?: number;
    marginBottom?: number;
    padding?: number;
    letterSpacing?: number;
  }): string {
    const styles: string[] = [];

    if (props.fontFamily) {
      styles.push(`font-family: ${FONT_FAMILIES[props.fontFamily]}`);
    }

    if (props.fontSize) {
      const size = typeof props.fontSize === 'number' 
        ? props.fontSize 
        : FONT_SIZES[props.fontSize];
      styles.push(`font-size: ${size}px`);
    }

    if (props.fontWeight) {
      const weight = typeof props.fontWeight === 'number'
        ? props.fontWeight
        : FONT_WEIGHTS[props.fontWeight];
      styles.push(`font-weight: ${weight}`);
    }

    if (props.color) {
      const color = props.color in COLOR_PALETTES
        ? COLOR_PALETTES[props.color as ColorPalette]
        : props.color;
      styles.push(`color: ${color}`);
    }

    if (props.alignment) {
      styles.push(`text-align: ${TEXT_ALIGNMENTS[props.alignment]}`);
    }

    if (props.lineHeight) {
      const lineHeight = typeof props.lineHeight === 'number'
        ? props.lineHeight
        : LINE_SPACINGS[props.lineHeight];
      styles.push(`line-height: ${lineHeight}`);
    }

    if (props.marginTop) {
      styles.push(`margin-top: ${props.marginTop}px`);
    }

    if (props.marginBottom) {
      styles.push(`margin-bottom: ${props.marginBottom}px`);
    }

    if (props.padding) {
      styles.push(`padding: ${props.padding}px`);
    }

    if (props.letterSpacing) {
      styles.push(`letter-spacing: ${props.letterSpacing}px`);
    }

    return styles.join('; ');
  }

  /**
   * Genera estilos para Excel usando una estructura predefinida
   */
  static generateExcelStyle(props: {
    fontFamily?: FontFamily;
    fontSize?: number;
    fontWeight?: FontWeight | number;
    color?: ColorPalette | string;
    alignment?: TextAlignment;
    isBold?: boolean;
  }) {
    const weight = props.fontWeight 
      ? typeof props.fontWeight === 'number'
        ? props.fontWeight
        : FONT_WEIGHTS[props.fontWeight]
      : undefined;

    const color = props.color
      ? props.color in COLOR_PALETTES
        ? COLOR_PALETTES[props.color as ColorPalette]
        : props.color
      : undefined;

    return {
      font: {
        name: props.fontFamily ? props.fontFamily : 'Calibri',
        size: props.fontSize || 11,
        bold: props.isBold || weight === FONT_WEIGHTS.bold || weight === FONT_WEIGHTS.extra_bold,
        italic: false,
        color: color ? { argb: this.hexToArgb(color) } : undefined,
      },
      alignment: props.alignment ? {
        horizontal: TEXT_ALIGNMENTS[props.alignment] as any,
        vertical: 'middle',
        wrapText: true,
      } : undefined,
    };
  }

  /**
   * Convierte color hexadecimal a ARGB para Excel
   */
  private static hexToArgb(hex: string): string {
    // Elimina el # si existe
    const cleanHex = hex.replace('#', '');
    // Retorna en formato ARGB (FF para opacidad + RGB)
    return `FF${cleanHex.toUpperCase()}`;
  }

  /**
   * Obtiene un estilo predefinido
   */
  static getDocumentStyle(styleKey: keyof typeof DOCUMENT_STYLES) {
    return DOCUMENT_STYLES[styleKey];
  }
}

/**
 * Disposiciones de página (layouts)
 */
export const PAGE_LAYOUTS = {
  'normal': {
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 25,
    width: 210,
    height: 297,
  },
  'compacto': {
    marginTop: 15,
    marginBottom: 15,
    marginLeft: 15,
    marginRight: 15,
    width: 210,
    height: 297,
  },
  'amplio': {
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 30,
    marginRight: 30,
    width: 210,
    height: 297,
  },
  'horizontal': {
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 25,
    width: 297,
    height: 210,
  },
} as const;

export type PageLayout = keyof typeof PAGE_LAYOUTS;

/**
 * Disposiciones de columnas
 */
export const COLUMN_LAYOUTS = {
  'una_columna': [100],
  'dos_columnas_iguales': [50, 50],
  'dos_columnas_desequilibradas': [30, 70],
  'tres_columnas': [33.33, 33.33, 33.34],
  'cuatro_columnas': [25, 25, 25, 25],
  'tabla_completa': [100],
} as const;

export type ColumnLayout = keyof typeof COLUMN_LAYOUTS;
