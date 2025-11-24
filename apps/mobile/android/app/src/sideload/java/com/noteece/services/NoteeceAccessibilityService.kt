package com.noteece.services

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.util.Log

// Active implementation for Sideload flavor
class NoteeceAccessibilityService : AccessibilityService() {
    private var isRecording = false
    private var lastCapturedText = ""
    private var lastScrollTime = 0L
    private val DEBOUNCE_MS = 150L

    companion object {
        const val TAG = "NoteeceSvc"
        const val ACTION_START_SESSION = "com.noteece.ACTION_START_SESSION"
    }

    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    Log.i(TAG, "Screen OFF - Pausing Ingestion")
                    isRecording = false
                }
                Intent.ACTION_SCREEN_ON -> {
                    // We do not auto-resume on screen on for security/privacy.
                    // User must explicitly re-engage via the app or widget if needed,
                    // or we rely on the session state if we want to be more aggressive.
                    // For now, let's keep it safe:
                    Log.i(TAG, "Screen ON - Waiting for session start")
                }
            }
        }
    }

    // Allowed packages whitelist - Must match config XML
    // Adding runtime check as a second layer of defense
    private val allowedPackages = setOf(
        "com.twitter.android",
        "com.instagram.android",
        "com.linkedin.android",
        "com.facebook.katana"
    )

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i(TAG, "Noteece Eyes Connected")

        // Register Screen State Receiver
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        }
        registerReceiver(screenStateReceiver, filter)

        // Launch the Overlay Service when accessibility is enabled
        startService(Intent(this, OverlayService::class.java))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_START_SESSION) {
            val platformId = intent.getStringExtra("PLATFORM_ID")
            Log.i(TAG, "Starting Session for: $platformId")
            isRecording = true
            // Signal Overlay to turn Green
            val overlayIntent = Intent(this, OverlayService::class.java)
            overlayIntent.action = OverlayService.ACTION_SET_ACTIVE
            startService(overlayIntent)
        }
        return super.onStartCommand(intent, flags, startId)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!isRecording || event == null) return

        // 0. Runtime Package Whitelist Check
        if (event.packageName == null || !allowedPackages.contains(event.packageName.toString())) {
            return
        }

        // 1. Event Filtering
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
            event.eventType != AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            return
        }

        // 2. Throttle/Debounce
        val now = System.currentTimeMillis()
        if (now - lastScrollTime < DEBOUNCE_MS) {
            return
        }
        lastScrollTime = now

        // 3. Scan & Ingest
        scanScreen()
    }

    private fun scanScreen() {
        val root = rootInActiveWindow ?: return
        val textBuilder = StringBuilder()

        traverseNode(root, textBuilder, 0)

        val rawText = textBuilder.toString()
        if (rawText.isNotEmpty() && rawText != lastCapturedText) {
            lastCapturedText = rawText
            // Send to Rust Bridge
            com.noteece.RustBridge.ingest(rawText)
            Log.d(TAG, "Captured: ${rawText.take(50)}...")
        }

        root.recycle()
    }

    private fun traverseNode(node: AccessibilityNodeInfo?, builder: StringBuilder, depth: Int) {
        if (node == null || depth > 10) return

        if (node.text != null && node.text.isNotEmpty()) {
            builder.append(node.text).append("\n")
        }

        // Optimization: Use child count to iterate
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            traverseNode(child, builder, depth + 1)
            child?.recycle()
        }
    }

    override fun onInterrupt() {
        isRecording = false
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (e: IllegalArgumentException) {
            // Receiver not registered
        }
    }
}
