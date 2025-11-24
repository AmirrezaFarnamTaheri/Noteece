package com.noteece.services

import android.app.Service
import android.content.Intent
import android.graphics.PixelFormat
import android.os.IBinder
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.graphics.Color
import android.util.Log

class OverlayService : Service() {
    private lateinit var windowManager: WindowManager
    private var overlayView: View? = null

    companion object {
        const val ACTION_SET_ACTIVE = "com.noteece.ACTION_SET_ACTIVE"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        createOverlay()
    }

    private fun createOverlay() {
        if (overlayView != null) return

        // Simple "Dot" View
        overlayView = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#44FF0000")) // Semi-transparent Red (Inactive)
            // Ideally inflate a layout XML here
        }

        val params = WindowManager.LayoutParams(
            100, 100, // 40dp approx
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        )
        params.gravity = Gravity.TOP or Gravity.END
        params.y = 200

        windowManager.addView(overlayView, params)

        overlayView?.setOnClickListener {
            Log.i("NoteeceOverlay", "Anchor Tapped!")
            // Trigger Rust Capture
            val result = com.noteece.RustBridge.anchorLatest()
            Log.i("NoteeceOverlay", "Anchored: $result")

            // Send to React Native via Broadcast
            val intent = Intent("com.noteece.ACTION_ANCHOR_CAPTURED")
            intent.putExtra("PAYLOAD", result)
            // Since AppLauncherModule registers with local context but via global broadcast system,
            // we use sendBroadcast(intent).
            // Note: If AppLauncherModule uses registerReceiver without export flag on Android 14+,
            // and we are sending from same UID, it should work.
            intent.setPackage(packageName) // Restrict to own package for security
            sendBroadcast(intent)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_SET_ACTIVE) {
            overlayView?.setBackgroundColor(Color.parseColor("#4400FF00")) // Green (Active)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        if (overlayView != null) {
            windowManager.removeView(overlayView)
            overlayView = null
        }
    }
}
