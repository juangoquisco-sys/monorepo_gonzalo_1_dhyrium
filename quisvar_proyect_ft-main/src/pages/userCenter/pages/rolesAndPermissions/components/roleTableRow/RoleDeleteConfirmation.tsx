import { useState } from 'react';
import { AppButton } from '@/components/app-ui/app-button';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

type RoleOption = { id: number; name: string };
type AffectedUser = {
  id: number;
  profile: { firstName: string; lastName: string; dni: string } | null;
};

type Props = {
  role: RoleOption & { users: AffectedUser[] };
  roles: RoleOption[];
  onClose: () => void;
  onSave: () => void;
};

const RoleDeleteConfirmation = ({ role, roles, onClose, onSave }: Props) => {
  const [replacementRoleId, setReplacementRoleId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const affectedUsers = role.users ?? [];

  const confirm = async () => {
    if (affectedUsers.length > 0 && !replacementRoleId) {
      SnackbarUtilities.warning('Seleccione el rol destino para los usuarios afectados.');
      return;
    }
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`/role/${role.id}`, {
        data: replacementRoleId ? { replacementRoleId: +replacementRoleId } : {},
      });
      SnackbarUtilities.success(
        affectedUsers.length > 0
          ? `Rol eliminado y ${affectedUsers.length} usuario(s) reasignado(s).`
          : 'Rol eliminado correctamente.'
      );
      onSave();
      onClose();
    } catch (error: any) {
      SnackbarUtilities.error(
        error?.response?.data?.message || 'No se pudo eliminar el rol.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Se eliminará el rol <strong>{role.name}</strong>.
      </p>
      {affectedUsers.length > 0 && (
        <>
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="font-semibold">{affectedUsers.length} usuario(s) serán reasignados:</p>
            <ul className="mt-2 list-disc pl-5">
              {affectedUsers.map(user => (
                <li key={user.id}>{`${user.profile?.firstName ?? ''} ${user.profile?.lastName ?? ''}`.trim()} — {user.profile?.dni}</li>
              ))}
            </ul>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Rol destino
            <select
              className="h-10 rounded-md border border-input bg-background px-3"
              value={replacementRoleId}
              onChange={event => setReplacementRoleId(event.target.value)}
              disabled={isDeleting}
            >
              <option value="">Seleccione un rol</option>
              {roles
                .filter(candidate => candidate.id !== role.id)
                .map(candidate => (
                  <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                ))}
            </select>
          </label>
        </>
      )}
      <div className="flex justify-end gap-2">
        <AppButton type="button" variant="outline" onClick={onClose} disabled={isDeleting}>Cancelar</AppButton>
        <AppButton type="button" variant="danger" onClick={() => void confirm()} disabled={isDeleting}>
          {isDeleting ? 'Eliminando…' : 'Confirmar eliminación'}
        </AppButton>
      </div>
    </div>
  );
};

export default RoleDeleteConfirmation;
