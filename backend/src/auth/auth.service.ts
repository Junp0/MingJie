import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuditLogCategory, AuditLogResult, CommonStatus, UserRole } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async seedDefaultUsers() {
    const users = [
      {
        username: 'admin',
        passwordHash: 'ant.design',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      },
      {
        username: 'user',
        passwordHash: 'ant.design',
        name: 'Normal User',
        email: 'user@example.com',
        role: UserRole.USER,
      },
    ];

    for (const user of users) {
      await this.prisma.user.upsert({
        where: { username: user.username },
        update: {},
        create: {
          ...user,
          status: CommonStatus.ACTIVE,
        },
      });
    }
  }

  async login(payload: LoginDto) {
    if (payload.type === 'mobile') {
      const user = await this.prisma.user.findFirst({
        where: { role: UserRole.ADMIN, status: CommonStatus.ACTIVE },
      });

      await this.auditLogsService.record({
        category: AuditLogCategory.AUTH,
        action: '登录',
        result: AuditLogResult.SUCCESS,
        actorId: user?.id,
        actorName: user?.name ?? '移动端用户',
        targetType: 'auth',
        targetId: user?.id,
        targetName: payload.username ?? 'mobile',
        detail: '移动端登录成功',
        metadata: { loginType: payload.type },
      });

      return {
        status: 'ok',
        type: payload.type,
        currentAuthority: user?.role === UserRole.ADMIN ? 'admin' : 'user',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { username: payload.username },
    });

    if (!user || user.passwordHash !== payload.password) {
      await this.auditLogsService.record({
        category: AuditLogCategory.AUTH,
        action: '登录',
        result: AuditLogResult.FAILED,
        actorName: payload.username ?? '未知用户',
        targetType: 'auth',
        targetName: payload.username ?? 'unknown',
        detail: '用户名或密码错误',
        metadata: { loginType: payload.type },
      });

      throw new UnauthorizedException({
        status: 'error',
        type: payload.type,
        currentAuthority: 'guest',
      });
    }

    await this.auditLogsService.record({
      category: AuditLogCategory.AUTH,
      action: '登录',
      result: AuditLogResult.SUCCESS,
      actorId: user.id,
      actorName: user.name,
      targetType: 'auth',
      targetId: user.id,
      targetName: user.username,
      detail: '账号密码登录成功',
      metadata: { loginType: payload.type, role: user.role },
    });

    return {
      status: 'ok',
      type: payload.type,
      currentAuthority: user.role === UserRole.ADMIN ? 'admin' : 'user',
    };
  }

  async currentUser() {
    const user = await this.prisma.user.findUnique({ where: { username: 'admin' } });

    return {
      success: true,
      data: {
        name: user?.name,
        avatar: user?.avatar ?? 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
        userid: user?.id,
        email: user?.email,
        signature: user?.signature ?? '数据治理平台管理员',
        title: user?.title ?? '管理员',
        group: user?.department ?? '数据治理中心',
        tags: [
          { key: '0', label: '数据治理' },
          { key: '1', label: '平台管理员' },
        ],
        notifyCount: 2,
        unreadCount: 1,
        country: 'China',
        access: user?.role === UserRole.ADMIN ? 'admin' : 'user',
        geographic: {
          province: { label: '广东省', key: '440000' },
          city: { label: '深圳市', key: '440300' },
        },
        address: 'Nanshan District',
        phone: user?.phone ?? '13800138000',
      },
    };
  }

  logout() {
    return { success: true, data: {} };
  }

  getCaptcha() {
    return 'captcha-xxx';
  }
}
