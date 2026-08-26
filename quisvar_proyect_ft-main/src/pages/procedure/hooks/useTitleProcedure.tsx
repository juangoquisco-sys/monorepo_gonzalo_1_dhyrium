import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { YEAR } from '../models/procedureDefinitions';
import type { MessageSendType, TypeProcedure } from '../models/types';
import { axiosInstance } from '@/services/axiosInstance';
import type { quantityType } from '@/types/types';
import { createNameHash } from '@/utils/files/files.utils';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import type { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { TYPE_PROCEDURE } from '../models/definitionsMail.models';

interface useTitleProcedureProps {
  setValue: UseFormSetValue<MessageSendType>;
  watch: UseFormWatch<MessageSendType>;
  type: TypeProcedure;
}
const useTitleProcedure = ({
  setValue,
  watch,
  type,
}: useTitleProcedureProps) => {
  const [countMessage, setCountMessage] = useState<quantityType[] | null>(null);
  const { lastName, firstName } = useSelector(
    (state: RootState) => state.userSession.profile
  );

  useEffect(() => {
    getQuantityServices();
  }, []);

  const HashUser = createNameHash(`${firstName} ${lastName}`);
  const handleTitle = () => {
    const { numberDocument, type } = watch();
    const title = `${type} N°${numberDocument} DHYRIUM-${HashUser}-${YEAR}`;
    setValue('title', title);
  };

  const getNumberDocument = (value: string) => {
    const countFile = countMessage?.find(file => file.type === value);
    const newIndex = (countFile ? countFile._count.type : 0) + 1;
    return newIndex;
  };

  const handleTypeDocumentChange = ({
    target,
  }: ChangeEvent<HTMLSelectElement>) => {
    const { options, selectedIndex } = target;
    const selectedTypeDocument = options[selectedIndex].text;
    setValue('numberDocument', getNumberDocument(selectedTypeDocument));
    handleTitle();
  };

  const getQuantityServices = () =>
    axiosInstance
      .get(TYPE_PROCEDURE[type]?.urlQuantity, { headers: { noLoader: true } })
      .then(res => {
        setCountMessage(res.data);
      });

  return {
    handleTitle,
    getNumberDocument,
    restTitle: `DHYRIUM-${HashUser}-${YEAR}`,
    handleTypeDocumentChange,
    countMessage,
  };
};

export default useTitleProcedure;
