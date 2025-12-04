import { SUPPORTED_LOCALES } from '../index';

describe('i18n configuration', () => {
  it('should have a default locale', () => {
    expect(SUPPORTED_LOCALES.length).toBeGreaterThan(0);
  });

  it('should have valid locale structures', () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(locale.code).toBeDefined();
      expect(locale.label).toBeDefined(); // verifying new field
      expect(locale.direction).toBeDefined();
      expect(['ltr', 'rtl']).toContain(locale.direction);
    }
  });

  it('should include English as a supported locale', () => {
    const english = SUPPORTED_LOCALES.find((l) => l.code === 'en');
    expect(english).toBeDefined();
    expect(english?.label).toBe('English');
    expect(english?.direction).toBe('ltr');
  });

  it('should include Persian as a supported locale (RTL check)', () => {
    const persian = SUPPORTED_LOCALES.find((l) => l.code === 'fa');
    expect(persian).toBeDefined();
    expect(persian?.label).toBe('فارسی');
    expect(persian?.direction).toBe('rtl');
  });
});
