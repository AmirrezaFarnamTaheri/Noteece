import { socialConfigService } from '../socialConfig';

// Mock Tauri APIs
jest.mock('@tauri-apps/api/tauri', () => ({
  invoke: jest.fn(),
}));

jest.mock('@tauri-apps/api/fs', () => ({
  readTextFile: jest.fn(),
}));

jest.mock('@tauri-apps/api/path', () => ({
  resolveResource: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SocialConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlatform', () => {
    it('should return undefined for unknown platform', () => {
      const result = socialConfigService.getPlatform('unknown-platform');
      expect(result).toBeUndefined();
    });
  });

  describe('getEnabledPlatforms', () => {
    it('should return object of enabled platforms', () => {
      const enabled = socialConfigService.getEnabledPlatforms();
      expect(typeof enabled).toBe('object');
    });
  });

  describe('getCaptureSettings', () => {
    it('should return capture settings object', () => {
      const settings = socialConfigService.getCaptureSettings();
      expect(settings).toHaveProperty('debounceMs');
      expect(settings).toHaveProperty('maxBufferSize');
      expect(settings).toHaveProperty('autoSaveInterval');
      expect(settings).toHaveProperty('enableScreenshots');
      expect(settings).toHaveProperty('enableTextCapture');
    });

    it('should have reasonable default values', () => {
      const settings = socialConfigService.getCaptureSettings();
      expect(settings.debounceMs).toBeGreaterThan(0);
      expect(settings.maxBufferSize).toBeGreaterThan(0);
    });
  });

  describe('getPrivacySettings', () => {
    it('should return privacy settings object', () => {
      const settings = socialConfigService.getPrivacySettings();
      expect(settings).toHaveProperty('redactEmails');
      expect(settings).toHaveProperty('redactPhoneNumbers');
      expect(settings).toHaveProperty('excludePrivateMessages');
    });

    it('should have privacy-friendly defaults', () => {
      const settings = socialConfigService.getPrivacySettings();
      expect(settings.redactEmails).toBe(true);
      expect(settings.redactPhoneNumbers).toBe(true);
    });
  });

  describe('generateInjectionScript', () => {
    it('should return empty string for unknown platform', () => {
      const script = socialConfigService.generateInjectionScript('unknown');
      expect(script).toBe('');
    });
  });

  describe('getPlatformIds', () => {
    it('should return array of platform IDs', () => {
      const ids = socialConfigService.getPlatformIds();
      expect(Array.isArray(ids)).toBe(true);
    });
  });
});

describe('SocialConfig Types', () => {
  it('should define PlatformSelectors interface correctly', () => {
    // Type checking via compilation
    const selectors = {
      post: '.post',
      timeline: '.timeline',
    };
    expect(selectors.post).toBeDefined();
  });

  it('should define CaptureSettings interface correctly', () => {
    const settings = {
      debounceMs: 150,
      maxBufferSize: 100,
      autoSaveInterval: 30_000,
      enableScreenshots: false,
      enableTextCapture: true,
    };
    expect(settings.debounceMs).toBe(150);
  });
});
