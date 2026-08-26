type Mod = { connect: { id: number } };
/**
 * Interface representing the options for duplicating a task.
 *
 * @interface TaskDuplicateOptions
 * @property {string} [stagePath] - The path to the stage where the task will be duplicated.
 * @property {Mod} [mods] - An array of mods to connect to the duplicated task.
 * @author  Jean Ticona
 */
export interface TaskDuplicateOptions {
  stagePath?: string;
  mods?: Mod;
}
