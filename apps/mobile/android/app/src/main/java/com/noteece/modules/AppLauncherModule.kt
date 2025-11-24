package com.noteece.modules

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.noteece.services.NoteeceAccessibilityService

class AppLauncherModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppLauncher"
    }

    private val anchorReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == "com.noteece.ACTION_ANCHOR_CAPTURED") {
                val payload = intent.getStringExtra("PAYLOAD") ?: "{}"
                sendEvent("onNoteAnchored", payload)
            }
        }
    }

    private fun sendEvent(eventName: String, params: Any?) {
        if (reactApplicationContext.hasActiveCatalystInstance()) {
             reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    override fun initialize() {
        super.initialize()
        val filter = IntentFilter("com.noteece.ACTION_ANCHOR_CAPTURED")
        try {
            if (android.os.Build.VERSION.SDK_INT >= 33) { // TIRAMISU
                reactApplicationContext.registerReceiver(anchorReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                reactApplicationContext.registerReceiver(anchorReceiver, filter)
            }
        } catch (e: Exception) {
            // Log error
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            reactApplicationContext.unregisterReceiver(anchorReceiver)
        } catch (e: Exception) {}
    }

    @ReactMethod
    fun launchWithSession(packageName: String, platformId: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val pm = context.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageName)

            if (launchIntent != null) {
                // 1. Signal Accessibility Service (Only works if enabled in Settings)
                try {
                    val signalIntent = Intent(context, Class.forName("com.noteece.services.NoteeceAccessibilityService"))
                    signalIntent.action = "com.noteece.ACTION_START_SESSION"
                    signalIntent.putExtra("PLATFORM_ID", platformId)
                    context.startService(signalIntent)
                } catch (e: Exception) {
                    // Service might not be running or permission not granted
                }

                // 2. Launch Target App
                context.startActivity(launchIntent)
                promise.resolve(true)
            } else {
                promise.reject("APP_NOT_FOUND", "App not installed: $packageName")
            }
        } catch (e: Exception) {
            promise.reject("LAUNCH_ERROR", e)
        }
    }
}
