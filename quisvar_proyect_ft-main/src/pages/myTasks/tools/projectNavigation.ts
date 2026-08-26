export const handleProjectNavigate = (
  projectId: number,
  stageId: number,
  taskId?: number
) => {
  const url = `${
    window.location.origin
  }/#/especialidades/proyecto/${projectId}/etapa/${stageId}/presupuestos${
    taskId ? `/tarea/${taskId}` : ''
  }`;
  window.open(url, '_blank', 'noopener,noreferrer');
};
