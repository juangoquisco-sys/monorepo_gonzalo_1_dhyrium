import { useQuery } from '@tanstack/react-query';
import type { Contact, TypeProcedure, userSelect } from '../models/types';
import { TYPE_PROCEDURE } from '../models/definitionsMail.models';
import { axiosInstance } from '@/services/axiosInstance';
import type { Office } from '@/types/types';
import { DNI_GERENTE_GENERAL } from '@/utils/constantsPdf';

interface ContactsProcedure {
  primary: Contact[] | null;
  secondary: userSelect[] | null;
}
const getContacs = async (
  optionalContacs: userSelect[] | false,
  type: TypeProcedure
): Promise<ContactsProcedure> => {
  if (optionalContacs) return { primary: optionalContacs, secondary: null };
  const isComunication = type === 'comunication';
  const url = `/office?menuId=${2}&typeRol=MOD&subMenuId=${
    TYPE_PROCEDURE[type].idSubmenu
  }`;
  const secondaryContacts: userSelect[] = [];
  const res = await axiosInstance.get<Office[]>(url, {
    headers: {
      noLoader: true,
    },
  });
  const contacts = res.data
    .map(el => {
      const users = el.users.map(({ user }) => {
        const newUser = {
          value: 'user-' + user.id,
          label: user.profile.firstName + ' ' + user.profile.lastName,
          isDisabled: false,
          ...user,
        };
        if (user.profile.dni !== DNI_GERENTE_GENERAL) {
          secondaryContacts.push(newUser);
        }
        return { ...newUser, isDisabled: type === 'payProcedure' };
      });
      const area = {
        value: 'area-' + el.id,
        id: el.id,
        label: el.name,
        quantity: el._count.users,
        manager: el.manager!,
      };
      const userWithArea = [area, ...users];
      return userWithArea;
    })
    .flat();

  return {
    primary: isComunication ? null : contacts,
    secondary: secondaryContacts,
  };
};

interface useContactsProcedureProps {
  type: TypeProcedure;
  optionalContacs?: userSelect[] | false;
}
const useContactsProcedure = ({
  type,
  optionalContacs,
}: useContactsProcedureProps) => {
  const listContactsProcedure = useQuery({
    queryKey: ['listContactsProcedure', optionalContacs, type],
    queryFn: () => getContacs(optionalContacs || false, type),
  });
  const { data } = listContactsProcedure;
  return {
    listContactsProcedure,
    contacts: data?.primary ?? null,
    secondaryContacts: data?.secondary ?? null,
  };
};

export default useContactsProcedure;
