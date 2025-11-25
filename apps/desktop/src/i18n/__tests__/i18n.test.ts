import { translations, SUPPORTED_LOCALES, useI18n, t } from '../index';

describe('i18n System', () => {
  describe('translations', () => {
    it('should have all supported locales', () => {
      const locales = Object.keys(translations);
      expect(locales).toContain('en');
      expect(locales).toContain('es');
      expect(locales).toContain('fr');
      expect(locales).toContain('de');
      expect(locales).toContain('ja');
      expect(locales).toContain('zh');
      expect(locales).toContain('fa');
    });

    it('should have consistent keys across all locales', () => {
      const enKeys = Object.keys(translations.en);
      
      Object.entries(translations).forEach(([locale, trans]) => {
        const keys = Object.keys(trans);
        expect(keys.length).toBe(enKeys.length);
        enKeys.forEach(key => {
          expect(keys).toContain(key);
        });
      });
    });

    it('should have non-empty values for all keys', () => {
      Object.entries(translations).forEach(([locale, trans]) => {
        Object.entries(trans).forEach(([key, value]) => {
          expect(value).toBeTruthy();
          expect(typeof value).toBe('string');
          expect(value.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('SUPPORTED_LOCALES', () => {
    it('should have 7 supported locales', () => {
      expect(SUPPORTED_LOCALES.length).toBe(7);
    });

    it('should have correct structure for each locale', () => {
      SUPPORTED_LOCALES.forEach(locale => {
        expect(locale).toHaveProperty('code');
        expect(locale).toHaveProperty('name');
        expect(locale).toHaveProperty('nativeName');
        expect(locale).toHaveProperty('direction');
        expect(['ltr', 'rtl']).toContain(locale.direction);
      });
    });

    it('should have Persian as RTL', () => {
      const persian = SUPPORTED_LOCALES.find(l => l.code === 'fa');
      expect(persian).toBeDefined();
      expect(persian?.direction).toBe('rtl');
    });

    it('should have other languages as LTR', () => {
      const ltrLocales = SUPPORTED_LOCALES.filter(l => l.code !== 'fa');
      ltrLocales.forEach(locale => {
        expect(locale.direction).toBe('ltr');
      });
    });
  });

  describe('translation categories', () => {
    it('should have common translations', () => {
      expect(translations.en['common.save']).toBe('Save');
      expect(translations.en['common.cancel']).toBe('Cancel');
      expect(translations.en['common.delete']).toBe('Delete');
    });

    it('should have navigation translations', () => {
      expect(translations.en['nav.dashboard']).toBe('Dashboard');
      expect(translations.en['nav.notes']).toBe('Notes');
      expect(translations.en['nav.tasks']).toBe('Tasks');
    });

    it('should have settings translations', () => {
      expect(translations.en['settings.title']).toBe('Settings');
      expect(translations.en['settings.theme']).toBe('Theme');
      expect(translations.en['settings.language']).toBe('Language');
    });

    it('should have AI translations', () => {
      expect(translations.en['ai.title']).toBe('AI Assistant');
      expect(translations.en['ai.localModel']).toBe('Local Model');
      expect(translations.en['ai.cloudModel']).toBe('Cloud Model');
    });
  });

  describe('translation quality', () => {
    it('should have Spanish translations', () => {
      expect(translations.es['common.save']).toBe('Guardar');
      expect(translations.es['nav.dashboard']).toBe('Panel');
    });

    it('should have French translations', () => {
      expect(translations.fr['common.save']).toBe('Enregistrer');
      expect(translations.fr['nav.dashboard']).toBe('Tableau de bord');
    });

    it('should have German translations', () => {
      expect(translations.de['common.save']).toBe('Speichern');
      expect(translations.de['nav.dashboard']).toBe('Dashboard');
    });

    it('should have Japanese translations', () => {
      expect(translations.ja['common.save']).toBe('保存');
      expect(translations.ja['nav.dashboard']).toBe('ダッシュボード');
    });

    it('should have Chinese translations', () => {
      expect(translations.zh['common.save']).toBe('保存');
      expect(translations.zh['nav.dashboard']).toBe('仪表盘');
    });

    it('should have Persian translations', () => {
      expect(translations.fa['common.save']).toBe('ذخیره');
      expect(translations.fa['nav.dashboard']).toBe('داشبورد');
    });
  });
});

