import { GoGear } from 'react-icons/go';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import type { TaskRes } from '../../types/types.response';
import './cardSelectProject.css';
import { PiMagnifyingGlassBold } from 'react-icons/pi';
import { axiosInstance } from '@/services/axiosInstance';
import { useState } from 'react';
import useDebounceCallback from '@/hooks/useDebounceCallback';
import useModalSubscription from '@/hooks/useModalSubscription';
import { COLOR_CSS } from '@/utils/cssData';
import { isOpenCardSelectProject$ } from '@/services/sharingSubject';
import { temporaryString$ } from '../../utils/momentString';
interface DataProps {
  id: number;
  name: string;
  contract: {
    cui: string;
  };
  stages: {
    id: number;
    name: string;
  }[];
}
interface CardSelectProjectProps {
  updateTask: (taskId: number, updatedTask: Partial<TaskRes>) => void;
}
const CardSelectProject = ({ updateTask }: CardSelectProjectProps) => {
  const [text, setText] = useState<string | number>();
  const [temporal, setTemporal] = useState<boolean>(false);
  const [data, setData] = useState<DataProps[]>();
  const [taskId, setTaskId] = useState<number>();
  const { onCloseModal, isOpenModal } = useModalSubscription(
    isOpenCardSelectProject$,
    ({ id, temporal }) => {
      setTaskId(id);
      setTemporal(temporal);
    }
  );
  const closeFunctions = () => {
    onCloseModal();
    setData([]);
    setText('');
    setTaskId(undefined);
  };
  const debounce = useDebounceCallback((value: string) => {
    if (value === '') return;
    axiosInstance
      .get(`projects/?search=${value}`, { headers: { noLoader: true } })
      .then(res => {
        setData(res.data);
      });
  }, 500);
  const searchStage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setText(value);
    debounce(value);
  };
  const handleUpdate = (taskId: number, item: DataProps) => {
    if (temporal) temporaryString$.next(item.name);
    updateTask(taskId, { projectName: item.name });
    closeFunctions();
  };
  return (
    <Modal size={30} isOpenProp={isOpenModal}>
      <div className="card-register-users">
        <CloseIcon onClick={closeFunctions} />
        <h1 className="cdf-title">Buscar proyecto</h1>
        <div className="specialist-col">
          <Input
            placeholder="Buscar por nombre o CUI"
            leftIcon={
              <PiMagnifyingGlassBold size={18} color={COLOR_CSS.gray} />
            }
            onChange={searchStage}
            defaultValue={text}
            autoFocus
            autoComplete="off"
          />
        </div>
        <div className="csp-items">
          {data &&
            taskId &&
            data.map(item => (
              <div key={item.id} className="csp-card">
                <div
                  className="csp-project"
                  onClick={() => handleUpdate(taskId, item)}
                >
                  <GoGear style={{ color: '#0e9cd8' }} />
                  <div className="csp-project-info">
                    <h4>{item.contract.cui}</h4>
                    <p>{item.name}</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </Modal>
  );
};

export default CardSelectProject;
