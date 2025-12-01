declare module '@expo/vector-icons' {
  export const Ionicons: any;
  export const MaterialCommunityIcons: any;
  export const FontAwesome: any;
}

declare module 'expo-font' {
  export function loadAsync(fonts: any): Promise<void>;
  export function isLoaded(fontName: string): boolean;
  export function useFonts(map: any): [boolean, Error | null];
}

declare module 'expo-splash-screen' {
  export function preventAutoHideAsync(): Promise<boolean>;
  export function hideAsync(): Promise<boolean>;
}

declare module 'expo-linking' {
  export function createURL(path: string, options?: any): string;
  export function openURL(url: string): Promise<boolean>;
  export function canOpenURL(url: string): Promise<boolean>;
  export function getInitialURL(): Promise<string | null>;
  export function addEventListener(type: string, handler: (event: any) => void): { remove: () => void };
}

declare module 'expo-constants' {
  const Constants: {
    manifest: any;
    [key: string]: any;
  };
  export default Constants;
}

declare module 'react-native-zeroconf' {
  export default class Zeroconf {
    scan(type: string, protocol: string, domain: string): void;
    stop(): void;
    on(event: string, callback: (data: any) => void): void;
    removeDeviceListeners(): void;
    getServices(): any;
  }
}
