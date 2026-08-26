import {
  forwardRef,
  useState,
  useImperativeHandle,
  type Ref,
  useEffect,
  type InputHTMLAttributes,
} from 'react';

import './inputRange.css';

interface InputTextProps extends InputHTMLAttributes<HTMLInputElement> {
  name?: string;
  maxRange: number;
  newPercentage?: number;
  defaultValue?: number;
  disabled?: boolean;
}

interface InputRangeRef {
  getValue: () => number | undefined;
  setValue: (newValue: number) => void;
}

const InputRange = forwardRef<InputRangeRef, InputTextProps>(
  (
    { name, maxRange, newPercentage, defaultValue, disabled, ...props },
    ref
  ) => {
    const [value, setValue] = useState<number | undefined>(defaultValue);

    const getBackgroundSize = () => ({
      backgroundSize: value
        ? `${(value * 100) / maxRange}% 100%`
        : `${defaultValue}% 100%`,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      setValue(newValue);
    };

    useImperativeHandle(ref, () => ({
      getValue: () => value,
      setValue: (newValue: number) => setValue(newValue),
    }));

    useEffect(() => {
      setValue(newPercentage);
    }, [newPercentage]);

    return (
      <div className="input-range range-container">
        <input
          name={name}
          ref={ref as Ref<HTMLInputElement>}
          type="range"
          maxLength={maxRange}
          value={value === undefined ? String(defaultValue) : String(value)}
          // defaultValue={defaultValue}
          {...props}
          className="input-range"
          style={getBackgroundSize()}
          disabled={disabled}
          onChange={handleInputChange}
        />
        <input
          {...props}
          type="number"
          max={maxRange}
          value={value || defaultValue}
          onChange={handleInputChange}
          className="input-range-text"
          disabled={disabled}
        />
      </div>
    );
  }
);

export default InputRange;
