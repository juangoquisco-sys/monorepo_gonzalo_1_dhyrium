import { VscPercentage } from 'react-icons/vsc';
import Input from '@/components/Input/Input';
import './taskInputPercentage.css';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
} from 'react';

interface TaskInputPercentageProps {
  onChange?: (value: number) => void;
  value?: number;
  disabled?: boolean;
  minLimit?: number;
}

const TaskInputPercentage = ({
  onChange,
  value,
  disabled = false,
  minLimit = 0,
}: TaskInputPercentageProps) => {
  const [percentage, setPercentage] = useState('0');
  const isControlled = useRef(!!onChange);

  const handlePercentage = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const { value } = target;
    handleSetPercentage(String(Math.min(+value, 100) || ''));
  };
  const handleBlurPercentage = ({ target }: FocusEvent<HTMLInputElement>) => {
    if (!target.value) handleSetPercentage('0');
    handleSetPercentage(String(Math.max(+target.value, minLimit)));
  };

  const handleSetPercentage = (value: string) => {
    if (isControlled.current) {
      return onChange!(+value);
    }
    setPercentage(value);
  };

  const PERCENTAGE_VALUES = ['25', '50', '75', '100'];

  useEffect(() => {
    setPercentage(String(value));
  }, [value]);

  return (
    <div className="taskInpuPercentage">
      <div className="taskInpuPercentage-input-container">
        <Input
          type="number"
          value={percentage}
          className="taskInpuPercentage-input"
          onChange={handlePercentage}
          autoFocus
          onBlur={handleBlurPercentage}
          disabled={disabled}
          styleInputDisabled={2}
        />
        <VscPercentage className="taskInpuPercentage-icon" />
      </div>
      {!disabled && (
        <div className="taskInpuPercentage-span-container">
          {PERCENTAGE_VALUES.map(el => (
            <span
              key={el}
              className="taskInpuPercentage-span-text"
              onClick={() => handleSetPercentage(el)}
            >
              {el}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskInputPercentage;
