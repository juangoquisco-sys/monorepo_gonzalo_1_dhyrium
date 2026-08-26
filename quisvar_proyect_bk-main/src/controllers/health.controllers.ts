import { ControllerFunction } from '@/types/patterns';

export const getHealth: ControllerFunction = async (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};
