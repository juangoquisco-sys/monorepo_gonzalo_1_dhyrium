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
}
export const SidebarContractCard = ({
  contract,
  onSave,
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
        <figure className="SidebarContractCard-sidebar-figure">
          <img src="/svg/contracts-icon.svg" alt="W3Schools" />
        </figure>
        <div className="SidebarContractCard-text-contain">
          <h5 className="SidebarContractCard-sidebar-cui ">
            {contract.projectShortName}
          </h5>
          <h4 className="SidebarContractCard-sidebar-name">
            {contract.contractNumber}
          </h4>
          <h5 className="SidebarContractCard-sidebar-cui">{contract.cui}</h5>
        </div>
      </NavLink>

      <div className={`contractCard-circle-status  ${getColorStatus()}`} />
    </AppContextMenu>
  );
};
