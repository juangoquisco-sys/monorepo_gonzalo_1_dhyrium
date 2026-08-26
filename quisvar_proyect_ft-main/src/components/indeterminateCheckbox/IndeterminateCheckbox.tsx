import { type InputHTMLAttributes, useEffect, useRef } from 'react';
import './indeterminateCheckbox.css';

interface IndeterminateCheckboxProps
  extends InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
}

const IndeterminateCheckbox = ({
  indeterminate,
  className = '',
  ...rest
}: IndeterminateCheckboxProps) => {
  const ref = useRef<HTMLInputElement>(null!);

  useEffect(() => {
    if (typeof indeterminate === 'boolean') {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className={className + 'indeterminateCheckbox'}
      {...rest}
    />
  );
};

export default IndeterminateCheckbox;
