import type { ChangeEvent } from 'react';
import './yesNoRadio.css';

type YesNoRadioProps = {
  value: 'yes' | 'no' | null;
  name: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  idPrefix: string;
};

const YesNoRadio = ({
  value,
  name,
  onChange,
  disabled = false,
  idPrefix,
}: YesNoRadioProps) => {
  return (
    <div className="yesNoRadio">
      <label
        className={`yesNoRadio-option ${
          value === 'yes' ? 'yesNoRadio-option--yes' : ''
        }`}
      >
        <input
          type="radio"
          value="yes"
          name={name}
          id={`${idPrefix}-yes`}
          onChange={onChange}
          checked={value === 'yes'}
          disabled={disabled}
        />
        Si
      </label>

      <label
        className={`yesNoRadio-option ${
          value === 'no' ? 'yesNoRadio-option--no' : ''
        }`}
      >
        <input
          type="radio"
          value="no"
          name={name}
          id={`${idPrefix}-no`}
          onChange={onChange}
          checked={value === 'no'}
          disabled={disabled}
        />
        No
      </label>
    </div>
  );
};

export default YesNoRadio;
