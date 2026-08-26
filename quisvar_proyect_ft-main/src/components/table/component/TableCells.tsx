import type { CellContext } from '@tanstack/react-table';
import Input from '../../Input/Input';
import InputPercentage from '../../Input/InputPercentage';
import TableCell from '../TableCell';
import { formatAmountMoneyPEN } from '@/utils/tools';
import useInputFocus from '@/hooks/useInputFocus';

export const CellAmount = <T,>(item: CellContext<T, string | number>) => {
  const { row, table, column } = item;
  const tableMeta = table.options.meta;
  const { handleKeyDown, onInputFocusRef } = useInputFocus();

  return !tableMeta?.editedRows ? (
    <>{formatAmountMoneyPEN(+item.getValue())}</>
  ) : (
    <TableCell item={item}>
      {(value, handleChange) => (
        <Input
          styleInput={3}
          value={value}
          type="number"
          autoFocus
          data-col={column.getIndex()}
          data-row={row.index}
          ref={onInputFocusRef}
          onKeyDown={handleKeyDown}
          width={4}
          onChange={({ target }) => handleChange(target.value)}
          isMoney
        />
      )}
    </TableCell>
  );
};

export const CellDay = <T,>(item: CellContext<T, string | number>) => {
  const { row, table, column } = item;
  const tableMeta = table.options.meta;
  const { handleKeyDown, onInputFocusRef } = useInputFocus();

  return !tableMeta?.editedRows ? (
    <>{Number(item.getValue()).toFixed(2)} dias</>
  ) : (
    <TableCell item={item}>
      {(value, handleChange) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Input
            styleInput={3}
            value={value}
            type="number"
            width={3}
            data-col={column.getIndex()}
            data-row={row.index}
            ref={onInputFocusRef}
            onKeyDown={handleKeyDown}
            autoFocus
            onChange={({ target }) => handleChange(target.value)}
          />
          dias
        </div>
      )}
    </TableCell>
  );
};
export const CellPercentage = <T,>(item: CellContext<T, string | number>) => {
  const { row, table, column } = item;
  const tableMeta = table.options.meta;
  const { handleKeyDown, onInputFocusRef } = useInputFocus();

  return !tableMeta?.editedRows ? (
    <>{+item.getValue()}%</>
  ) : (
    <TableCell item={item}>
      {(value, handleChange) => (
        <InputPercentage
          value={+value}
          onChange={handleChange}
          width={3.5}
          data-col={column.getIndex()}
          data-row={row.index}
          ref={onInputFocusRef}
          onKeyDown={handleKeyDown}
        />
      )}
    </TableCell>
  );
};
