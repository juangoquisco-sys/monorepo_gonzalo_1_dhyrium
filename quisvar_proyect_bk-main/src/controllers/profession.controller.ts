import { ControllerFunction } from '@/types/patterns';
import ProfessionService from '@/services/profession.services';

export class ProfessionController {
  getAll: ControllerFunction = async (_req, res) => {
    const result = ProfessionService.professions;
    res.status(200).json(result);
  };

  create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const result = ProfessionService.create(body);
    res.status(200).json(result);
  };

  delete: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const result = ProfessionService.delete(id);
    res.status(200).json(result);
  };

  update: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { abrv, label, amount } = req.body;
    const result = ProfessionService.update({
      abrv,
      label,
      value: id,
      amount,
    });
    res.status(200).json(result);
  };
}
