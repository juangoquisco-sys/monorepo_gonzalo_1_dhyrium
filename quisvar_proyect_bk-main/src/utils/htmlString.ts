/**
 * Sistema de generación de HTML con estilos mejorados
 * Compatible con Office 2019 y más opciones profesionales
 */

// Definición de fuentes disponibles (Office 2026 completo)
export const HTML_FONTS = {
  // Fuentes predeterminadas Office 2026
  'Aptos': "'Aptos', sans-serif",
  'Aptos Narrow': "'Aptos Narrow', sans-serif",
  'Aptos Display': "'Aptos Display', sans-serif",

  // Fuentes serif (con remates)
  'Times New Roman': "'Times New Roman', serif",
  'Cambria': "'Cambria', serif",
  'Georgia': "'Georgia', serif",
  'Garamond': "'Garamond', serif",
  'Palatino Linotype': "'Palatino Linotype', serif",
  'Book Antiqua': "'Book Antiqua', serif",
  'Century': "'Century', serif",
  'Century Schoolbook': "'Century Schoolbook', serif",
  'Constantia': "'Constantia', serif",
  'Perpetua': "'Perpetua', serif",
  'Sylfaen': "'Sylfaen', serif",
  'Lucida Fax': "'Lucida Fax', serif",
  'Habibi': "'Habibi', serif",
  'Baskerville Old Face': "'Baskerville Old Face', serif",

  // Fuentes sans-serif principales
  'Arial': "'Arial', sans-serif",
  'Arial Black': "'Arial Black', sans-serif",
  'Arial Narrow': "'Arial Narrow', sans-serif",
  'Arial Rounded MT Bold': "'Arial Rounded MT Bold', sans-serif",
  'Arial Unicode MS': "'Arial Unicode MS', sans-serif",
  'Arial Nova': "'Arial Nova', sans-serif",
  'Calibri': "'Calibri', sans-serif",
  'Calibri Light': "'Calibri Light', sans-serif",
  'Cambria Math': "'Cambria Math', sans-serif",
  'Segoe UI': "'Segoe UI', sans-serif",
  'Segoe UI Symbol': "'Segoe UI Symbol', sans-serif",
  'Segoe Print': "'Segoe Print', sans-serif",
  'Verdana': "'Verdana', sans-serif",
  'Trebuchet MS': "'Trebuchet MS', sans-serif",
  'Tahoma': "'Tahoma', sans-serif",
  'Lucida Grande': "'Lucida Grande', sans-serif",
  'Lucida Sans Unicode': "'Lucida Sans Unicode', sans-serif",
  'Lucida Sans': "'Lucida Sans', sans-serif",
  'Corbel': "'Corbel', sans-serif",
  'Gill Sans': "'Gill Sans', sans-serif",
  'Gill Sans MT': "'Gill Sans MT', sans-serif",
  'Gill Sans Nova': "'Gill Sans Nova', sans-serif",
  'Franklin Gothic': "'Franklin Gothic', sans-serif",
  'Franklin Gothic Medium': "'Franklin Gothic Medium', sans-serif",
  'Franklin Gothic Book': "'Franklin Gothic Book', sans-serif",
  'Franklin Gothic Demi': "'Franklin Gothic Demi', sans-serif",

  // Fuentes Monospace
  'Courier New': "'Courier New', monospace",
  'Consolas': "'Consolas', monospace",
  'Lucida Console': "'Lucida Console', monospace",
  'Courier': "'Courier', monospace",
  'OCR-A': "'OCR-A', monospace",
  'Fixedsys': "'Fixedsys', monospace",

  // Fuentes decorativas/especiales
  'Comic Sans MS': "'Comic Sans MS', cursive",
  'Impact': "'Impact', sans-serif",
  'Lucida Handwriting': "'Lucida Handwriting', cursive",
  'Broadway': "'Broadway', sans-serif",
  'Jokerman': "'Jokerman', cursive",
  'Playbill': "'Playbill', serif",
  'Stencil': "'Stencil', sans-serif",
  'Showcard Gothic': "'Showcard Gothic', sans-serif",
  'Colonna MT': "'Colonna MT', serif",
  'Cooper Black': "'Cooper Black', sans-serif",
  'Copperplate': "'Copperplate', serif",
  'Copperplate Gothic Bold': "'Copperplate Gothic Bold', serif",
  'Copperplate Gothic Light': "'Copperplate Gothic Light', serif",
  'Curlz MT': "'Curlz MT', cursive",
  'Engravers MT': "'Engravers MT', serif",
  'Footlight MT Light': "'Footlight MT Light', sans-serif",
  'Forte': "'Forte', cursive",
  'French Script MT': "'French Script MT', cursive",
  'Gigi': "'Gigi', cursive",
  'Harrington': "'Harrington', cursive",
  'Informal Roman': "'Informal Roman', serif",
  'Inscribe': "'Inscribe', serif",

  // Fuentes adicionales Microsoft Office
  'Agency FB': "'Agency FB', sans-serif",
  'Algerian': "'Algerian', sans-serif",
  'Bauhaus 93': "'Bauhaus 93', sans-serif",
  'Bell MT': "'Bell MT', serif",
  'Berlin Sans FB': "'Berlin Sans FB', sans-serif",
  'Berlin Sans FB Demi': "'Berlin Sans FB Demi', sans-serif",
  'Bernard MT Condensed': "'Bernard MT Condensed', sans-serif",
  'Blackadder ITC': "'Blackadder ITC', serif",
  'Bodoni MT': "'Bodoni MT', serif",
  'Bodoni MT Black': "'Bodoni MT Black', serif",
  'Bodoni MT Poster Compressed': "'Bodoni MT Poster Compressed', serif",
  'Bookman Old Style': "'Bookman Old Style', serif",
  'Braggadocio': "'Braggadocio', serif",
  'Britannic Bold': "'Britannic Bold', sans-serif",
  'Brush Script MT': "'Brush Script MT', cursive",
  'Californian FB': "'Californian FB', serif",
  'Calisto MT': "'Calisto MT', serif",
  'Castellar': "'Castellar', serif",
  'Century Gothic': "'Century Gothic', sans-serif",
  'Chiller': "'Chiller', cursive",
  'Freestyle Script': "'Freestyle Script', cursive",
  'Gloucester MT Extra Condensed': "'Gloucester MT Extra Condensed', serif",
  'Goudy Old Style': "'Goudy Old Style', serif",
  'Goudy Stout': "'Goudy Stout', serif",
  'Harlow Solid Italic': "'Harlow Solid Italic', cursive",
  'High Tower Text': "'High Tower Text', serif",
  'Matura MT Script Capitals': "'Matura MT Script Capitals', cursive",
  'Microsoft Himalaya': "'Microsoft Himalaya', sans-serif",
  'Microsoft JhengHei': "'Microsoft JhengHei', sans-serif",
  'Microsoft JhengHei Light': "'Microsoft JhengHei Light', sans-serif",
  'Microsoft JhengHei UI': "'Microsoft JhengHei UI', sans-serif",
  'Microsoft New Tai Lue': "'Microsoft New Tai Lue', sans-serif",
  'Microsoft PhagsPa': "'Microsoft PhagsPa', sans-serif",
  'Microsoft Sans Serif': "'Microsoft Sans Serif', sans-serif",
  'Microsoft Tai Le': "'Microsoft Tai Le', sans-serif",
  'Microsoft Uighur': "'Microsoft Uighur', sans-serif",
  'Microsoft YaHei': "'Microsoft YaHei', sans-serif",
  'Microsoft YaHei Light': "'Microsoft YaHei Light', sans-serif",
  'Microsoft YaHei Mono': "'Microsoft YaHei Mono', monospace",
  'Microsoft YaHei UI': "'Microsoft YaHei UI', sans-serif",
  'Mistral': "'Mistral', cursive",
  'Monotype Corsiva': "'Monotype Corsiva', cursive",
  'Monotype Sorts': "'Monotype Sorts', sans-serif",
  'MT Extra': "'MT Extra', sans-serif",
  'Niagara Engraved': "'Niagara Engraved', serif",
  'Niagara Solid': "'Niagara Solid', serif",
  'Old English Text': "'Old English Text', serif",
  'Palace Script MT': "'Palace Script MT', cursive",
  'Papyrus': "'Papyrus', serif",
  'Parchment': "'Parchment', cursive",
  'Perpetua Titling MT': "'Perpetua Titling MT', serif",
  'Ravie': "'Ravie', cursive",
  'Rockwell': "'Rockwell', serif",
  'Rockwell Condensed': "'Rockwell Condensed', serif",
  'Rockwell Extra Bold': "'Rockwell Extra Bold', serif",
  'Script MT Bold': "'Script MT Bold', cursive",
  'Snap ITC': "'Snap ITC', cursive",
  'Tempus Sans ITC': "'Tempus Sans ITC', sans-serif",
  'Terminal': "'Terminal', monospace",
  'Tw Cen MT': "'Tw Cen MT', sans-serif",
  'Tw Cen MT Condensed': "'Tw Cen MT Condensed', sans-serif",
  'Tw Cen MT Condensed Extra Bold': "'Tw Cen MT Condensed Extra Bold', sans-serif",
  'Viner Hand ITC': "'Viner Hand ITC', cursive",
  'Vivaldi': "'Vivaldi', cursive",
  'Vladimir Script': "'Vladimir Script', cursive",
  'Webdings': "'Webdings', sans-serif",
  'Wingdings': "'Wingdings', sans-serif",
  'Wingdings 2': "'Wingdings 2', sans-serif",
  'Wingdings 3': "'Wingdings 3', sans-serif",

  // Fuentes modernas alternativas
  'Helvetica': "'Helvetica Neue', 'Helvetica', 'Lucida Grande', 'tahoma', 'verdana', 'arial', sans-serif",
  'Helvetica Neue': "'Helvetica Neue', sans-serif",

  // Fuentes internacionales/libres
  'Noto Sans': "'Noto Sans', sans-serif",
  'Noto Serif': "'Noto Serif', serif",
  'Liberation Sans': "'Liberation Sans', sans-serif",
  'Liberation Serif': "'Liberation Serif', serif",
  'Liberation Mono': "'Liberation Mono', monospace",
  'DejaVu Sans': "'DejaVu Sans', sans-serif",
  'DejaVu Serif': "'DejaVu Serif', serif",
  'DejaVu Sans Mono': "'DejaVu Sans Mono', monospace",
  'Bitstream Vera Sans': "'Bitstream Vera Sans', sans-serif",
  'Bitstream Vera Serif': "'Bitstream Vera Serif', serif",
  'Bitstream Vera Sans Mono': "'Bitstream Vera Sans Mono', monospace",
} as const;

// Paleta de colores corporativos
export const HTML_COLORS = {
  'primario': '#1b74e4',
  'primario_oscuro': '#0056b3',
  'secundario': '#141823',
  'éxito': '#27AE60',
  'advertencia': '#F39C12',
  'error': '#E74C3C',
  'info': '#3498DB',
  'gris_oscuro': '#2C3E50',
  'gris': '#7F8C8D',
  'gris_claro': '#BDC3C7',
  'blanco': '#FFFFFF',
  'negro': '#000000',
} as const;

/**
 * Generador de estilos HTML con múltiples opciones
 */
export class HtmlStyleBuilder {
  private styles: Record<string, string> = {};

  constructor() {}

  /**
   * Establece la fuente
   */
  setFont(fontFamily: keyof typeof HTML_FONTS): this {
    this.styles['font-family'] = HTML_FONTS[fontFamily];
    return this;
  }

  /**
   * Establece el tamaño de fuente
   */
  setFontSize(size: number, unit: 'px' | 'pt' | 'rem' = 'px'): this {
    this.styles['font-size'] = `${size}${unit}`;
    return this;
  }

  /**
   * Establece el peso de fuente
   */
  setFontWeight(weight: 300 | 400 | 500 | 600 | 700 | 800 | 900 | 'normal' | 'bold'): this {
    this.styles['font-weight'] = String(weight);
    return this;
  }

  /**
   * Establece el color del texto
   */
  setColor(color: keyof typeof HTML_COLORS | string): this {
    this.styles['color'] = color in HTML_COLORS ? HTML_COLORS[color as keyof typeof HTML_COLORS] : color;
    return this;
  }

  /**
   * Establece el color de fondo
   */
  setBackgroundColor(color: keyof typeof HTML_COLORS | string): this {
    this.styles['background-color'] = color in HTML_COLORS ? HTML_COLORS[color as keyof typeof HTML_COLORS] : color;
    return this;
  }

  /**
   * Establece la alineación de texto
   */
  setAlignment(alignment: 'left' | 'center' | 'right' | 'justify'): this {
    this.styles['text-align'] = alignment;
    return this;
  }

  /**
   * Establece la altura de línea
   */
  setLineHeight(height: number | string): this {
    this.styles['line-height'] = typeof height === 'number' ? `${height}px` : height;
    return this;
  }

  /**
   * Establece el padding
   */
  setPadding(top: number, right: number, bottom: number, left: number): this {
    this.styles['padding'] = `${top}px ${right}px ${bottom}px ${left}px`;
    return this;
  }

  /**
   * Establece el margin
   */
  setMargin(top: number, right: number, bottom: number, left: number): this {
    this.styles['margin'] = `${top}px ${right}px ${bottom}px ${left}px`;
    return this;
  }

  /**
   * Establece bordes
   */
  setBorder(width: number, style: 'solid' | 'dashed' | 'dotted' = 'solid', color: string = '#000000'): this {
    this.styles['border'] = `${width}px ${style} ${color}`;
    return this;
  }

  /**
   * Establece propiedades adicionales
   */
  addStyle(property: string, value: string): this {
    this.styles[property] = value;
    return this;
  }

  /**
   * Retorna el string de estilos CSS
   */
  build(): string {
    return Object.entries(this.styles)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ');
  }
}

/**
 * Obtiene estilos predefinidos
 */
export const getPredefinedEmailStyles = () => {
  return {
    container: new HtmlStyleBuilder()
      .setFont('Calibri')
      .setFontSize(14)
      .setColor('negro')
      .setAlignment('left')
      .setLineHeight(1.5)
      .build(),

    titulo: new HtmlStyleBuilder()
      .setFont('Cambria')
      .setFontSize(24)
      .setFontWeight(700)
      .setColor('primario')
      .setAlignment('center')
      .setMargin(0, 0, 20, 0)
      .build(),

    subtitulo: new HtmlStyleBuilder()
      .setFont('Calibri')
      .setFontSize(16)
      .setFontWeight(600)
      .setColor('secundario')
      .setAlignment('left')
      .setMargin(10, 0, 10, 0)
      .build(),

    cuerpo: new HtmlStyleBuilder()
      .setFont('Calibri')
      .setFontSize(14)
      .setFontWeight(400)
      .setColor('negro')
      .setAlignment('justify')
      .setLineHeight(1.6)
      .build(),

    nota: new HtmlStyleBuilder()
      .setFont('Calibri')
      .setFontSize(12)
      .setFontWeight(400)
      .setColor('gris')
      .setAlignment('left')
      .setMargin(10, 0, 0, 0)
      .build(),

    boton: new HtmlStyleBuilder()
      .setFont('Calibri')
      .setFontSize(14)
      .setFontWeight(600)
      .setColor('blanco')
      .setBackgroundColor('primario')
      .setAlignment('center')
      .setPadding(12, 24, 12, 24)
      .setBorder(0)
      .addStyle('border-radius', '6px')
      .addStyle('text-decoration', 'none')
      .addStyle('display', 'inline-block')
      .build(),

    alerta: new HtmlStyleBuilder()
      .setFont('Calibri')
      .setFontSize(12)
      .setFontWeight(500)
      .setColor('error')
      .setBackgroundColor('#FEE')
      .setPadding(10, 10, 10, 10)
      .setBorder(1, 'solid', '#F99')
      .addStyle('border-radius', '4px')
      .build(),

    tabla_encabezado: new HtmlStyleBuilder()
      .setFont('Cambria')
      .setFontSize(12)
      .setFontWeight(700)
      .setColor('blanco')
      .setBackgroundColor('primario')
      .setAlignment('center')
      .setPadding(8, 8, 8, 8)
      .build(),

    tabla_celda: new HtmlStyleBuilder()
      .setFont('Calibri')
      .setFontSize(11)
      .setFontWeight(400)
      .setColor('negro')
      .setPadding(6, 6, 6, 6)
      .build(),
  };
};

/**
 * Función mejorada para generar HTML de recuperación de contraseña
 */
export const recoveryPasswordHtml = (name: string, linkReset: string) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Calibri, Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .titulo { font-family: Cambria, serif; font-size: 24px; font-weight: bold; color: #1b74e4; text-align: center; margin-bottom: 20px; }
      .cuerpo { font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; text-align: justify; }
      .nota { font-family: Calibri, Arial, sans-serif; font-size: 12px; color: #7F8C8D; margin-top: 10px; }
      .alerta { font-family: Calibri, Arial, sans-serif; font-size: 12px; color: #E74C3C; background-color: #FEE; padding: 10px; border: 1px solid #F99; border-radius: 4px; margin-top: 15px; }
      .boton { display: inline-block; background-color: #1b74e4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; text-align: center; }
      .boton:hover { background-color: #0056b3; }
      .center { text-align: center; margin: 30px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="titulo">DHYRIUM - Restablecer Contraseña</div>
      
      <div class="cuerpo">
        <p>Hola, <strong>${name}</strong>:</p>
        
        <p>Recibimos una solicitud para restablecer tu contraseña de DHYRIUM.</p>
        
        <p>Ingresa en el siguiente botón para restablecer tu contraseña:</p>
      </div>
      
      <div class="center">
        <a href="${linkReset}" class="boton" target="_blank">Cambiar Contraseña</a>
      </div>
      
      <div class="nota">
        <strong>Importante:</strong> Este enlace es válido únicamente por 3 minutos. 
        Si no solicitaste este cambio, por favor ignora este correo.
      </div>
      
      <div class="alerta">
        Por tu seguridad, nunca compartas este enlace con terceros.
      </div>
    </div>
  </body>
  </html>
`;
};

/**
 * Genera HTML de confirmación de email
 */
export const emailConfirmationHtml = (name: string, confirmLink: string, expirationMinutes: number = 30) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Calibri, Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .titulo { font-family: Cambria, serif; font-size: 24px; font-weight: bold; color: #1b74e4; text-align: center; margin-bottom: 20px; }
      .cuerpo { font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; }
      .nota { font-family: Calibri, Arial, sans-serif; font-size: 12px; color: #7F8C8D; margin-top: 10px; }
      .boton { display: inline-block; background-color: #1b74e4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
      .center { text-align: center; margin: 30px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="titulo">Confirma tu correo electrónico</div>
      
      <div class="cuerpo">
        <p>¡Hola, <strong>${name}</strong>!</p>
        
        <p>Gracias por registrarte en DHYRIUM. Para completar tu registro, necesitamos confirmar tu dirección de correo electrónico.</p>
        
        <p>Haz clic en el botón de abajo para confirmar tu email:</p>
      </div>
      
      <div class="center">
        <a href="${confirmLink}" class="boton" target="_blank">Confirmar Email</a>
      </div>
      
      <div class="nota">
        Este enlace es válido durante ${expirationMinutes} minutos.
      </div>
    </div>
  </body>
  </html>
`;
};

/**
 * Genera HTML de notificación general
 */
export const notificationHtml = (
  title: string,
  content: string,
  messageType: 'info' | 'success' | 'warning' | 'error' = 'info'
) => {
  const colorMap = {
    info: '#3498DB',
    success: '#27AE60',
    warning: '#F39C12',
    error: '#E74C3C',
  };

  const color = colorMap[messageType] || '#3498DB';

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Calibri, Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .titulo { font-family: Cambria, serif; font-size: 18px; font-weight: bold; color: ${color}; margin-bottom: 15px; }
      .cuerpo { font-family: Calibri, Arial, sans-serif; font-size: 14px; color: #000000; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="titulo">${title}</div>
      <div class="cuerpo">${content}</div>
    </div>
  </body>
  </html>
`;
};

/**
 * Genera tabla HTML con estilos
 */
export const generateHtmlTable = (
  headers: string[],
  rows: (string | number)[][]
) => {
  const styles = getPredefinedEmailStyles();
  
  const headerCells = headers
    .map(header => `<th style="${styles.tabla_encabezado}">${header}</th>`)
    .join('');

  const bodyCells = rows
    .map(row => {
      const cells = row
        .map(cell => `<td style="${styles.tabla_celda}">${cell}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
      ${bodyCells}
    </tbody>
  </table>
`;
};

/**
 * (Función original mantenida para compatibilidad)
 */
export const recoveryPasswordHtmlLegacy = (name: string, linkReset: string) => {
  return `
  <div  
  style="
    display: flex;
    width: 100%;
    "   >
    <span
        class="m_-5492978235239917155mb_text"
        style="
          font-family: Helvetica Neue, Helvetica, Lucida Grande, tahoma, verdana,
            arial, sans-serif;
          font-size: 16px;
          line-height: 21px;
          color: #141823;
          margin: auto;
          width: 560px;

        "
        ><span style="font-size: 15px"
          ><p></p>
          <div style="margin-top: 16px; margin-bottom: 20px">
            Hola, ${name}:
          </div>
          <div>
            Recibimos una solicitud para restablecer tu contraseña de DHYRIUM.
          </div>
          Ingresa el siguiente link para restablecer la contraseña:
    
          <table
            border="0"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            style="border-collapse: collapse"
          >
            <tbody>
              <tr>
                <td height="20" style="line-height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td align="middle">
                  <a
                    href="${linkReset}"
                    style="color: #1b74e4; text-decoration: none"
                    target="_blank"
                    ><table
                      border="0"
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      style="border-collapse: collapse"
                    >
                      <tbody>
                        <tr>
                          <td
                            style="
                              border-collapse: collapse;
                              border-radius: 6px;
                              text-align: center;
                              display: block;
                              background: #1877f2;
                              padding: 8px 20px 8px 20px;
                            "
                          >
                            <a
                              href="${linkReset}"
                              style="
                                color: #1b74e4;
                                text-decoration: none;
                                display: block;
                              "
                              target="_blank"
                              ><center>
                                <font size="3"
                                  ><span
                                    style="
                                      font-family: Helvetica Neue, Helvetica,
                                        Lucida Grande, tahoma, verdana, arial,
                                        sans-serif;
                                      white-space: nowrap;
                                      font-weight: bold;
                                      vertical-align: middle;
                                      color: #ffffff;
                                      font-weight: 500;
                                      font-family: Roboto-Medium, Roboto,
                                        -apple-system, BlinkMacSystemFont,
                                        Helvetica Neue, Helvetica, Lucida Grande,
                                        tahoma, verdana, arial, sans-serif;
                                      font-size: 17px;
                                    "
                                    >Cambiar&nbsp;contraseña</span
                                  ></font
                                >
                              </center></a
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table></a
                  >
                </td>
              </tr>
              <tr>
                <td height="8" style="line-height: 8px">&nbsp;</td>
              </tr>
              <tr>
                <td height="20" style="line-height: 20px">&nbsp;</td>
              </tr>
            </tbody>
          </table>
          <p></p>

          Recuerde que solo tiene 3mn para completar el proceso.
          <br />
        </span>
        <div>
          <div></div>
          <div></div></div
      >
    </span>
  </div> 
`;
};
