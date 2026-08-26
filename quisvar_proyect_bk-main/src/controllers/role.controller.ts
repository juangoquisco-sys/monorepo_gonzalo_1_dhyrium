import { ControllerFunction } from '@/types/patterns';
import RoleService from '@/services/role.service';
import { RoleForMenuPick } from '@/utils/format.server';
import { MenuPoints } from '@/models/menuPoints';

const menuPoints = new MenuPoints();
export class RoleController {
  public showMenus: ControllerFunction = async (req, res) => {
    const result = await RoleService.getAllMenus();
    res.status(200).json(result);
  };
  public showMenusPoints: ControllerFunction = async (req, res) => {
    const result = menuPoints.getMenuPoints();
    res.status(200).json(result);
  };
  public showsForForm: ControllerFunction = async (req, res) => {
    const result = await RoleService.getAllForForm();
    res.status(200).json(result);
  };
  public create: ControllerFunction = async (req, res) => {
    const body: RoleForMenuPick = req.body;
    const query = await RoleService.create(body);
    res.status(201).json(query);
  };
  public update: ControllerFunction = async (req, res, next) => {
    try {
      const { id } = req.params;
      const body: RoleForMenuPick = req.body;
      const query = await RoleService.edit(body, +id);
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public updateHierarchy: ControllerFunction = async (req, res, next) => {
    try {
      const { id, hierarchy } = req.params;
      const query = await RoleService.editHierarchy(+id, +hierarchy);
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public delete: ControllerFunction = async (req, res, next) => {
    try {
      const { id } = req.params;
      const query = await RoleService.delete(+id);
      res.status(200).json(query);
    } catch (error) {
      console.log(error);
      next(error);
    }
  };
  public showMenu: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await RoleService.findGeneral(+id);
    res.status(200).json(query);
  };
  public showMenusGeneral: ControllerFunction = async (req, res) => {
    const query = await RoleService.getAllMenusForAccess();
    res.status(200).json(query);
  };
  public show: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await RoleService.find(+id);
    res.status(200).json(query);
  };
}
