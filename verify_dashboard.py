"""Smoke-verify the desktop dashboard widgets render.

Exits non-zero when any expected widget is missing so this can gate CI or
local release checks instead of merely printing observations.
"""

import os
import sys
import time

from playwright.sync_api import sync_playwright

EXPECTED_WIDGETS = [
    "Universal Status",
    "Health Pulse",
    "Now Playing",
    "Social Feed",
]


def verify_dashboard(page) -> list[str]:
    """Return the list of missing widget names (empty list == pass)."""
    try:
        page.goto("http://localhost:5173", timeout=60000)
    except Exception as e:  # noqa: BLE001 - report, don't crash the probe
        print(f"Failed to load page: {e}")
        return list(EXPECTED_WIDGETS)

    missing: list[str] = []
    for widget in EXPECTED_WIDGETS:
        try:
            page.wait_for_selector(f"text={widget}", timeout=30000 if widget == EXPECTED_WIDGETS[0] else 5000)
            print(f"Found {widget} widget")
        except Exception:
            print(f"{widget} widget missing")
            missing.append(widget)

    os.makedirs("verification", exist_ok=True)
    page.screenshot(path="verification/dashboard_verification.png", full_page=True)
    print("Screenshot saved to verification/dashboard_verification.png")
    return missing


if __name__ == "__main__":
    time.sleep(5)  # give a freshly started dev server a moment

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()
        try:
            missing = verify_dashboard(page)
        finally:
            browser.close()

    if missing:
        print(f"VERIFICATION FAILED - missing widgets: {', '.join(missing)}")
        sys.exit(1)
    print("VERIFICATION PASSED")
