import { useEffect, useMemo, useState } from 'react';
import { UserRound, UsersRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getOfficeProjectModerators } from '../../services/officeMeetings.service';

type CommitmentAssigneePopoverProps = {
  unitId: string;
  value: number[];
  fallbackNames?: Map<number, string>;
  onApply: (userIds: number[]) => void;
  disabled?: boolean;
};

const memberName = (member: {
  user: {
    id: number;
    email?: string | null;
    profile?: { firstName: string; lastName: string } | null;
  };
}) => {
  const profile = member.user.profile;
  const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
  return name || member.user.email || `Usuario ${member.user.id}`;
};

export const CommitmentAssigneePopover = ({
  unitId,
  value,
  fallbackNames = new Map(),
  onApply,
  disabled = false,
}: CommitmentAssigneePopoverProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<number[]>(value);
  const membersQuery = useQuery({
    queryKey: ['office-project-moderators', unitId],
    queryFn: () => getOfficeProjectModerators(unitId),
    enabled: open || value.length > 0,
  });
  const memberships = membersQuery.data?.memberships ?? [];
  const namesById = useMemo(() => {
    const names = new Map(fallbackNames);
    memberships.forEach(member =>
      names.set(member.user.id, memberName(member))
    );
    return names;
  }, [fallbackNames, memberships]);
  const selectedNames = value
    .map(userId => namesById.get(userId))
    .filter((name): name is string => Boolean(name));
  const label = !value.length
    ? 'Elegir encargado'
    : selectedNames.length
    ? `${selectedNames[0]}${value.length > 1 ? ` +${value.length - 1}` : ''}`
    : `${value.length} encargados`;

  useEffect(() => {
    if (open) setDraft([...value]);
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 max-w-full items-center gap-1.5 overflow-hidden rounded-md border border-border bg-background px-2 text-left text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
          disabled={disabled}
          title={label}
        >
          {value.length > 1 ? (
            <UsersRound className="size-3.5 shrink-0" />
          ) : (
            <UserRound className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="flex items-center justify-between gap-2 border-b border-border px-2 pb-2">
          <div>
            <p className="text-sm font-semibold">Encargados</p>
            <p className="text-xs text-muted-foreground">
              Miembros activos de la unidad
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDraft([])}
          >
            Limpiar
          </Button>
        </div>

        <div className="max-h-64 overflow-auto py-2">
          {membersQuery.isLoading && (
            <p className="p-2 text-sm text-muted-foreground">
              Cargando miembros...
            </p>
          )}
          {membersQuery.isError && (
            <p className="p-2 text-sm text-danger-foreground">
              No se pudieron cargar los miembros.
            </p>
          )}
          {!membersQuery.isLoading &&
            !membersQuery.isError &&
            !memberships.length && (
              <p className="p-2 text-sm text-muted-foreground">
                No hay miembros activos en esta unidad.
              </p>
            )}
          {memberships.map(membership => {
            const userId = membership.user.id;
            const checked = draft.includes(userId);
            return (
              <label
                key={membership.id || userId}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    setDraft(current =>
                      checked
                        ? current.filter(currentId => currentId !== userId)
                        : [...current, userId]
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {memberName(membership)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {membership.user.profile?.job ||
                      membership.user.email ||
                      'Miembro de la unidad'}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onApply(Array.from(new Set(draft)));
              setOpen(false);
            }}
            disabled={disabled || membersQuery.isLoading}
          >
            Aplicar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
