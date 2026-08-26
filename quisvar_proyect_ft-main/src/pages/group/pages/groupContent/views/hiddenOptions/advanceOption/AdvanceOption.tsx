import { useEffect, useState } from 'react';
import './advanceOption.css';
import Input from '@/components/Input/Input';
import { _date } from '@/utils/formatDate';
import { axiosInstance } from '@/services/axiosInstance';
import type { Days } from '../../../../../types/types.response';
interface AdvanceOptionsProps {
  id: number;
  CUI: string;
}
const now = new Date();
const AdvanceOption = ({ id, CUI }: AdvanceOptionsProps) => {
  // const [dateValue, setDateValue] = useState<string>(_date(now));
  const [data, setData] = useState<Days[]>();
  const [showTask, setShowTask] = useState<number>();
  useEffect(() => {
    getDate(_date(now));
  }, [id]);
  const getDate = (e?: string) => {
    axiosInstance
      .get(`dutyMembers/week/${id}?CUI=${CUI}&date=${e}`)
      .then(res => {
        setData(res.data);
      });
  };
  return (
    <div className="ao-content">
      <span className="gd-date">
        <img src="/svg/calendary-icon.svg" className="attendance-icon" />
        <Input
          type="date"
          onChange={e => getDate(e.target.value)}
          width={12}
          style={{ padding: '0 1rem' }}
          max={_date(now)}
          defaultValue={_date(now)}
        />
      </span>
      <div className="ao-header">
        {data &&
          data.map((item, idx) => {
            return (
              <h1 style={{ textAlign: 'center' }} key={idx}>
                {item.day + ' ' + item.date.split('-')[2]}
              </h1>
            );
          })}
      </div>
      <div className="ao-table">
        {data &&
          data.map((item, idx) => {
            return (
              <div key={idx} className="ao-days">
                {item.members &&
                  item.members.map((member, idx) => {
                    return (
                      <div key={idx} className="ao-member">
                        <h1
                          className="ao-text"
                          onClick={() =>
                            setShowTask(showTask === idx ? undefined : idx)
                          }
                        >
                          {member.fullName}
                        </h1>
                        {showTask === idx &&
                          member.tasks &&
                          member.tasks.map((task, idx) => {
                            return (
                              <div key={idx} className="ao-taks">
                                <h1>&#128313; Tarea: {task.name}</h1>
                                <h1>Estado: {task.percentage}%</h1>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default AdvanceOption;
