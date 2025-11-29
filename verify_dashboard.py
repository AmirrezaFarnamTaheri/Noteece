import time
import os
from playwright.sync_api import sync_playwright, Page, Error


def verify_dashboard(page: Page) -> None:
    # Wait for the dashboard to load
    # The dev server is running on port 5173 (standard Vite port)
    try:
        page.goto("http://localhost:5173", timeout=60000)
    except Error as e:
        print(f"Failed to load page: {e}")
        return

    # Wait for the Universal Dashboard widget to appear
    # We look for the title "Universal Overview"
    try:
        page.wait_for_selector("text=Universal Status", timeout=30000)
        print("Found Universal Status widget")
    except Error:
        print("Universal Status widget not found, checking for fallback")

    # Check for other widgets
    try:
        page.wait_for_selector("text=Health Pulse", timeout=5000)
        print("Found Health Pulse widget")
    except Error:
        print("Health Pulse widget missing")

    try:
        page.wait_for_selector("text=Now Playing", timeout=5000)
        print("Found Now Playing widget")
    except Error:
        print("Now Playing widget missing")

    try:
        page.wait_for_selector("text=Social Feed", timeout=5000)
        print("Found Social Feed widget")
    except Error:
        print("Social Feed widget missing")

    # Take a screenshot
    # Use relative path or a temp dir for compatibility

    os.makedirs("verification", exist_ok=True)
    page.screenshot(path="verification/dashboard_verification.png", full_page=True)
    print("Screenshot saved to verification/dashboard_verification.png")


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to a standard desktop size
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()

        # Give the dev server a moment to spin up if it just started
        time.sleep(5)

        try:
            verify_dashboard(page)
        finally:
            browser.close()
