import type { CSSProperties, ReactNode } from 'react';
import { create } from 'zustand';
import { createUuid } from '@/utils/createUuid';

export const MAX_DIALOG_DEPTH = 3;

export type DialogId = string;
export type DialogBehavior = 'reject' | 'replace' | 'stack';
export type DialogPhase = 'opening' | 'open' | 'closing';

export interface DialogBlockingClose {
  isBlockingClose: boolean;
  message: string;
}

export interface OpenDialogOptions {
  title: string;
  description?: string;
  children: ReactNode;
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  maxHeight?: CSSProperties['maxHeight'];
  onClose?: () => void;
  behavior?: DialogBehavior;
}

export type ReplaceDialogOptions = Omit<OpenDialogOptions, 'behavior'>;

export interface DialogEntry extends ReplaceDialogOptions {
  id: DialogId;
  parentId?: DialogId;
  phase: DialogPhase;
  blockingClose: DialogBlockingClose;
  returnFocusElement: HTMLElement | null;
}

export interface DialogCloseRequestResult {
  closed: boolean;
  blockingMessage?: string;
}

interface DialogStore {
  dialogs: DialogEntry[];
  openDialog: (options: OpenDialogOptions) => DialogId | null;
  replaceDialog: (
    id: DialogId,
    options: ReplaceDialogOptions
  ) => DialogId | null;
  closeDialog: (id: DialogId) => boolean;
  finishDialogClose: (id: DialogId) => boolean;
  requestClose: (id: DialogId) => DialogCloseRequestResult;
  blockDialog: (id: DialogId, message: string) => boolean;
  unblockDialog: (id: DialogId) => boolean;
  closeTopDialog: () => boolean;
  blockTopDialog: (message: string) => boolean;
  unblockTopDialog: () => boolean;
  closeAllDialogs: (force?: boolean) => boolean;
  markDialogOpen: (id: DialogId) => void;
}

const createUnblockedState = (): DialogBlockingClose => ({
  isBlockingClose: false,
  message: '',
});

const getFocusedElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
};

const getDialogIndex = (dialogs: DialogEntry[], id: DialogId) =>
  dialogs.findIndex(dialog => dialog.id === id);

const createEntry = (
  options: ReplaceDialogOptions,
  parentId?: DialogId,
  returnFocusElement = getFocusedElement()
): DialogEntry => ({
  id: createUuid(),
  parentId,
  title: options.title,
  description: options.description,
  children: options.children,
  width: options.width,
  height: options.height,
  maxHeight: options.maxHeight,
  onClose: options.onClose,
  phase: 'opening',
  blockingClose: createUnblockedState(),
  returnFocusElement,
});

const warnDepthLimit = () => {
  if (import.meta.env?.DEV) {
    console.warn(
      `GlobalDialog: maximum stack depth (${MAX_DIALOG_DEPTH}) reached.`
    );
  }
};

export const useDialogStore = create<DialogStore>((set, get) => {
  const notifyClosed = (entries: DialogEntry[]) => {
    entries.forEach(entry => {
      if (entry.onClose === undefined) return;
      queueMicrotask(() => entry.onClose?.());
    });
  };

  const closeEntries = (entries: DialogEntry[]) => {
    const firstOpeningIndex = entries.findIndex(
      dialog => dialog.phase === 'opening'
    );
    const mountedEntries =
      firstOpeningIndex === -1 ? entries : entries.slice(0, firstOpeningIndex);

    // A dialog and its descendants are always a contiguous stack suffix.
    set(state => ({
      dialogs: [
        ...state.dialogs.slice(0, -entries.length),
        ...mountedEntries.map(dialog => ({
          ...dialog,
          phase: 'closing' as const,
          blockingClose: createUnblockedState(),
        })),
      ],
    }));
    notifyClosed(entries.slice(mountedEntries.length));
  };

  const getClosableEntries = (id: DialogId) => {
    const dialogs = get().dialogs;
    const targetIndex = getDialogIndex(dialogs, id);
    const target = dialogs[targetIndex];

    if (target === undefined || target.phase === 'closing') return [];

    return dialogs.slice(targetIndex);
  };

  const setDialogBlocking = (
    id: DialogId,
    blockingClose: DialogBlockingClose
  ) => {
    const dialogs = get().dialogs;
    const targetIndex = getDialogIndex(dialogs, id);
    const target = dialogs[targetIndex];

    if (target === undefined || target.phase === 'closing') return false;

    set({
      dialogs: dialogs.map((dialog, index) =>
        index === targetIndex ? { ...dialog, blockingClose } : dialog
      ),
    });
    return true;
  };

  const replaceTopEntry = (
    expectedId: DialogId,
    options: ReplaceDialogOptions
  ) => {
    const dialogs = get().dialogs;
    const topDialog = dialogs.at(-1);

    if (
      topDialog === undefined ||
      topDialog.id !== expectedId ||
      topDialog.blockingClose.isBlockingClose
    ) {
      return null;
    }

    const replacement = createEntry(
      options,
      topDialog.parentId,
      topDialog.returnFocusElement
    );

    set({ dialogs: [...dialogs.slice(0, -1), replacement] });
    notifyClosed([topDialog]);

    return replacement.id;
  };

  return {
    dialogs: [],
    openDialog: options => {
      const { behavior = 'reject', ...entryOptions } = options;
      const dialogs = get().dialogs;
      const topDialog = dialogs.at(-1);

      if (topDialog === undefined) {
        const entry = createEntry(entryOptions);
        set({ dialogs: [entry] });
        return entry.id;
      }

      if (behavior === 'reject') return null;

      if (behavior === 'replace') {
        return replaceTopEntry(topDialog.id, entryOptions);
      }

      if (dialogs.length >= MAX_DIALOG_DEPTH) {
        warnDepthLimit();
        return null;
      }

      if (topDialog.phase === 'closing') return null;

      const entry = createEntry(entryOptions, topDialog.id);
      set(state => ({ dialogs: [...state.dialogs, entry] }));
      return entry.id;
    },
    replaceDialog: (id, options) => replaceTopEntry(id, options),
    closeDialog: id => {
      const entries = getClosableEntries(id);
      if (entries.length === 0) return false;

      closeEntries(entries);
      return true;
    },
    finishDialogClose: id => {
      const dialogs = get().dialogs;
      const targetIndex = getDialogIndex(dialogs, id);
      const target = dialogs[targetIndex];
      if (target === undefined || target.phase !== 'closing') return false;

      const removedEntries = dialogs.slice(targetIndex);
      set({ dialogs: dialogs.slice(0, targetIndex) });
      notifyClosed(removedEntries);
      return true;
    },
    requestClose: id => {
      const entries = getClosableEntries(id);
      if (entries.length === 0) return { closed: false };

      const blockedEntry = [...entries]
        .reverse()
        .find(dialog => dialog.blockingClose.isBlockingClose);

      if (blockedEntry !== undefined) {
        return {
          closed: false,
          blockingMessage: blockedEntry.blockingClose.message,
        };
      }

      closeEntries(entries);
      return { closed: true };
    },
    blockDialog: (id, message) =>
      setDialogBlocking(id, { isBlockingClose: true, message }),
    unblockDialog: id => setDialogBlocking(id, createUnblockedState()),
    closeTopDialog: () => {
      const topDialog = get().dialogs.at(-1);
      return topDialog === undefined ? false : get().closeDialog(topDialog.id);
    },
    blockTopDialog: message => {
      const topDialog = get().dialogs.at(-1);
      return topDialog === undefined
        ? false
        : get().blockDialog(topDialog.id, message);
    },
    unblockTopDialog: () => {
      const topDialog = get().dialogs.at(-1);
      return topDialog === undefined
        ? false
        : get().unblockDialog(topDialog.id);
    },
    closeAllDialogs: (force = false) => {
      const dialogs = get().dialogs;
      if (
        !force &&
        dialogs.some(dialog => dialog.blockingClose.isBlockingClose)
      ) {
        return false;
      }

      set({ dialogs: [] });
      notifyClosed(dialogs);
      return true;
    },
    markDialogOpen: id => {
      const target = get().dialogs.find(dialog => dialog.id === id);
      if (target?.phase !== 'opening') return;

      set(state => ({
        dialogs: state.dialogs.map(dialog =>
          dialog.id === id ? { ...dialog, phase: 'open' } : dialog
        ),
      }));
    },
  };
});
