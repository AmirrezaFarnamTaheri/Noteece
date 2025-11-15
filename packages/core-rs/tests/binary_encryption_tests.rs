// Binary Data Encryption Tests
// Tests for the critical fix: handling binary data in sync without UTF-8 conversion
// Ensures that arbitrary binary data (including invalid UTF-8) is preserved during encryption/decryption

use core_rs::crypto::{decrypt_bytes, decrypt_string, encrypt_bytes, encrypt_string, generate_dek};

#[test]
fn test_encrypt_decrypt_binary_data() {
    let dek = generate_dek();
    // Binary data with various bytes including nulls and high bytes
    let data = vec![0u8, 1, 2, 255, 254, 128, 42, 0, 0, 255];

    let encrypted = encrypt_bytes(&data, &dek).expect("Encryption should succeed");
    let decrypted = decrypt_bytes(&encrypted, &dek).expect("Decryption should succeed");

    assert_eq!(
        data, decrypted,
        "Decrypted data must match original binary data"
    );
    assert_ne!(
        data, encrypted,
        "Encrypted data should differ from plaintext"
    );
}

#[test]
fn test_encrypt_invalid_utf8_sequence() {
    let dek = generate_dek();
    // Invalid UTF-8 sequence that would be corrupted by from_utf8_lossy()
    let data = vec![0xFF, 0xFE, 0xFD, 0xFC, 0xFB];

    let encrypted = encrypt_bytes(&data, &dek).expect("Encryption should succeed");
    let decrypted = decrypt_bytes(&encrypted, &dek).expect("Decryption should succeed");

    // Critical: Data must be preserved exactly (NOT corrupted like from_utf8_lossy would do)
    assert_eq!(data, decrypted, "Invalid UTF-8 sequence must be preserved");
}

#[test]
fn test_null_bytes_in_binary_data() {
    let dek = generate_dek();
    // Data with null bytes in the middle
    let data = vec![72, 101, 108, 108, 111, 0, 87, 111, 114, 108, 100];

    let encrypted = encrypt_bytes(&data, &dek).expect("Encryption should succeed");
    let decrypted = decrypt_bytes(&encrypted, &dek).expect("Decryption should succeed");

    assert_eq!(data, decrypted, "Null bytes must be preserved");
    assert_eq!(decrypted.len(), 11, "Data length must be preserved");
}

#[test]
fn test_large_binary_payload() {
    let dek = generate_dek();
    // Create a large payload with random bytes
    let mut data = vec![0u8; 10_000];
    for (i, byte) in data.iter_mut().enumerate() {
        *byte = (i as u8).wrapping_mul(7).wrapping_add(13);
    }

    let encrypted = encrypt_bytes(&data, &dek).expect("Encryption should succeed");
    let decrypted = decrypt_bytes(&encrypted, &dek).expect("Decryption should succeed");

    assert_eq!(
        data, decrypted,
        "Large binary payload must be preserved exactly"
    );
}

#[test]
fn test_empty_binary_data() {
    let dek = generate_dek();
    let data = vec![];

    let encrypted = encrypt_bytes(&data, &dek).expect("Encryption should succeed");
    let decrypted = decrypt_bytes(&encrypted, &dek).expect("Decryption should succeed");

    assert_eq!(data, decrypted, "Empty data must be handled correctly");
}

#[test]
fn test_encrypt_bytes_different_nonce_each_time() {
    let dek = generate_dek();
    let data = b"test data";

    let encrypted1 = encrypt_bytes(data, &dek).expect("First encryption should succeed");
    let encrypted2 = encrypt_bytes(data, &dek).expect("Second encryption should succeed");

    // Encrypted values should differ because different nonces are used
    assert_ne!(
        encrypted1, encrypted2,
        "Different calls to encrypt_bytes should produce different ciphertexts (different nonces)"
    );

    // But both should decrypt to the same plaintext
    let decrypted1 = decrypt_bytes(&encrypted1, &dek).expect("First decryption should succeed");
    let decrypted2 = decrypt_bytes(&encrypted2, &dek).expect("Second decryption should succeed");

    assert_eq!(decrypted1, decrypted2);
    assert_eq!(decrypted1, data);
}

#[test]
fn test_decrypt_corrupted_ciphertext_fails() {
    let dek = generate_dek();
    let data = b"test data";

    let mut encrypted = encrypt_bytes(data, &dek).expect("Encryption should succeed");

    // Corrupt the ciphertext (but keep it long enough)
    if encrypted.len() > 30 {
        encrypted[30] ^= 0xFF;
    }

    let result = decrypt_bytes(&encrypted, &dek);
    assert!(result.is_err(), "Decryption of corrupted data should fail");
}

#[test]
fn test_string_encryption_still_works() {
    let dek = generate_dek();
    let plaintext = "Hello, World! 你好世界";

    let encrypted = encrypt_string(plaintext, &dek).expect("String encryption should succeed");
    let decrypted = decrypt_string(&encrypted, &dek).expect("String decryption should succeed");

    assert_eq!(
        plaintext, decrypted,
        "String encryption/decryption must still work"
    );
}

#[test]
fn test_wrong_dek_fails_decryption() {
    let dek1 = generate_dek();
    let dek2 = generate_dek();
    let data = b"secret data";

    let encrypted = encrypt_bytes(data, &dek1).expect("Encryption should succeed");

    // Try to decrypt with wrong DEK
    let result = decrypt_bytes(&encrypted, &dek2);
    assert!(result.is_err(), "Decryption with wrong DEK should fail");
}

#[test]
fn test_invalid_dek_length_fails() {
    let data = b"test data";
    let invalid_dek = vec![1u8, 2, 3]; // Too short

    let result = encrypt_bytes(data, &invalid_dek);
    assert!(
        result.is_err(),
        "Encryption with invalid DEK length should fail"
    );
}

#[test]
fn test_binary_data_roundtrip_multiple_times() {
    let dek = generate_dek();
    let original_data = vec![255, 254, 128, 0, 1, 2, 3, 255];

    let mut data = original_data.clone();

    // Encrypt/decrypt 5 times
    for _ in 0..5 {
        let encrypted = encrypt_bytes(&data, &dek).expect("Encryption should succeed");
        data = decrypt_bytes(&encrypted, &dek).expect("Decryption should succeed");
    }

    assert_eq!(
        original_data, data,
        "Data must remain identical after multiple encrypt/decrypt cycles"
    );
}

#[test]
fn test_min_ciphertext_size_check() {
    let dek = generate_dek();

    // Create a truncated ciphertext (less than nonce + auth tag minimum)
    let truncated = vec![1u8, 2, 3, 4, 5, 6, 7, 8];

    let result = decrypt_bytes(&truncated, &dek);
    assert!(
        result.is_err(),
        "Decryption should fail for ciphertext shorter than nonce (24 bytes)"
    );
}
