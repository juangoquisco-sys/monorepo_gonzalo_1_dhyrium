import type { Contract, Option } from '@/types/types';
import { isOpenCardRegisteContract$ } from '@/services/sharingSubject';
import { axiosInstance } from '@/services/axiosInstance';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import './sidebarContractCard.css';
import { NavLink, useLocation } from 'react-router-dom';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import { useCallback } from 'react';
import useRole from '@/hooks/useRole';
import { getStatusContract } from '../../utils/tools';

interface SidebarContractCardProps {
  contract: Contract;
  onSave: () => void;
  statusLabel: string;
}
export const SidebarContractCard = ({
  contract,
  onSave,
  statusLabel,
}: SidebarContractCardProps) => {
  const handleEditContract = () =>
    (isOpenCardRegisteContract$.setSubject = { isOpen: true, contract });
  const location = useLocation();
  const handleDeleteContract = () =>
    axiosInstance.delete(`contract/${contract.id}`).then(() => {
      SnackbarUtilities.success('El Contrato fue eliminado exitosamente');
      onSave();
    });

  const dataDots: Option[] = [
    {
      name: 'Editar',
      type: 'button',
      icon: 'pencil',
      function: handleEditContract,
    },
    {
      name: 'Eliminar',
      type: 'button',
      icon: 'trash-red',
      function: handleDeleteContract,
    },
  ];

  const { hasAccess: authUsers } = useRole('MOD');

  const getColorStatus = useCallback(() => {
    const { createdAt, phases, indexContract } = contract;
    const color = getStatusContract(createdAt, phases, indexContract);
    const statusColor = {
      grey: 'bg-color-review',
      red: 'bg-color-unresolved',
      yellow: 'bg-color-process',
      skyBlue: 'bg-color-done',
    };
    return statusColor[color];
  }, [contract]);

  return (
    <AppContextMenu
      data={dataDots}
      disabled={!authUsers}
      key={contract.id}
      className="SidebarContractCard"
    >
      <NavLink
        to={{
          pathname: `contrato/${contract.id}/detalles`,
          search: location.search,
        }}
        className={({ isActive }) =>
          `SidebarContractCard-sidebar-data  ${
            isActive && 'contract-selected'
          } `
        }
      >
        <figure className="SidebarContractCard-sidebar-figure" aria-hidden>
          <img src="/svg/contracts-icon.svg" alt="" />
        </figure>
        <div className="SidebarContractCard-text-contain">
          <h5 className="SidebarContractCard-sidebar-cui" title={contract.projectShortName || undefined}>
            {contract.projectShortName}
          </h5>
          <h4 className="SidebarContractCard-sidebar-name" title={contract.contractNumber}>
            {contract.contractNumber}
          </h4>
          <div className="SidebarContractCard-sidebar-meta">
            <h5 className="SidebarContractCard-sidebar-cui">{contract.cui}</h5>
            <span className="SidebarContractCard-status-label">{statusLabel}</span>
          </div>
        </div>
      </NavLink>

      <div className={`contractCard-circle-status  ${getColorStatus()}`} />
    </AppContextMenu>
  );
};
