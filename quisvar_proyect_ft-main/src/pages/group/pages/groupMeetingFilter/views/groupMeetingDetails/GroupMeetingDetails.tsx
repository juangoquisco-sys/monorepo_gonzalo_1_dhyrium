import Button from '@/components/button/Button';
import { _date } from '@/utils/formatDate';
import type { GroupRes } from '../../../../types/types.response';
// import { DutyPdf } from '../../../groupContent/views';
import './groupMeetingDetails.css';
interface GroupDetailsProps {
  item: GroupRes;
  onClose: () => void;
}
const GroupMeetingDetails = ({ item, onClose }: GroupDetailsProps) => {
  // const info = {
  //   title: item?.title ?? '',
  //   group: `Grupo : ${item?.groups.name}`,
  //   mod: `${
  //     item?.groups.moderator.profile.firstName +
  //     ' ' +
  //     item?.groups.moderator.profile.lastName
  //   }`,
  //   createdAt: item?.createdAt as string,
  // };
  return (
    <div className="gmd-content">
      <span className="gmd-close">
        <Button
          text="Cerrar"
          className="attendance-add-btn"
          onClick={onClose}
          style={{ backgroundColor: 'red' }}
        />
      </span>
      <section className="gmd-info">
        <div className="gmd-row">
          <h5 className="gmd-text-title">{item.title}</h5>
        </div>
        <div className="gmd-row">
          <h5>Fecha:</h5>
          <h5 className="gmd-text">{_date(item.createdAt as Date)}</h5>
        </div>
        <div className="gmd-row">
          <h5>Grupo:</h5>
          <h5 className="gmd-text">Grupo: {item.groups.gNumber}</h5>
        </div>
        <div className="gmd-row">
          <h5>Archivo</h5>
          {/* <DutyPdf info={info} attendance={item.attendance} duty={item.duty} /> */}
        </div>
      </section>
      <div className="divider" style={{ backgroundColor: '#0000004D' }}></div>
      <h1 style={{ marginBottom: 8 }}>Asistencia</h1>
      <section className="gmd-attendance">
        <div className="gmd-table">
          <h3 className="gmd-headers">#</h3>
          <h3 className="gmd-headers">NOMBRES</h3>
          <h3 className="gmd-headers">ASISTENCIA</h3>
        </div>
        {/* {item.attendance.map((value, idx) => (
          <div className="gmd-table-row" key={value.id}>
            <h3 className="gmd-table-col">{idx + 1}</h3>
            <h3 className="gmd-table-col">
              {value.user.profile.firstName + '' + value.user.profile.lastName}
            </h3>
            <h3 className="gmd-table-col">{value.status}</h3>
          </div>
        ))} */}
      </section>
      <div className="divider" style={{ backgroundColor: '#0000004D' }}></div>
      <h1 style={{ marginBottom: 8 }}>Compromisos</h1>
    </div>
  );
};

export default GroupMeetingDetails;
