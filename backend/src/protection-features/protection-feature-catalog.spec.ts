import { ProtectionFeatureType } from '@prisma/client';
import { BUILT_IN_PROTECTION_FEATURES } from './protection-feature-catalog';

describe('built-in protection feature catalog', () => {
  it('contains unique stable feature codes for both feature types', () => {
    const codes = BUILT_IN_PROTECTION_FEATURES.map((feature) => feature.featureCode);

    expect(new Set(codes).size).toBe(codes.length);
    expect(
      BUILT_IN_PROTECTION_FEATURES.some(
        (feature) => feature.featureType === ProtectionFeatureType.MASKING,
      ),
    ).toBe(true);
    expect(
      BUILT_IN_PROTECTION_FEATURES.some(
        (feature) => feature.featureType === ProtectionFeatureType.ENCRYPTION,
      ),
    ).toBe(true);
  });

  it('contains complete, bounded metadata for every feature', () => {
    for (const feature of BUILT_IN_PROTECTION_FEATURES) {
      expect(feature.featureName.trim()).not.toBe('');
      expect(feature.featureCode).toMatch(/^(?:MASK|ENC)_[A-Z0-9_]+$/);
      expect(feature.scene.trim()).not.toBe('');
      expect(feature.featurePoint.trim()).not.toBe('');
      expect(feature.hitRate).toBeGreaterThanOrEqual(0);
      expect(feature.hitRate).toBeLessThanOrEqual(100);
      expect(feature.priority).toBeGreaterThanOrEqual(0);
      expect(feature.description.trim()).not.toBe('');
    }
  });

  it('keeps masking to the two generic symbol formats', () => {
    const maskingFeatures = BUILT_IN_PROTECTION_FEATURES.filter(
      (feature) => feature.featureType === ProtectionFeatureType.MASKING,
    );

    expect(maskingFeatures.map((feature) => feature.featureCode)).toEqual([
      'MASK_ASTERISK',
      'MASK_HASH',
    ]);
  });

  it('covers common database and directory encryption formats', () => {
    const codes = new Set(
      BUILT_IN_PROTECTION_FEATURES.map((feature) => feature.featureCode),
    );
    const requiredCodes = [
      'ENC_PASSWORD_POSTGRES_MD5',
      'ENC_PASSWORD_MYSQL_NATIVE',
      'ENC_PASSWORD_SQL_SERVER',
      'ENC_PASSWORD_LDAP_SSHA',
      'ENC_PEM_LEGACY_PRIVATE_KEY',
      'ENC_TOKEN_JWE',
    ];

    for (const code of requiredCodes) {
      expect(codes).toContain(code);
    }
  });

  it.each([
    ['MASK_ASTERISK', '张*'],
    ['MASK_ASTERISK', '138****1234'],
    ['MASK_ASTERISK', '*'],
    ['MASK_HASH', '订单#1'],
    ['MASK_HASH', '138####1234'],
    ['MASK_HASH', '#'],
  ])('%s covers %s', (featureCode, value) => {
    const feature = BUILT_IN_PROTECTION_FEATURES.find(
      (item) => item.featureCode === featureCode,
    );

    expect(new RegExp(feature!.expression).test(value)).toBe(true);
  });

  it.each([
    ['MASK_ASTERISK', '普通文本'],
    ['MASK_ASTERISK', '订单#1'],
    ['MASK_HASH', '普通文本'],
    ['MASK_HASH', '张*'],
    ['ENC_PASSWORD_POSTGRES_MD5', 'md5-short-value'],
    ['ENC_PASSWORD_MYSQL_NATIVE', '94BDCEBE19083CE2A1F959FD02F964C7AF4CFC29'],
    ['ENC_PEM_PRIVATE_KEY', '-----BEGIN PRIVATE KEY-----\nplain\n-----END PRIVATE KEY-----'],
  ])('%s rejects a representative plain or malformed value', (featureCode, value) => {
    const feature = BUILT_IN_PROTECTION_FEATURES.find(
      (item) => item.featureCode === featureCode,
    );

    expect(feature).toBeDefined();
    expect(new RegExp(feature!.expression, 'i').test(value)).toBe(false);
  });

  it.each(BUILT_IN_PROTECTION_FEATURES)(
    '$featureCode has a valid expression matching its sample',
    (feature) => {
      expect(() => new RegExp(feature.expression, 'i')).not.toThrow();
      expect(new RegExp(feature.expression, 'i').test(feature.sampleValue)).toBe(true);
    },
  );
});
