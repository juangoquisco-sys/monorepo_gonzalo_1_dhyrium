import { ControllerFunction } from '@/types/patterns';
import DivisionServices from '@/services/division.services';

class DivisionControllers {
  public create: ControllerFunction = async (req, res) => {
    const { body } = req;
    const query = await DivisionServices.create(body);
    res.status(201).json(query);
  };
  public getAll: ControllerFunction = async (req, res) => {
    const query = await DivisionServices.getAll();
    res.status(200).json(query);
  };
  public getLeader: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await DivisionServices.getLeader(+id);
    res.status(200).json(query);
  };
  public makeLeader: ControllerFunction = async (req, res) => {
    const { id, leaderId } = req.params;
    const query = await DivisionServices.makeLeader(+id, +leaderId);
    res.status(200).json(query);
  };
  public deleteLeader: ControllerFunction = async (req, res) => {
    const { id, leaderId } = req.params;
    const query = await DivisionServices.deleteLeader(+id, +leaderId);
    res.status(200).json(query);
  };
  public getDivisions: ControllerFunction = async (req, res) => {
    const query = await DivisionServices.getDivisions();
    res.status(200).json(query);
  };
  public edit: ControllerFunction = async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const query = await DivisionServices.edit(+id, body);
    res.status(200).json(query);
  };
  public delete: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await DivisionServices.delete(+id);
    res.status(200).json(query);
  };
  //--------------RELATION------------------
  public assingDivision: ControllerFunction = async (req, res) => {
    const { divisionId, groupId } = req.params;
    const query = await DivisionServices.assingDivision(+divisionId, +groupId);
    res.status(200).json(query);
  };
  public deleteDivision: ControllerFunction = async (req, res) => {
    const { divisionId, groupId } = req.params;
    const query = await DivisionServices.deleteDivision(+divisionId, +groupId);
    res.status(200).json(query);
  };
  /* -------------------------------- PROYECTS -------------------------------- */
  public getProjects: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await DivisionServices.getProjects(+id);
    res.status(200).json(query);
  };
}
export default new DivisionControllers();
