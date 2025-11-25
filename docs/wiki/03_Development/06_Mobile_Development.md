# Mobile Development (React Native / Expo)

## Overview

The mobile app (`apps/mobile`) is built with **Expo** (Managed Workflow) and **React Native**. It shares business logic concepts with the desktop app but implements them in TypeScript/JavaScript due to platform constraints.

## Environment Setup

1.  **Install Expo CLI:**
    ```bash
    npm install -g expo-cli
    ```
2.  **Install Dependencies:**
    ```bash
    cd apps/mobile
    pnpm install
    ```

## Running the App

- **iOS Simulator:** `pnpm ios` (Requires Xcode)
- **Android Emulator:** `pnpm android` (Requires Android Studio)
- **Physical Device:** `pnpm start` -> Scan QR with Expo Go app.

## Key Libraries

- **`expo-sqlite`:** Local database. Mirrors `core-rs` schema.
- **`expo-crypto`:** ECDH and Hashing for Sync.
- **`react-native-tcp-socket`:** TCP Transport for Sync.
- **`@shopify/flash-list`:** High-performance list rendering (for 1000+ notes).

## Sync Client Implementation

The file `src/lib/sync/sync-client.ts` is the heart of the mobile app. It implements:

1.  **Service Discovery:** Using `react-native-zeroconf` (or Expo equivalent).
2.  **Handshake:** ECDH key exchange manually implemented using `expo-crypto`.
3.  **Protocol:** Binary packet parsing matching `packages/core-rs/src/sync/models.rs`.

## Debugging

- **React Native Debugger:** Press `j` in the terminal to open debugger.
- **Flipper:** Used for network inspection and database viewing.

## Deployment

We use **EAS Build** (Expo Application Services).

- `eas build -p android --profile preview`
- `eas build -p ios --profile preview`
