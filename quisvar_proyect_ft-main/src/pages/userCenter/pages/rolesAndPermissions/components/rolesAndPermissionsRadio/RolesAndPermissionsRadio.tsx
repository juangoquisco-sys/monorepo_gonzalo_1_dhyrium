import './rolesAndPermissionsRadio.css';
import type { ChangeEvent } from 'react';

interface RolesAndPermissionsRadioProps {
  value: string;
  text: string;
  menuPointId: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  checked?: boolean;
}

const RolesAndPermissionsRadio = ({
  value,
  menuPointId,
  onChange,
  text,
  checked,
}: RolesAndPermissionsRadioProps) => {
  return (
    <label
      key={value}
      style={{ fontSize: 10 }}
      className="rolesAndPermissionsRadio"
    >
      <input
        type="radio"
        value={value}
        name={menuPointId}
        id={menuPointId}
        onChange={onChange}
        defaultChecked={checked}
      />
      {text}
    </label>
  );
};

export default RolesAndPermissionsRadio;
