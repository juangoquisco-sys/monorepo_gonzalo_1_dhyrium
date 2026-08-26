import { useEffect, useState, useContext } from 'react';
import type { ChangeEvent } from 'react';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import './groupDaily.css';
import { _date } from '@/utils/formatDate';
import { axiosInstance } from '@/services/axiosInstance';
import { useParams } from 'react-router-dom';
import type { Duty, GroupRes } from '../../types/types.response';
import { SocketContext } from '@/context/SocketContex';
import DutyList from '../../components/dutyList/DutyList';
// import { motion } from 'framer-motion';
import HiddenOptions from '../groupContent/views/hiddenOptions/HiddenOptions';
const now = new Date();

interface Projects {
  id: number;
  name: string;
  district: string;
  cui: true;
}

export const GroupDaily = () => {
  const socket = useContext(SocketContext);
  const [addBtn, setAddBtn] = useState<boolean>(true);
  const [selectedBtn, setSelectedBtn] = useState<number | null>(null);
  const [isToday, setIsToday] = useState<boolean>(true);
  const [showSelect, setShowSelect] = useState<boolean>(false);
  const [calls, setCalls] = useState<GroupRes[]>([]);
  const [idList, setIdList] = useState<number>();
  const [dateValue, setDateValue] = useState<string>(_date(now));
  const [hasDuty, setHasDuty] = useState<Duty[]>([]);
  const [dutyView, setDutyView] = useState<Duty>();
  // const [, setGroupUsers] = useState<GroupAttendanceRes[]>([]);
  const [dataProjects, setDataProjects] = useState<Projects[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const { groupId } = useParams();

  useEffect(() => {
    socket.on('server:action-button', () => {
      getTodayCalls();
    });

    return () => {
      socket.off('server:action-button');
    };
  }, []);

  useEffect(() => {
    getTodayCalls();
    // getMembers();
  }, []);
  const getTodayCalls = (position?: number, dateValue?: string) => {
    // setGroupUsers([]);
    setCalls([]);
    setHasDuty([]);
    setDutyView(undefined);
    const today = new Date();
    axiosInstance
      .get<GroupRes[]>(
        `/attendanceGroup/list/${groupId}?date=${dateValue ?? _date(today)}`
      )
      .then(res => {
        // console.log(res.data)
        setCalls(res.data);
        setAddBtn(res.data[res.data.length - 1]?.duty.length !== 0);
        if (position) {
          const pos = res.data.findIndex(item => item.id === position);
          viewList(res.data[pos], pos + 1);
        } else {
          if (res.data.length > 0)
            viewList(res.data[res.data.length - 1], res.data.length);
        }
      });
    axiosInstance.get<Projects[]>(`groups/projects/${groupId}`).then(res => {
      // console.log(res.data);
      setDataProjects(res.data);
    });
    position = undefined;
    dateValue = undefined;
  };
  // console.log(dataProjects);
  const getDate = (e: ChangeEvent<HTMLInputElement>) => {
    const today = new Date();
    const { value } = e.target;
    setDateValue(value);
    // setGroupUsers([]);
    setCalls([]);
    setHasDuty([]);
    setIdList(undefined);
    setDutyView(undefined);
    // setOption(true);
    axiosInstance
      .get<GroupRes[]>(`/attendanceGroup/list/${groupId}?date=${value}`)
      .then(res => {
        // console.log(res.data);
        setCalls(res.data);
        setIsToday(_date(today) === value);
        if (res.data.length > 0)
          viewList(res.data[res.data.length - 1], res.data.length);
      });
  };
  const addList = (order: number) => {
    setAddBtn(false);

    // setGroupUsers([]);
    setCalls([]);
    setHasDuty([]);
    setDutyView(undefined);
    // setOption(true);
    const today = new Date();
    const values = {
      nombre: order.toString(),
      groupId: +(groupId as string),
    };
    axiosInstance
      .post<GroupRes[]>(
        `/attendanceGroup/list?id=${groupId}&date=${_date(today)}`,
        values
      )
      .then(res => {
        // getTodayCalls();
        setSelectedBtn(res.data.length);
        // setAddBtn(res.data[res.data.length - 1]?.attendance.length !== 0);
        socket.emit('client:action-button');
        viewList(res.data[res.data.length - 1], res.data.length);
        setCalls(res.data);
      });
  };

  const viewList = (item: GroupRes, idx: number) => {
    setIdList(item.id);
    // setGroupUsers([]);
    setHasDuty([]);
    // setShowSecond(false);
    if (item) {
      // setGroupUsers(item?.duty);
      // setShowSecond(true);
      // setHasItems(true);
      setDutyView(item.duty[0]);
      setHasDuty(item?.duty);
    } else {
      // getMembers();
    }
    setSelectedBtn(idx);
  };
  const handleDeleteList = (id: number) => {
    axiosInstance.delete(`/attendanceGroup/list/${id}`).then(() => {
      socket.emit('client:action-button');
      setAddBtn(true);
      // setCalls([])
      // setGroupUsers([]);
      getTodayCalls();
      setDutyView(undefined);
    });
  };
  const createDuty = (item: string) => {
    const { id, name, district, cui } = dataProjects.find(
      project => project.id === +item
    ) as Projects;
    const data = {
      CUI: cui,
      project: name,
      shortName: district,
      listId: idList,
    };
    axiosInstance.post(`duty/${groupId}/${id}`, data).then(() => {
      getTodayCalls();
      setShowSelect(false);
    });
  };
  const viewDuty = (item: Duty) => {
    // console.log(idx)
    setDutyView(item);
  };

  const openCard = (e: boolean) => {
    setIsVisible(e);
  };
  return (
    <div className="gd-content">
      <div className="gd-header">
        <span className="gd-date">
          <img src="/svg/calendary-icon.svg" className="attendance-icon" />
          <Input
            type="date"
            onChange={getDate}
            width={12}
            style={{ padding: '0 1rem' }}
            max={_date(now)}
            defaultValue={_date(now)}
          />
          {/* Calls per day 1 2 3 ... */}
          {calls &&
            calls.map((call, idx) => {
              return (
                <div key={call.id} style={{ position: 'relative' }}>
                  {!call?.duty.length && (
                    <span
                      onClick={() => handleDeleteList(call.id)}
                      className="gd-close-span"
                    >
                      x
                    </span>
                  )}
                  <Button
                    onClick={() => viewList(call, idx + 1)}
                    className={`attendance-add-btn ${
                      selectedBtn === idx + 1 ? 'selected' : 'gd-gray'
                    }`}
                    style={{ width: '2rem', justifyContent: 'center' }}
                    // icon="plus"
                    text={`${call.nombre}`}
                    type="button"
                  />
                </div>
              );
            })}
          {isToday && addBtn && (
            <Button
              onClick={() => addList(calls.length + 1)}
              className="attendance-add-btn"
              // icon="plus"
              text="Añadir Nueva Lista"
            />
          )}
        </span>
      </div>
      {/* General table */}
      <div className="gd-table">
        <div className="gd-add-project">
          {hasDuty &&
            hasDuty.map(item => {
              return (
                <span
                  key={item.id}
                  onClick={() => viewDuty(item)}
                  className={`gd-project-list ${
                    item.id === dutyView?.id && 'gd-border'
                  }`}
                >
                  {item.shortName}
                </span>
              );
            })}
          {idList && (
            <div className="gd-add-area">
              {!showSelect ? (
                <span className="gd-add" onClick={() => setShowSelect(true)}>
                  + Agregar
                </span>
              ) : (
                <div className="gd-cross">
                  <Select
                    name="select"
                    extractValue={({ id }) => id}
                    renderTextField={({ district }) => district}
                    data={dataProjects}
                    placeholder="Proyecto"
                    onChange={e => createDuty(e.target.value)}
                  />
                  <span className="gd-add" onClick={() => setShowSelect(false)}>
                    x
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        {dutyView && (
          <DutyList
            data={dutyView}
            onSave={() => getTodayCalls(idList, dateValue)}
          />
        )}
      </div>
      {groupId && dutyView && dutyView.id && (
        <HiddenOptions
          visible={isVisible}
          showCard={openCard}
          duty={+groupId}
          CUI={dutyView.CUI}
        />
      )}
    </div>
  );
};

export default GroupDaily;
