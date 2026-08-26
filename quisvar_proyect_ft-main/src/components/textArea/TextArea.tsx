import type { FieldErrors, FieldValues, Path } from 'react-hook-form';
import { STYLE_INPUT } from '../Input/inputDefinitions';
import InputErrorInfo from '../inputErrorInfo/InputErrorInfo';
import './TextArea.css';
import {
  type ForwardedRef,
  type TextareaHTMLAttributes,
  forwardRef,
} from 'react';

interface TextAreaProps<FormData extends FieldValues>
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  name?: Path<FormData>;
  errors?: FieldErrors<FormData>;
  errorPosX?: number;
  errorPosY?: number;
  errorRelative?: boolean;
  styleInput?: keyof typeof STYLE_INPUT;
}
const TextArea = <FormData extends FieldValues>(
  {
    label,
    name,
    className,
    errors,
    errorPosX = 0,
    errorRelative = false,
    errorPosY = 0,
    disabled,
    styleInput = 2,
    ...props
  }: TextAreaProps<FormData>,
  ref: ForwardedRef<HTMLTextAreaElement>
) => {
  return (
    <div className="input-container">
      {label && (
        <label htmlFor={name} className="input-label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        name={name}
        disabled={disabled}
        className={`${className} ${STYLE_INPUT[styleInput]} ${
          disabled && 'input-disabled-2'
        } `}
        {...props}
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

export default forwardRef(TextArea);
