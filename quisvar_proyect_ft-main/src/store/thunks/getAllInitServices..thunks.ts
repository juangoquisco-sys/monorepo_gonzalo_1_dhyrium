import type { Dispatch } from '@reduxjs/toolkit';
import { axiosInstance } from '@/services/axiosInstance';
// import { setListStage } from '../slices/listStages.slice';
import { setUserSessionGlobal } from '../slices/userSession.slice';

let initializedToken: string | null = null;
let initServicesPromise: Promise<void> | null = null;

export const resetInitServicesCache = () => {
  initializedToken = null;
  initServicesPromise = null;
};

export const getAllServices =
  () => async (dispatch: Dispatch<ReturnType<typeof setUserSessionGlobal>>) => {
    const token = localStorage.getItem('token');

    if (!token || initializedToken === token) return;
    if (initServicesPromise) return initServicesPromise;

    initServicesPromise = (async () => {
      const profileResponse = await axiosInstance.get('/profile');
      // const stagesResponse = await axiosInstance.get('/stages');
      dispatch(setUserSessionGlobal(profileResponse.data));
      // dispatch(setListStage(stagesResponse.data));
      initializedToken = token;
    })();

    try {
      await initServicesPromise;
    } finally {
      initServicesPromise = null;
    }
  };
