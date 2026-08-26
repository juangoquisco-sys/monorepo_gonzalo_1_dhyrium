import { useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import './cardDuplicateFrom.css';
import { isOpenCardDuplicateFrom$ } from '@/services/sharingSubject';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Input from '@/components/Input/Input';
import Modal from '@/components/portal/Modal';
import { axiosInstance } from '@/services/axiosInstance';
import { GoGear } from 'react-icons/go';
import { BsArrowReturnRight } from 'react-icons/bs';
import { PiCopyThin, PiMagnifyingGlassBold } from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';
import useDebounceCallback from '@/hooks/useDebounceCallback';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';

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
interface CardDuplicateProps {
  onSave: () => void;
}
const CardDuplicateFrom = ({ onSave }: CardDuplicateProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [data, setData] = useState<DataProps[]>();
  const [hasId, setHasId] = useState<number>();
  const [text, setText] = useState<string | number>();
  const { emitWithLoader } = useEmitWithLoader();
  const handleIsOpen = useRef<Subscription>(new Subscription());
  useEffect(() => {
    handleIsOpen.current = isOpenCardDuplicateFrom$.getSubject.subscribe(
      value => {
        setIsOpen(value.isOpen);
        setHasId(value.id);
      }
    );

    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);
  const closeFunctions = () => {
    setIsOpen(false);
    setData([]);
    setText('');
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
  const handleDuplicate = (id: number) => {
    const body = {
      stageId: hasId,
    };
    axiosInstance.post(`/duplicates/stage/${id}`, body).then(() => {
      closeFunctions();
      onSave();
      emitWithLoader('client:get-stage-content', hasId);
    });
  };
  return (
    <Modal size={30} isOpenProp={isOpen}>
      <div className="card-register-users">
        <CloseIcon onClick={closeFunctions} />
        <h1 className="cdf-title">Duplicar etapa de otro proyecto</h1>
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
        <div className="cdf-items">
          {data &&
            data.map(item => (
              <div key={item.id} className="cdf-card">
                <div className="cdf-project">
                  <GoGear style={{ color: '#0e9cd8' }} />
                  <div className="cdf-project-info">
                    <h4>{item.contract.cui}</h4>
                    <p>{item.name}</p>
                  </div>
                </div>
                {item.stages.length > 0 &&
                  item.stages.map(stage => (
                    <div key={stage.id} className="cdf-stage">
                      <div className="cdf-stage-info">
                        <BsArrowReturnRight />
                        <h4>{stage.name}</h4>
                      </div>
                      <PiCopyThin
                        onClick={() => handleDuplicate(stage.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  ))}
              </div>
            ))}
        </div>
      </div>
    </Modal>
  );
};

export default CardDuplicateFrom;
