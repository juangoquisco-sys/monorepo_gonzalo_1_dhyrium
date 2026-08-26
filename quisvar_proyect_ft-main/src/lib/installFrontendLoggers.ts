import { captureException, captureMessage, flush } from './frontendLogger';
import { loader$ } from '@/services/sharingSubject';

const resourceTags = new Set(['SCRIPT', 'LINK', 'IMG']);
const PRELOAD_RELOAD_KEY = 'vite_preload_reload_at';
const PRELOAD_RELOAD_COOLDOWN_MS = 60_000;
const dynamicImportErrorPatterns = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
];

const isDynamicImportError = (value: unknown) => {
  const message = value instanceof Error ? value.message : String(value);
  const normalizedMessage = message.toLowerCase();
  return dynamicImportErrorPatterns.some(pattern =>
    normalizedMessage.includes(pattern)
  );
};

const getResourceSource = (target: HTMLElement) => {
  if (target instanceof HTMLScriptElement) return target.src;
  if (target instanceof HTMLLinkElement) return target.href;
  if (target instanceof HTMLImageElement) return target.src;
  return '';
};

export const installFrontendLoggers = () => {
  window.addEventListener('vite:preloadError', event => {
    loader$.setSubject = false;

    const now = Date.now();
    const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || 0);
    const reloadAllowed = now - lastReload > PRELOAD_RELOAD_COOLDOWN_MS;
    captureMessage({
      type: 'RESOURCE_ERROR',
      level: 'error',
      message: 'No se pudo cargar un módulo de la aplicación.',
      context: {
        recovery: 'vite:preloadError',
        reloadAllowed,
      },
    });

    if (!reloadAllowed) return;

    event.preventDefault();
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(now));
    void flush();
    window.location.reload();
  });

  window.addEventListener(
    'error',
    event => {
      const target = event.target;
      const isResourceError =
        target instanceof HTMLElement && resourceTags.has(target.tagName);

      if (isResourceError) {
        if (
          target instanceof HTMLScriptElement ||
          target instanceof HTMLLinkElement
        ) {
          loader$.setSubject = false;
        }
        captureMessage({
          type: 'RESOURCE_ERROR',
          level: 'error',
          message: `No se pudo cargar recurso: ${target.tagName}`,
          source: getResourceSource(target),
          context: {
            tagName: target.tagName,
            source: getResourceSource(target),
          },
        });
        return;
      }

      captureException({
        type: 'WINDOW_ERROR',
        level: 'error',
        error: event.error || event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        context: {
          message: event.message,
          source: event.filename,
          line: event.lineno,
          column: event.colno,
        },
      });
    },
    true
  );

  window.addEventListener('unhandledrejection', event => {
    if (isDynamicImportError(event.reason)) {
      loader$.setSubject = false;
    }
    captureException({
      type: 'UNHANDLED_REJECTION',
      level: 'error',
      error: event.reason,
      context: {
        reason: String(event.reason),
      },
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flush();
    }
  });

  window.addEventListener('pagehide', () => {
    void flush();
  });
};
