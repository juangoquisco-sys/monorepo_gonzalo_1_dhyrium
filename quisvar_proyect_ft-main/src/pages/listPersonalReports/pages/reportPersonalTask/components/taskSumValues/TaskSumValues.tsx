import { formatAmountMoneyPEN } from '@/utils/tools';
import './taskSumValues.css';

interface TaskSumValuesProps {
  firstValue: number;
  secondValue: number;
  total?: number;
}
const TaskSumValues = ({
  firstValue,
  secondValue,
  total,
}: TaskSumValuesProps) => {
  const alterTotal = firstValue + secondValue;
  return (
    <div className="taskSumValues">
      <span className="taskSumValues-values">
        {formatAmountMoneyPEN(firstValue)} - {formatAmountMoneyPEN(secondValue)}
      </span>
      <span className="taskSumValues-total">
        {formatAmountMoneyPEN(total || alterTotal)}
      </span>
    </div>
  );
};

export default TaskSumValues;
