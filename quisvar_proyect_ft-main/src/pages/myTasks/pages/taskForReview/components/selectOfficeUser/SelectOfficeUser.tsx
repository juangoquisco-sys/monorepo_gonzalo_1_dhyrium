import useListOfficeUser from '../../hooks/useListOfficeUser';
import SelectReact, {
  components,
  type ControlProps,
  type MultiValue,
  type SingleValue,
} from 'react-select';
import './selectOfficeUser.tsx.css';
import Button from '@/components/button/Button';
import IconAction from '@/components/iconAction/IconAction';
import type { OfficeUsersSelect } from '../../interface/taskForReview.types';

const Control = (props: ControlProps<OfficeUsersSelect>) => (
  <components.Control {...props}>
    <Button
      leftIcon={<IconAction size={0.7} icon={'office-white'} position="none" />}
      color="gray"
      size="xxs"
      borderRadius={20}
    />
    {props.children}
  </components.Control>
);

interface SelectOfficeUserProps {
  onChange?: (data: OfficeUsersSelect | null) => void;
  disabled?: boolean;
}
const SelectOfficeUser = ({
  onChange,
  disabled = false,
}: SelectOfficeUserProps) => {
  const { listOfficeUser } = useListOfficeUser();

  const handleSelectOption = (
    option: SingleValue<OfficeUsersSelect> | MultiValue<OfficeUsersSelect>
  ) => {
    if (!option || option instanceof Array) return onChange?.(null);
    onChange?.(option || []);
  };
  return (
    <SelectReact
      isClearable
      options={listOfficeUser.data || []}
      components={{
        Control,
      }}
      noOptionsMessage={() => 'No se encontraron resultados'}
      onChange={handleSelectOption}
      isLoading={listOfficeUser.isFetching}
      placeholder="Oficina"
      styles={{
        container: provided => ({
          ...provided,
          width: '100%',
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
  );
};

export default SelectOfficeUser;
