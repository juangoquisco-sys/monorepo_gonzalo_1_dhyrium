import { memo, useCallback, useRef } from 'react';
import type { DialogEntry } from '@/store/useDialogStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDialogStore } from '@/store/useDialogStore';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const DIALOG_CONTENT_CLASS =
  'grid max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden';

const afterStackCommit = (callback: () => void) => {
  queueMicrotask(() => queueMicrotask(callback));
};

const focusElement = (element: HTMLElement | null) => {
  if (element?.isConnected && element.closest('[inert]') === null) {
    element.focus();
    return true;
  }

  return false;
};

const restoreFocus = (entry: DialogEntry) => {
  afterStackCommit(() => {
    const dialogs = useDialogStore.getState().dialogs;
    const parentDialog = entry.parentId
      ? dialogs.find(dialog => dialog.id === entry.parentId)
      : undefined;

    if (parentDialog !== undefined && parentDialog.phase !== 'closing') {
      if (focusElement(entry.returnFocusElement)) return;

      const parentContent = document.querySelector<HTMLElement>(
        `[data-global-dialog-id="${parentDialog.id}"]`
      );
      const fallback =
        parentContent?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
        parentContent;
      focusElement(fallback);
      return;
    }

    if (!dialogs.some(dialog => dialog.phase !== 'closing')) {
      focusElement(entry.returnFocusElement);
    }
  });
};

type PresencePart = 'content' | 'overlay';

const useDialogPresenceRefs = (dialogId: string) => {
  const presenceRef = useRef({
    content: { hasMounted: false, isUnmounted: false },
    overlay: { hasMounted: false, isUnmounted: false },
  });
  const finishQueuedRef = useRef(false);

  const maybeFinishClose = useCallback(() => {
    const { content, overlay } = presenceRef.current;
    if (
      !content.hasMounted ||
      !overlay.hasMounted ||
      !content.isUnmounted ||
      !overlay.isUnmounted ||
      finishQueuedRef.current
    ) {
      return;
    }

    finishQueuedRef.current = true;
    queueMicrotask(() => {
      finishQueuedRef.current = false;
      const currentPresence = presenceRef.current;
      if (
        !currentPresence.content.isUnmounted ||
        !currentPresence.overlay.isUnmounted
      ) {
        return;
      }

      const state = useDialogStore.getState();
      const entry = state.dialogs.find(dialog => dialog.id === dialogId);
      if (entry?.phase === 'closing') state.finishDialogClose(dialogId);
    });
  }, [dialogId]);

  const registerPresence = useCallback(
    (part: PresencePart, element: HTMLDivElement | null) => {
      const presence = presenceRef.current[part];
      if (element !== null) {
        presence.hasMounted = true;
        presence.isUnmounted = false;
      } else if (presence.hasMounted) {
        presence.isUnmounted = true;
        maybeFinishClose();
      }
    },
    [maybeFinishClose]
  );

  const contentRef = useCallback(
    (element: HTMLDivElement | null) =>
      registerPresence('content', element),
    [registerPresence]
  );
  const overlayRef = useCallback(
    (element: HTMLDivElement | null) =>
      registerPresence('overlay', element),
    [registerPresence]
  );

  return { contentRef, overlayRef };
};

interface StackDialogEntryProps {
  entry: DialogEntry;
  isStackTop: boolean;
  ownsBackdrop: boolean;
}

const StackDialogEntry = memo(function StackDialogEntry({
  entry,
  isStackTop,
  ownsBackdrop,
}: StackDialogEntryProps) {
  const { contentRef, overlayRef } = useDialogPresenceRefs(entry.id);
  const descriptionId = `global-dialog-description-${entry.id}`;

  const requestClose = useCallback(() => {
    if (!isStackTop) return;

    const result = useDialogStore.getState().requestClose(entry.id);
    if (result.blockingMessage !== undefined) {
      SnackbarUtilities.warning(result.blockingMessage);
    }
  }, [entry.id, isStackTop]);

  const overlayClassName =
    cn(
      !ownsBackdrop && 'bg-black/20',
      !isStackTop && 'pointer-events-none'
    ) || undefined;

  return (
    <Dialog
      open={entry.phase !== 'closing'}
      onOpenChange={nextOpen => {
        if (!nextOpen) requestClose();
      }}
    >
      <DialogContent
        ref={contentRef}
        aria-describedby={entry.description ? descriptionId : undefined}
        aria-hidden={isStackTop ? undefined : true}
        className={cn(
          DIALOG_CONTENT_CLASS,
          !isStackTop && 'pointer-events-none'
        )}
        data-global-dialog-id={entry.id}
        inert={isStackTop ? undefined : true}
        onCloseAutoFocus={event => {
          event.preventDefault();
          restoreFocus(entry);
        }}
        onEscapeKeyDown={event => {
          if (!isStackTop) event.preventDefault();
        }}
        onOpenAutoFocus={() =>
          useDialogStore.getState().markDialogOpen(entry.id)
        }
        onPointerDownOutside={event => {
          if (!isStackTop) event.preventDefault();
        }}
        overlayClassName={overlayClassName}
        overlayRef={overlayRef}
        showCloseButton={isStackTop}
        style={{
          width: entry.width,
          height: entry.height,
          maxHeight: entry.maxHeight,
        }}
        tabIndex={-1}
      >
        <DialogHeader>
          <DialogTitle>{entry.title}</DialogTitle>
          {entry.description ? (
            <DialogDescription id={descriptionId}>
              {entry.description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto">{entry.children}</div>
      </DialogContent>
    </Dialog>
  );
});

export function GlobalDialog() {
  const dialogs = useDialogStore(state => state.dialogs);

  return dialogs.map((entry, index) => (
    <StackDialogEntry
      key={entry.id}
      entry={entry}
      isStackTop={index === dialogs.length - 1}
      ownsBackdrop={index === 0}
    />
  ));
}
