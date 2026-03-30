import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CommonStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
      throw new UnauthorizedException({
        status: 'error',
        type: payload.type,
        currentAuthority: 'guest',
      });
    }

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
