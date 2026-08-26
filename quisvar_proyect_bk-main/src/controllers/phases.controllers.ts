import { ControllerFunction } from '@/types/patterns';
import PhasesServices from '@/services/phases.services';
import { parseQueries } from '@/utils/format.server';
import AppError from '@/utils/appError';

class PhasesControllers {
  public static getAll: ControllerFunction = async (req, res) => {
    const query = parseQueries<{ currentYear?: string }>(req.query);
    const phases = await PhasesServices.getAll(query);
    res.status(200).json(phases);
  };

  public static create: ControllerFunction = async (req, res) => {
    const { initialDate, untilDate } = req.body;
    if (isNaN(new Date(initialDate).getTime()))
      throw new AppError('Fecha inicial invalida', 400);
    if (isNaN(new Date(untilDate).getTime()))
      throw new AppError('Fecha final invalida', 400);
    const data = {
      initialDate: new Date(initialDate),
      untilDate: new Date(untilDate),
    };
    const phase = await PhasesServices.create(data);
    res.status(201).json(phase);
  };

  public static update: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { initialDate, untilDate } = req.body;
    if (isNaN(new Date(initialDate).getTime()))
      throw new AppError('Fecha inicial invalida', 400);
    if (isNaN(new Date(untilDate).getTime()))
      throw new AppError('Fecha final invalida', 400);
    const data = {
      initialDate: new Date(initialDate),
      untilDate: new Date(untilDate),
    };
    const phase = await PhasesServices.update(+id, data);
    res.status(200).json(phase);
  };

  public static remove: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const phase = await PhasesServices.remove(+id);
    res.status(200).json(phase);
  };
}

export default PhasesControllers;
