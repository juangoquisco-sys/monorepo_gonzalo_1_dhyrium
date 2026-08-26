import Button from '@/components/button/Button';
import GeneralTitle from '@/components/generalTitle/GeneralTitle';
import Input from '@/components/Input/Input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import { IoArrowBack } from 'react-icons/io5';
import './reportPersonalTask.css';
import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import type {
  FooterData,
  Reporting,
  ReportingProject,
  ReportingTask,
  TaskKanban,
  TechnicalEvidenceProject,
  TechnicalEvidenceReporting,
  TechnicalEvidenceTask,
} from '../../interface/report.types';
import { excelReport } from '@/utils/generateExcel';
import { getTimeOut } from '@/utils/formatDate';
import ReportKanbanTask from './views/reportKanbanTask/ReportKanbanTask';
import ReportPersonalTaskFooter from './views/reportPersonalTaskFooter/ReportPersonalTaskFooter';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import type { ExcelData } from '@/types/types';
import useAbortableAxios from '@/hooks/useAbortableAxios';
import ReportPersonalTaskTable from './views/reportPersonalTaskTable/ReportPersonalTaskTable';
import { axiosInstance } from '@/services/axiosInstance';
import { TypeStatus } from '../../../myTasks/pages/listPersonalTask/interface/listPersonalTask.types';
import { PersonalReportContext } from '../../context/PersonalReportContext';
import AttendanceTable from './components/attendanceTable/AttendanceTable';
import TaskSelectViewTotal from '../../../myTasks/pages/listPersonalTask/components/taskSelectViewTotal/TaskSelectViewTotal';
import { LiquidationReportView } from '../../../myTasks/pages/recaudadorGrande/LiquidationReportView';

const normalizeEvidenceText = (value?: string) =>
  (value || '').replace(/\s+/g, ' ').trim();

const uniqueEvidencePath = (path: string[] = []) =>
  path.reduce<string[]>((acc, item) => {
    const label = normalizeEvidenceText(item);
    if (!label || acc[acc.length - 1] === label) return acc;
    return [...acc, label];
  }, []);

const compactEvidencePath = (path: string[] = [], fallback?: string) => {
  const labels = uniqueEvidencePath(path);
  if (!labels.length) return normalizeEvidenceText(fallback);
  if (labels.length <= 3) return labels.join(' / ');
  return `${labels[0]} / ${labels[labels.length - 2]} / ${
    labels[labels.length - 1]
  }`;
};

const evidenceTaskName = (task: TechnicalEvidenceTask) =>
  normalizeEvidenceText(task.taskInfo?.name || task.name);

const ReportPersonalTask = () => {
  const { axiosAbortable, abortRequest } = useAbortableAxios();
  const { editValues, navigatePayroll, noViewButtonBack, technicalEvidence } =
    useContext(PersonalReportContext);
  // const { reportQuery, reporting, tasks } = useReport();
  const { profile } = useSelector((state: RootState) => state.userSession);

  const { reportId, taskId } = useParams();

  const navigate = useNavigate();
  const [reporting, setReporting] = useState<Reporting | null>(null);
  const [technicalEvidenceProjects, setTechnicalEvidenceProjects] = useState<
    TechnicalEvidenceProject[]
  >([]);
  const [tasks, setTasks] = useState<ReportingTask[] | null>(null);
  const [openAttendance, setOpenAttendance] = useState(false);
  const [reportData, setReportData] = useState<TaskKanban[] | null>(null);
  const [finishAmount, setFinishAmount] = useState(0);
  const [footerData, setFooterData] = useState<FooterData>({
    attendanceDiscount: reporting?.attendanceDiscount ?? 0,
    licensesDiscount: reporting?.licensesDiscount ?? 0,
    percentagePayment: reporting?.percentage ?? 0,
    totalPartialPrice: reporting?.subprice ?? 0,
    earlyPaymentDiscount: reporting?.earlyPaymentDiscount ?? 0,
  });

  const handleSetFooterData = (
    key: keyof FooterData,
    value: number | string
  ) => {
    setFooterData({ ...footerData, [key]: value });
  };
  const handleBridgeAmount = ({ target }: ChangeEvent<HTMLInputElement>) => {
    handleSetFooterData('totalPartialPrice', target.value);
  };
  const handleBridgeAmountBlur = ({
    target,
  }: ChangeEvent<HTMLInputElement>) => {
    if (target.value) return;
    handleSetFooterData('totalPartialPrice', '0');
  };
  const handleSetFinishAmount = (amount: number) => {
    setFinishAmount(amount);
  };
  const sumTotalPriceInTask = useMemo(() => {
    if (reporting?.type === TypeStatus.APPROVED) return reporting.subprice;
    if (reporting?.type === TypeStatus.MONTH)
      return +footerData.totalPartialPrice;
    const total = +(
      tasks
        ?.reduce(
          (acc, { taskInfo, percentage }) =>
            taskInfo.price * (percentage / 100) + acc,
          0
        )
        .toFixed(2) ?? '0'
    );
    return total;
  }, [tasks, footerData.totalPartialPrice, reporting]);

  const getReportingTask = async () => {
    const requestUrl = `/reports/${reportId}?mods=true&userinfo=true${
      technicalEvidence ? '&evidence=technical' : ''
    }`;
    const requestConfig = { headers: { noLoader: true } };
    let resData: Reporting;
    let reportingProjects: ReportingProject[] = [];

    if (technicalEvidence) {
      const response = await axiosAbortable.get<TechnicalEvidenceReporting>(
        requestUrl,
        requestConfig
      );
      resData = response.data;
      setTechnicalEvidenceProjects(response.data.data);
    } else {
      const response = await axiosAbortable.get<Reporting>(
        requestUrl,
        requestConfig
      );
      resData = response.data;
      setTechnicalEvidenceProjects([]);
      reportingProjects = response.data.data.filter(
        (stage): stage is ReportingProject => 'levels' in stage
      );
    }

    const tasksWithProjectNameAndLevels: ReportingTask[] =
      reportingProjects.flatMap(stage =>
        stage.levels.flatMap((level, i) => {
          const [firstTask, ...levelTasks] = level.tasks;
          return [
            {
              ...firstTask,
              projectName: i === 0 ? stage.name : undefined,
              parentLevels: level.parentLevels,
            },
            ...levelTasks,
          ];
        })
      );

    setReporting(resData);
    setTasks(tasksWithProjectNameAndLevels);
    setReportData(
      resData.data.filter((item): item is TaskKanban => 'days' in item)
    );
    setFooterData({
      attendanceDiscount: resData.attendanceDiscount,
      licensesDiscount: resData.licensesDiscount,
      percentagePayment: resData.percentage,
      totalPartialPrice: resData.subprice,
      earlyPaymentDiscount: resData.earlyPaymentDiscount,
    });
    return resData;
  };

  useEffect(() => {
    if (!reportId) return;
    // Legacy report state is populated by this request until the page is moved
    // to React Query; the async boundary prevents a synchronous render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void getReportingTask();
    return () => {
      setReporting(null);
      setTasks(null);
      abortRequest();
    };
    // This legacy screen intentionally reloads only when the route id changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const liquidationItems = useMemo(() => {
    if (reporting?.type !== TypeStatus.APPROVED) return [];
    const snapshotItems = reporting.liquidationScopeSnapshot?.items ?? [];
    if (snapshotItems.length) return snapshotItems;

    return (
      tasks?.map(task => ({
        subTaskId: task.taskId,
        stageId: task.stageId,
        levelId: task.stageId,
        taskName: task.taskInfo.name,
        item: task.item,
        finishedAt: task.finishedAt,
        sourceSubTaskOnUserIds: [task.id],
        participationPercentage: task.percentage,
        taskBaseAmount: task.taskInfo.price,
        userGrossAmount: task.price,
      })) ?? []
    );
  }, [reporting, tasks]);

  const isLiquidation = reporting?.type === TypeStatus.APPROVED;

  const onBack = () => {
    if (navigatePayroll) navigate(-1);
    else navigate('/mis-tareas');
  };

  const onGenerateReport = async () => {
    if (!reporting) return;
    let newReporting = reporting;
    if (editValues && !isLiquidation) {
      await handleEditReport();
      newReporting = await getReportingTask();
    }
    const { firstName, lastName, dni, phone, degree } = profile;
    const totalDays =
      getTimeOut(newReporting.initialDate, newReporting.untilDate) / 24;
    const infoData: ExcelData = {
      firstName,
      lastName,
      dni,
      phone,
      degree,
      totalDays,
      initialDate: newReporting.initialDate,
      untilDate: newReporting.untilDate,
      concept: 'Aqui va el concepto',
      porcentageValue: 0,
      title: 'AQUI VA EL TITULO',
    };
    excelReport(newReporting, infoData);
  };

  const handleEditReport = async () => {
    const ids = technicalEvidence
      ? []
      : tasks?.map(task => ({
          id: task.id,
          percentage: task.percentage,
          price: task.price,
          days: task.taskInfo.days,
          priceTask: task.taskInfo.price,
        }));
    const body = {
      subtotal: sumTotalPriceInTask,
      total: finishAmount,
      licensesDiscount: +footerData.licensesDiscount,
      attendanceDiscount: +footerData.attendanceDiscount,
      percentagePayment: +footerData.percentagePayment,
      earlyPaymentDiscount: +footerData.earlyPaymentDiscount,

      ids,
    };
    await axiosInstance.put(`/reports/update-items/${reportId}`, body);
  };

  const handleEditReportAndBack = async () => {
    await handleEditReport();
    onBack();
  };
  // console.log(reportData)
  // const handleChangeCheck = (id: number, value: boolean) => {
  //   if (!reportData) return;
  //   const newData = reportData.map(item => item.days.find(day => day.id === id ?
  //     { ...day, }
  //    ) )
  // }
  return (
    <div
      className={`reportPersonalTaskView ${
        technicalEvidence ? 'is-technical-evidence' : ''
      }`}
    >
      <div className="reportPersonalTaskView-content">
        {!reporting ? (
          <LoaderForComponent />
        ) : (
          <>
            <div className="reportPersonalTaskView-header">
              {!noViewButtonBack && (
                <Button
                  text={editValues ? 'Volver' : 'Mis tareas'}
                  leftIcon={<IoArrowBack size={21} />}
                  variant="ghost"
                  position="left"
                  onClick={onBack}
                />
              )}

              <div className="reportPersonalTaskView-title-container">
                <GeneralTitle
                  firstTitle={reporting?.name ?? 'Cargando...'}
                  fontSize={1.3}
                />
                <div className="reportPersonalTaskView-btns">
                  <Button
                    text="Generar reporte"
                    icon="excel-icon"
                    size="xxs"
                    color="grayLigth"
                    textColor="secondary"
                    onClick={onGenerateReport}
                  />
                  {editValues && !isLiquidation && (
                    <Button text="Guardar" onClick={handleEditReportAndBack} />
                  )}
                </div>
              </div>

              <div className="reportPersonalTaskView-more-info">
                {technicalEvidence ? (
                  <section className="reportPersonalTaskView-bridgeSummary">
                    <TaskSelectViewTotal
                      cost={reporting.totalHours}
                      label="PRODUCTIVIDAD TOTAL EN DIAS"
                      width={14}
                    />
                    <TaskSelectViewTotal
                      cost={+footerData.totalPartialPrice}
                      label="MONTO MENSUAL"
                      width={14}
                    >
                      {editValues && (
                        <Input
                          styleInput={3}
                          value={footerData.totalPartialPrice}
                          type="number"
                          name="totalPartialPrice"
                          width={8}
                          onChange={handleBridgeAmount}
                          onBlur={handleBridgeAmountBlur}
                          isMoney
                        />
                      )}
                    </TaskSelectViewTotal>
                  </section>
                ) : (
                  <TaskSelectViewTotal
                    cost={reporting.totalHours}
                    label="PRODUCTIVIDAD TOTAL EN DIAS"
                    width={15}
                  />
                )}
              </div>
            </div>

            <div
              className={`reportPersonalTaskView-container ${
                taskId && 'task-card-route'
              } ${technicalEvidence ? 'is-technical-evidence' : ''}`}
            >
              {isLiquidation && reporting ? (
                <LiquidationReportView
                  items={liquidationItems}
                  grossAmount={reporting.subprice}
                  amortizedAmount={reporting.amortizedAmount ?? 0}
                  netAmount={Math.max(
                    reporting.subprice - (reporting.amortizedAmount ?? 0),
                    0
                  )}
                />
              ) : technicalEvidence ? (
                <div className="reportPersonalTaskView-technicalEvidence">
                  {technicalEvidenceProjects.map(stage => (
                    <section
                      key={stage.id}
                      className="reportPersonalTaskView-evidenceStage"
                    >
                      <h2>{stage.name}</h2>
                      {stage.levels.map(level => (
                        <div
                          key={level.id}
                          className="reportPersonalTaskView-evidenceLevel"
                        >
                          <h3>
                            {compactEvidencePath(
                              level.parentLevels,
                              level.name
                            )}
                          </h3>
                          <div className="reportPersonalTaskView-evidenceRows">
                            {level.tasks.map(task => (
                              <div
                                key={task.subTaskOnUserId || task.id}
                                className="reportPersonalTaskView-evidenceTask"
                              >
                                <span className="reportPersonalTaskView-evidenceTaskCode">
                                  {task.item}
                                </span>
                                <span className="reportPersonalTaskView-evidenceTaskName">
                                  {evidenceTaskName(task)}
                                </span>
                                <span className="reportPersonalTaskView-evidenceTaskMeta">
                                  {task.percentage}% - {task.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  ))}
                </div>
              ) : reporting?.type !== 'MENSUAL' ? (
                <ReportPersonalTaskTable tasks={tasks} setTasks={setTasks} />
              ) : (
                <ReportKanbanTask tasks={reportData as TaskKanban[]} />
              )}
              {reporting && !isLiquidation && (
                <ReportPersonalTaskFooter
                  handleSetFinishAmount={handleSetFinishAmount}
                  totalPartialPrice={sumTotalPriceInTask ?? 0}
                  footerData={footerData}
                  handleSetFooterData={handleSetFooterData}
                  isAdministrative={reporting?.type === TypeStatus.MONTH}
                  viewAttendance={() => setOpenAttendance(true)}
                />
              )}
            </div>
          </>
        )}
        <Outlet />
      </div>
      {openAttendance && editValues && reporting?.userId && (
        <AttendanceTable
          userId={reporting.userId}
          className="reportPersonalTaskView-licenses"
          editValues={editValues}
          onCloseTable={() => setOpenAttendance(false)}
        />
      )}
    </div>
  );
};

export default ReportPersonalTask;
