import { configureStore } from '@reduxjs/toolkit';
import userSession from './slices/userSession.slice';
import modAuthProject from './slices/modAuthProject.slice';
import listStage from './slices/listStages.slice';
import contract from './slices/contract.slice';

const store = configureStore({
  reducer: {
    userSession,
    modAuthProject,
    listStage,
    contract,
  },
});

export default store;
