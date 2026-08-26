import { Outlet, useParams } from 'react-router-dom';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Modal from '@/components/portal/Modal';
import useGoBackRoute from '@/hooks/useGoBackRoute';
import './reportCard.css';

const ReportCard = () => {
  const { reportId } = useParams();

  const isOpenProp = !!reportId;
  const goBack = useGoBackRoute('report');

  return (
    <Modal size={90} isOpenProp={isOpenProp} sizeHeight={90}>
      <div className="reportCard">
        <CloseIcon onClick={goBack} size={0.8} top={0.5} right={0.5} />
        <Outlet />
      </div>
    </Modal>
  );
};

export default ReportCard;
