/**
 * Build Configuration for Noteece
 * Optimized for desktop and mobile builds with proper caching
 */

export interface BuildConfig {
  name: string;
  version: string;
  targets: BuildTarget[];
  output: string;
  cache: {
    enabled: boolean;
    directory: string;
    ttl: number; // hours
  };
  optimization: {
    minify: boolean;
    sourceMap: boolean;
    treeshake: boolean;
    splitChunks: boolean;
  };
}

export interface BuildTarget {
  name: string;
  platform: 'desktop' | 'mobile' | 'web';
  os: 'macos' | 'windows' | 'linux' | 'ios' | 'android';
  arch: 'x64' | 'arm64' | 'x86';
  outputFormat: string;
  buildScript: string;
}

const config: BuildConfig = {
  name: 'Noteece',
  version: '1.0.0',

  targets: [
    // Desktop - macOS
    {
      name: 'Desktop macOS (Intel)',
      platform: 'desktop',
      os: 'macos',
      arch: 'x64',
      outputFormat: 'dmg',
      buildScript: 'npm run build:desktop:macos:x64',
    },
    {
      name: 'Desktop macOS (Apple Silicon)',
      platform: 'desktop',
      os: 'macos',
      arch: 'arm64',
      outputFormat: 'dmg',
      buildScript: 'npm run build:desktop:macos:arm64',
    },
    // Desktop - Windows
    {
      name: 'Desktop Windows',
      platform: 'desktop',
      os: 'windows',
      arch: 'x64',
      outputFormat: 'msi',
      buildScript: 'npm run build:desktop:windows',
    },
    // Desktop - Linux
    {
      name: 'Desktop Linux',
      platform: 'desktop',
      os: 'linux',
      arch: 'x64',
      outputFormat: 'AppImage',
      buildScript: 'npm run build:desktop:linux',
    },
    // Mobile - iOS
    {
      name: 'Mobile iOS',
      platform: 'mobile',
      os: 'ios',
      arch: 'arm64',
      outputFormat: 'ipa',
      buildScript: 'npm run build:mobile:ios',
    },
    // Mobile - Android
    {
      name: 'Mobile Android',
      platform: 'mobile',
      os: 'android',
      arch: 'arm64',
      outputFormat: 'apk',
      buildScript: 'npm run build:mobile:android',
    },
  ],

  output: './dist',

  cache: {
    enabled: true,
    directory: '.cache',
    ttl: 24, // 24 hours
  },

  optimization: {
    minify: true,
    sourceMap: false,
    treeshake: true,
    splitChunks: true,
  },
};

export default config;
