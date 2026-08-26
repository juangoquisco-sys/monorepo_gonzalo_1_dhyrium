import './cardSubtaskDone.css';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
// import { useUserPorcetage } from '../../../../../../../../hooks';
import SubtasksMoreInfo from '../../components/subtasksMoreInfo/SubtasksMoreInfo';
import SubtasksShippingHistory from '../../components/subtasksShippingHistory/SubtasksShippingHistory';
import type { SubTask } from '@/types/types';

interface CardSubtaskDone {
  subTask: SubTask;
}

const CardSubtaskDone = ({ subTask }: CardSubtaskDone) => {
  const { modAuthProject, userSession } = useSelector(
    (state: RootState) => state
  );
  const isAuthorizedMod =
    modAuthProject || userSession.id === subTask.Levels.userId;
  const feedBacksReverse = [...subTask.feedBacks].reverse();
  // const { usersData } = useUserPorcetage(subTask.users);

  return (
    <div className="cardSubtaskDone">
      <section className="cardSubtaskDone-left-details ">
        {isAuthorizedMod && (
          <>
            <h4 className="cardSubtask-title-information">
              <figure className="cardSubtask-figure">
                <img src="/svg/paper-clip.svg" alt="W3Schools" />
              </figure>
              Archivos modelos:
            </h4>
            {/* <SubtaskFile files={subTask.files} typeFile="MODEL" /> */}
          </>
        )}
        <div className="cardSubtaskProcess-left-details-buttom">
          <div className="cardSubtaskProcess-all-activity">
            <h4 className="cardSubtask-title-information">
              <figure className="cardSubtask-figure">
                <img src="/svg/activity-icon.svg" alt="W3Schools" />
              </figure>
              Toda la actividad:
            </h4>
            <SubtasksShippingHistory
              feedBacks={feedBacksReverse}
              viewComentary
            />
          </div>
          {/* <SubtaskUsers usersData={usersData} viewProcentage /> */}
        </div>
      </section>
      <section
        className={`cardSubtaskDone-details ${
          !isAuthorizedMod && 'cardSubtaskDone-other-style'
        }`}
      >
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
        {/* {status === 'DONE' && isAuthorizedMod && (
          <div className="cardSubtaskDone-btns">
            <div></div>
            <SubtaskChangeStatusBtn
              option="ASIG"
              subtaskId={subTask.id}
              subtaskStatus={status}
              text="Liquidar"
              type="liquidate"
              className="cardSubtask-add-btn"
            />
          </div>
        )} */}
      </section>
    </div>
  );
};

export default CardSubtaskDone;
