import type {
  OpenDialogOptions,
  ReplaceDialogOptions,
} from '@/store/useDialogStore';
import { useDialogStore } from '@/store/useDialogStore';

export interface DialogHandle {
  id: string;
  close: () => boolean;
  block: (message: string) => boolean;
  unblock: () => boolean;
  replace: (options: ReplaceDialogOptions) => DialogHandle | null;
}

const createDialogHandle = (id: string): DialogHandle => ({
  id,
  close: () => useDialogStore.getState().closeDialog(id),
  block: message => useDialogStore.getState().blockDialog(id, message),
  unblock: () => useDialogStore.getState().unblockDialog(id),
  replace: options => {
    const replacementId = useDialogStore.getState().replaceDialog(id, options);
    return replacementId === null ? null : createDialogHandle(replacementId);
  },
});

export const openDialog = (
  options: OpenDialogOptions
): DialogHandle | null => {
  const id = useDialogStore.getState().openDialog(options);
  return id === null ? null : createDialogHandle(id);
};

export const closeDialog = (): boolean =>
  useDialogStore.getState().closeTopDialog();

export const blockingClose = (message: string): boolean =>
  useDialogStore.getState().blockTopDialog(message);

export const unBlockingClose = (): boolean =>
  useDialogStore.getState().unblockTopDialog();

export const closeAllDialogs = (force = false): boolean =>
  useDialogStore.getState().closeAllDialogs(force);
