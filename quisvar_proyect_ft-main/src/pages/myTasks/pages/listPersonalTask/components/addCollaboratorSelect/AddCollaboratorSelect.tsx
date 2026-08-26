import SelectReact, { components } from 'react-select';
import type { PlaceholderProps, SingleValue } from 'react-select';
import useListUserGroup from '@/pages/specialities/hooks/useListUserGroup';
import { OptionUserSelect } from '@/components/select/optionComponents/optionUserSelect/OptionUserSelect';
import { FiPlus } from 'react-icons/fi';
import './addCollaboratorSelect.css';
import type { UserSelect } from '@/pages/specialities/models/taskGroupUser.types';
const Placeholder = <T,>(props: PlaceholderProps<T>) => {
  return (
    <components.Placeholder {...props}>
      <h4 className="addCollaboratorSelect-add">
        <FiPlus size={15} />
        Agregar colaborador
      </h4>
    </components.Placeholder>
  );
};
interface AddCollaboratorSelectProps {
  taskId: number;
  onChange?: (value: UserSelect) => void;
  userIdSelects: number[];
}

const AddCollaboratorSelect = ({
  taskId,
  onChange,
  userIdSelects,
}: AddCollaboratorSelectProps) => {
  const { useListUserGroupQuery } = useListUserGroup(taskId);
  const handleSelectOption = async (option: SingleValue<UserSelect>) => {
    onChange?.(option!);
  };
  return (
    <SelectReact
      className="addCollaboratorSelect"
      isClearable
      options={useListUserGroupQuery.data}
      components={{
        Option: OptionUserSelect<UserSelect>,
        Placeholder,
      }}
      onChange={handleSelectOption}
      value={null}
      isLoading={useListUserGroupQuery.isLoading}
      isOptionDisabled={({ id }) => userIdSelects.includes(id)}
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
  );
};

export default AddCollaboratorSelect;
