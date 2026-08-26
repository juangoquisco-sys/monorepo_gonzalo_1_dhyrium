import type { CellContext } from '@tanstack/react-table';
import TableCell from '@/components/table/TableCell';
import Check from '@/components/check/Check';
import { COLOR_CSS } from '@/utils/cssData';
import useAbortableAxios from '@/hooks/useAbortableAxios';

const TaskCheckCell = <T extends { id: number }>(
  item: CellContext<T, boolean>
) => {
  const { abortRequest, axiosAbortable } = useAbortableAxios();

  const handleCheck = async (isAuthorized: boolean, taskId: number) => {
    abortRequest();
    const body = { isAuthorized };
    await axiosAbortable.put(`reports/authorized-items/${taskId}`, body, {
      headers: {
        noLoader: true,
      },
    });
  };
  return (
    <TableCell item={item}>
      {(value, handleChange) => (
        <Check
          cursor={'pointer'}
          size={18}
          isChecked={value}
          onClick={() => {
            handleCheck(!value, item.row.original.id);
            handleChange(!value);
          }}
          color={value ? COLOR_CSS.success : COLOR_CSS.gray}
        />
      )}
    </TableCell>
  );
};

export default TaskCheckCell;
