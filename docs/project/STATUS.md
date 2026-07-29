# Project Status

> **This file is not canonical.** Project status lives in
> [`STATUS.md`](../../STATUS.md) at the repository root, and the underlying
> evidence in
> [`docs/audit_reports/FORENSIC_AUDIT_2026-07-26.md`](../audit_reports/FORENSIC_AUDIT_2026-07-26.md).
>
> **Summary: version 1.1.0, pre-release, rated 4.0/10 and NOT production ready.**
> Critical blockers include plaintext mobile data at rest, the Prime capture
> feature's lack of consent, and an unregistered desktop AI backend.

This file previously carried a per-module status-and-coverage table asserting
86–98% coverage per module. Those figures were unsourced — no coverage gate
exists in CI, and `packages/ui` and `packages/types` have zero tests — so the
table has been removed rather than corrected.

## Known Issues

See [`ISSUES.md`](../../ISSUES.md) at the repository root (canonical), and
[`docs/project/ISSUES.md`](ISSUES.md) for the long-lived build/tooling quirks.

### Standing platform mitigations

1. **FTS5/SQLCipher build conflict:** hybrid search with `LIKE` fallback.
2. **Ubuntu 24.04:** build on 22.04 LTS or in a container.
3. **iOS Prime:** unavailable — App Store restrictions mean Android sideload only.

## Roadmap

Planning lives in [`PLAN.md`](PLAN.md) and [`NEXT_STEPS.md`](../../NEXT_STEPS.md).
Note that all previously published target dates have passed without a tagged
release; treat the phase ordering as meaningful and the dates as not.

## Project Credits

**Author:** Amirreza "Farnam" Taheri
**Email:** taherifarnam@gmail.com
**GitHub:** [@AmirrezaFarnamTaheri](https://github.com/AmirrezaFarnamTaheri)

---

_Noteece v1.1.0 — last reviewed 2026-07-26_
