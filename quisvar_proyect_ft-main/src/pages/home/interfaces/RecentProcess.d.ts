interface RecentProject {
  visitedAt: string;
  stageName: string;
  stageId: number;
  projectName: string;
  projectId: number;
  cui: number;
}
interface RecentTask extends Omit<RecentProject, 'cui'> {
  name: string;
  id: number;
  item: string;
  levelName: string;
  levelId: number;
  levelItem: string;
}
