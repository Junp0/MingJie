import { Injectable } from '@nestjs/common';
import { AuditLogCategory, AuditLogResult, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

type RecordAuditLogInput = {
  category: AuditLogCategory;
  action: string;
  result?: AuditLogResult;
  actorId?: string | null;
  actorName?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  detail?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        category: input.category,
        action: input.action,
        result: input.result ?? AuditLogResult.INFO,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetName: input.targetName ?? null,
        detail: input.detail ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  }

  async findAll(query: ListAuditLogsDto) {
    const current = query.current ?? 1;
    const pageSize = query.pageSize ?? 20;
    const keyword = query.keyword?.trim();

    const where: Prisma.AuditLogWhereInput = {
      category: query.category,
      result: query.result,
      ...(keyword
        ? {
            OR: [
              { action: { contains: keyword } },
              { actorName: { contains: keyword } },
              { targetName: { contains: keyword } },
              { detail: { contains: keyword } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      current,
      pageSize,
    };
  }
}
