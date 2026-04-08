import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppInitializationService } from './app-initialization.service';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AssetGroupsModule } from './asset-groups/asset-groups.module';
import { DataAssetsModule } from './data-assets/data-assets.module';
import { ImportTasksModule } from './import-tasks/import-tasks.module';
import { ClassificationTasksModule } from './classification-tasks/classification-tasks.module';
import { ClassificationTemplatesModule } from './classification-templates/classification-templates.module';
import { ProtectionFeaturesModule } from './protection-features/protection-features.module';
import { AutoScanModule } from './auto-scan/auto-scan.module';
import { ClassificationTemplateDetailsModule } from './classification-template-details/classification-template-details.module';
import { DataOverviewModule } from './data-overview/data-overview.module';
import { TaskSchedulerService } from './task-scheduler/task-scheduler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuditLogsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AssetGroupsModule,
    DataAssetsModule,
    ImportTasksModule,
    ClassificationTasksModule,
    ClassificationTemplatesModule,
    ProtectionFeaturesModule,
    AutoScanModule,
    ClassificationTemplateDetailsModule,
    DataOverviewModule,
  ],
  providers: [
    AppInitializationService,
    TaskSchedulerService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
