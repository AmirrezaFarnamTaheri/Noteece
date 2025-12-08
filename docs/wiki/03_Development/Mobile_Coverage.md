# Mobile Code Coverage

We use Jest to collect code coverage for the mobile application.

## Running Coverage

```bash
cd apps/mobile
pnpm test --coverage
```

## Configuration

Coverage configuration is in `apps/mobile/jest.config.js`.

We ignore:
- `node_modules`
- `android/`
- `ios/`
- Test files (`__tests__`)
- Type definition files (`d.ts`)

## Viewing Reports

Coverage reports are generated in `apps/mobile/coverage/`. Open `lcov-report/index.html` in a browser to view the report.
