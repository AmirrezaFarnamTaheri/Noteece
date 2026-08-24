#![no_main]
use libfuzzer_sys::fuzz_target;

fuzz_target!(|data: &[u8]| {
    // Fuzz the encrypt/decrypt roundtrip for binary data
    let dek: [u8; 32] = [42u8; 32];

    // Test encrypt_bytes then decrypt_bytes roundtrip
    if let Ok(encrypted) = core_rs::crypto::encrypt_bytes(data, &dek) {
        let decrypted = core_rs::crypto::decrypt_bytes(&encrypted, &dek)
            .expect("decrypt_bytes should succeed on data we just encrypted");
        assert_eq!(
            data, decrypted.as_slice(),
            "Decrypted data must match original plaintext"
        );
    }

    // Test encrypt_string/decrypt_string with valid UTF-8 input
    if let Ok(s) = std::str::from_utf8(data) {
        if let Ok(encrypted) = core_rs::crypto::encrypt_string(s, &dek) {
            let decrypted = core_rs::crypto::decrypt_string(&encrypted, &dek)
                .expect("decrypt_string should succeed on data we just encrypted");
            assert_eq!(s, decrypted, "Decrypted string must match original plaintext");
        }
    }
});
