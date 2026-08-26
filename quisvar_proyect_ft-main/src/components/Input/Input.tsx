import {
  type CSSProperties,
  type ForwardedRef,
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState,
} from 'react';
import Eye from '/svg/eye.svg';
import EyeClose from '/svg/eyeClose.svg';
import './input.css';
import { STYLE_INPUT } from './inputDefinitions';
import type { FieldErrors, FieldValues, Path } from 'react-hook-form';
import InputErrorInfo from '../inputErrorInfo/InputErrorInfo';
interface InputTextProps<FormData extends FieldValues>
  extends InputHTMLAttributes<HTMLInputElement> {
  name?: Path<FormData>;
  label?: string;
  col?: boolean;
  classNameMain?: string;
  errors?: FieldErrors<FormData>;
  errorPosX?: number;
  errorPosY?: number;
  errorRelative?: boolean;
  handleSearch?: (() => void) | boolean;
  styleInput?: keyof typeof STYLE_INPUT;
  styleInputDisabled?: number;
  full?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  autoFocus?: boolean;
  width?: number;
  isMoney?: boolean;
}

const InputText = <FormData extends FieldValues>(
  {
    name,
    label,
    col,
    errors,
    type,
    errorPosX = 0,
    errorPosY = 0,
    disabled,
    errorRelative = false,
    classNameMain,
    handleSearch,
    styleInput = 2,
    className,
    full = true,
    styleInputDisabled = 2,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    autoFocus,
    width,
    isMoney,
    ...props
  }: InputTextProps<FormData>,
  ref: ForwardedRef<HTMLInputElement>
) => {
  const [isShow, setIsShow] = useState(false);
  const viewPassword = () => setIsShow(!isShow);

  let typeAux = type;
  if (type === 'password') {
    typeAux = isShow ? 'text' : 'password';
  }

  const containInputStyle: CSSProperties = {
    width: width ? `${width}rem` : full ? '100%' : 'auto',
  };
  const inputStyle: CSSProperties = {
    paddingLeft: isMoney ? '1.5rem' : !!LeftIcon ? '2.5rem' : '0.3125rem',
    paddingRight:
      !!RightIcon || handleSearch || type == 'password'
        ? '2.5rem'
        : '0.3125rem',
    ...props.style,
  };

  return (
    <div
      className={`input-main ${col && 'input-col'} ${classNameMain}`}
      style={containInputStyle}
    >
      {label && (
        <label
          htmlFor={name}
          className={`${col ? 'input-label-col' : 'input-label'}`}
        >
          {label}
        </label>
      )}
      <div className={`${col ? 'input-option-col' : 'input-option'}`}>
        {!!LeftIcon && <span className="input-icon-left">{LeftIcon}</span>}
        {isMoney && (
          <span className="input-icon-left input-icon-money">S/. </span>
        )}

        <input
          name={name}
          id={name}
          className={`${className} ${STYLE_INPUT[styleInput]} ${
            errors && name && errors[name] && 'input-area-error'
          } ${disabled && 'input-disabled-' + styleInputDisabled} `}
          style={inputStyle}
          disabled={disabled}
          ref={ref}
          type={typeAux}
          onFocus={e => {
            props?.onFocus?.(e);
            if (autoFocus) {
              e.target?.select();
            }
          }}
          {...props}
        />
        {!!RightIcon && <span className="input-icon-right">{RightIcon}</span>}

        {type == 'password' && (
          <img
            onClick={viewPassword}
            src={isShow ? Eye : EyeClose}
            alt={Eye}
            className="input-icon"
          />
        )}
        {handleSearch && typeof handleSearch === 'function' && (
          <img
            onClick={handleSearch}
            src={'/svg/ic_baseline-search.svg'}
            className="input-icon"
          />
        )}
      </div>
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

export default forwardRef(InputText);
