import cron from 'node-cron';

class TimerCron {
  public cronExpression: string;
  protected options: cron.ScheduleOptions;

  constructor(cronExpression: string, options?: cron.ScheduleOptions) {
    this.cronExpression = cronExpression;
    this.options = options || { timezone: 'America/Bogota' };
  }

  crontimer(schedule: () => void) {
    cron.schedule(this.cronExpression, schedule, this.options);
  }

  async crontimerAsync(schedule: () => Promise<void>) {
    cron.schedule(this.cronExpression, schedule, this.options);
  }
}

export default TimerCron;
