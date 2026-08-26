import type { UseFormTrigger, UseFormWatch } from 'react-hook-form';
import type { MessageSendType, ToData, TypeProcedure } from '../models/types';
import procedureDocument from '../pdfGenerator/procedureDocument/procedureDocument';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { isOpenViewHtmlToPdf$ } from '@/services/sharingSubject';
import { getHtmlPdfBlob } from '@/utils/htmlToString';
import { axiosInstance } from '@/services/axiosInstance';

interface useDocumentPdfProcedureProps {
  watch: UseFormWatch<MessageSendType>;
  trigger: UseFormTrigger<MessageSendType>;
  type: TypeProcedure;
}
const useDocumentPdfProcedure = ({
  watch,
  trigger,
  type,
}: useDocumentPdfProcedureProps) => {
  const { profile } = useSelector((state: RootState) => state.userSession);

  const getHtmlString = (size: 'a4' | 'a5') => {
    const {
      description,
      header,
      title,
      signature,
      receiver,
      secondaryReceiver,
    } = watch();
    let toProfile: ToData | null = null;
    if (receiver) {
      const isArea = receiver.value.includes('area');
      if (isArea && 'manager' in receiver) {
        const { profile } = receiver.manager;
        toProfile = {
          name: profile.firstName + ' ' + profile.lastName,
          degree: profile.degree,
          position: profile.description,
          job: profile.job,
        };
      } else if ('profile' in receiver) {
        toProfile = {
          name: receiver.label,
          degree: receiver.profile.degree,
          position: receiver.profile.description,
          job: receiver.profile.job,
        };
      }
    }
    const ccProfiles =
      secondaryReceiver?.map(receiver => {
        if ('profile' in receiver) {
          return {
            name: receiver.label,
            degree: receiver.profile.degree,
            position: receiver.profile.description,
            job: receiver.profile.job,
          };
        }
      }) ?? [];
    let filteredCcProfiles = ccProfiles.filter(
      profile => profile !== undefined
    ) as ToData[];

    const htmlString = procedureDocument({
      title,
      subject: header,
      body: description ?? '',
      toProfile,
      ccProfiles: filteredCcProfiles,
      fromProfile: profile,
      size,
      type,
      signature: !!signature,
    });
    return htmlString;
  };
  const downLoadPdf = async (size: 'a4' | 'a5') => {
    const isValid = await trigger();
    if (!isValid) return;
    const htmlString = getHtmlString(size);
    if (!htmlString) return;
    isOpenViewHtmlToPdf$.setSubject = {
      isOpen: true,
      fileNamePdf: watch('title'),
      htmlString,
      size,
    };
  };
  const getPdfA5 = async () => {
    const isValid = await trigger();
    if (!isValid) return;
    const formData = new FormData();
    const htmlString = getHtmlString('a4');
    const blobData = await getHtmlPdfBlob(htmlString, 'a4');
    formData.append('file', blobData);
    const response = await axiosInstance.post(
      '/generate-pdf/two-pages',
      formData,
      { responseType: 'blob' }
    );
    isOpenViewHtmlToPdf$.setSubject = {
      isOpen: true,
      fileNamePdf: watch('title'),
      pdfBlob: response.data,
    };
  };

  const downloadOptions = [
    {
      id: 1,
      handleClick: getPdfA5,
      iconOne: 'file-download',
      iconTwo: 'file-download-white',
      text: 'A5',
    },
    {
      id: 2,
      handleClick: () => downLoadPdf('a4'),
      iconOne: 'file-download',
      iconTwo: 'file-download-white',
      text: 'A4',
    },
  ];
  return { downloadOptions, getHtmlString };
};

export default useDocumentPdfProcedure;
