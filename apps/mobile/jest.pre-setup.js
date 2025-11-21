import { NativeModules, Linking } from "react-native";

// Mock Linking
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  openURL: jest.fn(() => Promise.resolve(true)),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  sendIntent: jest.fn(),
}));

// Mock crypto
global.crypto = {
  getRandomValues: (buffer) => {
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  },
};

// Mock NativeModules for Expo modules
NativeModules.ExpoCrypto = {
  digestStringAsync: jest.fn(),
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
};

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Mock Expo SQLite
jest.mock("expo-sqlite", () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      callback({
        executeSql: jest.fn((query, params, success, error) => {
          if (success)
            success([], { rows: { length: 0, item: () => null, _array: [] } });
        }),
      });
    }),
  })),
}));

// Mock react-native-zeroconf
jest.mock("react-native-zeroconf", () => {
  return class Zeroconf {
    scan = jest.fn();
    stop = jest.fn();
    removeDeviceListeners = jest.fn();
    on = jest.fn();
    off = jest.fn();
  };
});

// Mock expo-file-system
jest.mock("expo-file-system", () => ({
  documentDirectory: "file:///test/directory/",
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));

// Mock Expo Font
jest.mock("expo-font", () => ({
  isLoaded: jest.fn().mockReturnValue(true),
  loadAsync: jest.fn().mockResolvedValue(true),
}));

// Mock Vector Icons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
  MaterialIcons: "MaterialIcons",
  MaterialCommunityIcons: "MaterialCommunityIcons",
  FontAwesome: "FontAwesome",
}));

// Mock Linear Gradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));

// Mock React Native Gesture Handler
jest.mock("react-native-gesture-handler", () => ({
  Swipeable: "Swipeable",
  DrawerLayout: "DrawerLayout",
  State: {},
  ScrollView: "ScrollView",
  Slider: "Slider",
  Switch: "Switch",
  TextInput: "TextInput",
  ToolbarAndroid: "ToolbarAndroid",
  ViewPagerAndroid: "ViewPagerAndroid",
  DrawerLayoutAndroid: "DrawerLayoutAndroid",
  WebView: "WebView",
  NativeViewGestureHandler: "NativeViewGestureHandler",
  TapGestureHandler: "TapGestureHandler",
  FlingGestureHandler: "FlingGestureHandler",
  ForceTouchGestureHandler: "ForceTouchGestureHandler",
  LongPressGestureHandler: "LongPressGestureHandler",
  PanGestureHandler: "PanGestureHandler",
  PinchGestureHandler: "PinchGestureHandler",
  RotationGestureHandler: "RotationGestureHandler",
  /* Buttons */
  RawButton: "RawButton",
  BaseButton: "BaseButton",
  RectButton: "RectButton",
  BorderlessButton: "BorderlessButton",
  /* Other */
  FlatList: "FlatList",
  gestureHandlerRootHOC: jest.fn(),
  Directions: {},
}));

// Mock Reanimated
jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Task Manager
jest.mock("expo-task-manager", () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn().mockResolvedValue(false),
}));

// Mock Expo Haptics
jest.mock("expo-haptics", () => ({
  NotificationFeedbackType: {
    Success: "success",
    Warning: "warning",
    Error: "error",
  },
  ImpactFeedbackStyle: {
    Light: "light",
    Medium: "medium",
    Heavy: "heavy",
  },
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
}));

// Mock Expo Sharing
jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// Mock Expo Linking
jest.mock("expo-linking", () => ({
  createURL: jest.fn(),
  openURL: jest.fn(),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock React Native Share
jest.mock("react-native/Libraries/Share/Share", () => ({
  share: jest.fn(),
}));

// Mock console.log and console.error to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("iOS App Group access") ||
      args[0].includes("Running in non-browser environment") ||
      args[0].includes("Database initialized") ||
      args[0].includes("Running migration") ||
      args[0].includes("Added") ||
      args[0].includes("Migration"))
  ) {
    return;
  }
  originalConsoleLog(...args);
};

console.error = (...args) => {
  if (
    typeof args[0] === "string" &&
    (args[0].includes("Warning: An update to ForwardRef") ||
      args[0].includes(
        "You are trying to `import` a file after the Jest environment has been torn down",
      ) ||
      args[0].includes("Sync failed: Error: WebSocket connection failed") ||
      args[0].includes("Failed to load timeline: Error: DB Error"))
  ) {
    return;
  }
  originalConsoleError(...args);
};
