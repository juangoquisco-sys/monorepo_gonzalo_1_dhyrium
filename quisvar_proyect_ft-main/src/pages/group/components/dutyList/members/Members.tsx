import { useForm } from 'react-hook-form';
// import { Input } from '../../../../../components';
import type { DutyMember, DutyTasks } from '../../../types/types.response';
import './members.css';
import { useEffect, useState, type Dispatch } from 'react';
import { axiosInstance } from '@/services/axiosInstance';
import Button from '@/components/button/Button';
import Select from '@/components/select/Select';
import MembersTasks from './tasks/MembersTasks';
// import { PROJECT_STATUS } from '../../../../userCenter/pages/users/models';
interface MembersProps {
  members: DutyMember[];
  dutyId: number;
  onSave: () => void;
  edit: boolean;
  editMember: Dispatch<React.SetStateAction<DutyMember[]>>;
}

const options = [
  { id: 1, color: '#57d9a3b6', value: 'PUNTUAL', label: 'PUNTUAL' },
  { id: 2, color: '#ffd240ab', value: 'TARDE', label: 'TARDE' },
  { id: 3, color: '#df00003a', value: 'SIMPLE', label: 'FALTA' },
  { id: 4, color: '#df00006e', value: 'GRAVE', label: 'GRAVE' },
  { id: 5, color: '#c00000a2', value: 'MUY_GRAVE', label: 'MUY GRAVE' },
  { id: 6, color: '#2263e58f', value: 'PERMISO', label: 'LICENCIA' },
];

const Members = ({
  members,
  dutyId,
  onSave,
  editMember,
  edit,
}: MembersProps) => {
  const [sendItems, setSendItems] = useState<DutyMember[]>([]);
  // const [editTasks, setEditTasks] = useState<DutyTasks[]>([]);
  const {
    register,
    // handleSubmit,
    //setValue,
    // control,
    reset,
    // watch,
    // formState: { errors },
  } = useForm<DutyMember[]>();
  useEffect(() => {
    if (members) {
      setSendItems(members);
      reset({ ...members });
    }
  }, [members, reset, edit]);
  // console.log(members);

  const handleChange = (
    idx: number,
    field: string,
    value: string | DutyTasks[]
  ) => {
    if (!value) return;
    const updatedItems = [...sendItems];
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: value,
    };
    setSendItems(updatedItems);

    editMember(updatedItems);
  };
  const handleAddRow = () => {
    axiosInstance.post(`dutyMembers/${dutyId}`).then(() => onSave?.());
  };

  return (
    <div className="member-container">
      {sendItems &&
        sendItems.map((member, idx) => (
          <div className="member-body" key={idx}>
            <h1 className="member-index">{idx + 1}</h1>
            <input
              {...register(`${idx}.fullName` as const)}
              className={`member-list right-border ${
                idx !== 0 && 'top-border'
              }`}
              onBlur={e => {
                if (e.target.value === member.fullName) return;
                handleChange(idx, 'fullName', e.target.value);
              }}
              disabled={!!member.fullName || !edit}
            />
            <Select
              {...register(`${idx}.attendance` as const)}
              name="select"
              extractValue={({ label }) => label}
              renderTextField={({ label }) => label}
              data={options}
              onChange={e => handleChange(idx, 'attendance', e.target.value)}
              disabled={!edit}
            />
            <MembersTasks
              tasks={member.task}
              editTask={e => handleChange(idx, 'task', e as DutyTasks[])}
              edit={edit}
            />
            <div className="member-daily">
              <textarea
                {...register(`${idx}.feedBack` as const)}
                className={`member-list right-border ${
                  idx !== 0 && 'top-border'
                }`}
                onBlur={e => {
                  if (e.target.value === member.feedBack) return;
                  handleChange(idx, 'feedBack', e.target.value);
                }}
                style={{
                  minHeight: '50px',
                  resize: 'none',
                  overflow: 'hidden',
                  border: '1px solid #ccc',
                }}
                disabled={!edit}
              />
              <input
                {...register(`${idx}.feedBackDate` as const)}
                type="date"
                className="member-date"
                disabled={!edit}
                onChange={e => {
                  if (e.target.value === member.feedBackDate) return;
                  handleChange(idx, 'feedBackDate', e.target.value);
                }}
              />
            </div>
            <div className="member-daily">
              <textarea
                {...register(`${idx}.dailyDuty` as const)}
                className={`member-list right-border ${
                  idx !== 0 && 'top-border'
                }`}
                style={{
                  minHeight: '50px',
                  resize: 'none',
                  overflow: 'hidden',
                  border: '1px solid #ccc',
                }}
                onBlur={e => {
                  if (e.target.value === member.dailyDuty) return;
                  handleChange(idx, 'dailyDuty', e.target.value);
                }}
                disabled={!edit}
              />
              <input
                {...register(`${idx}.dailyDutyDate` as const)}
                type="date"
                className="member-date"
                disabled={!edit}
                onChange={e => {
                  if (e.target.value === member.dailyDutyDate) return;
                  handleChange(idx, 'dailyDutyDate', e.target.value);
                }}
              />
            </div>
          </div>
        ))}
      <Button icon="add1" onClick={handleAddRow} className="member-add" />
    </div>
  );
};

export default Members;
