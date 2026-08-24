package com.noteece

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.File

/**
 * Bridge between the Prime capture services and local persistence.
 *
 * Contract:
 *  - [attach] must be called once with any valid Context before first use.
 *  - [ingest] appends one JSON Lines record per captured screen snapshot to an
 *    app-private store (`filesDir/captures/ingest.jsonl`). The store is size-capped;
 *    on overflow the oldest file is rotated out so memory/disk usage stays bounded.
 *  - [anchorLatest] returns the most recent capture as a JSON payload string suitable
 *    for hand-off to the React Native layer via the ACTION_ANCHOR_CAPTURED broadcast,
 *    or a JSON object with "ok": false when nothing is available.
 *
 * All data stays inside the app sandbox. Nothing here performs network I/O.
 */
object RustBridge {

    private const val TAG = "RustBridge"
    private const val CAPTURE_DIR = "captures"
    private const val CAPTURE_FILE = "ingest.jsonl"
    private const val MAX_STORE_BYTES: Long = 5L * 1024 * 1024 // rotate beyond 5 MB

    @Volatile
    private var appContext: Context? = null

    private val lock = Any()

    /** Attach application context. Idempotent; safe to call from any Service. */
    fun attach(context: Context) {
        if (appContext == null) {
            synchronized(lock) {
                if (appContext == null) {
                    appContext = context.applicationContext
                    ensureCaptureDir()
                    Log.i(TAG, "Attached to application context")
                }
            }
        }
    }

    /**
     * Persist one captured screen snapshot.
     * @return true when the record was written, false when the bridge is not
     *         attached or the write failed. Never throws.
     */
    fun ingest(rawText: String): Boolean {
        val context = appContext ?: run {
            Log.w(TAG, "ingest called before attach(); dropping capture")
            return false
        }
        if (rawText.isBlank()) return false

        val record = try {
            JSONObject()
                .put("ts", System.currentTimeMillis())
                .put("chars", rawText.length)
                .put("text", rawText)
                .toString()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to encode capture record", e)
            return false
        }

        return try {
            synchronized(lock) {
                val store = captureFile(context)
                rotateIfOversized(store)
                store.appendText(record + "\n", Charsets.UTF_8)
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist capture", e)
            false
        }
    }

    /**
     * Return the latest stored capture as a JSON string:
     * `{"ok":true,"ts":<millis>,"text":"..."}` or `{"ok":false,"reason":"empty"}`.
     */
    fun anchorLatest(): String {
        val context = appContext ?: return JSONObject().put("ok", false).put("reason", "not_attached").toString()
        return try {
            synchronized(lock) {
                val store = captureFile(context)
                val lastLine = store.useLines { lines -> lines.lastOrNull { it.isNotBlank() } }
                if (lastLine == null) {
                    JSONObject().put("ok", false).put("reason", "empty").toString()
                } else {
                    val record = JSONObject(lastLine)
                    JSONObject()
                        .put("ok", true)
                        .put("ts", record.optLong("ts"))
                        .put("text", record.optString("text"))
                        .toString()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to anchor latest capture", e)
            JSONObject().put("ok", false).put("reason", "error").toString()
        }
    }

    /** Test/support hook: total bytes currently retained by the capture store. */
    fun storeSizeBytes(): Long = synchronized(lock) {
        val context = appContext ?: return 0L
        captureFile(context).takeIf { it.exists() }?.length() ?: 0L
    }

    private fun ensureCaptureDir() {
        val context = appContext ?: return
        val dir = File(context.filesDir, CAPTURE_DIR)
        if (!dir.exists()) dir.mkdirs()
    }

    private fun captureFile(context: Context): File {
        val dir = File(context.filesDir, CAPTURE_DIR)
        if (!dir.exists()) dir.mkdirs()
        return File(dir, CAPTURE_FILE)
    }

    /**
     * Bounded-storage policy: when the active store exceeds MAX_STORE_BYTES,
     * move it aside to a timestamped archive, keeping at most one archive.
     */
    private fun rotateIfOversized(active: File) {
        if (!active.exists() || active.length() < MAX_STORE_BYTES) return

        val dir = active.parentFile ?: return
        val archive = File(dir, "ingest.archived.jsonl")
        if (archive.exists()) archive.delete()
        active.renameTo(archive)
        active.createNewFile()
    }
}
