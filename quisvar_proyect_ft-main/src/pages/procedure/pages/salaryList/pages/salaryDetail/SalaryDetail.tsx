import DivFlex from '@/components/divFlex/DivFlex';
import IndeterminateCheckboxAll from '@/components/indeterminateCheckbox/IndeterminateCheckboxAll';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import TableNoData from '@/components/table/TableNoData';
import './salaryDetail.css';
import SalaryDetailTable from './pages/salaryDetailtable/SalaryDetailTable';
import { Outlet, useParams } from 'react-router-dom';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import usePayroll from './hooks/usePayroll';
import { PayrollContext } from './context/payrollContext';
import PayrollHeader from './components/payrollHeader/PayrollHeader';
import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { TypePayroll } from '../interface/payroll.types';
import type { OnChangeFn, RowSelectionState } from '@tanstack/react-table';
import TaskSelectViewTotal from '../../../../../myTasks/pages/listPersonalTask/components/taskSelectViewTotal/TaskSelectViewTotal';
import { isEmptyObject } from '@/utils/tools';
const SalaryDetail = () => {
  const { salaryId, paymessageId } = useParams();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const handleRowSelection: OnChangeFn<RowSelectionState> = values => {
    setRowSelection(values);
  };

  const { payrollQuery, salary, setSearchTypePayroll, typePayroll } =
    usePayroll(Number(salaryId || 0));

  useEffect(() => {
    setRowSelection({});
  }, [typePayroll]);

  useEffect(() => {
    setSearchTypePayroll(typePayroll || TypePayroll.UNAPPROVED);
  }, []);

  const handleSelectAll = ({ target }: ChangeEvent<HTMLInputElement>) => {
    if (!salary) return;
    let rowsSelection: RowSelectionState = {};
    if (target.checked) {
      rowsSelection = salary.offices.reduce((acc, office) => {
        const object: Record<string, boolean> = {};
        office.payMessages.forEach(payMessages => {
          payMessages.reports.forEach(({ id }) => {
            object[id] = true;
          });
        });
        return { ...acc, ...object };
      }, {} as RowSelectionState);
    }
    setRowSelection(rowsSelection);
  };

  const totalAmountSelected = useMemo(() => {
    if (!salary) return;
    const sumTotal = salary.offices.reduce((acc, office) => {
      let sum = 0;
      office.payMessages.forEach(({ id, total }) => {
        if (rowSelection[id]) {
          sum += total;
        }
      });
      return acc + sum;
    }, 0);

    return sumTotal;
  }, [rowSelection, salary]);

  const totalAmountSelectedUnconformity = useMemo(() => {
    if (!salary) return;
    const sumTotal = salary.offices.reduce((acc, office) => {
      let sum = 0;
      office.payMessages.forEach(payMessages => {
        payMessages.reports.forEach(({ price, isAuthorized }) => {
          if (isAuthorized) {
            sum += price;
          }
        });
      });
      return acc + sum;
    }, 0);

    return sumTotal;
  }, [salary]);

  return (
    <PayrollContext.Provider
      value={{
        payrollQuery,
        salaryId: Number(salaryId || 0),
        salary,
        setSearchTypePayroll,
        typePayroll,
        handleRowSelection,
        rowSelection,
      }}
    >
      <PanelGroup direction="horizontal">
        <Panel defaultSize={paymessageId ? 50 : 100} order={1}>
          <div className="salaryDetail">
            <PayrollHeader />
            {salary && payrollQuery.isFetching && (
              <LoaderOnly position="absolute" right={2} />
            )}
            {payrollQuery.isLoading && <LoaderForComponent />}
            {payrollQuery.isError && !payrollQuery.isLoading && (
              <div className="salaryDetail-error">
                <p>No se pudo cargar la planilla.</p>
                <button type="button" onClick={() => payrollQuery.refetch()}>
                  Reintentar
                </button>
              </div>
            )}
            {[TypePayroll.APPROVED, TypePayroll.UNAPPROVED].includes(
              typePayroll
            ) &&
              salary &&
              salary.offices.length > 0 && (
                <DivFlex
                  justifyContent="flex-start"
                  alignItems="center"
                  gap={3}
                >
                  {[TypePayroll.APPROVED].includes(typePayroll) && (
                    <>
                      <IndeterminateCheckboxAll onChange={handleSelectAll} />
                      {!isEmptyObject(rowSelection) && (
                        <TaskSelectViewTotal
                          cost={totalAmountSelected}
                          label="COSTO ACUMULADO"
                          width={12}
                        />
                      )}
                    </>
                  )}

                  {[TypePayroll.UNAPPROVED].includes(typePayroll) && (
                    <TaskSelectViewTotal
                      cost={totalAmountSelectedUnconformity}
                      label="COSTO ACUMULADO"
                      width={12}
                    />
                  )}
                </DivFlex>
              )}
            <div className="salaryDetail-tables-main">
              {salary && salary.offices.length > 0
                ? salary?.offices.map(office => (
                    <SalaryDetailTable key={office.id} office={office} />
                  ))
                : !payrollQuery.isLoading &&
                  !payrollQuery.isError && <TableNoData />}
            </div>
          </div>
        </Panel>
        {paymessageId && (
          <>
            <PanelResizeHandle className="resizable" />
            <Panel defaultSize={50} order={2}>
              <Outlet context={{ officeId: 0 }} />
            </Panel>
          </>
        )}
      </PanelGroup>
    </PayrollContext.Provider>
  );
};

export default SalaryDetail;
