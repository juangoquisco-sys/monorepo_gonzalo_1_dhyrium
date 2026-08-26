import { useSelector } from 'react-redux';
import { Outlet, useParams } from 'react-router-dom';
import type { RootState } from '@/store/store.types';
import { motion } from 'framer-motion';
import { useContext, useEffect, useState } from 'react';
import { InputFocusProvider } from '@/context/InputFocusContext';
import { SocketContext } from '@/context/SocketContex';
import { axiosInstance } from '@/services/axiosInstance';
import type { DegreType, Level } from '@/types/types';
import Button from '@/components/button/Button';
import FloatingText from '@/components/floatingText/FloatingText';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Select from '@/components/select/Select';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { GenerateIndexPdf } from '../budgets/pdfgenerator/generateIndexPdf/GenerateIndexPdf';
import { COST_DATA } from '../budgets/models/definitionsBudgets';
import { MoreInfo } from '../../components/moreInfo/MoreInfo';
import StatusText from '@/pages/specialities/components/taskStatusText/TaskStatusText';
import CardRegisterSubTask from '../budgets/views/cardRegisterSubTask/CardRegisterSubTask';
// import { getIdsSubTasksRecursive } from '../../utils/tools';
import DaysTaskEdit from '../../components/daysTaskEdit/DaysTaskEdit';
import CoverEdit from '../../components/coverEdit/CoverEdit';
// import { ProjectContext } from '../../context';
import { TaskStatus } from '../../models/definitiosProject';
import { DropdownLevelGeneral } from '../../components/dropdownLevel/DropdownLevelGeneral';
import { normalizeProjectLevel } from '../../utils/normalizeProjectLevel';
import TaskWorkspaceSplit from '@/pages/specialities/components/taskWorkspaceSplit/TaskWorkspaceSplit';

export const BasicsPage = () => {
  const { stageId, taskId } = useParams();
  // const { setDayTaksRef } = useContext(ProjectContext);

  const modAuthProject = useSelector(
    (state: RootState) => state.modAuthProject
  );
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [degree, setDegree] = useState<DegreType | ''>('');
  const [levels, setlevels] = useState<Level | null>(null);
  const [openFilter, setOpenFilter] = useState(false);
  const socket = useContext(SocketContext);

  useEffect(() => {
    if (!stageId) return;
    socket.on('server:basic-load-stage', (data: Level) => {
      // const idsLevel = getIdsSubTasksRecursive(data);
      // setDayTaksRef?.(idsLevel);
      setlevels(normalizeProjectLevel({ ...data, stagesId: +stageId }));
    });
    return () => {
      socket.off('server:basic-load-stage');
    };
  }, [socket]);

  useEffect(() => {
    if (!stageId) return;
    socket.emit('client:get-stage', +stageId, (data: Level) => {
      socket.emit('join', `basic-${stageId}`);
      // const idsLevel = getIdsSubTasksRecursive(data);
      // setDayTaksRef?.(idsLevel);
      setlevels(normalizeProjectLevel({ ...data, stagesId: +stageId }));
    });
  }, [socket]);

  // const getLevelsForSocket = () => {
  //   axiosInstance.get(`/stages/${stageId}`).then(async res => {
  //     const resBasic = await axiosInstance.get(`/basiclevels/${stageId}`);
  //     setlevels({
  //       ...res.data,
  //       stagesId: stageId,
  //       nextLevel: resBasic.data,
  //     });
  //   });
  // };

  const levelFilter = (value: TaskStatus | '') => {
    setStatus(value);
    axiosInstance
      .get(
        `/stages/${stageId}?${value && `status=${value}`}${
          degree && `&typecost=${degree}`
        }`
      )
      .then(res => {
        if (stageId) {
          setlevels(normalizeProjectLevel({ ...res.data, stagesId: +stageId }));
        }
      });
  };

  const levelFilterForDegree = (value: DegreType) => {
    setDegree(value);
    axiosInstance
      .get(
        `/stages/${stageId}?${status && `status=${status}`}${
          value && `&typecost=${value}`
        }`
      )
      .then(res => {
        if (stageId) {
          setlevels(normalizeProjectLevel({ ...res.data, stagesId: +stageId }));
        }
      });
  };

  const closeFilter = () => {
    setOpenFilter(false);
    levelFilter('');
  };
  if (!levels) return <LoaderForComponent />;

  return (
    <>
      <div className="budgetsPage-filter-contain">
        <div className="budgetsPage-filter">
          <FloatingText text="Descargar Índice" xPos={-50}>
            <PDFDownloadLink
              document={<GenerateIndexPdf data={levels} />}
              fileName={`${levels.projectName}.pdf`}
              className="budgetsPage-filter-icon"
            >
              <figure className="budgetsPage-figure-icon">
                <img src={`/svg/index-icon.svg`} />
              </figure>
              Índice
            </PDFDownloadLink>
          </FloatingText>
          {/* <FloatingText text="Descargar Índice" xPos={-50}>
            <PDFDownloadLink
              document={<GenerateDetailedIndexPdf data={levels} />}
              fileName={`${levels.projectName}.pdf`}
              className="budgetsPage-filter-icon"
            >
              <figure className="budgetsPage-figure-icon">
                <img src={`/svg/index-icon.svg`} />
              </figure>
              Índice Detallado
            </PDFDownloadLink>
          </FloatingText> */}
          <span
            className="budgetsPage-filter-icon"
            onClick={() => setOpenFilter(true)}
          >
            <img src="/svg/filter.svg" />
            Filtrar
          </span>
          {openFilter && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="budgetsPage-filter-area"
            >
              {Object.values(TaskStatus).map(option => (
                <StatusText
                  key={option}
                  status={option}
                  onClick={() => levelFilter(option)}
                />
              ))}
              <Button
                onClick={closeFilter}
                icon="close"
                className="budgetsPage-filter-close"
              />
            </motion.div>
          )}
          <DaysTaskEdit />
          <CoverEdit />
        </div>
        <div className="budgetsPage-filter-select">
          <Select
            name="difficulty"
            data={COST_DATA}
            extractValue={({ key }) => key}
            renderTextField={({ value }) => value}
            defaultValue={degree}
            onChange={({ target }) =>
              levelFilterForDegree(target.value as DegreType)
            }
          />
        </div>
      </div>

      <TaskWorkspaceSplit
        enabled={Boolean(taskId)}
        storageId="basic-task-vertical-layout"
        upperContent={
          <div className="budgetsPage-contain h-full">
            <div className="budgetsPage-title-contain">
              <div className="budgetsPage-contain-left">
                <figure className="budgetsPage-figure">
                  <img src="/svg/engineering.svg" alt="W3Schools" />
                </figure>
                <h4 className="budgetsPage-title">{levels?.projectName}</h4>
              </div>
              {levels && modAuthProject && (
                <div className="budgetsPage-contain-right">
                  <MoreInfo data={levels} />
                </div>
              )}
            </div>
            {levels && (
              <InputFocusProvider colNumber={2}>
                <DropdownLevelGeneral level={levels} />
              </InputFocusProvider>
            )}
          </div>
        }
        lowerContent={<Outlet />}
      />
      <CardRegisterSubTask />
    </>
  );
};
