import type { CellContext } from '@tanstack/react-table';
import TableCell from '@/components/table/TableCell';
import Check from '@/components/check/Check';
import { COLOR_CSS } from '@/utils/cssData';
import useReportAuthorizedMutation from '../../hooks/useReportAuthorizedMutation';
import type { PayMessages } from '../../../interface/payroll.types';

const PayrollCheckCell = <T extends PayMessages>(
  item: CellContext<T, boolean>
) => {
  const reportAuthorizedMutation = useReportAuthorizedMutation();
  const hasPendingLiquidation = item.row.original.reports.some(
    report => report.type === 'LIQUIDACION' && !report.isAuthorized
  );
  const handleCheck = async (
    isAuthorized: boolean,
    reports: PayMessages['reports']
  ) => {
    reportAuthorizedMutation.mutate({
      isAuthorized,
      reportsId: reports.map(({ id }) => id),
    });
  };
  if (hasPendingLiquidation) {
    return (
      <TableCell item={item}>
        {() => (
          <span className="text-xs font-bold uppercase text-warning">
            Conciliar
          </span>
        )}
      </TableCell>
    );
  }

  return (
    <TableCell item={item}>
      {(value, handleChange) => (
        <Check
          size={18}
          isChecked={value}
          onClick={() => {
            handleCheck(!value, item.row.original.reports);
            handleChange(!value);
          }}
          color={value ? COLOR_CSS.success : COLOR_CSS.gray}
        />
      )}
    </TableCell>
  );
};

export default PayrollCheckCell;
