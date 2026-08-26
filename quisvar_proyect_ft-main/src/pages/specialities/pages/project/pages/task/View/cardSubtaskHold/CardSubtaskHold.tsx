import { useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { axiosInstance } from '@/services/axiosInstance';
import { SocketContext } from '@/context/SocketContex';
import Button from '@/components/button/Button';
import DropDownSimple from '@/components/dropDownSimple/DropDownSimple';
import type { DataUser, SubTask } from '@/types/types';
import './cardSubtaskHold.css';
import { useParams } from 'react-router-dom';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import SubtaskUploadFiles from '../../components/subtaskUploadFiles/SubtaskUploadFiles';
import SubtaskUsers from '../../components/subtaskUsers/SubtaskUsers';
import SubtasksMoreInfo from '../../components/subtasksMoreInfo/SubtasksMoreInfo';
import type { RootState } from '@/store/store.types';
import { useTaskAssignmentContext } from '@/pages/specialities/hooks/useTaskAssignmentContext';

interface CardSubtaskHold {
  subTask: SubTask;
}

const CardSubtaskHold = ({ subTask }: CardSubtaskHold) => {
  const socket = useContext(SocketContext);
  const { id: userSessionid } = useSelector(
    (state: RootState) => state.userSession
  );
  const modAuthProject = useSelector(
    (state: RootState) => state.modAuthProject
  );
  const isAuthorizedMod =
    modAuthProject || userSessionid === subTask.Levels.userId;

  const [addBtn, setAddBtn] = useState(false);
  const [usersData, setUsersData] = useState<DataUser[]>([]);
  const { stageId } = useParams();
  const assignmentContextQuery = useTaskAssignmentContext(
    subTask.id,
    'TECHNICAL'
  );
  const users = useMemo<DataUser[]>(
    () =>
      (assignmentContextQuery.data?.members ?? []).map(user => ({
        id: user.id,
        name: user.label,
        status: true,
      })),
    [assignmentContextQuery.data?.members]
  );
  // const { status } = subTask;
  const handleAddUser = (user: DataUser) => {
    setAddBtn(true);
    const getId = usersData.find(list => list.id == user.id);
    if (!getId) setUsersData([...usersData, user]);
  };

  const handleAddUserByTask = () => {
    if (!addBtn) return;
    if (!subTask.files?.MODEL.length)
      return SnackbarUtilities.warning(
        'Asegurese de subir los archivos modelos antes'
      );
    axiosInstance
      .patch(`/subtasks/assignUser/${subTask.id}/${stageId}`, usersData)
      .then(res => {
        socket.emit('client:update-projectAndTask', res.data);
      });
  };

  const handleRemoveUser = (user: DataUser) => {
    const filterValue = usersData.filter(list => list.id !== user.id);
    setUsersData(filterValue);
    if (usersData.length == 1) {
      setAddBtn(false);
    }
  };

  return (
    <div className="cardSubtaskHold">
      <section className="cardSubtaskHold-left-details">
        {isAuthorizedMod ? (
          <>
            <h4 className="cardSubtask-title-information">
              <figure className="cardSubtask-figure">
                <img src="/svg/paper-clip.svg" alt="W3Schools" />
              </figure>
              Archivos modelos:
            </h4>

            <div className="cardSubtask-files-content">
              <SubtaskUploadFiles taskId={subTask.id} type="MODEL" />
            </div>
            {/* <SubtaskFile
              files={subTask.files}
              typeFile="MODEL"
              showDeleteBtn={isAuthorizedMod}
            /> */}
            <div className="cardSubtaskHold-add-users">
              <div className="cardSubtaskHold-users-contain">
                {usersData.length === 0 && (
                  <>
                    <h4 className="cardSubtask-title-information">
                      <figure className="cardSubtask-figure">
                        <img src="/svg/asig-user.svg" alt="W3Schools" />
                      </figure>
                      Asignar Usuario:
                    </h4>
                    <DropDownSimple
                      data={users}
                      textField="name"
                      itemKey="id"
                      valueInput={(name, id) =>
                        handleAddUser({ id: parseInt(id), name })
                      }
                      placeholder="Seleccione Usuario"
                      classNameListOption="cardSubtaskHold-list-option"
                    />
                  </>
                )}
              </div>
              {usersData && (
                <SubtaskUsers
                  usersData={usersData}
                  handleRemoveUser={handleRemoveUser}
                />
              )}
            </div>
          </>
        ) : (
          <div className="cardSubtaskHold-logo-content ">
            <div className="cardSubtaskHold-more-info-content">
              <figure className="cardSubtaskHold-figure-logo">
                <img src={`/img/DHYRIUM-gray.png`} alt="W3Schools" />
              </figure>
              <p className="cardSubtaskHold-more-info">DHYRIUM</p>
            </div>
          </div>
        )}
      </section>
      <section className="cardSubtaskHold-details">
        <SubtasksMoreInfo task={subTask} />
        {!isAuthorizedMod && (
          <div className="cardSubtask-models-contain">
            <h4 className="cardSubtask-title-information">
              <figure className="cardSubtask-figure">
                <img src="/svg/paper-clip.svg" alt="W3Schools" />
              </figure>
              Archivos modelos:
            </h4>

            {/* <SubtaskFile
              files={subTask.files}
              typeFile="MODEL"
              showDeleteBtn={isAuthorizedMod}
            /> */}
          </div>
        )}
        <div className="cardSubtaskHold-btns">
          {!isAuthorizedMod && <div></div>}
          {/* <SubtaskChangeStatusBtn

            isAuthorizedUser
            option="ASIG"
            type="assigned"
            subtaskId={subTask.id}
            subtaskStatus={status}
            isDisabled={addBtn}
            files={subTask.files.REVIEW}
            text="ASIGNARME"
            className={`cardSubtask-add-btn cardSubtask-asig-btn  ${
              addBtn && 'cardSubtask-btn-disabled'
            }`}
          /> */}
          {isAuthorizedMod && (
            <Button
              text="CONTINUAR"
              className={`cardSubtask-add-btn ${
                !addBtn && 'cardSubtask-btn-disabled'
              }`}
              onClick={handleAddUserByTask}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default CardSubtaskHold;
