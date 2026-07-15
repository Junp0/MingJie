import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AssetGroupsService } from './asset-groups/asset-groups.service';
import { AuthService } from './auth/auth.service';
import { ClassificationTemplatesService } from './classification-templates/classification-templates.service';
import { PrismaService } from './prisma/prisma.service';
import { ProtectionFeaturesService } from './protection-features/protection-features.service';
import { RolesService } from './roles/roles.service';

const DEFAULT_BOOTSTRAP_KEY = 'default-demo-v1';
const ROLES_BOOTSTRAP_KEY = 'roles-v1';
const CLASSIFICATION_BASELINE_BOOTSTRAP_KEY = 'classification-baseline-v10';
const PROTECTION_FEATURE_CATALOG_BOOTSTRAP_KEY =
  'protection-feature-catalog-v4';

@Injectable()
export class AppInitializationService implements OnApplicationBootstrap {
  private initializationPromise?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly rolesService: RolesService,
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
    // Always ensure roles exist (idempotent upsert)
    await this.rolesService.seedDefaultRoles();
    // Asset groups also need to be repaired when an existing bootstrap marker skips demo seeding.
    await this.assetGroupsService.seed();

    const rolesState = await this.prisma.appBootstrapState.findUnique({
      where: { key: ROLES_BOOTSTRAP_KEY },
    });
    if (!rolesState) {
      // Ensure existing users get assigned roles
      await this.authService.seedDefaultUsers();
      await this.prisma.appBootstrapState.upsert({
        where: { key: ROLES_BOOTSTRAP_KEY },
        update: { value: 'initialized' },
        create: { key: ROLES_BOOTSTRAP_KEY, value: 'initialized' },
      });
    }

    const bootstrapState = await this.prisma.appBootstrapState.findUnique({
      where: { key: DEFAULT_BOOTSTRAP_KEY },
    });

    if (bootstrapState) {
      await this.classificationTemplatesService.seed();
      await Promise.all([
        this.upgradeClassificationBaseline(),
        this.upgradeProtectionFeatureCatalog(),
      ]);
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
      await this.classificationTemplatesService.seed();
      await this.protectionFeaturesService.seed();
    } else {
      await this.classificationTemplatesService.seed();
    }

    await this.prisma.appBootstrapState.upsert({
      where: { key: DEFAULT_BOOTSTRAP_KEY },
      update: {
        value: hasExistingData
          ? 'adopted-existing-data'
          : 'initialized-default-demo-data',
      },
      create: {
        key: DEFAULT_BOOTSTRAP_KEY,
        value: hasExistingData
          ? 'adopted-existing-data'
          : 'initialized-default-demo-data',
      },
    });

    await Promise.all([
      this.upgradeClassificationBaseline(),
      this.upgradeProtectionFeatureCatalog(),
    ]);
  }

  private async upgradeClassificationBaseline() {
    const state = await this.prisma.appBootstrapState.findUnique({
      where: { key: CLASSIFICATION_BASELINE_BOOTSTRAP_KEY },
    });
    if (state) return;

    const upgradedTemplateCount =
      await this.classificationTemplatesService.upgradeBuiltInTemplates();
    await this.prisma.appBootstrapState.upsert({
      where: { key: CLASSIFICATION_BASELINE_BOOTSTRAP_KEY },
      update: { value: `upgraded-${upgradedTemplateCount}-templates` },
      create: {
        key: CLASSIFICATION_BASELINE_BOOTSTRAP_KEY,
        value: `upgraded-${upgradedTemplateCount}-templates`,
      },
    });
  }

  private async upgradeProtectionFeatureCatalog() {
    const state = await this.prisma.appBootstrapState.findUnique({
      where: { key: PROTECTION_FEATURE_CATALOG_BOOTSTRAP_KEY },
    });
    if (state) return;

    const installedFeatureCount =
      await this.protectionFeaturesService.installBuiltInCatalog();
    await this.prisma.appBootstrapState.upsert({
      where: { key: PROTECTION_FEATURE_CATALOG_BOOTSTRAP_KEY },
      update: { value: `installed-${installedFeatureCount}-features` },
      create: {
        key: PROTECTION_FEATURE_CATALOG_BOOTSTRAP_KEY,
        value: `installed-${installedFeatureCount}-features`,
      },
    });
  }
}
