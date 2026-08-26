import JSZip from 'jszip';

export interface DocxEmbeddedImage {
  blob: Blob;
  contentType: string;
  fileName: string;
}

export interface DocxPageSetup {
  width: number;
  height: number;
  margins: [number, number, number, number];
  headerTop?: number;
  footerBottom?: number;
  paperDirection: 'vertical' | 'horizontal';
}

export interface DocxOoxmlImportResult {
  headerHtml: string;
  footerHtml: string;
  headerPartCount: number;
  footerPartCount: number;
  imageCount: number;
  omittedImageCount: number;
  pageSetup?: DocxPageSetup;
}

type ImageUploader = (image: DocxEmbeddedImage) => Promise<string>;

const TWIPS_PER_PIXEL = 15;
const EMUS_PER_PIXEL = 9_525;

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character
  );

const parseXml = (value: string) => {
  const document = new DOMParser().parseFromString(value, 'application/xml');
  if (document.querySelector('parsererror')) {
    throw new Error('El DOCX contiene una parte XML no válida.');
  }
  return document;
};

const elementChildren = (node: Element, localName?: string): Element[] =>
  Array.from(node.children).filter(
    child => !localName || child.localName === localName
  );

const firstChild = (node: Element, localName: string) =>
  elementChildren(node, localName)[0] ?? null;

const descendants = (node: Document | Element, localName: string): Element[] =>
  Array.from(node.getElementsByTagNameNS('*', localName));

const attribute = (element: Element | null, localName: string) => {
  if (!element) return undefined;
  return Array.from(element.attributes).find(item => item.localName === localName)?.value;
};

const numericAttribute = (element: Element | null, localName: string) => {
  const value = Number(attribute(element, localName));
  return Number.isFinite(value) ? value : undefined;
};

const resolvePackagePath = (sourcePart: string, target: string) => {
  const segments = [...sourcePart.split('/').slice(0, -1), ...target.replace(/\\/g, '/').split('/')];
  const resolved: string[] = [];
  segments.forEach(segment => {
    if (!segment || segment === '.') return;
    if (segment === '..') resolved.pop();
    else resolved.push(segment);
  });
  return resolved.join('/');
};

const relationshipPartPath = (partPath: string) => {
  const segments = partPath.split('/');
  const fileName = segments.pop();
  return [...segments, '_rels', `${fileName}.rels`].join('/');
};

const getRelationships = async (zip: JSZip, sourcePart: string) => {
  const relationshipFile = zip.file(relationshipPartPath(sourcePart));
  if (!relationshipFile) return new Map<string, string>();
  const document = parseXml(await relationshipFile.async('text'));
  return new Map<string, string>(
    descendants(document, 'Relationship')
      .filter(item => attribute(item, 'TargetMode') !== 'External')
      .map(item => [
        attribute(item, 'Id') ?? '',
        resolvePackagePath(sourcePart, attribute(item, 'Target') ?? ''),
      ] as const)
      .filter(([id, target]) => Boolean(id && target))
  );
};

const getContentTypes = async (zip: JSZip) => {
  const contentTypeFile = zip.file('[Content_Types].xml');
  const types = new Map<string, string>();
  if (!contentTypeFile) return types;
  const document = parseXml(await contentTypeFile.async('text'));
  descendants(document, 'Default').forEach(item => {
    const extension = attribute(item, 'Extension')?.toLowerCase();
    const contentType = attribute(item, 'ContentType');
    if (extension && contentType) types.set(extension, contentType);
  });
  return types;
};

const partHasContent = (html: string) =>
  /<img\b|<table\b/i.test(html) ||
  html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;

const getReferencedParts = async (
  zip: JSZip,
  kind: 'header' | 'footer'
) => {
  const documentFile = zip.file('word/document.xml');
  const relationships = await getRelationships(zip, 'word/document.xml');
  const referenced: Array<{ path: string; type: string }> = [];

  if (documentFile) {
    const document = parseXml(await documentFile.async('text'));
    descendants(document, `${kind}Reference`).forEach(reference => {
      const path = relationships.get(attribute(reference, 'id') ?? '');
      if (path) referenced.push({ path, type: attribute(reference, 'type') ?? 'default' });
    });
  }

  const ordered = [
    ...referenced.filter(item => item.type === 'default'),
    ...referenced.filter(item => item.type !== 'default'),
  ].map(item => item.path);
  const fallback = Object.keys(zip.files)
    .filter(path => new RegExp(`^word/${kind}\\d+\\.xml$`, 'i').test(path))
    .sort();
  return Array.from(new Set([...ordered, ...fallback]));
};

const getPageSetup = async (zip: JSZip): Promise<DocxPageSetup | undefined> => {
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) return undefined;
  const document = parseXml(await documentFile.async('text'));
  const section = descendants(document, 'sectPr')[0];
  if (!section) return undefined;
  const pageSize = firstChild(section, 'pgSz');
  const pageMargins = firstChild(section, 'pgMar');
  const width = numericAttribute(pageSize, 'w');
  const height = numericAttribute(pageSize, 'h');
  if (!width || !height) return undefined;

  const toPixels = (value: number | undefined, fallback: number) =>
    Math.max(0, (value ?? fallback * TWIPS_PER_PIXEL) / TWIPS_PER_PIXEL);
  const orientation = attribute(pageSize, 'orient');

  return {
    width: width / TWIPS_PER_PIXEL,
    height: height / TWIPS_PER_PIXEL,
    margins: [
      toPixels(numericAttribute(pageMargins, 'top'), 96),
      toPixels(numericAttribute(pageMargins, 'right'), 96),
      toPixels(numericAttribute(pageMargins, 'bottom'), 96),
      toPixels(numericAttribute(pageMargins, 'left'), 96),
    ],
    headerTop: numericAttribute(pageMargins, 'header') !== undefined
      ? toPixels(numericAttribute(pageMargins, 'header'), 36)
      : undefined,
    footerBottom: numericAttribute(pageMargins, 'footer') !== undefined
      ? toPixels(numericAttribute(pageMargins, 'footer'), 36)
      : undefined,
    paperDirection: orientation === 'landscape' || width > height ? 'horizontal' : 'vertical',
  };
};

const getParagraphStyle = (paragraph: Element) => {
  const properties = firstChild(paragraph, 'pPr');
  if (!properties) return '';
  const styles: string[] = [];
  const alignment = attribute(firstChild(properties, 'jc'), 'val');
  const alignmentMap: Record<string, string> = {
    both: 'justify',
    center: 'center',
    end: 'right',
    left: 'left',
    right: 'right',
    start: 'left',
  };
  if (alignment && alignmentMap[alignment]) {
    styles.push(`text-align:${alignmentMap[alignment]}`);
  }
  const spacing = firstChild(properties, 'spacing');
  const before = numericAttribute(spacing, 'before');
  const after = numericAttribute(spacing, 'after');
  const line = numericAttribute(spacing, 'line');
  if (before !== undefined) styles.push(`margin-top:${before / TWIPS_PER_PIXEL}px`);
  if (after !== undefined) styles.push(`margin-bottom:${after / TWIPS_PER_PIXEL}px`);
  if (line !== undefined) styles.push(`line-height:${Math.max(0.8, line / 240)}`);
  const indentation = firstChild(properties, 'ind');
  const left = numericAttribute(indentation, 'left') ?? numericAttribute(indentation, 'start');
  const right = numericAttribute(indentation, 'right') ?? numericAttribute(indentation, 'end');
  const firstLine = numericAttribute(indentation, 'firstLine');
  const hanging = numericAttribute(indentation, 'hanging');
  if (left !== undefined) styles.push(`margin-left:${left / TWIPS_PER_PIXEL}px`);
  if (right !== undefined) styles.push(`margin-right:${right / TWIPS_PER_PIXEL}px`);
  if (firstLine !== undefined) styles.push(`text-indent:${firstLine / TWIPS_PER_PIXEL}px`);
  if (hanging !== undefined) styles.push(`text-indent:${-hanging / TWIPS_PER_PIXEL}px`);
  return styles.join(';');
};

const getRunStyle = (run: Element) => {
  const properties = firstChild(run, 'rPr');
  if (!properties) return '';
  const styles: string[] = [];
  const fonts = firstChild(properties, 'rFonts');
  const font = attribute(fonts, 'ascii') ?? attribute(fonts, 'hAnsi');
  const size = numericAttribute(firstChild(properties, 'sz'), 'val');
  const color = attribute(firstChild(properties, 'color'), 'val');
  if (font) styles.push(`font-family:${escapeHtml(font)}`);
  if (size) styles.push(`font-size:${size / 2}pt`);
  if (color && color !== 'auto') styles.push(`color:#${color.replace(/^#/, '')}`);
  return styles.join(';');
};

const isEnabledProperty = (properties: Element, localName: string) => {
  const property = firstChild(properties, localName);
  if (!property) return false;
  return !['0', 'false', 'off', 'none'].includes(attribute(property, 'val') ?? 'true');
};

const getImageDimensions = (node: Element) => {
  const extent = descendants(node, 'extent')[0];
  const width = numericAttribute(extent, 'cx');
  const height = numericAttribute(extent, 'cy');
  if (!width || !height) return '';
  return ` width="${Math.max(1, Math.round(width / EMUS_PER_PIXEL))}" height="${Math.max(1, Math.round(height / EMUS_PER_PIXEL))}"`;
};

const renderPart = async (
  zip: JSZip,
  partPath: string,
  contentTypes: Map<string, string>,
  uploadImage: ImageUploader,
  counters: { images: number; omitted: number }
) => {
  const partFile = zip.file(partPath);
  if (!partFile) return '';
  const document = parseXml(await partFile.async('text'));
  const relationships = await getRelationships(zip, partPath);

  const renderImage = async (node: Element) => {
    const imageReference = descendants(node, 'blip')[0] ?? descendants(node, 'imagedata')[0];
    const relationshipId = attribute(imageReference, 'embed') ?? attribute(imageReference, 'id');
    const imagePath = relationships.get(relationshipId ?? '');
    const imageFile = imagePath ? zip.file(imagePath) : null;
    if (!imagePath || !imageFile) {
      counters.omitted += 1;
      return '';
    }
    const extension = imagePath.split('.').pop()?.toLowerCase() ?? 'bin';
    const contentType = contentTypes.get(extension) ?? `image/${extension}`;
    counters.images += 1;
    try {
      const url = await uploadImage({
        blob: await imageFile.async('blob'),
        contentType,
        fileName: `${partPath.split('/').pop()?.replace('.xml', '') ?? 'zona'}-${counters.images}.${extension}`,
      });
      const documentProperties = descendants(node, 'docPr')[0];
      const alt = attribute(documentProperties, 'descr') ?? attribute(documentProperties, 'name') ?? 'Imagen del documento';
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}"${getImageDimensions(node)}>`;
    } catch {
      counters.omitted += 1;
      return '';
    }
  };

  const renderChildren = async (node: Element): Promise<string> => {
    const parts: string[] = [];
    for (const child of elementChildren(node)) {
      const name = child.localName;
      if (['drawing', 'pict', 'object'].includes(name)) {
        parts.push(await renderImage(child));
      } else if (name === 't' || name === 'delText') {
        parts.push(escapeHtml(child.textContent ?? ''));
      } else if (name === 'tab') {
        parts.push('&emsp;');
      } else if (name === 'br' || name === 'cr') {
        parts.push('<br>');
      } else if (name === 'r') {
        const properties = firstChild(child, 'rPr');
        let content = await renderChildren(child);
        if (properties) {
          if (isEnabledProperty(properties, 'b')) content = `<strong>${content}</strong>`;
          if (isEnabledProperty(properties, 'i')) content = `<em>${content}</em>`;
          if (isEnabledProperty(properties, 'u')) content = `<u>${content}</u>`;
        }
        const style = getRunStyle(child);
        parts.push(style ? `<span style="${style}">${content}</span>` : content);
      } else if (!['pPr', 'rPr', 'tblPr', 'trPr', 'tcPr'].includes(name)) {
        parts.push(await renderChildren(child));
      }
    }
    return parts.join('');
  };

  const renderBlock = async (block: Element): Promise<string> => {
    if (block.localName === 'p') {
      const style = getParagraphStyle(block);
      const content = await renderChildren(block);
      return `<p${style ? ` style="${style}"` : ''}>${content || '<br>'}</p>`;
    }
    if (block.localName === 'tbl') {
      const rows: string[] = [];
      for (const row of elementChildren(block, 'tr')) {
        const cells: string[] = [];
        for (const cell of elementChildren(row, 'tc')) {
          const blocks: string[] = [];
          for (const cellBlock of elementChildren(cell)) {
            if (cellBlock.localName === 'p' || cellBlock.localName === 'tbl') {
              blocks.push(await renderBlock(cellBlock));
            }
          }
          cells.push(`<td>${blocks.join('')}</td>`);
        }
        rows.push(`<tr>${cells.join('')}</tr>`);
      }
      return `<table style="width:100%;border-collapse:collapse"><tbody>${rows.join('')}</tbody></table>`;
    }
    return renderChildren(block);
  };

  const root = document.documentElement;
  const blocks: string[] = [];
  for (const child of elementChildren(root)) {
    if (child.localName === 'p' || child.localName === 'tbl') {
      blocks.push(await renderBlock(child));
    }
  }
  return blocks.join('');
};

/**
 * Mammoth convierte el cuerpo del DOCX, pero no sus encabezados ni pies.
 * Esta lectura OOXML complementaria conserva esas zonas y sus imágenes sin
 * modificar el archivo Word original.
 */
export const extractDocxOoxmlLayout = async (
  arrayBuffer: ArrayBuffer,
  uploadImage: ImageUploader
): Promise<DocxOoxmlImportResult> => {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const contentTypes = await getContentTypes(zip);
  const headerParts = await getReferencedParts(zip, 'header');
  const footerParts = await getReferencedParts(zip, 'footer');
  const counters = { images: 0, omitted: 0 };

  const extractFirstPartWithContent = async (parts: string[]) => {
    for (const part of parts) {
      const html = await renderPart(zip, part, contentTypes, uploadImage, counters);
      if (partHasContent(html)) return html;
    }
    return '';
  };

  const headerHtml = await extractFirstPartWithContent(headerParts);
  const footerHtml = await extractFirstPartWithContent(footerParts);

  return {
    headerHtml,
    footerHtml,
    headerPartCount: headerParts.length,
    footerPartCount: footerParts.length,
    imageCount: counters.images,
    omittedImageCount: counters.omitted,
    pageSetup: await getPageSetup(zip),
  };
};
