import ListItems from '../listItems/ListItems';
import type { GroupAttendanceRes } from '../../types/types.response';
import './groupAttendance.css';
interface GroupAttendanceProps {
  onRadioChange: (value: string, id: number, desc?: string) => void;
  groupUsers: GroupAttendanceRes[];
  hasItems?: boolean;
}
const GroupAttendance = ({
  groupUsers,
  onRadioChange,
  hasItems,
}: GroupAttendanceProps) => {
  const handleRadioChange = (
    status: string,
    usersId: number,
    desc?: string
  ) => {
    // console.log(status, usersId);
    onRadioChange(status, usersId, desc);
  };
  return (
    <div className="ga-table">
      <div className="ga-header">
        <h1 className="ga-title">#</h1>
        <h1 className="ga-title">NOMBRE</h1>
        <div className="ga-attendance">
          <h1 className="gah-title head-p">P</h1>
          <h1 className="gah-title head-t">T</h1>
          <h1 className="gah-title head-f">F</h1>
          <h1 className="gah-title head-g">G</h1>
          <h1 className="gah-title head-m">M</h1>
          <h1 className="gah-title head-l">L</h1>
        </div>
        {/* <h1 className="ga-title" style={{ textAlign: 'center' }}>
          COMPROMISO DIARIO
        </h1> */}
      </div>
      {groupUsers &&
        groupUsers.map((item, idx) => (
          <ListItems
            hasItems={hasItems}
            groupUsers={item}
            key={item.id}
            idx={idx}
            onRadioChange={(e, v, d) => {
              // console.log(e, v);
              handleRadioChange(e, v, d);
            }}
          />
        ))}
    </div>
  );
};

export default GroupAttendance;
