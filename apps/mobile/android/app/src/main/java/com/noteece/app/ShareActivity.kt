package com.noteece.app

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.content.Context
import org.json.JSONObject
import org.json.JSONArray
import java.io.File
import java.io.FileOutputStream

class ShareActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        handleSharedContent()
        finish()
    }

    private fun handleSharedContent() {
        when (intent?.action) {
            Intent.ACTION_SEND -> {
                handleSingleShare()
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                handleMultipleShare()
            }
        }
    }

    private fun handleSingleShare() {
        val type = intent.type ?: return

        when {
            type.startsWith("text/") -> {
                val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
                if (sharedText != null) {
                    saveSharedText(sharedText)
                }
            }
            type.startsWith("image/") -> {
                val imageUri = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
                if (imageUri != null) {
                    saveSharedImage(imageUri)
                }
            }
        }
    }

    private fun handleMultipleShare() {
        val imageUris = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
        if (imageUris != null) {
            for (uri in imageUris) {
                saveSharedImage(uri)
            }
        }
    }

    private fun saveSharedText(text: String) {
        val sharedData = JSONObject().apply {
            put("type", "text")
            put("text", text)
            put("timestamp", System.currentTimeMillis())
        }
        saveToSharedPreferences(sharedData)
    }

    private fun saveSharedImage(uri: Uri) {
        val sharedData = JSONObject().apply {
            put("type", "image")
            put("uri", uri.toString())
            put("timestamp", System.currentTimeMillis())
        }
        saveToSharedPreferences(sharedData)
    }

    private fun saveToSharedPreferences(data: JSONObject) {
        try {
            val prefs = getSharedPreferences("noteece_shared_items", Context.MODE_PRIVATE)
            val existingItems = prefs.getString("items", "[]")
            val itemsArray = JSONArray(existingItems)

            // Add new item
            itemsArray.put(data)

            // Save back
            prefs.edit().putString("items", itemsArray.toString()).apply()

            // Launch main app to process the shared content
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            launchIntent?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra("shared_content", true)
                startActivity(this)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
