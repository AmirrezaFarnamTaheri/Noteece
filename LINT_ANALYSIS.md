# Noteece Monorepo - Comprehensive Lint Analysis

## 156 Total Warnings Across Desktop & Mobile

---

## EXECUTIVE SUMMARY

**Total Warnings: 156**

- Desktop App (tauri-react-typescript-tailwind): 83 warnings (2 auto-fixable)
- Mobile App (@noteece/mobile): 73 warnings (0 auto-fixable)
- Other Packages: 0 warnings

---

## PART 1: WARNING CATEGORIES BY FREQUENCY

### All Warning Types (23 categories)

| Rank | Rule                                    | Count | Fixable | Priority |
| ---- | --------------------------------------- | ----- | ------- | -------- |
| 1    | @typescript-eslint/no-unused-vars       | 54    | YES\*   | HIGH     |
| 2    | react-hooks/exhaustive-deps             | 26    | PARTIAL | HIGH     |
| 3    | security/detect-object-injection        | 16    | MANUAL  | MEDIUM   |
| 4    | @typescript-eslint/no-unsafe-return     | 11    | PARTIAL | MEDIUM   |
| 5    | @typescript-eslint/no-unsafe-assignment | 10    | PARTIAL | MEDIUM   |
| 6    | @typescript-eslint/no-explicit-any      | 10    | MANUAL  | MEDIUM   |
| 7    | react/no-unescaped-entities             | 4     | YES     | LOW      |
| 8    | no-unreachable                          | 4     | YES     | HIGH     |
| 9    | jsx-a11y/label-has-associated-control   | 4     | MANUAL  | MEDIUM   |
| 10   | unicorn/numeric-separators-style        | 2     | YES     | LOW      |
| 11   | unicorn/no-array-for-each               | 2     | YES     | LOW      |
| 12   | no-unused-vars                          | 2     | YES     | HIGH     |
| 13   | unicorn/prefer-array-some               | 1     | YES     | LOW      |
| 14   | unicorn/no-useless-switch-case          | 1     | YES     | LOW      |
| 15   | security/detect-possible-timing-attacks | 1     | MANUAL  | HIGH     |
| 16   | security/detect-non-literal-regexp      | 1     | MANUAL  | MEDIUM   |
| 17   | jsx-a11y/no-static-element-interactions | 1     | MANUAL  | MEDIUM   |
| 18   | jsx-a11y/media-has-caption              | 1     | MANUAL  | MEDIUM   |
| 19   | jsx-a11y/click-events-have-key-events   | 1     | MANUAL  | MEDIUM   |
| 20   | import/no-named-as-default              | 1     | MANUAL  | LOW      |
| 21   | @typescript-eslint/no-unsafe-call       | 1     | PARTIAL | MEDIUM   |
| 22   | @typescript-eslint/no-unsafe-argument   | 1     | PARTIAL | MEDIUM   |
| 23   | @typescript-eslint/no-require-imports   | 1     | MANUAL  | LOW      |

**Legend:**

- YES\* = Often auto-fixable with --fix, but requires careful review
- YES = Auto-fixable with --fix
- PARTIAL = Some instances may be auto-fixable
- MANUAL = Requires manual intervention

---

## PART 2: TOP 10 MOST FREQUENT WARNINGS WITH EXAMPLES

### 1. @typescript-eslint/no-unused-vars (54 warnings)

**Category:** Code Quality | **Fixable:** YES | **Impact:** High

**Distribution:**

- Mobile App: 59 instances
- Desktop App: varies

**Top Examples:**

```
/home/user/Noteece/apps/mobile/src/lib/haptics.ts
  45:14  warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  58:14  warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  71:14  warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  84:14  warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  97:14  warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  110:14 warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  123:14 warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  136:14 warning  'error' is defined but never used  @typescript-eslint/no-unused-vars
  149:14 warning  'error' is defined but never used  @typescript-eslint/no-unused-vars

/home/user/Noteece/apps/mobile/app/(tabs)/today.tsx
  1:20   warning  'useEffect' is defined but never used         @typescript-eslint/no-unused-vars
  13:18  warning  'isToday' is defined but never used           @typescript-eslint/no-unused-vars
  13:27  warning  'isTomorrow' is defined but never used        @typescript-eslint/no-unused-vars
  13:39  warning  'parseISO' is defined but never used          @typescript-eslint/no-unused-vars
  21:10  warning  'TimelineItem' is defined but never used      @typescript-eslint/no-unused-vars
  28:28  warning  'loading' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/user/Noteece/apps/mobile/src/screens/MusicHub.tsx
  16:3   warning  'ScrollView' is defined but never used               @typescript-eslint/no-unused-vars
  18:3   warning  'TextInput' is defined but never used                @typescript-eslint/no-unused-vars
  25:9   warning  'width' is assigned a value but never used           @typescript-eslint/no-unused-vars
  25:16  warning  'height' is assigned a value but never used          @typescript-eslint/no-unused-vars
  60:10  warning  'stats' is assigned a value but never used           @typescript-eslint/no-unused-vars
  60:17  warning  'setStats' is assigned a value but never used        @typescript-eslint/no-unused-vars
  61:10  warning  'loading' is assigned a value but never used         @typescript-eslint/no-unused-vars
  63:10  warning  'searchQuery' is assigned a value but never used     @typescript-eslint/no-unused-vars
  63:23  warning  'setSearchQuery' is assigned a value but never used  @typescript-eslint/no-unused-vars

/home/user/Noteece/apps/mobile/src/lib/social-database.ts
  12:3   warning  'SocialPost' is defined but never used      @typescript-eslint/no-unused-vars
  15:3   warning  'PostCategory' is defined but never used    @typescript-eslint/no-unused-vars
  17:3   warning  'AutomationRule' is defined but never used  @typescript-eslint/no-unused-vars
  18:3   warning  'SyncHistory' is defined but never used     @typescript-eslint/no-unused-vars
```

---

### 2. react-hooks/exhaustive-deps (26 warnings)

**Category:** React Best Practices | **Fixable:** PARTIAL | **Impact:** High

**Distribution:**

- Mobile App: 10 instances
- Desktop App: 13 instances
- Other: 3 instances

**Top Examples:**

```
/home/user/Noteece/apps/desktop/src/components/FormTemplates.tsx
  36:6  warning  React Hook useEffect has a missing dependency: 'fetchTemplates'

/home/user/Noteece/apps/desktop/src/components/modes/FinanceMode.tsx
  71:6  warning  React Hook useEffect has a missing dependency: 'loadData'

/home/user/Noteece/apps/desktop/src/components/modes/HealthMode.tsx
  75:6  warning  React Hook useEffect has a missing dependency: 'loadData'

/home/user/Noteece/apps/desktop/src/components/modes/RecipeMode.tsx
  49:6  warning  React Hook useEffect has a missing dependency: 'loadData'

/home/user/Noteece/apps/desktop/src/components/modes/TravelMode.tsx
  57:6  warning  React Hook useEffect has a missing dependency: 'loadData'

/home/user/Noteece/apps/mobile/app/(tabs)/music.tsx
  67:6   warning  React Hook useEffect has a missing dependency: 'sound'
  88:6   warning  React Hook useEffect has a missing dependency: 'playNextTrack'

/home/user/Noteece/apps/mobile/src/screens/SocialHub.tsx
  89:6   warning  React Hook useEffect has missing dependencies: 'loadData' and 'loadSavedFilters'
  223:6  warning  React Hook useCallback has missing dependencies: 'loadCategories', 'loadPosts', and 'refresh'
  344:6  warning  React Hook useEffect has missing dependencies: 'handleRefresh' and 'loading'
```

---

### 3. security/detect-object-injection (16 warnings)

**Category:** Security | **Fixable:** MANUAL | **Impact:** Medium

**Distribution:**

- Desktop App: 14 instances
- Mobile App: 0 instances

**Top Examples:**

```
/home/user/Noteece/apps/desktop/src/components/widgets/NotesHeatmap.tsx
  37:7   warning  Generic Object Injection Sink
  47:11  warning  Generic Object Injection Sink
  48:9   warning  Generic Object Injection Sink
  67:11  warning  Generic Object Injection Sink
  69:18  warning  Generic Object Injection Sink

/home/user/Noteece/apps/desktop/src/components/SpacedRepetition.tsx
  89:25  warning  Variable Assigned to Object Injection Sink
  121:13 warning  Generic Object Injection Sink
  193:25 warning  Variable Assigned to Object Injection Sink

/home/user/Noteece/apps/desktop/src/components/settings/BackupRestore.tsx
  171:73 warning  Generic Object Injection Sink
  179:46 warning  Generic Object Injection Sink
```

---

### 4. @typescript-eslint/no-unsafe-return (11 warnings)

**Category:** Type Safety | **Fixable:** PARTIAL | **Impact:** Medium

**Key Files:**

- `/home/user/Noteece/apps/desktop/src/components/__tests__/UserManagement.qa-fixes.test.tsx`: 4 instances
- `/home/user/Noteece/apps/desktop/src/components/social/SocialTimeline.tsx`: 5 instances
- `/home/user/Noteece/apps/desktop/src/services/auth.ts`: 1 instance
- `/home/user/Noteece/apps/desktop/src/utils/logger.ts`: 1 instance

---

### 5. @typescript-eslint/no-unsafe-assignment (10 warnings)

**Category:** Type Safety | **Fixable:** PARTIAL | **Impact:** Medium

**Key Files:**

- `/home/user/Noteece/apps/desktop/src/components/__tests__/UserManagement.qa-fixes.test.tsx`: 2 instances
- `/home/user/Noteece/apps/desktop/src/components/social/SocialTimeline.tsx`: 2 instances
- `/home/user/Noteece/apps/desktop/src/components/social/TimelineFilters.tsx`: 1 instance
- `/home/user/Noteece/apps/desktop/src/hooks/useSessionRefresh.ts`: 1 instance
- `/home/user/Noteece/apps/desktop/src/services/auth.ts`: 1 instance
- `/home/user/Noteece/apps/desktop/src/utils/logger.ts`: 1 instance
- Plus more...

---

### 6. @typescript-eslint/no-explicit-any (10 warnings)

**Category:** Type Safety | **Fixable:** MANUAL | **Impact:** Medium

**Key Files:**

- `/home/user/Noteece/apps/desktop/src/components/__tests__/UserManagement.qa-fixes.test.tsx`: 1 instance
- `/home/user/Noteece/apps/desktop/src/components/social/SocialTimeline.tsx`: 3 instances
- `/home/user/Noteece/apps/desktop/src/components/social/TimelineFilters.tsx`: 1 instance
- `/home/user/Noteece/apps/desktop/src/components/widgets/CalendarWidget.tsx`: 3 instances
- `/home/user/Noteece/apps/desktop/src/hooks/useSessionRefresh.ts`: 1 instance
- `/home/user/Noteece/apps/desktop/src/utils/logger.ts`: 1 instance

---

### 7. react/no-unescaped-entities (4 warnings)

**Category:** React/JSX | **Fixable:** YES | **Impact:** Low

**Examples:**

```
/home/user/Noteece/apps/desktop/src/components/auth/Login.tsx
  102:14  warning  `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`

/home/user/Noteece/apps/desktop/src/components/social/SocialSearch.tsx
  106:67  warning  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`
  106:84  warning  `"` can be escaped with `&quot;`, `&ldquo;`, `&#34;`, `&rdquo;`

/home/user/Noteece/apps/desktop/src/components/social/SocialTimeline.tsx
  196:20  warning  `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`
```

---

### 8. no-unreachable (4 warnings)

**Category:** Code Quality | **Fixable:** YES (Delete) | **Impact:** High

**Examples:**

```
/home/user/Noteece/apps/mobile/src/lib/sync/sync-client.ts
  203:7   warning  Unreachable code

/home/user/Noteece/apps/mobile/src/screens/HealthHub.tsx
  41:19  warning  Unreachable code

/home/user/Noteece/apps/mobile/src/screens/MusicHub.tsx
  35:19  warning  Unreachable code
  48:19  warning  Unreachable code
```

---

### 9. jsx-a11y/label-has-associated-control (4 warnings)

**Category:** Accessibility | **Fixable:** MANUAL | **Impact:** Medium

**Examples:**

```
/home/user/Noteece/apps/desktop/src/components/auth/AccountSettings.tsx
  134:15  warning  A form label must be associated with a control
  138:15  warning  A form label must be associated with a control
  142:15  warning  A form label must be associated with a control
  146:15  warning  A form label must be associated with a control
```

---

### 10. unicorn/numeric-separators-style (2 warnings)

**Category:** Style | **Fixable:** YES | **Impact:** Low

**Examples:**

```
/home/user/Noteece/apps/desktop/src/__tests__/performance.test.ts
  88:8   warning  Invalid group length in numeric value
  103:8  warning  Invalid group length in numeric value
```

---

## PART 3: AUTO-FIX ANALYSIS

### 2 Warnings Potentially Auto-Fixable (Per Desktop App Output)

The linter reports **2 warnings potentially fixable with the `--fix` option** for the desktop app.

**Can Be Auto-Fixed with `eslint --fix`:**

1. react/no-unescaped-entities (4 warnings) - YES
2. unicorn/numeric-separators-style (2 warnings) - YES
3. unicorn/no-array-for-each (2 warnings) - YES
4. unicorn/prefer-array-some (1 warning) - YES
5. unicorn/no-useless-switch-case (1 warning) - YES
6. no-unused-vars (2 warnings) - YES (but needs review)
7. no-unreachable (4 warnings) - YES (delete code)

**Estimated Auto-Fixable: 16-20 warnings (~13-15%)**

**Should NOT be Auto-Fixed (Manual Intervention Required):**

1. @typescript-eslint/no-unused-vars (54) - Review before deletion
2. react-hooks/exhaustive-deps (26) - Complex logic required
3. security/detect-object-injection (16) - Security review needed
4. @typescript-eslint/no-unsafe-return (11) - Type safety required
5. @typescript-eslint/no-unsafe-assignment (10) - Type safety required
6. @typescript-eslint/no-explicit-any (10) - Type definitions needed
7. All jsx-a11y/\* rules (6) - Accessibility context required
8. security/\* rules (2) - Security assessment needed

**Estimated Manual Fixes: 136-140 warnings (~85-87%)**

---

## PART 4: RECOMMENDED FIX ORDER FOR MAXIMUM IMPACT

### Phase 1: Quick Wins (2-3 hours) - Auto-Fixable

**16-20 warnings (~13%)**

1. **react/no-unescaped-entities** (4 warnings)
   - Time: 15 min | Impact: Cleanup
   - Command: `eslint --fix <file>`
   - Files: LoginForm, SocialSearch, SocialTimeline, etc.

2. **unicorn/numeric-separators-style** (2 warnings)
   - Time: 15 min | Impact: Code style
   - Command: `eslint --fix <file>`
   - Files: performance.test.ts

3. **unicorn/no-array-for-each** (2 warnings)
   - Time: 15 min | Impact: Code pattern
   - Command: `eslint --fix <file>`
   - Files: UserManagement.qa-fixes.test.tsx

4. **unicorn/prefer-array-some** (1 warning)
   - Time: 10 min | Impact: Optimization
   - Command: `eslint --fix <file>`
   - Files: performance.test.ts

5. **unicorn/no-useless-switch-case** (1 warning)
   - Time: 10 min | Impact: Logic cleanup
   - Command: `eslint --fix <file>`
   - Files: SocialTimeline.tsx

6. **no-unreachable** (4 warnings) - DELETE unreachable code
   - Time: 30 min | Impact: Code cleanup
   - Manual review then delete
   - Files:
     - sync-client.ts:203
     - HealthHub.tsx:41
     - MusicHub.tsx:35, 48

**Result after Phase 1: ~140 warnings remaining**

---

### Phase 2: High-Impact Manual Fixes (6-8 hours) - Unused Variables

**54 warnings (~35%)**

**@typescript-eslint/no-unused-vars**

- Priority: HIGH (removes dead code)
- Estimated Time: 2-3 hours
- Approach: Review each file, delete or use variables

**Hotspot Files (Mobile App):**

1. `/home/user/Noteece/apps/mobile/src/lib/haptics.ts` (9 error params)
   - Pattern: All 'error' params in catch blocks never used
   - Fix: Use `catch (_error)` or `catch (_)` or review logic
2. `/home/user/Noteece/apps/mobile/app/(tabs)/today.tsx` (6 imports)
   - Imports: useEffect, isToday, isTomorrow, parseISO, TimelineItem, loading
   - Fix: Remove unused imports or refactor component
3. `/home/user/Noteece/apps/mobile/src/screens/MusicHub.tsx` (10 variables)
   - Unused: ScrollView, TextInput, width, height, stats, setStats, loading, searchQuery, setSearchQuery
   - Fix: Remove or implement functionality
4. `/home/user/Noteece/apps/mobile/src/lib/social-database.ts` (4 types)
   - Unused: SocialPost, PostCategory, AutomationRule, SyncHistory
   - Fix: Remove if truly unused or mark as exported for external use

**Result after Phase 2: ~86 warnings remaining**

---

### Phase 3: React Hooks Dependencies (4-6 hours) - Type Safety

**26 warnings (~17%)**

**react-hooks/exhaustive-deps**

- Priority: HIGH (prevents bugs)
- Estimated Time: 2-3 hours
- Approach: Add dependencies or wrap functions with useCallback

**Pattern Analysis:**

- Most common: Missing `loadData`, `fetchTemplates`, `fetchTasks`, `loadGraph` etc.
- Fix Strategy:
  1. Add dependency if function is stable
  2. Wrap function with `useCallback` if dependency is unstable
  3. Use ESLint's autofix suggestion (semi-automated)

**Desktop Files (8 instances):**

- FormTemplates.tsx:36 - add 'fetchTemplates'
- ModeStore.tsx:37 - add 'fetchEnabledModes'
- SavedSearches.tsx:40 - add 'fetchSearches'
- TaskBoard.tsx:53 - add 'fetchTasks'
- TemporalGraph.tsx:80 - add 'loadGraph'
- FinanceMode.tsx:71 - add 'loadData'
- HealthMode.tsx:75 - add 'loadData'
- RecipeMode.tsx:49 - add 'loadData'
- TravelMode.tsx:57 - add 'loadData'
- Risks.tsx:39 - add 'fetchRisks'
- useAsync.tsx:68 - add 'execute', 'immediate'
- useFetch.tsx:54 - add 'fetch'

**Mobile Files (6 instances):**

- music.tsx:67, 88
- tasks.tsx:73
- unlock.tsx:52
- PostCard.tsx:50
- ThemeContext.tsx:172
- useSharedContent.ts:43
- SocialHub.tsx:89, 223 (useCallback), 344

**Result after Phase 3: ~60 warnings remaining**

---

### Phase 4: Type Safety Issues (8-10 hours) - Complex

**32 warnings (~20%)**

**@typescript-eslint/no-unsafe-return** (11 warnings)

- Priority: MEDIUM
- Time: 1.5-2 hours
- Fix: Add proper return types to functions
- Files: UserManagement.qa-fixes.test.tsx, SocialTimeline.tsx, auth.ts, logger.ts

**@typescript-eslint/no-unsafe-assignment** (10 warnings)

- Priority: MEDIUM
- Time: 1.5-2 hours
- Fix: Type annotations, proper casting
- Files: UserManagement.qa-fixes.test.tsx, SocialTimeline.tsx, TimelineFilters.tsx

**@typescript-eslint/no-explicit-any** (10 warnings)

- Priority: MEDIUM
- Time: 1.5-2 hours
- Fix: Replace `any` with specific types
- Files: SocialTimeline.tsx, CalendarWidget.tsx, auth.ts, logger.ts

**Result after Phase 4: ~28 warnings remaining**

---

### Phase 5: Security & Accessibility (4-5 hours) - Important

**22 warnings (~14%)**

**security/detect-object-injection** (16 warnings)

- Priority: MEDIUM (Security)
- Time: 2-3 hours
- Fix: Use type guards, constants instead of string keys
- Main File: NotesHeatmap.tsx (5), SpacedRepetition.tsx (3), BackupRestore.tsx (2), others

**jsx-a11y/label-has-associated-control** (4 warnings)

- Priority: MEDIUM (Accessibility)
- Time: 30 min
- Fix: Add htmlFor to labels
- File: AccountSettings.tsx:134-146

**jsx-a11y/click-events-have-key-events** (1 warning)

- Priority: MEDIUM
- Time: 15 min
- File: BackupRestore.tsx:215

**jsx-a11y/no-static-element-interactions** (1 warning)

- Priority: MEDIUM
- Time: 15 min
- File: BackupRestore.tsx:215

**jsx-a11y/media-has-caption** (1 warning)

- Priority: MEDIUM
- Time: 15 min
- File: TimelinePost.tsx:100

**security/detect-possible-timing-attacks** (1 warning)

- Priority: HIGH (Security)
- Time: 30 min
- File: Register.tsx:52

**security/detect-non-literal-regexp** (1 warning)

- Priority: MEDIUM
- Time: 15 min
- File: CalendarWidget.test.tsx:61

**Result after Phase 5: ~6 warnings remaining**

---

### Phase 6: Final Polish (1-2 hours) - Edge Cases

**6 warnings (~4%)**

1. **import/no-named-as-default** (1 warning)
   - File: project_hub/Timeline.tsx:2
   - Fix: Change named import to default import

2. **@typescript-eslint/no-unsafe-call** (1 warning)
   - File: components/widgets/CalendarWidget.tsx:84
   - Fix: Add type annotation

3. **@typescript-eslint/no-unsafe-argument** (1 warning)
   - File: **tests**/UserManagement.qa-fixes.test.tsx:15
   - Fix: Type function arguments

4. **@typescript-eslint/no-require-imports** (1 warning)
   - File: apps/mobile/src/lib/data-utils.ts:198
   - Fix: Change to ES6 import

5. **no-unused-vars (legacy)** (2 warnings)
   - File: withShareExtension.js
   - Fix: Remove or use variables

---

## IMPLEMENTATION TIMELINE

| Phase     | Task               | Warnings | Time       | Difficulty |
| --------- | ------------------ | -------- | ---------- | ---------- |
| 1         | Auto-fix (--fix)   | 16-20    | 2-3h       | Easy       |
| 2         | Remove unused vars | 54       | 3-4h       | Easy-Med   |
| 3         | React hooks deps   | 26       | 2-3h       | Medium     |
| 4         | Type safety        | 32       | 4-5h       | Hard       |
| 5         | Security/A11y      | 22       | 3-4h       | Medium     |
| 6         | Final polish       | 6        | 1-2h       | Easy-Med   |
| **TOTAL** | **All Warnings**   | **156**  | **15-21h** | **Varied** |

---

## KEY METRICS

- **Quick Wins:** 16-20 warnings (13%) - 2-3 hours
- **High-Impact:** 80 warnings (51%) - Phase 2+3
- **Complex Fixes:** 54 warnings (35%) - Phase 4+5+6
- **Auto-Fixable:** ~20 warnings (13%)
- **Manual Only:** ~136 warnings (87%)

---

## RECOMMENDED EXECUTION STRATEGY

1. **Day 1 (2-3 hours):** Run auto-fix, review and commit

   ```bash
   eslint --fix apps/desktop/src
   eslint --fix apps/mobile
   ```

2. **Day 2-3 (6-8 hours):** Focus on unused variables
   - Start with haptics.ts (9 errors, clear pattern)
   - Move to today.tsx, MusicHub.tsx
   - Then social-database.ts

3. **Day 4-5 (6-8 hours):** React hooks dependencies
   - Use dependency array suggestions
   - Consider useCallback patterns
   - Test changes thoroughly

4. **Day 6-7 (8-10 hours):** Type safety improvements
   - SocialTimeline.tsx (complex)
   - UserManagement.qa-fixes.test.tsx
   - Calendar/Logger utilities

5. **Day 8 (3-4 hours):** Security & A11y fixes
   - Object injection patterns
   - Label associations
   - Timing attack fix

6. **Day 9 (1-2 hours):** Final polish
   - Cleanup remaining edge cases
   - Run full lint
   - Commit final changes

**Total Estimated Time: 15-21 hours (2-3 days intensive work)**
