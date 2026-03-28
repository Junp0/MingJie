import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AssetGroupsModule } from './asset-groups/asset-groups.module';
import { DataAssetsModule } from './data-assets/data-assets.module';
import { ImportTasksModule } from './import-tasks/import-tasks.module';
import { ClassificationTasksModule } from './classification-tasks/classification-tasks.module';
import { ClassificationTemplatesModule } from './classification-templates/classification-templates.module';
import { ProtectionFeaturesModule } from './protection-features/protection-features.module';
import { AutoScanModule } from './auto-scan/auto-scan.module';
import { ClassificationTemplateDetailsModule } from './classification-template-details/classification-template-details.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AssetGroupsModule,
    DataAssetsModule,
    ImportTasksModule,
    ClassificationTasksModule,
    ClassificationTemplatesModule,
    ProtectionFeaturesModule,
    AutoScanModule,
    ClassificationTemplateDetailsModule,
  ],
})
export class AppModule {}
