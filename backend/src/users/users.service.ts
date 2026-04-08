import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogCategory, AuditLogResult, CommonStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(params?: {
    current?: number;
    pageSize?: number;
    keyword?: string;
    roleId?: string;
    status?: CommonStatus;
  }) {
    const { current = 1, pageSize = 20, keyword, roleId, status } = params ?? {};
    const where: Record<string, unknown> = {};

    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { name: { contains: keyword } },
        { email: { contains: keyword } },
        { phone: { contains: keyword } },
      ];
    }
    if (roleId) where.roleId = roleId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: { select: { id: true, name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    const safeItems = items.map(({ passwordHash: _, ...rest }) => rest);

    return { items: safeItems, total, current, pageSize };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true, code: true } } },
    });
    if (!user) throw new NotFoundException('用户不存在');
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      include: { role: true },
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) throw new BadRequestException('用户名已存在');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        roleId: dto.roleId || null,
        title: dto.title,
        department: dto.department,
        status: CommonStatus.ACTIVE,
      },
      include: { role: { select: { id: true, name: true, code: true } } },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.USER_MANAGEMENT,
      action: '创建用户',
      result: AuditLogResult.SUCCESS,
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
      detail: `创建用户: ${user.username} (${user.name})`,
    });

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async update(id: string, dto: UpdateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('用户不存在');

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        roleId: dto.roleId,
        title: dto.title,
        department: dto.department,
        status: dto.status,
        avatar: dto.avatar,
      },
      include: { role: { select: { id: true, name: true, code: true } } },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.USER_MANAGEMENT,
      action: '更新用户',
      result: AuditLogResult.SUCCESS,
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
      detail: `更新用户: ${user.username}`,
    });

    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async remove(id: string) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('用户不存在');
    if (existing.username === 'admin')
      throw new BadRequestException('不能删除管理员账户');

    await this.prisma.user.update({
      where: { id },
      data: { status: CommonStatus.INACTIVE },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.USER_MANAGEMENT,
      action: '禁用用户',
      result: AuditLogResult.SUCCESS,
      targetType: 'user',
      targetId: id,
      targetName: existing.name,
      detail: `禁用用户: ${existing.username}`,
    });

    return { success: true };
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('用户不存在');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.auditLogsService.record({
      category: AuditLogCategory.USER_MANAGEMENT,
      action: '重置密码',
      result: AuditLogResult.SUCCESS,
      targetType: 'user',
      targetId: id,
      targetName: existing.name,
      detail: `重置用户密码: ${existing.username}`,
    });

    return { success: true };
  }
}
