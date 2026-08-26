import { type ControlProps, type OptionProps, components } from 'react-select';
import './optionProcedureSelect.css';
import type { OptionUserExtend } from '@/types/types';
import type { OptionSelect } from '@/types/option.types';
import { PiBuildingOfficeFill } from 'react-icons/pi';
import { FaUserLarge } from 'react-icons/fa6';

interface ProcedureIconProps {
  isUser: boolean;
  isSmall?: boolean;
}
const ProcedureIcon = ({ isUser, isSmall }: ProcedureIconProps) => {
  return (
    <div
      className={`optionProcedureSelect-icon ${
        isSmall && 'optionProcedureSelect-icon-small'
      }`}
    >
      {isUser ? (
        <FaUserLarge size={11} color="white" />
      ) : (
        <PiBuildingOfficeFill size={isSmall ? 14 : 16} color="white" />
      )}
    </div>
  );
};

interface OptionProcedureSelectProps extends OptionProps<OptionSelect, false> {
  isSmall?: boolean;
}
export const OptionProcedureSelect = ({
  isSmall = false,
  ...props
}: OptionProcedureSelectProps) => {
  const { data } = props;
  return (
    <components.Option {...props}>
      <div className="optionProcedureSelect scroll-slim">
        <ProcedureIcon isUser={data.id === 0} isSmall={isSmall} />
        <span
          className={`optionProcedureSelect-span ${
            isSmall && 'optionProcedureSelect-span-small'
          }`}
        >
          {data.label}
        </span>
      </div>
    </components.Option>
  );
};

interface ControlProcedureSelectProps
  extends ControlProps<OptionSelect, false> {
  isSmall?: boolean;
}

export const ControlProcedureSelect = ({
  isSmall = false,
  ...props
}: ControlProcedureSelectProps) => {
  const { children, selectProps } = props;
  const data = selectProps.value as OptionUserExtend;
  return (
    <components.Control {...props}>
      <div className="optionProcedureSelect" style={{ gap: '0.1rem' }}>
        <ProcedureIcon isUser={data.id === 0} isSmall={isSmall} />
        {children}
      </div>
    </components.Control>
  );
};
