// TODO: This entire test suite is disabled because it is testing functions
// (encryptCredentials, storeCredentials, retrieveCredentials) that no longer
// exist in the social-security.ts implementation. The implementation has been
// refactored to focus on biometric authentication, and these tests need to be
// rewritten or removed.

describe.skip("SocialSecurity", () => {
  it("is a placeholder", () => {});
});

// import * as SocialSecurity from '../social-security';
// import * as SecureStore from 'expo-secure-store';
// import * as Crypto from 'expo-crypto';

// // Mock Expo modules
// jest.mock('expo-secure-store', () => ({
//   setItemAsync: jest.fn(),
//   getItemAsync: jest.fn(),
//   deleteItemAsync: jest.fn(),
// }));

// jest.mock('expo-local-authentication', () => ({
//   hasHardwareAsync: jest.fn().mockResolvedValue(true),
//   isEnrolledAsync: jest.fn().mockResolvedValue(true),
//   authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
// }));

// jest.mock('expo-crypto', () => ({
//   digestStringAsync: jest.fn().mockResolvedValue('mock-hash'),
//   CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
// }));

// describe('SocialSecurity', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   it('encryptCredentials should return encrypted string', async () => {
//     // Mock implementation details if necessary, or rely on the module's logic
//     // Assuming the module uses a deterministic mock or simple logic for tests
//     const creds = { token: '123', secret: 'abc' };

//     // Since we can't easily mock the actual encryption implementation without
//     // a complex setup, we'll verify it calls the underlying storage/crypto
//     // or returns a string that looks encrypted.

//     // Note: If the actual implementation relies on native modules that are hard to mock
//     // perfectly in Jest, we often verify the flow.

//     // For this test, we assume standard mocks allow function execution.
//     try {
//       const result = await SocialSecurity.encryptCredentials(creds);
//       expect(typeof result).toBe('string');
//       expect(result.length).toBeGreaterThan(0);
//     } catch (e) {
//       // If implementation is strictly native, we might need to skip or adjust mocks
//       console.log('Encryption test requires deeper native mocking');
//     }
//   });

//   it('storeCredentials should save to SecureStore', async () => {
//     const accountId = 'acc_123';
//     const creds = { token: 'test' };

//     // Mock internal encrypt call if exported, otherwise we test the public API
//     await SocialSecurity.storeCredentials(accountId, creds);

//     expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
//       expect.stringContaining(accountId),
//       expect.any(String)
//     );
//   });

//   it('retrieveCredentials should get from SecureStore', async () => {
//     const accountId = 'acc_123';
//     (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
//       JSON.stringify({ iv: 'test', data: 'test' })
//     );

//     try {
//       await SocialSecurity.retrieveCredentials(accountId);
//       expect(SecureStore.getItemAsync).toHaveBeenCalled();
//     } catch (e) {
//       // Decryption might fail with mocks, but we verified retrieval attempt
//       expect(SecureStore.getItemAsync).toHaveBeenCalled();
//     }
//   });
// });
