import type { UserType } from '@/middlewares/auth.middleware';
import MeetingPermissionService from '@/services/meetingPermission.services';

// Temporary policy until configurable capabilities are available. See the Resources Basics blueprint.
export const BASIC_RESOURCE_MANAGER_UNIT_ID =
  'cbed8e6b-143d-4dd8-b45d-33ca08a0b118';
export const BASIC_RESOURCE_MANAGER_USER_IDS: readonly number[] = [];

export const isBasicResourceManager = async (actor: UserType) => {
  if (MeetingPermissionService.hasModuleRole(actor, ['MOD'])) return true;
  if (BASIC_RESOURCE_MANAGER_USER_IDS.includes(actor.id)) return true;
  return MeetingPermissionService.isUnitMember(
    actor.id,
    BASIC_RESOURCE_MANAGER_UNIT_ID
  );
};
