# Issues

## Resolved

- [x] **Security:** Desktop session tokens were in localStorage (Moved to `tauri-plugin-store`).
- [x] **Security:** Console logs exposed sensitive data (Replaced with secure `Logger`).
- [x] **Quality:** Mobile app console logs cleaned up and replaced with `Logger`.
- [x] **Quality:** Removed unsafe `unwrap()` calls in Core-RS critical paths (LLM, CalDAV, DB).
- [x] **Reliability:** Sync engine masked database errors (Fixed error propagation).
- [x] **Mobile:** Race condition in vault unlock (Fixed with mutex).
- [x] **Mobile:** SQL Injection in search (Fixed with parameter binding).
- [x] **Mobile:** Transaction rollback issues in migrations (Fixed).
- [x] **Mobile:** Encryption/Salt issue (Fixed with GLOBAL_KEY and salt helper).
- [x] **Performance:** Mobile SocialHub list was slow (Migrated to `FlashList`).
- [x] **Performance:** Desktop graph loading was unpaginated (Added pagination).
- [x] **Infrastructure:** CI was slow (Added caching).
- [x] **Testing:** Jest mock configuration for `react-native-zeroconf` and `tauri-plugin-store` (Fixed).
- [x] **i18n:** Missing pluralization in mobile app (Added).

## Pending / Known Limitations

- [ ] **Mobile:** Certificate pinning for P2P sync is documented in `SECURITY.md` but requires a certificate generation strategy for production deployment.
- [ ] **Mobile Test Environment:** Some jest tests may require `@babel/plugin-transform-private-methods` depending on node version, currently working with provided config.
- [ ] **Desktop:** `tauri-plugin-store` mock is memory-only for tests; integration tests require running binary.

## Backlog

- [ ] **Mobile:** Full offline-first conflict resolution UI (Basic version implemented).
- [ ] **Desktop:** Add visual regression testing for widgets.
