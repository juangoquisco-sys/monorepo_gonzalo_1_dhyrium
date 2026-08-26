export type DutyFormStep = 'activity' | 'schedule' | 'participants' | 'review';

export const dutyFormSteps: Array<{
  id: DutyFormStep;
  label: string;
  shortLabel: string;
}> = [
  { id: 'activity', label: 'Actividad', shortLabel: 'Datos básicos' },
  { id: 'schedule', label: 'Programación', shortLabel: 'Calendario' },
  { id: 'participants', label: 'Participantes', shortLabel: 'Lista y orden' },
  { id: 'review', label: 'Revisar y crear', shortLabel: 'Confirmación' },
];
