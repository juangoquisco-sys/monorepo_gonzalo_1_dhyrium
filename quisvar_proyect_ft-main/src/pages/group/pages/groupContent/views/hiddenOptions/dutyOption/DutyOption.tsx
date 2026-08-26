import './dutyOption.css';
interface DutyOptionProps {
  id: number;
}
const DutyOption = ({ id }: DutyOptionProps) => {
  return <div>Compromisos {id}</div>;
};

export default DutyOption;
