import type {
  PayMessages,
  Report,
} from '@/pages/procedure/pages/salaryList/pages/interface/payroll.types';
import { openDialog, type DialogHandle } from '@/utils/dialog';
import LiquidationReconciliationDialog from './LiquidationReconciliationDialog';

interface OpenLiquidationReconciliationDialogOptions {
  payrollId: number;
  payMessage: PayMessages;
  report: Report;
  onComplete: () => void;
}

export const openLiquidationReconciliationDialog = ({
  payrollId,
  payMessage,
  report,
  onComplete,
}: OpenLiquidationReconciliationDialogOptions) => {
  let handle: DialogHandle | null = null;
  handle = openDialog({
    title: 'Revisión y conciliación de liquidación',
    description:
      'Seleccione los adelantos que se descontarán antes de autorizar el pago.',
    width: '72rem',
    maxHeight: '90vh',
    children: (
      <LiquidationReconciliationDialog
        getDialogHandle={() => handle}
        payrollId={payrollId}
        payMessage={payMessage}
        report={report}
        onComplete={onComplete}
      />
    ),
  });
  return handle;
};
