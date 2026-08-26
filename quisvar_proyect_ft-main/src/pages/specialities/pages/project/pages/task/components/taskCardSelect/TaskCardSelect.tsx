import SelectReact from 'react-select';
import type { MenuPosition, SingleValue } from 'react-select';
import type { OptionUserExtend } from '@/types/types';
import './taskCardSelect.css';
import {
  OptionUserSelect,
  ControlUser,
} from '@/components/select/optionComponents/optionUserSelect/OptionUserSelect';

// type OptionValuesExtend<OptionValues> = OptionValues;

interface TaskCardSelectProps<OptionValues extends OptionUserExtend> {
  label?: string;
  options: OptionValues[];
  viewAssigned?: boolean;
  idDefaultValue?: number | null;
  onAssigned?: () => void;
  isDisabled?: boolean;
  onChange?: (value: OptionValues | null) => void;
  isLoading?: boolean;
  menuPosition?: MenuPosition;
}
function TaskCardSelect<OptionValues extends OptionUserExtend>({
  label,
  options,
  onAssigned,
  isDisabled = false,
  viewAssigned = false,
  idDefaultValue,
  isLoading,
  onChange,
  menuPosition = 'fixed',
}: TaskCardSelectProps<OptionValues>) {
  const handleSelectOption = (option: SingleValue<OptionValues>) => {
    if (!option) {
      return onChange?.(null);
    }
    onChange?.(option);
  };

  return (
    <div className="taskCardSelect">
      {label && <span className="taskCardSelect-label">{label}</span>}
      <div className="taskCardSelect-contain">
        <SelectReact
          isClearable
          options={options}
          components={{
            Option: OptionUserSelect<OptionValues>,
            Control: ControlUser,
          }}
          defaultValue={options.find(el => el.id === idDefaultValue)}
          isDisabled={isDisabled}
          onChange={handleSelectOption}
          isLoading={isLoading}
          menuPosition={menuPosition}
          placeholder="Sin asignar..."
          className="taskCardSelect-select"
          styles={{
            control: (baseStyles, state) => ({
              ...baseStyles,
              borderColor: 'transparent',
              fontSize: '0.875rem',
              fontWeight: '500',
              paddingLeft: 10,
              backgroundColor: state.isDisabled
                ? 'white'
                : baseStyles.backgroundColor,
            }),
            singleValue: (provided, state) => ({
              ...provided,
              color: state.isDisabled ? 'black' : provided.color,
              fontSize: ' 0.875rem',
              fontWeight: '400',
              lineHeight: '150%',
              letterSpacing: '0.01313rem',
            }),
            indicatorsContainer: (provided, state) => ({
              ...provided,
              display: state.isDisabled ? 'none' : provided.display,
            }),
            placeholder: provided => ({
              ...provided,
              fontSize: '0.8rem',
              fontWeight: '500',
            }),
          }}
        />
        {viewAssigned && (
          <span className="taskCardSelect-assign" onClick={onAssigned}>
            Asignarme
          </span>
        )}
      </div>
    </div>
  );
}

export default TaskCardSelect;
