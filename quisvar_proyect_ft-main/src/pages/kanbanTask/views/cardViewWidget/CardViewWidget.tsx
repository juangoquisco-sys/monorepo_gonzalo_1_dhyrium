// import { useState } from 'react';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Modal from '@/components/portal/Modal';
import Select from '@/components/select/Select';
import TextArea from '@/components/textArea/TextArea';
import useDebounceCallback from '@/hooks/useDebounceCallback';
import useModalSubscription from '@/hooks/useModalSubscription';
import {
  isOpenCardSelectProject$,
  isOpenCardViewWidget$,
} from '@/services/sharingSubject';
import './cardViewWidget.css';
import FundsBody from '../../components/fundsBody/FundsBody';
import FundsHeader from '../../components/fundsHeader/FundsHeader';
import type { ItemsRes, TaskRes } from '../../types/types.response';
import { useForm } from 'react-hook-form';
import { formatDateWeekdayUtc } from '@/utils/dayjsSpanish';
import { useCallback, useEffect, useState } from 'react';
import { temporaryString$ } from '../../utils/momentString';
import { axiosInstance } from '@/services/axiosInstance';
const data = [
  {
    id: 1,
    name: 'Gerencia general',
  },
  {
    id: 2,
    name: 'Compras',
  },
];
interface CardViewWidgetProps {
  updateTask?: (taskId: number, updatedTask: Partial<TaskRes>) => void;
}
const CardViewWidget = ({ updateTask }: CardViewWidgetProps) => {
  const [project, setProject] = useState<string>();
  const [items, setItems] = useState<ItemsRes[]>();
  const [loader, setLoader] = useState<boolean>(false);
  const [hasId, setHasId] = useState<number>();
  const { register, reset, watch } = useForm<TaskRes>();
  const { onCloseModal, isOpenModal } = useModalSubscription(
    isOpenCardViewWidget$,
    ({ task }) => {
      setHasId(task?.id);
      reset(task);
    }
  );
  const getItems = useCallback(() => {
    setLoader(true);
    axiosInstance
      .get<ItemsRes[]>(`operationaltasks/${watch('id')}/items`, {
        headers: { noLoader: true },
      })
      .then(({ data }) => {
        setItems(data);
        setLoader(false);
      });
  }, []);
  useEffect(() => {
    if (!hasId) return;
    getItems();
  }, [hasId]);
  const changeValues = (event: string, key: string) => {
    debounce(event, key);
  };
  useEffect(() => {
    const subscription = temporaryString$.subscribe(value => {
      setProject(value);
    });

    return () => {
      temporaryString$.next('');
      subscription.unsubscribe();
    };
  }, []);
  const debounce = useDebounceCallback((value: string, key: string) => {
    if (value === '') return;
    updateTask?.(watch('id'), { [key]: value });
  }, 1500);
  const openCardProject = (e: React.MouseEvent<HTMLElement>, open: boolean) => {
    e.stopPropagation();
    isOpenCardSelectProject$.setSubject = {
      isOpen: open,
      id: watch('id'),
      temporal: true,
    };
  };
  const handleAddItem = () => {
    setLoader(true);
    axiosInstance
      .post(
        `operationaltasks/item`,
        {
          description: '',
          price: 0,
          taskId: watch('id'),
        },
        {
          headers: { noLoader: true },
        }
      )
      .then(() => {
        getItems();
        setLoader(false);
      })
      .catch(() => setLoader(false));
  };

  const handleClose = () => {
    setHasId(undefined);
    onCloseModal();
  };

  return (
    <Modal size={20} isOpenProp={isOpenModal}>
      <CloseIcon onClick={handleClose} size={0.7} right={0.5} top={0.5} />
      <div className="cvw-container">
        <p style={{ textTransform: 'uppercase' }}>
          {formatDateWeekdayUtc(watch('createdAt'))}
        </p>
        <div className="cvw-main">
          <section className="cvw-section-left">
            <input
              className="cvw-title"
              {...register('name')}
              onChange={e => changeValues(e.target.value, 'name')}
              disabled={!updateTask}
            />
            <TextArea
              {...register('description')}
              label="Descripción:"
              className="cvw-textarea"
              onChange={e => changeValues(e.target.value, 'description')}
              disabled={!updateTask}
            />
            <div className="cvw-title-header">
              <h3>Presupuesto requerido</h3>
              <div>
                <Button
                  text="Agregar gasto"
                  icon="plus"
                  variant="outline"
                  size="xxs"
                  onClick={handleAddItem}
                  disabled={!updateTask}
                />
              </div>
            </div>
            <div className="cvw-table">
              <FundsHeader />
              <div className="cvw-table-body">
                {loader ? (
                  <LoaderForComponent />
                ) : (
                  items?.map((item, index) => (
                    <FundsBody
                      key={index}
                      item={item}
                      number={index}
                      onSave={getItems}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
          <section className="cvw-section-right">
            <h3 className="cvw-details">Detalles</h3>
            <div className="cvw-row">
              <div className="cvw-row-left">Oficina</div>
              <div className="cvw-row-right">
                <Select
                  data={data}
                  extractValue={item => item.name}
                  renderTextField={item => item.name}
                  disabled={!updateTask}
                />
              </div>
            </div>
            <div className="cvw-row">
              <div className="cvw-row-left">Proyecto</div>
              <div className="cvw-row-right">
                <div className="cvw-project-content">
                  <h3
                    className="kw-project-text"
                    onClick={e => {
                      if (!updateTask) return;
                      if (!!project || watch('projectName')) return;
                      openCardProject(e, true);
                    }}
                    style={{
                      cursor:
                        !!project || watch('projectName')
                          ? 'default'
                          : 'pointer',
                    }}
                  >
                    {watch('projectName')
                      ? watch('projectName')
                      : !!project
                      ? project
                      : 'Agregar proyecto'}
                  </h3>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default CardViewWidget;
