import type { InputHTMLAttributes } from 'react';
import IndeterminateCheckbox from './IndeterminateCheckbox';
import './indeterminateCheckbox.css';

interface IndeterminateCheckboxAllProps
  extends InputHTMLAttributes<HTMLInputElement> {
  indeterminate?: boolean;
}
const IndeterminateCheckboxAll = (props: IndeterminateCheckboxAllProps) => {
  return (
    <div className="indeterminateCheckboxAll">
      <IndeterminateCheckbox {...props} />
      <span>Seleccionar todo</span>
    </div>
  );
};

export default IndeterminateCheckboxAll;
