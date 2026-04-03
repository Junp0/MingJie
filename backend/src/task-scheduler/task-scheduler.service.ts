import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import {
  ClassificationTaskStatus,
  ImportTaskStatus,
} from '@prisma/client';
import { ClassificationTasksService } from '../classification-tasks/classification-tasks.service';
import { ImportTasksService } from '../import-tasks/import-tasks.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskSchedulerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly pollIntervalMs = 15_000;
  private timer?: NodeJS.Timeout;
  private polling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly importTasksService: ImportTasksService,
    private readonly classificationTasksService: ClassificationTasksService,
  ) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => {
      void this.pollDueTasks();
    }, this.pollIntervalMs);

    void this.pollDueTasks();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async pollDueTasks() {
    if (this.polling) {
      return;
    }

    this.polling = true;

    try {
      const now = new Date();

      const [dueImportTasks, dueClassificationTasks] = await Promise.all([
        this.prisma.importTask.findMany({
          where: {
            executeAt: { lte: now },
            sourceType: 'mysql',
            databaseName: { not: null },
            sourceUsername: { not: null },
            sourcePassword: { not: null },
            status: { in: [ImportTaskStatus.PENDING, ImportTaskStatus.SUCCESS, ImportTaskStatus.FAILED] },
          },
          orderBy: { executeAt: 'asc' },
        }),
        this.prisma.classificationTask.findMany({
          where: {
            executeAt: { lte: now },
            status: {
              in: [
                ClassificationTaskStatus.PENDING,
                ClassificationTaskStatus.COMPLETED,
                ClassificationTaskStatus.FAILED,
              ],
            },
          },
          orderBy: { executeAt: 'asc' },
        }),
      ]);

      for (const task of dueImportTasks) {
        const shouldExecute =
          task.scheduleMode === 'single'
            ? task.status === ImportTaskStatus.PENDING
            : true;

        if (!shouldExecute) {
          continue;
        }

        await this.importTasksService.executeNow(task.id);
      }

      for (const task of dueClassificationTasks) {
        const shouldExecute =
          task.scheduleMode === 'single'
            ? task.status === ClassificationTaskStatus.PENDING
            : true;

        if (!shouldExecute) {
          continue;
        }

        await this.classificationTasksService.executeNow(task.id);
      }
    } catch (error) {
      console.error('Failed to poll due tasks', error);
    } finally {
      this.polling = false;
    }
  }
}
