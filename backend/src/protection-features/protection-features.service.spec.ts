import { ProtectionFeaturesService } from './protection-features.service';
import {
  BUILT_IN_PROTECTION_FEATURES,
  RETIRED_BUILT_IN_MASKING_FEATURE_CODES,
} from './protection-feature-catalog';

describe('ProtectionFeaturesService built-in catalog installation', () => {
  const createService = (existingCodes: string[] = []) => {
    const prisma = {
      protectionFeature: {
        findMany: jest.fn().mockResolvedValue(
          existingCodes.map((featureCode) => ({ featureCode })),
        ),
        createMany: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ count: data.length }),
        ),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'creator-1' }),
      },
    };
    const service = new ProtectionFeaturesService(
      prisma as never,
      {} as never,
    );

    return { prisma, service };
  };

  it('installs only missing features and keeps existing codes untouched', async () => {
    const existingCode = BUILT_IN_PROTECTION_FEATURES[0].featureCode;
    const { prisma, service } = createService([existingCode]);

    await expect(service.installBuiltInCatalog()).resolves.toBe(
      BUILT_IN_PROTECTION_FEATURES.length - 1,
    );
    expect(prisma.protectionFeature.createMany).toHaveBeenCalledTimes(1);

    const createdFeatures = prisma.protectionFeature.createMany.mock.calls[0][0]
      .data as Array<{ featureCode: string; creatorId?: string }>;
    expect(createdFeatures).toHaveLength(BUILT_IN_PROTECTION_FEATURES.length - 1);
    expect(createdFeatures.some((item) => item.featureCode === existingCode)).toBe(
      false,
    );
    expect(createdFeatures.every((item) => item.creatorId === 'creator-1')).toBe(
      true,
    );
    expect(prisma.protectionFeature.deleteMany).toHaveBeenCalledWith({
      where: {
        featureType: 'MASKING',
        featureCode: { in: [...RETIRED_BUILT_IN_MASKING_FEATURE_CODES] },
      },
    });
  });

  it('does not add rows when the complete catalog is already installed', async () => {
    const { prisma, service } = createService(
      BUILT_IN_PROTECTION_FEATURES.map((feature) => feature.featureCode),
    );

    await expect(service.installBuiltInCatalog()).resolves.toBe(0);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.protectionFeature.createMany).not.toHaveBeenCalled();
  });
});
