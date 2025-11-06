use core_rs::crypto::{decrypt_string, derive_key, encrypt_string};

#[test]
fn test_key_derivation() {
    let password = "test-password";
    let salt = b"test-salt";
    let key = derive_key(password, salt);
    assert_eq!(key.len(), 32);
}

#[test]
fn test_encrypt_decrypt_roundtrip() {
    let dek = derive_key("test-password", b"salt");
    let plaintext = "Hello, World! This is a test message with special chars: 🔐🚀";

    let ciphertext = encrypt_string(plaintext, &dek).expect("Encryption failed");
    assert_ne!(
        ciphertext, plaintext,
        "Ciphertext should differ from plaintext"
    );

    let decrypted = decrypt_string(&ciphertext, &dek).expect("Decryption failed");
    assert_eq!(decrypted, plaintext, "Decrypted text should match original");
}

#[test]
fn test_encrypt_with_invalid_dek_length() {
    // Test with DEK too short (< 32 bytes)
    let short_dek = vec![0u8; 16];
    let result = encrypt_string("test", &short_dek);
    assert!(result.is_err(), "Should fail with short DEK");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid DEK length"));

    // Test with DEK too long (> 32 bytes)
    let long_dek = vec![0u8; 64];
    let result = encrypt_string("test", &long_dek);
    assert!(result.is_err(), "Should fail with long DEK");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid DEK length"));

    // Test with empty DEK
    let empty_dek = vec![];
    let result = encrypt_string("test", &empty_dek);
    assert!(result.is_err(), "Should fail with empty DEK");
}

#[test]
fn test_decrypt_with_invalid_dek_length() {
    let valid_dek = derive_key("password", b"salt");
    let ciphertext = encrypt_string("test", &valid_dek).unwrap();

    // Try to decrypt with wrong DEK length
    let wrong_dek = vec![0u8; 16];
    let result = decrypt_string(&ciphertext, &wrong_dek);
    assert!(result.is_err(), "Should fail with wrong DEK length");
}

#[test]
fn test_decrypt_with_invalid_ciphertext_too_short() {
    let dek = derive_key("password", b"salt");

    // Test with ciphertext shorter than nonce (24 bytes) + tag (16 bytes) = 40 bytes minimum
    let short_ciphertext = "ABC"; // Only 3 bytes base64
    let result = decrypt_string(short_ciphertext, &dek);
    assert!(result.is_err(), "Should fail with too-short ciphertext");
    assert!(result.unwrap_err().to_string().contains("too short"));

    // Test with exactly nonce length (24 bytes) but no tag
    let nonce_only = base64::encode(&[0u8; 24]);
    let result = decrypt_string(&nonce_only, &dek);
    assert!(result.is_err(), "Should fail with only nonce, no tag");
}

#[test]
fn test_decrypt_with_corrupted_ciphertext() {
    let dek = derive_key("password", b"salt");
    let ciphertext = encrypt_string("original message", &dek).unwrap();

    // Corrupt the ciphertext by modifying a character
    let mut corrupted = ciphertext.clone();
    corrupted.push('X'); // Add invalid character
    let result = decrypt_string(&corrupted, &dek);
    assert!(result.is_err(), "Should fail with corrupted ciphertext");
}

#[test]
fn test_decrypt_with_wrong_dek() {
    let dek1 = derive_key("password1", b"salt1");
    let dek2 = derive_key("password2", b"salt2");

    let ciphertext = encrypt_string("secret message", &dek1).unwrap();

    // Try to decrypt with wrong DEK
    let result = decrypt_string(&ciphertext, &dek2);
    assert!(
        result.is_err(),
        "Should fail with wrong DEK due to authentication tag mismatch"
    );
}

#[test]
fn test_encrypt_empty_string() {
    let dek = derive_key("password", b"salt");
    let ciphertext = encrypt_string("", &dek).expect("Should encrypt empty string");
    let decrypted = decrypt_string(&ciphertext, &dek).expect("Should decrypt empty string");
    assert_eq!(decrypted, "", "Empty string should round-trip correctly");
}

#[test]
fn test_encrypt_large_string() {
    let dek = derive_key("password", b"salt");
    let large_text = "A".repeat(1_000_000); // 1 MB of text

    let ciphertext = encrypt_string(&large_text, &dek).expect("Should encrypt large string");
    let decrypted = decrypt_string(&ciphertext, &dek).expect("Should decrypt large string");
    assert_eq!(
        decrypted, large_text,
        "Large string should round-trip correctly"
    );
}

#[test]
fn test_encrypt_unicode_and_special_chars() {
    let dek = derive_key("password", b"salt");
    let test_strings = vec![
        "Hello 世界 🌍",
        "Ñoño español",
        "Здравствуй мир",
        "שלום עולם",
        "مرحبا العالم",
        "Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?",
        "Newlines\nand\ttabs",
    ];

    for plaintext in test_strings {
        let ciphertext = encrypt_string(plaintext, &dek).expect("Encryption failed");
        let decrypted = decrypt_string(&ciphertext, &dek).expect("Decryption failed");
        assert_eq!(decrypted, plaintext, "Unicode should round-trip correctly");
    }
}

#[test]
fn test_same_plaintext_different_ciphertexts() {
    let dek = derive_key("password", b"salt");
    let plaintext = "same message";

    let ciphertext1 = encrypt_string(plaintext, &dek).unwrap();
    let ciphertext2 = encrypt_string(plaintext, &dek).unwrap();

    // Ciphertexts should differ due to random nonce
    assert_ne!(
        ciphertext1, ciphertext2,
        "Same plaintext should produce different ciphertexts with random nonces"
    );

    // But both should decrypt to same plaintext
    assert_eq!(decrypt_string(&ciphertext1, &dek).unwrap(), plaintext);
    assert_eq!(decrypt_string(&ciphertext2, &dek).unwrap(), plaintext);
}

#[test]
fn test_dek_derivation_consistency() {
    let password = "test-password-123";
    let salt = b"consistent-salt";

    let key1 = derive_key(password, salt);
    let key2 = derive_key(password, salt);

    assert_eq!(key1, key2, "Same password and salt should derive same key");

    // Different salt should produce different key
    let key3 = derive_key(password, b"different-salt");
    assert_ne!(key1, key3, "Different salt should produce different key");
}

#[test]
fn test_decrypt_invalid_base64() {
    let dek = derive_key("password", b"salt");

    // Test with invalid base64 characters
    let invalid_base64 = "This is not valid base64!@#$%";
    let result = decrypt_string(invalid_base64, &dek);
    assert!(result.is_err(), "Should fail with invalid base64");
}
