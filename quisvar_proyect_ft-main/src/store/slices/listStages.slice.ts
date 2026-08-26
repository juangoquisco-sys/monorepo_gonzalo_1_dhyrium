import { createSlice } from '@reduxjs/toolkit';
import type { Dispatch, PayloadAction } from '@reduxjs/toolkit';
import type { Stage } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';

type State = Stage[] | null;
const initialState = null as State;

const listStageSlice = createSlice({
  name: 'list_stages',
  initialState,
  reducers: {
    setListStage: (_state, action: PayloadAction<State>) => action.payload,
  },
});

export const { setListStage } = listStageSlice.actions;
export default listStageSlice.reducer;

export const getListStage =
  () => (dispatch: Dispatch<PayloadAction<State>>) => {
    axiosInstance
      .get('/stages')
      .then(res => dispatch(setListStage(res.data)))
      .catch(() => dispatch(setListStage(initialState)));
  };
