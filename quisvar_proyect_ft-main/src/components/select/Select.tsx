import './Select.css';
import type { StylesVariant } from '@/types/types';
import {
  type CSSProperties,
  type ForwardedRef,
  type ReactNode,
  type SelectHTMLAttributes,
  forwardRef,
} from 'react';
import { STYLE_SELECT } from './selectDefinitions';
import InputErrorInfo from '../inputErrorInfo/InputErrorInfo';
import type { FieldErrors, FieldValues, Path } from 'react-hook-form';

interface SelectOptionsProps<T, FormData extends FieldValues>
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  data?: T[];
  renderTextField?: (data: T) => ReactNode;
  extractValue: (data: T) => string | number;
  name?: Path<FormData>;
  errors?: FieldErrors<FormData>;
  errorPosX?: number;
  errorPosY?: number;
  placeholder?: string;
  errorRelative?: boolean;
  placeholderDisabled?: boolean;
  styleVariant?: StylesVariant;
  width?: number;
}
export const SelectOptions = <T, FormData extends FieldValues>(
  {
    label,
    data,
    name,
    errorPosX = 0,
    errorPosY = 0,
    errors,
    defaultValue,
    errorRelative = false,
    className,
    placeholder,
    extractValue,
    renderTextField,
    placeholderDisabled = false,
    width,
    styleVariant = 'secondary',
    ...props
  }: SelectOptionsProps<T, FormData>,
  ref: ForwardedRef<HTMLSelectElement>
) => {
  const styleContainer: CSSProperties = {
    width: width ? `${width}rem` : '100%',
  };
  return (
    <div className="select-container" style={styleContainer}>
      {label && (
        <label htmlFor="email" className="input-label">
          {label}
        </label>
      )}
      <select
        className={`${STYLE_SELECT[styleVariant]} ${className} input-disabled-2`}
        {...props}
        ref={ref}
        defaultValue={defaultValue}
        name={name}
      >
        <option value={''} disabled={placeholderDisabled}>{`${
          placeholder ? placeholder : 'Seleccionar'
        }`}</option>
        {data?.map(element => (
          <option key={extractValue(element)} value={extractValue(element)}>
            {renderTextField && renderTextField(element)}
          </option>
        ))}
      </select>
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

export default forwardRef(SelectOptions);
