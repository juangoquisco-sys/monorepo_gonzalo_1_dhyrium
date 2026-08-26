import type { ReactNode } from 'react';
import type { OpenDialogOptions } from '@/store/useDialogStore';
import { openDialog, type DialogHandle } from '@/utils/dialog';

export type DutyDialogHandleGetter = () => DialogHandle | null;

export const openDutyRotationDialog = (
  options: Omit<OpenDialogOptions, 'children'>,
  renderChildren: (getDialogHandle: DutyDialogHandleGetter) => ReactNode
): DialogHandle | null => {
  let dialogHandle: DialogHandle | null = null;
  const getDialogHandle = () => dialogHandle;

  dialogHandle = openDialog({
    ...options,
    children: renderChildren(getDialogHandle),
  });

  return dialogHandle;
};
