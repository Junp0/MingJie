import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditLogCategory, AuditLogResult, CommonStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly jwtService: JwtService,
  ) {}

  async seedDefaultUsers() {
    const superAdminRole = await this.prisma.role.findUnique({
      where: { code: 'super_admin' },
    });
    const viewerRole = await this.prisma.role.findUnique({
      where: { code: 'viewer' },
    });

    const users = [
      {
        username: 'admin',
        passwordHash: await bcrypt.hash('ant.design', 10),
        name: 'Admin User',
        email: 'admin@example.com',
        roleId: superAdminRole?.id ?? null,
      },
      {
        username: 'user',
        passwordHash: await bcrypt.hash('ant.design', 10),
        name: 'Normal User',
        email: 'user@example.com',
        roleId: viewerRole?.id ?? null,
      },
    ];

    for (const user of users) {
      const existing = await this.prisma.user.findUnique({
        where: { username: user.username },
      });
      if (existing) {
        // Update roleId for existing users if not set
        if (!existing.roleId && user.roleId) {
          await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              roleId: user.roleId,
              passwordHash: user.passwordHash,
            },
          });
        }
      } else {
        await this.prisma.user.create({
          data: {
            ...user,
            status: CommonStatus.ACTIVE,
          },
        });
      }
    }
  }

  async login(payload: LoginDto) {
    if (payload.type === 'mobile') {
      const user = await this.prisma.user.findFirst({
        where: { status: CommonStatus.ACTIVE },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
      });

      const token = user
        ? this.jwtService.sign({ sub: user.id, username: user.username })
        : null;

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
        token,
        currentAuthority:
          (user?.role?.permissions as string[])?.includes('system:admin')
            ? 'admin'
            : 'user',
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { username: payload.username },
      include: { role: true },
    });

    if (!user) {
      await this.recordFailedLogin(payload.username ?? '未知用户', payload.type);
      throw new UnauthorizedException({
        status: 'error',
        type: payload.type,
        currentAuthority: 'guest',
      });
    }

    // Support both bcrypt hashed and legacy plain-text passwords
    let passwordValid = false;
    if (user.passwordHash.startsWith('$2')) {
      passwordValid = await bcrypt.compare(
        payload.password ?? '',
        user.passwordHash,
      );
    } else {
      passwordValid = user.passwordHash === payload.password;
      // Migrate to bcrypt if plain-text matches
      if (passwordValid) {
        const hashed = await bcrypt.hash(payload.password!, 10);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashed },
        });
      }
    }

    if (!passwordValid) {
      await this.recordFailedLogin(payload.username ?? '未知用户', payload.type);
      throw new UnauthorizedException({
        status: 'error',
        type: payload.type,
        currentAuthority: 'guest',
      });
    }

    if (user.status !== CommonStatus.ACTIVE) {
      throw new UnauthorizedException({
        status: 'error',
        type: payload.type,
        message: '账户已被禁用',
        currentAuthority: 'guest',
      });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

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
      metadata: { loginType: payload.type, role: user.role?.name },
    });

    return {
      status: 'ok',
      type: payload.type,
      token,
      currentAuthority:
        (user.role?.permissions as string[])?.includes('system:admin')
          ? 'admin'
          : 'user',
    };
  }

  async currentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const permissions = (user.role?.permissions as string[]) ?? [];

    return {
      success: true,
      data: {
        name: user.name,
        avatar:
          user.avatar ??
          'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
        userid: user.id,
        email: user.email,
        signature: user.signature ?? '数据治理平台用户',
        title: user.title ?? '',
        group: user.department ?? '',
        tags: [],
        notifyCount: 0,
        unreadCount: 0,
        country: 'China',
        access: permissions.includes('system:admin') ? 'admin' : 'user',
        role: user.role
          ? { id: user.role.id, name: user.role.name, code: user.role.code }
          : null,
        permissions,
        geographic: {
          province: { label: '广东省', key: '440000' },
          city: { label: '深圳市', key: '440300' },
        },
        address: '',
        phone: user.phone ?? '',
      },
    };
  }

  logout() {
    return { success: true, data: {} };
  }

  getCaptcha() {
    return 'captcha-xxx';
  }

  private async recordFailedLogin(username: string, type: string) {
    await this.auditLogsService.record({
      category: AuditLogCategory.AUTH,
      action: '登录',
      result: AuditLogResult.FAILED,
      actorName: username,
      targetType: 'auth',
      targetName: username,
      detail: '用户名或密码错误',
      metadata: { loginType: type },
    });
  }
}
