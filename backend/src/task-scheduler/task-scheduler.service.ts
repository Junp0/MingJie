import { Injectable, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import {
  ClassificationTaskStatus,
  ImportTaskStatus,
  ScanTaskStatus,
} from '@prisma/client';
import { AutoScanService } from '../auto-scan/auto-scan.service';
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
    private readonly autoScanService: AutoScanService,
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
        if (task.status !== ClassificationTaskStatus.PENDING) {
          continue;
        }

        await this.classificationTasksService.executeNow(task.id);
      }

      // Poll auto-scan rules
      await this.pollAutoScanRules();
    } catch (error) {
      console.error('Failed to poll due tasks', error);
    } finally {
      this.polling = false;
    }
  }

  /**
   * Check enabled auto-scan rules and trigger scans when due.
   *
   * Schedule logic based on description (scheduleLabel):
   *   "每天 HH:mm"       → daily at HH:mm
   *   "每周X HH:mm"      → weekly on day X at HH:mm
   *   "每月 Dd日 HH:mm"  → monthly on day D at HH:mm
   *
   * cronExpression stores firstScanTime — scans only start after that time.
   * lastScannedAt is checked to avoid re-triggering within the same period.
   */
  private async pollAutoScanRules() {
    const rules = await this.prisma.autoScanRule.findMany({
      where: {
        status: ScanTaskStatus.RUNNING,
        OR: [
          { scanProgress: null },
          { scanProgress: 100 },
          { scanProgress: -1 },
        ],
      },
    });

    const now = new Date();

    for (const rule of rules) {
      if (this.isAutoScanDue(rule, now)) {
        this.autoScanService.executeScan(rule.id).catch((err) => {
          console.error(`Auto-scan rule ${rule.id} failed:`, err);
        });
      }
    }
  }

  private isAutoScanDue(
    rule: {
      cronExpression: string | null;
      description: string | null;
      lastScannedAt: Date | null;
    },
    now: Date,
  ): boolean {
    // Must have passed the first scan time
    if (rule.cronExpression) {
      const firstScanTime = new Date(rule.cronExpression);
      if (isNaN(firstScanTime.getTime()) || now < firstScanTime) return false;
    }

    const desc = rule.description ?? '';
    const timeMatch = desc.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return false;

    const scheduleHour = Number(timeMatch[1]);
    const scheduleMinute = Number(timeMatch[2]);

    // Convert current UTC time to Beijing time (UTC+8)
    const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
    const beijingNow = new Date(now.getTime() + BEIJING_OFFSET_MS);

    // Build today's scheduled time in Beijing
    const scheduledTodayBeijing = new Date(beijingNow);
    scheduledTodayBeijing.setUTCHours(scheduleHour, scheduleMinute, 0, 0);

    // Check day-of-week for weekly (using Beijing time)
    if (desc.startsWith('每周')) {
      const weekdayMap: Record<string, number> = { '日': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
      const dayMatch = desc.match(/每周([\u4e00-\u9fa5])/);
      if (dayMatch && weekdayMap[dayMatch[1]] !== undefined) {
        if (beijingNow.getUTCDay() !== weekdayMap[dayMatch[1]]) return false;
      }
    }

    // Check day-of-month for monthly (using Beijing time)
    if (desc.startsWith('每月')) {
      const domMatch = desc.match(/(\d+)日/);
      if (domMatch) {
        if (beijingNow.getUTCDate() !== Number(domMatch[1])) return false;
      }
    }

    // Is now within the polling window after scheduled time?
    const diffMs = beijingNow.getTime() - scheduledTodayBeijing.getTime();
    if (diffMs < 0 || diffMs > this.pollIntervalMs * 2) return false;

    // Already scanned in this window? Convert scheduledToday back to UTC for comparison
    const scheduledTodayUtc = new Date(scheduledTodayBeijing.getTime() - BEIJING_OFFSET_MS);
    if (rule.lastScannedAt) {
      const lastScan = new Date(rule.lastScannedAt);
      if (lastScan.getTime() > scheduledTodayUtc.getTime() - 60_000) return false;
    }

    return true;
  }
}
