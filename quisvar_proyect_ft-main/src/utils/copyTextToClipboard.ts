interface CopyTextOptions {
  preferLegacy?: boolean;
}

const copyTextWithTextarea = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  const previousActiveElement = document.activeElement as HTMLElement | null;
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('No se pudo copiar al portapapeles');
  } finally {
    document.body.removeChild(textarea);
    previousActiveElement?.focus?.();
  }
};

export const copyTextToClipboard = async (
  text: string,
  options: CopyTextOptions = {}
) => {
  if (
    !options.preferLegacy &&
    window.isSecureContext &&
    navigator.clipboard?.writeText
  ) {
    await navigator.clipboard.writeText(text);
    return;
  }

  copyTextWithTextarea(text);
};
