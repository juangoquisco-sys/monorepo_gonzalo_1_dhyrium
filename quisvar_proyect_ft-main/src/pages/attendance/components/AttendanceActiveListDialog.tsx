import { AppButton } from '@/components/app-ui/app-button';
import type { DialogHandle } from '@/utils/dialog';

interface AttendanceActiveListDialogProps {
  getDialogHandle: () => DialogHandle | null;
  onGoToActiveList: () => void;
}

export const AttendanceActiveListDialog = ({
  getDialogHandle,
  onGoToActiveList,
}: AttendanceActiveListDialogProps) => (
  <div className="flex justify-end">
    <AppButton
      onClick={() => {
        getDialogHandle()?.close();
        onGoToActiveList();
      }}
    >
      Ir a la lista activa
    </AppButton>
  </div>
);
