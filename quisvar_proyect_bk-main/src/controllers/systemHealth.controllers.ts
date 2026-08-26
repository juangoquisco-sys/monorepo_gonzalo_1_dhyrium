import { ControllerFunction } from '@/types/patterns';
import SystemHealthServices from '@/services/systemHealth.services';

export const getSystemHealth: ControllerFunction = async (_req, res) => {
  const health = await SystemHealthServices.getHealth();
  res.status(200).json(health);
};
