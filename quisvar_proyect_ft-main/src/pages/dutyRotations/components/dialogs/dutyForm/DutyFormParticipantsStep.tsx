import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GripVertical,
  Plus,
  RefreshCw,
  Trash2,
  UserRoundCheck,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDutyUserFullName } from '../../../dutyRotations.utils';
import type {
  DutyAssignmentStrategy,
  DutyParticipantSource,
  DutyRoleOption,
  DutySlot,
  DutyUser,
} from '../../../models/dutyRotations.types';
import {
  DutyFormChoiceCard,
  DutyFormFieldError,
  DutyFormStepIntro,
} from './DutyFormStepPrimitives';

interface SortableParticipantProps {
  user: DutyUser;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: (userId: number) => void;
}

const SortableParticipant = ({
  user,
  index,
  total,
  onMove,
  onRemove,
}: SortableParticipantProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: user.id });
  const userName = getDutyUserFullName(user);

  return (
    <div
      ref={setNodeRef}
      className="dutyRotations-participantOrderRow"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="dutyRotations-dragHandle"
        aria-label={`Arrastrar a ${userName}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical />
      </button>
      <span>
        <strong>
          {index + 1}. {userName}
        </strong>
        <small>{user.role?.name || user.email || 'Sin rol visible'}</small>
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={index === 0}
        aria-label={`Subir a ${userName}`}
        onClick={() => onMove(index, index - 1)}
      >
        <ArrowUp />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={index === total - 1}
        aria-label={`Bajar a ${userName}`}
        onClick={() => onMove(index, index + 1)}
      >
        <ArrowDown />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Quitar a ${userName}`}
        onClick={() => onRemove(user.id)}
      >
        <Trash2 />
      </Button>
    </div>
  );
};

interface DutyFormParticipantsStepProps {
  participantSource: DutyParticipantSource;
  assignmentStrategy: DutyAssignmentStrategy;
  participantIds: number[];
  selectedUsers: DutyUser[];
  availableUsers: DutyUser[];
  userSearch: string;
  roles: DutyRoleOption[];
  slots: DutySlot[];
  participantsError?: string;
  allocationError?: string;
  usersLoading: boolean;
  usersError: boolean;
  rolesLoading: boolean;
  rolesError: boolean;
  onParticipantSourceChange: (value: DutyParticipantSource) => void;
  onUserSearchChange: (value: string) => void;
  onAddUser: (userId: number) => void;
  onAddRole: (role: DutyRoleOption) => void;
  onMoveParticipant: (from: number, to: number) => void;
  onRemoveParticipant: (userId: number) => void;
  onApplyActiveRoster: () => void;
  onRetryUsers: () => void;
  onRetryRoles: () => void;
  onToggleSlotEligibility: (index: number, userId: number) => void;
  onClearSlotEligibility: (index: number) => void;
}

const DutyFormParticipantsStep = ({
  participantSource,
  assignmentStrategy,
  participantIds,
  selectedUsers,
  availableUsers,
  userSearch,
  roles,
  slots,
  participantsError,
  allocationError,
  usersLoading,
  usersError,
  rolesLoading,
  rolesError,
  onParticipantSourceChange,
  onUserSearchChange,
  onAddUser,
  onAddRole,
  onMoveParticipant,
  onRemoveParticipant,
  onApplyActiveRoster,
  onRetryUsers,
  onRetryRoles,
  onToggleSlotEligibility,
  onClearSlotEligibility,
}: DutyFormParticipantsStepProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = participantIds.indexOf(Number(active.id));
    const to = participantIds.indexOf(Number(over.id));
    if (from < 0 || to < 0) return;
    onMoveParticipant(from, to);
  };

  const fixedCapacity = slots.reduce(
    (total, slot) =>
      total + (slot.capacity?.mode === 'FIXED' ? slot.capacity.count : 0),
    0
  );
  const remainderCount = Math.max(0, participantIds.length - fixedCapacity);
  const missingUserCount = participantIds.length - selectedUsers.length;
  const displayedUsers = availableUsers.slice(0, 20);

  return (
    <section
      className="dutyRotations-formStepPanel"
      aria-labelledby="duty-form-participants-title"
    >
      <DutyFormStepIntro
        eyebrow="Paso 3 de 4"
        title="Elige a las personas"
        description="Define quiénes participan y el orden base que seguirá la rotación."
        icon={UsersRound}
      />

      <div className="dutyRotations-formSection">
        <div className="dutyRotations-formSectionHeading">
          <div>
            <h3 id="duty-form-participants-title">Origen de la lista</h3>
            <p>
              Puedes controlar el orden manualmente o tomar una fotografía del
              personal activo elegible.
            </p>
          </div>
        </div>
        <div className="dutyRotations-formChoiceGrid">
          <DutyFormChoiceCard
            title="Elegir y ordenar personas"
            description="Agrega participantes concretos y controla su posición."
            selected={participantSource === 'EXPLICIT'}
            onClick={() => onParticipantSourceChange('EXPLICIT')}
            icon={UserRoundCheck}
          />
          <DutyFormChoiceCard
            title="Todo el personal activo presencial"
            description="Incluye el padrón elegible actual y permite sincronizarlo después."
            selected={participantSource === 'ACTIVE_ELIGIBLE_SYNC'}
            onClick={() => onParticipantSourceChange('ACTIVE_ELIGIBLE_SYNC')}
            icon={UsersRound}
            badge={
              assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
                ? 'Recomendado para este reparto'
                : undefined
            }
            disabled={usersLoading || usersError}
          />
        </div>
        <DutyFormFieldError>{participantsError}</DutyFormFieldError>
        <DutyFormFieldError>{allocationError}</DutyFormFieldError>
      </div>

      {usersLoading ? (
        <div className="dutyRotations-formLoading" aria-live="polite">
          <RefreshCw className="animate-spin" aria-hidden="true" />
          Cargando personas elegibles…
        </div>
      ) : null}
      {usersError ? (
        <Alert variant="danger">
          <AlertTitle>No se pudieron cargar las personas elegibles</AlertTitle>
          <AlertDescription>
            Reintenta la consulta antes de continuar. La selección existente no
            se modificó.
          </AlertDescription>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetryUsers}
          >
            <RefreshCw /> Reintentar
          </Button>
        </Alert>
      ) : null}

      {!usersError && participantSource === 'EXPLICIT' ? (
        <div className="dutyRotations-formSection">
          <div className="dutyRotations-formSectionHeading">
            <div>
              <h3>Selección manual</h3>
              <p>
                Los roles son atajos: siempre se guardan personas específicas.
              </p>
            </div>
            <span>{participantIds.length} seleccionadas</span>
          </div>

          <div
            className="dutyRotations-rolePicker"
            aria-label="Agregar personas por rol"
          >
            {rolesLoading ? <span>Cargando roles…</span> : null}
            {rolesError ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetryRoles}
              >
                <RefreshCw /> Reintentar roles
              </Button>
            ) : null}
            {roles.map(role => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                key={role.id}
                onClick={() => onAddRole(role)}
              >
                <Plus /> Agregar {role.name}
              </Button>
            ))}
          </div>

          <div className="dutyRotations-participantGrid">
            <div className="dutyRotations-participantPane">
              <header>
                <div>
                  <strong>Personas disponibles</strong>
                  <span>{availableUsers.length} coincidencias</span>
                </div>
              </header>
              <Input
                value={userSearch}
                aria-label="Buscar persona elegible"
                placeholder="Buscar por nombre o apellido"
                onChange={event => onUserSearchChange(event.target.value)}
              />
              <div className="dutyRotations-userResults">
                {displayedUsers.map(user => (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => onAddUser(user.id)}
                  >
                    <span>
                      <strong>{getDutyUserFullName(user)}</strong>
                      <small>
                        {user.role?.name || user.email || 'Sin rol visible'}
                      </small>
                    </span>
                    <Plus aria-hidden="true" />
                  </button>
                ))}
                {!displayedUsers.length ? (
                  <p>No hay personas disponibles para esta búsqueda.</p>
                ) : null}
              </div>
              {availableUsers.length > displayedUsers.length ? (
                <p className="dutyRotations-fieldHint">
                  Mostrando 20 de {availableUsers.length}. Escribe un nombre
                  para acotar la búsqueda.
                </p>
              ) : null}
            </div>

            <div className="dutyRotations-participantPane is-selected">
              <header>
                <div>
                  <strong>Orden de rotación</strong>
                  <span>La primera persona inicia el calendario.</span>
                </div>
                <span>{selectedUsers.length}</span>
              </header>
              {selectedUsers.length ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={participantIds}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="dutyRotations-selectedParticipants">
                      {selectedUsers.map((user, index) => (
                        <SortableParticipant
                          key={user.id}
                          user={user}
                          index={index}
                          total={selectedUsers.length}
                          onMove={onMoveParticipant}
                          onRemove={onRemoveParticipant}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="dutyRotations-formEmptyState">
                  <UserRoundCheck aria-hidden="true" />
                  <strong>Agrega al menos una persona</strong>
                  <span>
                    La vista previa aparecerá cuando la lista esté lista.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!usersError && participantSource === 'ACTIVE_ELIGIBLE_SYNC' ? (
        <div className="dutyRotations-formSection">
          <div className="dutyRotations-rosterSnapshot">
            <span
              className="dutyRotations-rosterSnapshotIcon"
              aria-hidden="true"
            >
              <CheckCircle2 />
            </span>
            <div>
              <strong>{participantIds.length} personas incluidas</strong>
              <p>
                Esta lista se guarda como una fotografía controlada. Los
                ingresos o bajas futuras requieren una sincronización
                confirmada.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onApplyActiveRoster}
              disabled={usersLoading}
            >
              <RefreshCw /> Actualizar lista activa
            </Button>
          </div>
          <details className="dutyRotations-rosterDetails">
            <summary>Ver personal incluido</summary>
            <div className="dutyRotations-rosterList">
              {selectedUsers.map((user, index) => (
                <div key={user.id}>
                  <span>{index + 1}</span>
                  <p>
                    <strong>{getDutyUserFullName(user)}</strong>
                    <small>
                      {user.role?.name || user.email || 'Sin rol visible'}
                    </small>
                  </p>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : null}

      {missingUserCount > 0 ? (
        <Alert variant="warning">
          <AlertTitle>Hay participantes sin información visible</AlertTitle>
          <AlertDescription>
            {missingUserCount} participante(s) conservan su identificador, pero
            no pudieron mostrarse. Revisa el padrón antes de guardar.
          </AlertDescription>
        </Alert>
      ) : null}

      {assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS' &&
      participantIds.length ? (
        <div className="dutyRotations-formSection">
          <div className="dutyRotations-formSectionHeading">
            <div>
              <h3>Comprobación del reparto</h3>
              <p>Los cupos se comparan con las personas seleccionadas.</p>
            </div>
          </div>
          <div className="dutyRotations-allocationBalance" aria-live="polite">
            <div>
              <span>Personal disponible</span>
              <strong>{participantIds.length}</strong>
            </div>
            <div>
              <span>Cupos fijos</span>
              <strong>{fixedCapacity}</strong>
            </div>
            <div>
              <span>Personal restante</span>
              <strong>{remainderCount}</strong>
            </div>
          </div>

          <details className="dutyRotations-formAdvanced dutyRotations-eligibilityRules">
            <summary>
              <span>Restringir personas por grupo</span>
              <small>Opcional</small>
            </summary>
            <div className="dutyRotations-formAdvancedContent">
              <p>
                Sin restricciones, cualquier participante puede ocupar el grupo.
                Úsalas solo cuando una zona requiera personal específico.
              </p>
              {slots.map((slot, slotIndex) => {
                const eligibleIds = slot.eligibleParticipantIds ?? [];
                return (
                  <fieldset
                    className="dutyRotations-eligibilityGroup"
                    key={slot.key}
                  >
                    <legend>{slot.label || `Grupo ${slotIndex + 1}`}</legend>
                    <div className="dutyRotations-eligibilityGroupHeader">
                      <span>
                        {eligibleIds.length
                          ? `${eligibleIds.length} personas autorizadas`
                          : 'Todas las personas son elegibles'}
                      </span>
                      {eligibleIds.length ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onClearSlotEligibility(slotIndex)}
                        >
                          Permitir a todos
                        </Button>
                      ) : null}
                    </div>
                    <div className="dutyRotations-eligibilityUsers">
                      {selectedUsers.map(user => {
                        const inputId = `slot-${slotIndex}-user-${user.id}`;
                        return (
                          <label htmlFor={inputId} key={user.id}>
                            <input
                              id={inputId}
                              type="checkbox"
                              checked={eligibleIds.includes(user.id)}
                              onChange={() =>
                                onToggleSlotEligibility(slotIndex, user.id)
                              }
                            />
                            <span>
                              <strong>{getDutyUserFullName(user)}</strong>
                              <small>
                                {user.role?.name ||
                                  user.email ||
                                  'Sin rol visible'}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
};

export default DutyFormParticipantsStep;
