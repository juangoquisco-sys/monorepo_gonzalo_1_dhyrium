import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
  type ForwardedRef,
  forwardRef,
} from 'react';
import Input from './Input';
import { VscPercentage } from 'react-icons/vsc';

interface InputPercentageProps {
  value?: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
  width?: number;
  limit?: number;
  minLimit?: number;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

const InputPercentage = forwardRef<HTMLInputElement, InputPercentageProps>(
  (
    {
      value,
      disabled,
      onChange,
      width,
      limit = 100,
      minLimit = 0,
      onKeyDown,
      ...rest
    }: InputPercentageProps,
    ref: ForwardedRef<HTMLInputElement>
  ) => {
    const [percentage, setPercentage] = useState('0');
    const isControlled = useRef(!!onChange);

    const handlePercentage = ({ target }: ChangeEvent<HTMLInputElement>) => {
      const { value } = target;
      handleSetPercentage(String(Math.min(+value, limit) || ''));
    };

    const handleSetPercentage = (value: string) => {
      if (isControlled.current) {
        return onChange!(+value);
      }
      setPercentage(value);
    };

    const handleBlurPercentage = ({ target }: FocusEvent<HTMLInputElement>) => {
      if (!target.value) return handleSetPercentage('0');
      handleSetPercentage(String(Math.max(+target.value, minLimit)));
    };

    useEffect(() => {
      setPercentage(String(value));
    }, [value]);

    return (
      <div
        className="inputPercentage-input-container"
        style={width ? { width: `${width}rem` } : {}}
      >
        <Input
          type="number"
          value={percentage}
          className="inputPercentage-input"
          onChange={handlePercentage}
          autoFocus
          onKeyDown={onKeyDown}
          onBlur={handleBlurPercentage}
          disabled={disabled}
          styleInputDisabled={2}
          ref={ref}
          {...rest}
        />
        <VscPercentage className="inputPercentage-icon" />
      </div>
    );
  }
);

export default InputPercentage;
