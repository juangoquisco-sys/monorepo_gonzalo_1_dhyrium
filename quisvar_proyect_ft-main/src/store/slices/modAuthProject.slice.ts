import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const initialState = false;

const istModAuthProjectSlice = createSlice({
  name: 'isAuthorizeProjectdMod',
  initialState,
  reducers: {
    setModAuthProject: (_state, action: PayloadAction<boolean>) =>
      action.payload,
  },
});

export const { setModAuthProject } = istModAuthProjectSlice.actions;
export default istModAuthProjectSlice.reducer;
