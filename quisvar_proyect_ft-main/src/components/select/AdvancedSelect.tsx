import SelectReact from 'react-select';
import type {
  GroupBase,
  Props as ReactSelectProps,
  SelectInstance,
} from 'react-select';
import CreatableSelect from 'react-select/creatable';
import type { StylesVariant } from '@/types/types';
import { STYLE_SELECT_ADVANCE } from './selectDefinitions';
import type { FieldErrors, FieldValues, Path } from 'react-hook-form';
import InputErrorInfo from '../inputErrorInfo/InputErrorInfo';
import { type Ref, forwardRef } from 'react';

export interface AdvancedSelectProps<
  OptionType,
  FormData extends FieldValues,
  IsMulti extends boolean = false
> extends ReactSelectProps<OptionType, IsMulti, GroupBase<OptionType>> {
  label?: string;
  name?: Path<FormData>;
  errors?: FieldErrors<FormData>;
  errorPosX?: number;
  errorPosY?: number;
  onCreateOption?: (inputValue: string) => void;
  isCreatable?: boolean;
  errorRelative?: boolean;
  className?: string;
  styleVariant?: StylesVariant;
}

const AdvancedSelect = <
  OptionType,
  FormData extends FieldValues,
  IsMulti extends boolean = false
>(
  {
    label,
    errorPosX = 0,
    errorPosY = 0,
    errors,
    errorRelative = false,
    className,
    isCreatable,
    styleVariant = 'primary',
    onCreateOption,
    name,
    ...props
  }: AdvancedSelectProps<OptionType, FormData, IsMulti>,
  ref: Ref<SelectInstance<OptionType, IsMulti, GroupBase<OptionType>>>
) => {
  const SelectComponent = isCreatable ? CreatableSelect : SelectReact;
  return (
    <div className="select-container">
      {label && <label className="input-label">{label}</label>}
      <SelectComponent
        formatCreateLabel={inputValue => 'Crear: ' + inputValue}
        onCreateOption={onCreateOption}
        ref={ref}
        {...props}
        className={`AdvancedSelect ${STYLE_SELECT_ADVANCE[styleVariant]} ${className}`}
      />
      {name && errors && errors[name] && (
        <InputErrorInfo
          errors={errors}
          name={name}
          isRelative={errorRelative}
          errorPosX={errorPosX}
          errorPosY={errorPosY}
        />
      )}
    </div>
  );
};

export default forwardRef(AdvancedSelect);
