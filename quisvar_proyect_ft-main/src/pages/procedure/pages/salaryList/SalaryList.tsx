import { Outlet, useParams } from 'react-router-dom';
import './salaryList .css';
import SalaryListSidebar from './views/salaryListSidebar/SalaryListSidebar';

const SalaryList = () => {
  const { salaryId } = useParams();

  return (
    <div className="salaryList">
      <SalaryListSidebar />
      <div className="salaryList-content" key={salaryId}>
        <Outlet />
      </div>
    </div>
  );
};

export default SalaryList;
