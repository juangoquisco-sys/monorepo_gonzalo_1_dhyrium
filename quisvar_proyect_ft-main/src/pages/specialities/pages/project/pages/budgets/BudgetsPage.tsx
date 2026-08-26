import { useCallback, useContext, useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { InputFocusProvider } from '@/context/InputFocusContext';
import { SocketContext } from '@/context/SocketContex';
import type { DegreType, Level } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import { motion } from 'framer-motion';
import './budgetsPage.css';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import Button from '@/components/button/Button';
import DivFlex from '@/components/divFlex/DivFlex';
import FloatingText from '@/components/floatingText/FloatingText';
import Input from '@/components/Input/Input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Select from '@/components/select/Select';
import { MoreInfo } from '../../components/moreInfo/MoreInfo';
import StatusText from '@/pages/specialities/components/taskStatusText/TaskStatusText';
import { COST_DATA } from './models/definitionsBudgets';
import { GenerateDetailedIndexPdf } from './pdfgenerator/generateDetailedIndexPdf/GenerateDetailedIndexPdf';
import { GenerateIndexPdf } from './pdfgenerator/generateIndexPdf/GenerateIndexPdf';
import CardRegisterSubTask from './views/cardRegisterSubTask/CardRegisterSubTask';
import { findTaskPath } from '../../utils/tools';
import DaysTaskEdit from '../../components/daysTaskEdit/DaysTaskEdit';
import { ProjectContext } from '../../context/ProjectContext';
import { ProjectRole, TaskStatus } from '../../models/definitiosProject';
import { DropdownLevelGeneral } from '../../components/dropdownLevel/DropdownLevelGeneral';
import useAbortableAxios from '@/hooks/useAbortableAxios';
import useRole from '@/hooks/useRole';
import CoverEdit from '../../components/coverEdit/CoverEdit';
import { formatAmountMoney } from '@/utils/tools';
import { normalizeProjectLevel } from '../../utils/normalizeProjectLevel';
import TaskWorkspaceSplit from '@/pages/specialities/components/taskWorkspaceSplit/TaskWorkspaceSplit';

export const BudgetsPage = () => {
  const {
    handleSetUserPermission,
    hasPermission,
    stageId,
    dayTask,
    monthlyPrice,
    handleSetMonthlyPrice,
    levels,
    setlevels,
  } = useContext(ProjectContext);
  const { taskId } = useParams();
  const { axiosAbortable, abortRequest } = useAbortableAxios();

  const { hasAccess: isMod } = useRole('MOD');
  const userSession = useSelector((state: RootState) => state.userSession);
  // const modAuthProject = useSelector(
  //   (state: RootState) => state.modAuthProject
  // );

  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [degree, setDegree] = useState<DegreType | ''>('');
  const [openFilter, setOpenFilter] = useState(false);
  const socket = useContext(SocketContext);

  const getLevels = useCallback(async () => {
    const { data } = await axiosAbortable.get<Level>(`/stages/${stageId}`, {
      headers: { noLoader: true },
    });

    const { managerGroup } = data;
    if (isMod || managerGroup?.some(m => m.userId === userSession.id)) {
      handleSetUserPermission(ProjectRole.MODERATOR);
    } else {
      handleSetUserPermission(ProjectRole.USER);
    }
    socket.emit('join', `budget-${stageId}`);
    const levels = normalizeProjectLevel({ ...data, stagesId: +stageId! });
    if (taskId) {
      const idsLevel = findTaskPath(levels, +taskId)?.map(el => String(el));
      localStorage.setItem('arrCheckedLevel', JSON.stringify(idsLevel ?? []));
    }
    handleSetMonthlyPrice(String(levels.monthlyPrice));
    setlevels(levels);
  }, [socket, stageId]);

  useEffect(() => {
    if (!stageId) return;
    getLevels();
    return () => {
      abortRequest();
      setlevels(null);
    };
  }, [getLevels, stageId]);

  useEffect(() => {
    if (!stageId) return;
    socket.on('server:budget-load-stage', (data: Level) => {
      setlevels(normalizeProjectLevel({ ...data, stagesId: +stageId }));
    });
    return () => {
      socket.off('server:budget-load-stage');
    };
  }, [socket]);

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
          {hasPermission(ProjectRole.MODERATOR) && (
            <>
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
              <FloatingText text="Descargar Índice" xPos={-50}>
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
              </FloatingText>
            </>
          )}
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
                // className="budgetsPage-filter-close"
                variant="ghost"
              />
            </motion.div>
          )}
          {hasPermission(ProjectRole.MODERATOR) && (
            <>
              <DaysTaskEdit /> <CoverEdit />
            </>
          )}
        </div>
        {hasPermission(ProjectRole.MODERATOR) && (
          <div className="budgetsPage-filter-select">
            {!dayTask.isEdit ? (
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
            ) : (
              <DivFlex>
                <div className="budgetsPage-cost-month">
                  Techo máximo asignado:
                  <Input
                    value={formatAmountMoney(levels.budget ?? 0)}
                    isMoney
                    width={5}
                    disabled
                  />
                </div>
                <div className="budgetsPage-cost-month">
                  Costo mensual
                  <Input
                    onChange={({ target }) =>
                      handleSetMonthlyPrice(target.value)
                    }
                    value={monthlyPrice}
                    isMoney
                    width={5}
                    autoFocus
                  />
                </div>
              </DivFlex>
            )}
          </div>
        )}
      </div>

      <TaskWorkspaceSplit
        enabled={Boolean(taskId)}
        storageId="budget-task-vertical-layout"
        upperContent={
          <div className="budgetsPage-contain h-full">
            <div className="budgetsPage-title-contain">
              <div className="budgetsPage-contain-left">
                <figure className="budgetsPage-figure">
                  <img src="/svg/engineering.svg" alt="W3Schools" />
                </figure>
                <h4 className="budgetsPage-title">{levels?.projectName}</h4>
              </div>
              {levels && (
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
