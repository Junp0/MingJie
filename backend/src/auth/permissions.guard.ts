import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const jwtUser = request.user;
    if (!jwtUser?.userId) throw new ForbiddenException('未认证');

    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.userId },
      include: { role: true },
    });

    if (!user || !user.role) throw new ForbiddenException('无权限');

    const userPermissions = (user.role.permissions as string[]) ?? [];
    if (userPermissions.includes('system:admin')) return true;

    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p),
    );
    if (!hasPermission) throw new ForbiddenException('权限不足');

    return true;
  }
}
