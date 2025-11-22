package com.noteece.services

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent

// Stub implementation for Store flavor - does nothing
class NoteeceAccessibilityService : AccessibilityService() {
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // No-op
    }

    override fun onInterrupt() {
        // No-op
    }
}
