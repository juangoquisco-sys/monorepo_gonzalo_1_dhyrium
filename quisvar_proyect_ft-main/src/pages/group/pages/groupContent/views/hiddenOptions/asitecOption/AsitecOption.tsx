import './asitecOption.css';
interface AsitecOptionsPrps {
  id: number;
}
const AsitecOption = ({ id }: AsitecOptionsPrps) => {
  return <div>Asitec {id}</div>;
};

export default AsitecOption;
