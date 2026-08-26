import { ControllerFunction } from '@/types/patterns';
import OrgServices from '@/services/org.services';
import { parseQueries } from '@/utils/format.server';
import {
  createOrganizationalUnitSchema,
  moveOrganizationalUnitSchema,
  updateOrganizationalUnitSchema,
} from '@/services/org.schema';

class OrgControllers {
  private static getDateAtEndOfDay(date?: string) {
    if (!date) return new Date();
    const selectedDate = new Date(date);
    selectedDate.setUTCHours(23, 59, 59, 999);
    return selectedDate;
  }

  public static getTree: ControllerFunction = async (req, res) => {
    const { rootId, scope } = parseQueries<{
      rootId?: string;
      scope?: string;
    }>(req.query);
    const query = await OrgServices.getTree(
      rootId,
      scope === 'directory' ? 'directory' : 'all'
    );
    res.status(200).json(query);
  };

  public static createUnit: ControllerFunction = async (req, res) => {
    const query = await OrgServices.createUnit(
      createOrganizationalUnitSchema.parse(req.body)
    );
    res.status(201).json(query);
  };

  public static updateUnit: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await OrgServices.updateUnit(
      id,
      updateOrganizationalUnitSchema.parse(req.body)
    );
    res.status(200).json(query);
  };

  public static deactivateUnit: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await OrgServices.deactivateUnit(id);
    res.status(200).json(query);
  };

  public static moveUnit: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { parentId } = moveOrganizationalUnitSchema.parse(req.body);
    const query = await OrgServices.moveUnit(id, parentId);
    res.status(200).json(query);
  };

  public static getMembers: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const { date } = parseQueries<{ date?: string }>(req.query);
    const query = await OrgServices.getMembers(
      id,
      this.getDateAtEndOfDay(date)
    );
    res.status(200).json(query);
  };

  public static getUserUnits: ControllerFunction = async (req, res) => {
    const { legacyId } = req.params;
    const { date } = parseQueries<{ date?: string }>(req.query);
    const query = await OrgServices.getUserUnits(
      +legacyId,
      date ? new Date(date) : new Date()
    );
    res.status(200).json(query);
  };

  public static getActiveUsers: ControllerFunction = async (req, res) => {
    const { date } = parseQueries<{ date?: string }>(req.query);
    const query = await OrgServices.getActiveUsers(
      date ? new Date(date) : new Date()
    );
    res.status(200).json(query);
  };

  public static createMembership: ControllerFunction = async (req, res) => {
    const query = await OrgServices.createMembership(req.body);
    res.status(201).json(query);
  };

  public static updateMembership: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await OrgServices.updateMembership(id, req.body);
    res.status(200).json(query);
  };

  public static terminateMembership: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const endDate = req.body?.endDate ? new Date(req.body.endDate) : new Date();
    const query = await OrgServices.terminateMembership(id, endDate);
    res.status(200).json(query);
  };

  public static deleteMembership: ControllerFunction = async (req, res) => {
    const { id } = req.params;
    const query = await OrgServices.terminateMembership(id);
    res.status(200).json(query);
  };
}

export default OrgControllers;
