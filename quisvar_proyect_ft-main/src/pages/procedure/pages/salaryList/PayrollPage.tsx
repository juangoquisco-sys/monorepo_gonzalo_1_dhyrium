import Navbar from '@/components/navbar/Navbar';
import '../../procedure.css';
import SalaryList from './SalaryList';

const PayrollPage = () => {
  return (
    <div className="procedure">
      <Navbar title="planillas" />
      <div className="procedure-main">
        <SalaryList />
      </div>
    </div>
  );
};

export default PayrollPage;
