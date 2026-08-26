import { useEffect } from 'react';
import type { Contract, ContractIndexData } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import type { AppDispatch, RootState } from '@/store/store.types';
import { useDispatch, useSelector } from 'react-redux';
import { getContractThunks } from '@/store/slices/contract.slice';
import './contractsLevels.css';
import { DropdownLevelContract } from './components/dropdownLevelContract/DropdownLevelContract';
import IconAction from '@/components/iconAction/IconAction';
import {
  isOpenCardObservations$,
  isOpenViewPdf$,
} from '@/services/sharingSubject';
import ContractPhasePdf from '../../pdfGenerator/contractPhasePdf/ContractPhasePdf';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { parseContractIndex } from '../../utils/tools';

export const ContractsLevels = () => {
  const dispatch: AppDispatch = useDispatch();
  const [params, setParams] = useSearchParams();

  const contract = useSelector((state: RootState) => state.contract);
  const { contractId } = useParams();
  useEffect(() => {
    getContract();
  }, [contractId]);

  const getContract = () => {
    if (!contractId) return;
    dispatch(getContractThunks(contractId));
  };
  const getLevelData = (contract: Contract) => {
    const contractIndex: ContractIndexData[] = parseContractIndex(
      contract?.indexContract
    );
    return {
      id: '0',
      name: '',
      nivel: 0,
      uploadDate: new Date(),
      nextLevel: contractIndex,
    };
  };
  const editFileContractIndex = (id: string, value: 'yes' | 'no') => {
    if (!contract) return;
    const arrayId = id.split('.').map(el => +el - 1);
    const contractIndex: ContractIndexData[] = parseContractIndex(
      contract?.indexContract
    );
    const newcontract = contractIndex?.[arrayId[0]];
    const nextLevel = newcontract?.nextLevel?.[arrayId[1]];
    if (arrayId.length === 2) {
      if (contract && nextLevel) {
        nextLevel.hasFile = value;
        nextLevel.uploadDate = new Date();
      }
    }
    if (arrayId.length === 3) {
      const nextLevel2 = nextLevel?.nextLevel?.[arrayId[2]];
      if (contract && nextLevel && nextLevel2) {
        nextLevel2.hasFile = value;
        nextLevel2.uploadDate = new Date();
      }
    }
    const indexContract = JSON.stringify(contractIndex);
    axiosInstance
      .put(`/contract/${contract.id}/index`, { indexContract })
      .then(() => {
        params.set('savePhase', String(new Date().getTime()));
        setParams(params);
        getContract();
      });
  };
  const handleReportPdf = () => {
    if (!contract) return;
    isOpenViewPdf$.setSubject = {
      fileNamePdf: contract.contractNumber,
      pdfComponentFunction: ContractPhasePdf({ contract }),
      isOpen: true,
    };
  };
  const handleInfo = () => {
    if (!contract) return;
    isOpenCardObservations$.setSubject = {
      isOpen: true,
      observations: contract.observations,
    };
  };
  return contract ? (
    <PanelGroup direction="horizontal">
      <Panel defaultSize={60} order={1}>
        <div className="contractsLevels-main-level">
          <h3 className="contractsLevels-level-title">{contract.name}</h3>
          <IconAction icon="Info" onClick={handleInfo} size={1.4} />

          <div className="contractsLevels-level-contain">
            <DropdownLevelContract
              level={getLevelData(contract)}
              idContract={contract.id}
              editFileContractIndex={editFileContractIndex}
              handleReportPdf={handleReportPdf}
            />
          </div>
        </div>
      </Panel>
      <PanelResizeHandle className="resizable" />
      <Panel defaultSize={40} order={2}>
        <div className="contractsLevels-main-info">
          <Outlet />
        </div>
      </Panel>
    </PanelGroup>
  ) : (
    <div className="contractsLevels-select-empty">
      <h1>Seleccione un Contrato</h1>
    </div>
  );
};

export default ContractsLevels;
