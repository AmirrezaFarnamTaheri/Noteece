# LINT WARNINGS - QUICK REFERENCE SUMMARY

## TOTAL: 156 Warnings

### By Application

#### DESKTOP APP: 83 warnings (2 auto-fixable)

**File:** `/home/user/Noteece/apps/desktop`

| Rule                                    | Count | Fixable |
| --------------------------------------- | ----- | ------- |
| react-hooks/exhaustive-deps             | 13    | PARTIAL |
| security/detect-object-injection        | 14    | MANUAL  |
| @typescript-eslint/no-unsafe-return     | 10    | PARTIAL |
| @typescript-eslint/no-explicit-any      | 8     | MANUAL  |
| @typescript-eslint/no-unsafe-assignment | 8     | PARTIAL |
| react/no-unescaped-entities             | 4     | YES     |
| jsx-a11y/label-has-associated-control   | 4     | MANUAL  |
| unicorn/\* (various)                    | 7     | YES     |
| security/\* (specific)                  | 2     | MANUAL  |
| jsx-a11y/\* (other)                     | 3     | MANUAL  |
| @typescript-eslint/no-unsafe-argument   | 1     | PARTIAL |
| @typescript-eslint/no-unsafe-call       | 1     | PARTIAL |
| import/no-named-as-default              | 1     | MANUAL  |
| Others                                  | 3     | VARIES  |

---

#### MOBILE APP: 73 warnings (0 auto-fixable)

**File:** `/home/user/Noteece/apps/mobile`

| Rule                                  | Count | Fixable |
| ------------------------------------- | ----- | ------- |
| @typescript-eslint/no-unused-vars     | 59    | YES\*   |
| react-hooks/exhaustive-deps           | 10    | PARTIAL |
| no-unreachable                        | 4     | YES     |
| @typescript-eslint/no-require-imports | 1     | MANUAL  |

---

## HOTSPOT FILES (Highest Warning Counts)

### MOBILE APP

1. **src/lib/haptics.ts** - 9 warnings
   - Pattern: unused 'error' in catch blocks
   - Fix: Use `catch (_error)` syntax
2. **src/screens/MusicHub.tsx** - 11 warnings
   - Multiple unused imports/variables
   - Unreachable code
3. **src/screens/HealthHub.tsx** - 7 warnings
   - Unused imports
   - Unreachable code
4. **app/(tabs)/today.tsx** - 6 warnings
   - Unused imports (useEffect, date utilities)
   - Unused state variable
5. **src/lib/social-database.ts** - 4 warnings
   - Unused type imports
6. **app/(tabs)/music.tsx** - 6 warnings
   - Unused imports/state
   - React hook deps issues

### DESKTOP APP

1. **src/components/widgets/NotesHeatmap.tsx** - 5 warnings
   - Object injection sinks
2. **src/components/social/SocialTimeline.tsx** - 11 warnings
   - Type safety issues (any types)
   - Unsafe operations
3. **src/components/**tests**/UserManagement.qa-fixes.test.tsx** - 10 warnings
   - Type safety in tests
4. **src/components/SpacedRepetition.tsx** - 5 warnings
   - Object injection sinks
5. **src/components/settings/BackupRestore.tsx** - 4 warnings
   - Security + a11y issues

---

## ACTION CHECKLIST

### PHASE 1: QUICK WINS (Auto-fixable)

- [ ] Run `eslint --fix apps/desktop/src --report-unused-disable-directives`
- [ ] Run `eslint --fix apps/mobile`
- [ ] Review and commit auto-fixed changes
- [ ] Delete unreachable code (4 instances)

### PHASE 2: UNUSED VARIABLES

- [ ] Fix haptics.ts (9 errors) - Use `catch (_error)` pattern
- [ ] Fix today.tsx (6 errors) - Remove unused imports/state
- [ ] Fix MusicHub.tsx (11 errors) - Cleanup imports and state
- [ ] Fix social-database.ts (4 errors) - Remove or export types
- [ ] Review and test changes

### PHASE 3: REACT HOOKS

- [ ] Add missing dependencies to useEffect hooks (13 desktop + 10 mobile)
- [ ] Consider useCallback for complex dependencies
- [ ] Test functionality doesn't break

### PHASE 4: TYPE SAFETY

- [ ] Fix SocialTimeline.tsx (no-unsafe-return, no-unsafe-assignment)
- [ ] Fix UserManagement test (type safety)
- [ ] Fix CalendarWidget (any types)
- [ ] Fix logger/auth utilities

### PHASE 5: SECURITY & A11Y

- [ ] Fix object injection sinks in NotesHeatmap, SpacedRepetition
- [ ] Fix form labels in AccountSettings
- [ ] Fix accessibility issues in BackupRestore, TimelinePost
- [ ] Fix timing attack in Register

### PHASE 6: FINAL CLEANUP

- [ ] Review remaining warnings
- [ ] Commit final changes
- [ ] Run full lint to verify all fixed

---

## COMMAND CHEAT SHEET

### Check current lint status

```bash
pnpm lint 2>&1 | head -100
```

### Auto-fix available warnings

```bash
eslint --fix apps/desktop/src --report-unused-disable-directives
eslint --fix apps/mobile
```

### Check single file

```bash
eslint apps/mobile/src/lib/haptics.ts
```

### Fix single file

```bash
eslint --fix apps/mobile/src/lib/haptics.ts
```

### Get count by rule

```bash
pnpm lint 2>&1 | grep "warning" | awk '{print $(NF)}' | sort | uniq -c | sort -rn
```

---

## ESTIMATED EFFORT

**Total Time:** 15-21 hours (2-3 days intensive)

- Phase 1: 2-3 hours (Auto-fix)
- Phase 2: 3-4 hours (Unused vars)
- Phase 3: 2-3 hours (React hooks)
- Phase 4: 4-5 hours (Type safety)
- Phase 5: 3-4 hours (Security/A11y)
- Phase 6: 1-2 hours (Polish)

**Recommended:**

- Start with Phase 1 (quick wins)
- Then Phases 2-3 (high impact, easier)
- Then Phases 4-5 (complex, important)
- End with Phase 6 (polish)
