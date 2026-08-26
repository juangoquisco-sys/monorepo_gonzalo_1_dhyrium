import { useRef } from 'react';
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components';
import { MoreHorizontal24Regular } from '@fluentui/react-icons';

import { writerIconRegistry } from './IconRegistry';
import { useKeyTip } from './KeyTipManager';
import { useRibbonCommandRegistry } from './RibbonRuntime';
import type { RibbonGroup } from './ribbonTypes';

interface RibbonOverflowProps {
  groups: RibbonGroup[];
  styleItems: Array<{ id: string; label: string }>;
}

export const RibbonOverflow = ({ groups, styleItems }: RibbonOverflowProps) => {
  const registry = useRibbonCommandRegistry();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const showKeyTip = useKeyTip('Z', triggerRef);

  if (groups.length === 0) return null;

  return (
    <Menu positioning="below-end">
      <MenuTrigger disableButtonEnhancement>
        <button
          ref={triggerRef}
          type="button"
          className="canvas-word-ribbon__overflow-trigger"
          aria-label="Más comandos de la cinta"
          aria-keyshortcuts="Alt+Z"
        >
          <MoreHorizontal24Regular aria-hidden="true" />
          <span>Más</span>
          {showKeyTip && <kbd className="canvas-word-ribbon__keytip">Z</kbd>}
        </button>
      </MenuTrigger>
      <MenuPopover className="canvas-word-ribbon__overflow-popover">
        <MenuList>
          {groups.flatMap(group => {
            const GroupIcon = writerIconRegistry.resolve(group.icon) ?? MoreHorizontal24Regular;
            if (group.id === 'home.styles') {
              return styleItems.map(item => {
                const definition = registry.get('home.styles.gallery');
                const disabled = !registry.canExecute('home.styles.gallery', item.id);
                const disabledReason = disabled ? registry.disabledReason('home.styles.gallery') : undefined;
                return (
                  <MenuItem
                    key={`${group.id}-${item.id}`}
                    icon={<GroupIcon aria-hidden="true" />}
                    disabled={disabled}
                    secondaryContent={definition?.shortcut}
                    title={disabledReason ?? definition?.tooltip}
                    aria-description={disabledReason}
                    onClick={() => void registry.execute('home.styles.gallery', item.id)}
                  >
                    {group.label}: {item.label}
                  </MenuItem>
                );
              });
            }
            return group.controls.map(control => {
              const ControlIcon = writerIconRegistry.resolve(control.icon) ?? GroupIcon;
              const definition = registry.get(control.commandId);
              const disabled = !registry.canExecute(control.commandId);
              const disabledReason = disabled ? registry.disabledReason(control.commandId) : undefined;
              return (
                <MenuItem
                  key={control.commandId}
                  icon={<ControlIcon aria-hidden="true" />}
                  disabled={disabled}
                  secondaryContent={definition?.shortcut}
                  title={disabledReason ?? definition?.tooltip}
                  aria-description={disabledReason}
                  onClick={() => void registry.execute(control.commandId)}
                >
                  {group.label}: {control.label}
                </MenuItem>
              );
            });
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
