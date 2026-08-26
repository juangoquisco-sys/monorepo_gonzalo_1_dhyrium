import './toDoOption.css';
interface ToDoOptionProps {
  id: number;
}
const ToDoOption = ({ id }: ToDoOptionProps) => {
  return <div>Pendientes {id}</div>;
};

export default ToDoOption;
