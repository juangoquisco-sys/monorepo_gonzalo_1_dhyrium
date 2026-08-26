import { useEffect, useState } from 'react';
import type { StylesVariant } from '@/types/types';
import type { OptionSelect } from '@/types/option.types';
import type { Props as SelectProps } from 'react-select';
import AdvancedSelect from './AdvancedSelect';
import { Controller } from 'react-hook-form';
import type { Control, FieldErrors, FieldValues, Path } from 'react-hook-form';
import OptionCrudSelect from './optionComponents/optionCrudSelect/OptionCrudSelect';

interface AdvancedSelectCrudProps<
  OptionValues extends OptionSelect,
  FormData extends FieldValues
> extends SelectProps<OptionValues> {
  options: OptionValues[];
  control?: Control<FormData>;
  errors?: FieldErrors<FormData>;
  label?: string;
  name: Path<FormData>;
  placeholder?: string;
  styleVariant?: StylesVariant;
  onCreateOption?: (value: string) => void;
  onEditOption?: (value: OptionValues) => void;
  onSave?: () => void;
  urlDelete: string;
}

const AdvancedSelectCrud = <
  OptionValues extends OptionSelect,
  FormData extends FieldValues
>({
  options,
  control,
  errors,
  label,
  name,
  styleVariant,
  onEditOption,
  onCreateOption,
  onSave,
  urlDelete,
  placeholder = 'Seleccione...',
  isMulti,
  ...props
}: AdvancedSelectCrudProps<OptionValues, FormData>) => {
  const [selectData, setSelectData] = useState<OptionValues[]>(options);

  useEffect(() => {
    setSelectData(options);
  }, [options]);

  return control ? (
    <Controller
      control={control}
      name={name}
      rules={{ required: 'Debes seleccionar una opción' }}
      render={({ field: { onChange: onChangeForm, value: data } }) => (
        <AdvancedSelect
          {...props}
          placeholder={placeholder}
          components={{
            Option: props => (
              <OptionCrudSelect
                {...props}
                onSave={onSave}
                onEditOption={onEditOption}
                urlDelete={data => `${urlDelete}/${data.value}`}
              />
            ),
          }}
          options={selectData}
          isClearable
          isCreatable
          onCreateOption={onCreateOption}
          value={
            !isMulti ? selectData.find(c => c.value === data?.value) : data
          }
          label={label}
          errors={errors}
          name={name}
          onChange={onChangeForm}
          styleVariant={styleVariant}
          isMulti={isMulti}
        />
      )}
    />
  ) : (
    <AdvancedSelect
      {...props}
      placeholder={placeholder}
      components={{
        Option: props => (
          <OptionCrudSelect
            {...props}
            onSave={onSave}
            onEditOption={onEditOption}
            urlDelete={data => `${urlDelete}/${data.value}`}
          />
        ),
      }}
      options={selectData}
      isClearable
      isCreatable
      onCreateOption={onCreateOption}
      label={label}
      errors={errors}
      name={name}
      styleVariant={styleVariant}
    />
  );
};

export default AdvancedSelectCrud;
