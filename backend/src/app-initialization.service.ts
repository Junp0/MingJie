import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AssetGroupsService } from './asset-groups/asset-groups.service';
import { AuthService } from './auth/auth.service';
import { ClassificationTemplatesService } from './classification-templates/classification-templates.service';
import { PrismaService } from './prisma/prisma.service';
import { ProtectionFeaturesService } from './protection-features/protection-features.service';

const DEFAULT_BOOTSTRAP_KEY = 'default-demo-v1';

@Injectable()
export class AppInitializationService implements OnApplicationBootstrap {
  private initializationPromise?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly assetGroupsService: AssetGroupsService,
    private readonly classificationTemplatesService: ClassificationTemplatesService,
    private readonly protectionFeaturesService: ProtectionFeaturesService,
  ) {}

  async onApplicationBootstrap() {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeDefaultData();
    }

    await this.initializationPromise;
  }

  private async initializeDefaultData() {
    const bootstrapState = await this.prisma.appBootstrapState.findUnique({
      where: { key: DEFAULT_BOOTSTRAP_KEY },
    });

    if (bootstrapState) {
      return;
    }

    const existingDataCounts = await Promise.all([
      this.prisma.user.count(),
      this.prisma.assetGroup.count(),
      this.prisma.classificationTemplate.count(),
      this.prisma.protectionFeature.count(),
    ]);

    const hasExistingData = existingDataCounts.some((count) => count > 0);

    if (!hasExistingData) {
      await this.authService.seedDefaultUsers();
      await this.assetGroupsService.seed();
      await this.classificationTemplatesService.seed();
      await this.protectionFeaturesService.seed();
    }

    await this.prisma.appBootstrapState.upsert({
      where: { key: DEFAULT_BOOTSTRAP_KEY },
      update: {
        value: hasExistingData ? 'adopted-existing-data' : 'initialized-default-demo-data',
      },
      create: {
        key: DEFAULT_BOOTSTRAP_KEY,
        value: hasExistingData ? 'adopted-existing-data' : 'initialized-default-demo-data',
      },
    });
  }
}
