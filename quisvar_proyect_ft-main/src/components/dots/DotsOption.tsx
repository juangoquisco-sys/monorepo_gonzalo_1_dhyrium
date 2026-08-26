import { useEffect, useState } from 'react';
import './DotsOption.css';
import Outside from '../portal/Outside';
import type { Option } from '@/types/types';

interface DotsOptionProps {
  data: Option[];
  className?: string;
  notPersist?: boolean;
  variant?: boolean;
  notPositionRelative?: boolean;
  isClickRight?: boolean;
  iconHide?: boolean;
}

const DotsOption = ({
  data,
  className,
  notPersist,
  notPositionRelative,
  variant = false,
  isClickRight,
  iconHide = false,
}: DotsOptionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const handleClick = (value: (() => void) | undefined) => {
    value?.();
    notPersist && setIsOpen(false);
  };

  useEffect(() => {
    if (isClickRight !== undefined) {
      setIsOpen(isClickRight);
    }
  }, [isClickRight]);

  return (
    <Outside onClickOutside={() => setIsOpen(false)}>
      <div
        className={`${
          notPositionRelative ? 'dots-content-not-relative' : 'dots-content'
        } `}
        onClick={e => e.stopPropagation()}
      >
        {!iconHide && (
          <span onClick={() => setIsOpen(!isOpen)}>
            <img
              className="menu-icon-dot"
              src={`/svg/${variant ? 'dots-color' : 'menusmall'}.svg`}
              alt=""
            />
          </span>
        )}
        <div className={`${className} dot-options`}>
          {isOpen &&
            data.map((option, index) => (
              <button
                key={index}
                className="option-list"
                onClick={() => handleClick(option.function)}
                type={option.type}
              >
                {option.icon && (
                  <img src={`/svg/${option.icon}.svg`} className="dot-icon" />
                )}
                {option.name}
              </button>
            ))}
        </div>
      </div>
    </Outside>
  );
};

export default DotsOption;
