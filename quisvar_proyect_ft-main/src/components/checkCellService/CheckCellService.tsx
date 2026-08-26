import type { CellContext } from '@tanstack/react-table';
import useAbortableAxios from '@/hooks/useAbortableAxios';
import TableCell from '../table/TableCell';
import Check from '../check/Check';
import { COLOR_CSS } from '@/utils/cssData';

interface TaskCheckCellProps<T> {
  url: string;
  item: CellContext<T, boolean>;
}
const TaskCheckCell = <T,>({ url, item }: TaskCheckCellProps<T>) => {
  const { abortRequest, axiosAbortable } = useAbortableAxios();

  const handleCheck = async (isAuthorized: boolean) => {
    abortRequest();
    const body = { isAuthorized };
    await axiosAbortable.put(`${url}`, body, {
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
            handleCheck(!value);
            handleChange(!value);
          }}
          color={value ? COLOR_CSS.success : COLOR_CSS.gray}
        />
      )}
    </TableCell>
  );
};

export default TaskCheckCell;
