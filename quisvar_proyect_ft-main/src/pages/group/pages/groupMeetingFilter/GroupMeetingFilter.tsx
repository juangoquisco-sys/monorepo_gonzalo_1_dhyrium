import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/button/Button';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import './groupMeetingFilter.css';
import { axiosInstance } from '@/services/axiosInstance';
import type { Group } from '@/types/types';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import type { GroupRes } from '../../types/types.response';
import { _date, formatDate } from '@/utils/formatDate';
// import { DutyPdf } from '../groupContent/views';
import GroupMeetingDetails from './views/groupMeetingDetails/GroupMeetingDetails';
const today = new Date();
const GroupMeetingFilter = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>();
  const [items, setItems] = useState<GroupRes[]>();
  const [details, setDetails] = useState<GroupRes>();
  const getgroups = useCallback(async () => {
    await axiosInstance.get('/groups/all').then(res => setGroups(res.data));
  }, []);
  const {
    register,
    handleSubmit,
    // setValue,
    // reset,
    // watch,
    // formState: { errors },
  } = useForm<any>();
  useEffect(() => {
    getgroups();
  }, []);

  const onSubmit: SubmitHandler<any> = values => {
    axiosInstance
      .get(
        `/attendanceGroup/filter/?id=${values.groupId}&startDate=${values.startDate}&endDate=${values.endDate}`
      )
      .then(res => {
        setItems(res.data);
      });
  };

  return (
    <div className="gmf-content">
      <h1 className="gr-title">REUNIONES</h1>
      <section className="gmf-information">
        <form onSubmit={handleSubmit(onSubmit)} className="gmf-filters">
          <Input
            {...register('startDate', { required: true })}
            name="startDate"
            label="Fecha Inicial"
            type="date"
            defaultValue={startDate}
            width={12.5}
            onChange={e => setStartDate(e.target.value)}
            max={_date(today)}
          />
          <Input
            type="date"
            {...register('endDate', { required: true })}
            name="endDate"
            label="Fecha Final"
            defaultValue={endDate}
            width={12.5}
            onChange={e => setEndDate(e.target.value)}
            max={_date(today)}
          />
          <div>
            <Select
              {...register('groupId')}
              data={groups}
              extractValue={({ id }) => id}
              renderTextField={({ name }) => name}
              placeholder="Todos"
              name="groupId"
              label="Grupos"
              className="gmf-input"
            />
          </div>
          <Button
            text="Filtrar"
            type="submit"
            icon="filter"
            color="secondary"
            variant="outline"
          />
        </form>
        <div className="gmf-data">
          <div className="gmf-items">
            <div className="gmf-table">
              <div className="gmf-header">
                <h1 className="gmf-title">N</h1>
                <h1 className="gmf-title">Grupo</h1>
                <h1 className="gmf-title">Fecha</h1>
                <h1 className="gmf-title">Titulo</h1>
                <h1 className="gmf-title">Documento</h1>
              </div>
            </div>
            <div className="gmf-res-content">
              {items &&
                items.map((item, idx) => {
                  // const info = {
                  //   title: item.title ?? '',
                  //   group: item.groups.name ?? '',
                  //   mod:
                  //     (item.groups?.moderator?.profile?.firstName ?? '---') +
                  //     ' ' +
                  //     (item.groups?.moderator?.profile?.lastName ?? '---'),
                  //   createdAt: item.createdAt as string,
                  // };
                  return (
                    <div
                      className={`gmf-body ${
                        details?.id === item.id && 'gmf-color'
                      }`}
                      key={item.id}
                      onClick={() => setDetails(item)}
                    >
                      <h1 className="gmf-item">{idx + 1}</h1>
                      <h1 className="gmf-item">Grupo {item.groups.gNumber}</h1>
                      <h1 className="gmf-item">
                        {formatDate(new Date(item.createdAt), {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </h1>
                      <h1 className="gmf-item">{item.title}</h1>
                      <h1 className="gmf-doc">
                        {/* <DutyPdf
                          info={info}
                          attendance={item.attendance}
                          duty={item.duty}
                        /> */}
                      </h1>
                    </div>
                  );
                })}
            </div>
          </div>
          {details && (
            <GroupMeetingDetails
              item={details as GroupRes}
              onClose={() => setDetails(undefined)}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default GroupMeetingFilter;
