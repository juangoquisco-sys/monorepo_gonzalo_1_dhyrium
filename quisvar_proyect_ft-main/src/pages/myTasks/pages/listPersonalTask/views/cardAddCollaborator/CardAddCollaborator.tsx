import { useState } from 'react';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Modal from '@/components/portal/Modal';
import useModalSubscription from '@/hooks/useModalSubscription';
import { isOpenCardAddCollaborator$ } from '@/services/sharingSubject';
import './cardAddCollaborator.css';
import type { Collaborator } from '../../interface/listPersonalTask.types';
import AddCollaboratorSelect from '../../components/addCollaboratorSelect/AddCollaboratorSelect';
import CollaboratorRow from '../../components/collaboratorRow/CollaboratorRow';
import type { UserSelect } from '@/pages/specialities/models/taskGroupUser.types';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { axiosInstance } from '@/services/axiosInstance';
import type { RootState } from '@/store/store.types';
import { useSelector } from 'react-redux';
import type { MyTask } from '../../../../interfaces/myTasks.types';

const CardAddCollaborator = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [limitPercentage, setLimitPercentage] = useState(100);
  const { profile } = useSelector((state: RootState) => state.userSession);
  const [customFuction, setCustomFuction] = useState<(() => void) | null>(null);

  const [task, setTask] = useState<MyTask | null>(null);
  const [userTaks, setUserTaks] = useState<Collaborator | null>(null);

  const { onCloseModal, isOpenModal } = useModalSubscription(
    isOpenCardAddCollaborator$,
    ({ task, onReloadList }) => {
      setTask(task);
      setUserTaks({
        id: task.id,
        fullName: `${profile.firstName} ${profile.lastName}`,
        percentage: task.percentage,
      });
      setCustomFuction(onReloadList);
      setLimitPercentage(task.percentage);
    }
  );

  const resetState = () => {
    resetCollaborators();
    setLimitPercentage(100);
    setCustomFuction(null);
    setTask(null);
    setUserTaks(null);
  };

  const addCollaborator = ({ id, label }: UserSelect) => {
    const newCollaborator: Collaborator = {
      id,
      fullName: label,
      percentage: 0,
    };
    setCollaborators([...collaborators, newCollaborator]);
  };

  const deleteCollaborator = (collaboratorSelect: Collaborator) => {
    if (!userTaks) return;
    setUserTaks({
      ...userTaks,
      percentage: userTaks.percentage + collaboratorSelect.percentage,
    });
    setCollaborators(
      collaborators.filter(
        collaborator => collaborator.id !== collaboratorSelect.id
      )
    );
  };

  const changePercentage = (collaboratorId: number, percentage: number) => {
    if (!userTaks || !task) return;
    let newPercentage = percentage;
    const totalPercentageCollaborators = collaborators.reduce(
      (acc, collaborator) =>
        collaborator.id !== collaboratorId
          ? acc + collaborator.percentage
          : acc + 0,
      0
    );
    setLimitPercentage(task.percentage - totalPercentageCollaborators);
    if (totalPercentageCollaborators + percentage > task.percentage) {
      newPercentage = task.percentage - totalPercentageCollaborators;
    }
    const newCollaborators = collaborators.map(collaborator => {
      if (collaborator.id === collaboratorId) {
        return {
          ...collaborator,
          percentage: newPercentage,
        };
      }
      return collaborator;
    });
    setUserTaks({
      ...userTaks,
      percentage:
        task.percentage - (totalPercentageCollaborators + newPercentage),
    });
    setCollaborators(newCollaborators);
  };
  const handleSubmit = async () => {
    const findPercentageZero = collaborators.find(
      ({ percentage }) => percentage <= 0
    );
    if (findPercentageZero || userTaks!.percentage <= 0) {
      return SnackbarUtilities.warning(
        'Asegurece de que los porcentajes de los usuarios sean mayores que 0'
      );
    }

    const body = collaborators.map(({ id, percentage }) => ({
      userId: id,
      percentage,
    }));
    await axiosInstance.post(`/subtasks/add-colabs/${task?.id}`, body);
    customFuction?.();
    onCloseModal();
    resetState();
  };
  const resetCollaborators = () => setCollaborators([]);
  return (
    <Modal size={20} isOpenProp={isOpenModal}>
      <CloseIcon
        onClick={() => {
          onCloseModal();
          resetState();
        }}
        size={0.7}
        right={0.5}
        top={0.5}
      />
      <div className="cardAddCollaborator">
        <div className="cardAddCollaborator-header">
          <h2 className="cardAddCollaborator-title">
            Agregar colaboradores y porcentajes
          </h2>
          <p className="cardAddCollaborator-description">
            Ingrese los porcentajes correspondientes a cada participante para su
            informe de adelanto
          </p>
        </div>
        <div className="cardAddCollaborator-container">
          {userTaks && <CollaboratorRow collaborator={userTaks} />}
          <div className="cardAddCollaborator-subcontainer scroll-slim">
            {collaborators.map(collaborator => (
              <CollaboratorRow
                key={collaborator.id}
                collaborator={collaborator}
                deleteCollaborator={deleteCollaborator}
                changePercentage={changePercentage}
                limitPercentage={limitPercentage}
              />
            ))}
          </div>

          {task?.id && (
            <AddCollaboratorSelect
              taskId={task.taskInfo.id}
              onChange={addCollaborator}
              userIdSelects={collaborators.map(({ id }) => id)}
            />
          )}
          <h2 className="cardAddCollaborator-error">
            *Los porcentajes deben sumar un total de{' '}
            <span className="cardAddCollaborator-error-span">
              {task?.percentage ?? 0}%
            </span>
          </h2>
        </div>

        <div className="cardAddCollaborator-footer-btn">
          {collaborators.length > 0 && (
            <Button
              textColor="gray"
              text="Cancelar"
              variant="ghost"
              onClick={resetCollaborators}
            />
          )}
          <Button text="Confirmar" onClick={handleSubmit} />
        </div>
      </div>
    </Modal>
  );
};

export default CardAddCollaborator;
