import type { ReactNode } from 'react';
import type { Option } from '@/types/types';
import DotsRight from '../dotsRight/DotsRight';
import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';

interface AppContextMenuProps {
  children: ReactNode;
  data?: Option[];
  className?: string;
  disabled?: boolean;
}

const AppContextMenu = ({
  children,
  data = [],
  className,
  disabled = false,
}: AppContextMenuProps) => {
  if (disabled || data.length === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className}>{children}</ContextMenuTrigger>
      <DotsRight data={data} />
    </ContextMenu>
  );
};

export default AppContextMenu;
