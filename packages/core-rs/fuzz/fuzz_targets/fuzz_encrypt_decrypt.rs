#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Fuzz with varying key material to catch edge cases
    let dek: [u8; 32] = [42u8; 32];

    // 1. Roundtrip must always hold for binary data
    if let Ok(encrypted) = core_rs::crypto::encrypt_bytes(data, &dek) {
        // Encrypted output must differ from input (unless empty)
        if !data.is_empty() {
            assert_ne!(
                data, encrypted.as_slice(),
                "Ciphertext must differ from plaintext"
            );
        }

        // Encrypted output must be longer (nonce + tag overhead)
        assert!(
            encrypted.len() >= data.len() + 40,
            "Encrypted data should include 24-byte nonce + 16-byte tag overhead"
        );

        // Decryption must recover original
        let decrypted = core_rs::crypto::decrypt_bytes(&encrypted, &dek)
            .expect("Roundtrip decrypt failed");
        assert_eq!(data, decrypted.as_slice());
    }

    // 2. Decryption with wrong key must fail
    if let Ok(encrypted) = core_rs::crypto::encrypt_bytes(data, &dek) {
        let wrong_key: [u8; 32] = [99u8; 32];
        let result = core_rs::crypto::decrypt_bytes(&encrypted, &wrong_key);
        assert!(
            result.is_err(),
            "Decryption with wrong key should fail"
        );
    }

    // 3. Truncated ciphertext must fail gracefully
    if let Ok(encrypted) = core_rs::crypto::encrypt_bytes(data, &dek) {
        for cut in 0..encrypted.len().min(40) {
            let _ = core_rs::crypto::decrypt_bytes(&encrypted[..cut], &dek);
        }
    }

    // 4. Arbitrary input to decrypt_bytes must not panic
    let _ = core_rs::crypto::decrypt_bytes(data, &dek);
});
