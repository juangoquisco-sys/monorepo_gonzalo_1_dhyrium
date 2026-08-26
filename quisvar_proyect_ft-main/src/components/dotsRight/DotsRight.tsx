import './dotsRight.css';
import type { Option } from '@/types/types';
import { ContextMenuContent, ContextMenuItem } from '../ui/context-menu';

interface DotsRightProps {
  data: Option[];
}

const DotsRight = ({ data }: DotsRightProps) => {
  const handleClick = (value: (() => void) | undefined) => {
    value?.();
  };

  return (
    <ContextMenuContent className="dotsRight-contex-menu">
      {data.map((option, index) => (
        <ContextMenuItem
          key={index}
          onSelect={e => {
            e.stopPropagation();
            handleClick(option.function);
          }}
          className="dotsRight-contex-menu-item"
        >
          <button
            key={index}
            className="dotsRight-option-list"
            type={option.type ?? 'button'}
          >
            {option.icon && (
              <img src={`/svg/${option.icon}.svg`} className="dotsRight-icon" />
            )}
            {option.name}
          </button>
        </ContextMenuItem>
      ))}
    </ContextMenuContent>
  );
};

export default DotsRight;
