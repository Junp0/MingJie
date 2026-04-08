import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogCategory, AuditLogResult, CommonStatus } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLES,
  PERMISSION_GROUPS,
} from './permissions.constants';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async seedDefaultRoles() {
    for (const role of DEFAULT_ROLES) {
      await this.prisma.role.upsert({
        where: { code: role.code },
        update: {},
        create: {
          name: role.name,
          code: role.code,
          description: role.description,
          permissions: role.permissions,
          isSystem: role.isSystem,
          status: CommonStatus.ACTIVE,
        },
      });
    }
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return roles.map((r) => ({
      ...r,
      userCount: r._count.users,
      _count: undefined,
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('角色不存在');
    return { ...role, userCount: role._count.users, _count: undefined };
  }

  async create(dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        permissions: dto.permissions,
        status: dto.status ?? CommonStatus.ACTIVE,
      },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.ROLE_MANAGEMENT,
      action: '创建角色',
      result: AuditLogResult.SUCCESS,
      targetType: 'role',
      targetId: role.id,
      targetName: role.name,
      detail: `创建角色: ${role.name} (${role.code})`,
    });

    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('角色不存在');

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        permissions: dto.permissions,
        status: dto.status,
      },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.ROLE_MANAGEMENT,
      action: '更新角色',
      result: AuditLogResult.SUCCESS,
      targetType: 'role',
      targetId: role.id,
      targetName: role.name,
      detail: `更新角色: ${role.name}`,
    });

    return role;
  }

  async remove(id: string) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) throw new NotFoundException('角色不存在');
    if (existing.isSystem)
      throw new BadRequestException('系统内置角色不能删除');
    if (existing._count.users > 0)
      throw new BadRequestException('该角色下存在用户，无法删除');

    await this.prisma.role.delete({ where: { id } });

    await this.auditLogsService.record({
      category: AuditLogCategory.ROLE_MANAGEMENT,
      action: '删除角色',
      result: AuditLogResult.SUCCESS,
      targetType: 'role',
      targetId: id,
      targetName: existing.name,
      detail: `删除角色: ${existing.name} (${existing.code})`,
    });

    return { success: true };
  }

  getPermissions() {
    return {
      groups: PERMISSION_GROUPS,
      permissions: ALL_PERMISSIONS,
    };
  }
}
