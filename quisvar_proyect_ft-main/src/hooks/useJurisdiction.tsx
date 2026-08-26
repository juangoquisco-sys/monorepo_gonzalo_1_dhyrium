import provincesJson from '@/utils/ubigeo/provincias.json';
import distritosJson from '@/utils/ubigeo/distritos.json';
import departamentsJson from '@/utils/ubigeo/departamentos.json';
import { type ChangeEvent, useState } from 'react';
import type { Ubigeo } from '@/types/types';

const useJurisdiction = () => {
  const [provinces, setProvinces] = useState<Ubigeo[]>([]);
  const [districts, setDistricts] = useState<Ubigeo[]>([]);
  const handleGetProvinces = (e: ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    const findDepartament = departamentsJson.find(
      ubigeo => ubigeo.nombre_ubigeo === value
    );
    const idDepartament = findDepartament?.id_ubigeo;
    const provinciasData =
      provincesJson[idDepartament as keyof typeof provincesJson];
    setProvinces(provinciasData);
    setDistricts([]);
  };
  const handleGetDistricts = (e: ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    const findProvice = provinces.find(
      ubigeo => ubigeo.nombre_ubigeo === value
    );
    const idProvince = findProvice?.id_ubigeo;
    const districsData =
      distritosJson[idProvince as keyof typeof distritosJson];
    setDistricts(districsData);
  };
  const setJurisdictionSelectData = (departament: string, province: string) => {
    const findDepartament = departamentsJson.find(
      ubigeo => ubigeo.nombre_ubigeo === departament
    );
    const idDepartament = findDepartament?.id_ubigeo;
    const provinciasData =
      provincesJson[idDepartament as keyof typeof provincesJson];
    const findProvice = provinciasData?.find(
      ubigeo => ubigeo.nombre_ubigeo === province
    );
    const idProvince = findProvice?.id_ubigeo;
    const districsData =
      distritosJson[idProvince as keyof typeof distritosJson];
    setProvinces(provinciasData);
    setDistricts(districsData);
  };
  return {
    provinces,
    districts,
    departaments: departamentsJson,
    handleGetProvinces,
    handleGetDistricts,
    setJurisdictionSelectData,
  };
};

export default useJurisdiction;
