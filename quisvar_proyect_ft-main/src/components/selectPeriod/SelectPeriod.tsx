import SelectReact, {
  components,
  type ControlProps,
  type MenuProps,
  type MultiValue,
  type SingleValue,
} from 'react-select';
import useListPeriod from '@/hooks/useListPeriod';
import { LuCalendarClock } from 'react-icons/lu';
import { COLOR_CSS } from '@/utils/cssData';
import './selectPeriod.css';
import { FaPlus } from 'react-icons/fa';
import CardRegisterPeriod from '@/views/cardRegisterPeriod/CardRegisterPeriod';
import OptionCrudSelect from '../select/optionComponents/optionCrudSelect/OptionCrudSelect';
import type { PeriodsSelect } from '@/types/types';
import { isOpenModalPeriod$ } from '@/services/sharingSubject';

const Control = (props: ControlProps<PeriodsSelect>) => (
  <components.Control {...props}>
    <LuCalendarClock size={15} color={COLOR_CSS.gray} /> {props.children}
  </components.Control>
);

interface CustomMenuProps extends MenuProps<PeriodsSelect> {
  addNewOption: boolean;
  onCreateOption: () => void;
}
const Menu = (props: CustomMenuProps) => {
  const { addNewOption = false, onCreateOption, ...rest } = props;
  return (
    <>
      <components.Menu {...rest}>
        {addNewOption && (
          <div className="addNewOption" onClick={onCreateOption}>
            <FaPlus size={13} color={COLOR_CSS.primary} />
            <span className="addNewOption-span">Agregar periodo</span>
          </div>
        )}
        {props.children}
      </components.Menu>
    </>
  );
};

interface SelectPeriodProps {
  onChange?: (value: [Date, Date]) => void;
  disabled?: boolean;
  width?: string;
}
const SelectPeriod = ({
  onChange,
  disabled,
  width = '12rem',
}: SelectPeriodProps) => {
  const { useListPeriodQuery } = useListPeriod();
  const handleSelectOption = (
    option: SingleValue<PeriodsSelect> | MultiValue<PeriodsSelect>
  ) => {
    if (!option || option instanceof Array) return;
    onChange?.([new Date(option.initialDate), new Date(option.untilDate)]);
  };

  const handleOpenModal = () => {
    isOpenModalPeriod$.setSubject = {
      isOpen: true,
    };
  };

  const handleEditOption = (data: PeriodsSelect) => {
    isOpenModalPeriod$.setSubject = {
      isOpen: true,
      data,
    };
  };
  const onSave = () => {
    useListPeriodQuery.refetch();
  };
  return (
    <>
      <SelectReact
        isClearable
        options={useListPeriodQuery.data || []}
        components={{
          Option: props => (
            <OptionCrudSelect
              {...props}
              onSave={onSave}
              onEditOption={handleEditOption}
              urlDelete={data => `/phases/${data.id}`}
              sizeIcon={0.7}
            />
          ),
          Control,
          Menu: props => (
            <Menu
              {...props}
              addNewOption={true}
              onCreateOption={handleOpenModal}
            />
          ),
        }}
        noOptionsMessage={() => 'No se encontraron resultados'}
        onChange={handleSelectOption}
        isLoading={useListPeriodQuery.isFetching}
        placeholder="Perido"
        styles={{
          container: provided => ({
            ...provided,
            width,
          }),
          control: (baseStyles, state) => ({
            ...baseStyles,
            boxShadow: 'none',
            borderColor: 'transparent',
            fontSize: '0.875rem',
            fontWeight: '500',
            paddingLeft: 10,
            backgroundColor: state.isDisabled
              ? 'white'
              : baseStyles.backgroundColor,
            borderRadius: 0,
            borderBottom: '0.1px solid #cccccc',
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
          dropdownIndicator: provided => ({
            ...provided,
            padding: 0,
            paddingInline: 8,
          }),
          placeholder: provided => ({
            ...provided,
            fontSize: '0.8rem',
            fontWeight: '500',
          }),
          noOptionsMessage: provided => ({
            ...provided,
            fontSize: '0.8rem',
          }),
          option: provided => ({
            ...provided,
            fontSize: '0.7rem',
          }),
        }}
        isDisabled={disabled}
      />
      <CardRegisterPeriod onSave={onSave} />
    </>
  );
};

export default SelectPeriod;
