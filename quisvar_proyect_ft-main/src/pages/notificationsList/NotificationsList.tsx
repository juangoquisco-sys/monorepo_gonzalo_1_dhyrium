import { useEffect, useState } from 'react';
import './notificationsList.css';
import { axiosInstance } from '@/services/axiosInstance';
import type { ReviewList } from '@/types/types';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import SubtaskDetail from './components/subtaskDetail/SubtaskDetail';

export const NotificationsList = () => {
  const { userSession } = useSelector((state: RootState) => state);
  const [subTasks, setSubTasks] = useState<ReviewList[]>();

  useEffect(() => {
    if (!userSession.id) return;
    axiosInstance
      .get(`/workareas/${userSession.id}/review`)
      .then(res => setSubTasks(res.data));
  }, [userSession.id]);

  return (
    <div className="notify container">
      <div className="notify-head">
        <div>
          <h1 className="main-title">
            LISTA DE <span className="main-title-span">NOTIFICACIONES </span>
          </h1>
        </div>
      </div>
      <div className="notify-card-container">
        {subTasks?.map(subtask => (
          <SubtaskDetail key={subtask.id} subtask={subtask} />
        ))}
      </div>
    </div>
  );
};
