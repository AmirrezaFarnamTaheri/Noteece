package com.noteece.modules

import android.content.Intent
import android.content.pm.PackageManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.noteece.services.NoteeceAccessibilityService

class AppLauncherModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppLauncher"
    }

    @ReactMethod
    fun launchWithSession(packageName: String, platformId: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            val pm = context.packageManager
            val launchIntent = pm.getLaunchIntentForPackage(packageName)

            if (launchIntent != null) {
                // 1. Signal Accessibility Service (Only works if enabled in Settings)
                // We use explicit intent to the specific service class
                // Note: Class resolution might fail in 'store' flavor if not handled carefully,
                // but since we define the class in both flavors (one stub, one real), this is safe.
                try {
                    val signalIntent = Intent(context, Class.forName("com.noteece.services.NoteeceAccessibilityService"))
                    signalIntent.action = "com.noteece.ACTION_START_SESSION"
                    signalIntent.putExtra("PLATFORM_ID", platformId)
                    context.startService(signalIntent)
                } catch (e: Exception) {
                    // Service might not be running or permission not granted
                    // In 'Store' flavor, this service exists but does nothing.
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
