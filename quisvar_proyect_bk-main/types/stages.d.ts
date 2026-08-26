import { Stages } from '@prisma/client';
import { PaginationOptions } from '@/types/types';

/**
 * @interface StagesParams
 * @description - Interface for handling pagination options and additional parameters
 * for filtering stages by projectId and search.
 * @summary - all properties are optional
 * @author `Jean Ticona`
 */
export interface StagesParams extends PaginationOptions {
  projectId?: number;
  search?: string;
}

/**
 * @interface StageForm
 * @description - Interface for handling the parameters required to create a stage.
 * @summary Only two properties are required: `name` and `projectId`.
 * @author `Jean Ticona`
 */
export type StageForm = Pick<Stages, 'name' | 'projectId'>;

/**
 * @interface DuplicateStageParams
 * @description - Interface for handling the parameters required to duplicate a stage.
 * @summary - The `name` property is optional and it will be used if the new stage name is different from the original one.
 * The `stageId` property is required and it represents the ID of the stage to be duplicated.
 * @author `Jean Ticona`
 */
export interface DuplicateStageParams {
  stageId: number;
  name?: string;
}

export enum TypeRoot {
  ID,
  ROOT,
}

export interface StagePricingOption {
  monthlyPrice: Stages['monthlyPrice'];
  stayPrice: Stages['stayPrice'];
}
