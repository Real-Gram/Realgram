package com.realgram.calling

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

class CallDeclineReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("call_id") ?: return
        if (!IncomingCallNotifications.validId(id)) return
        IncomingCallNotifications.dismiss(context, id)
        val pending = goAsync()
        executor.execute {
            try {
                val deviceId = IncomingCallNotifications.prefs(context).getString("device_id", "") ?: ""
                if (deviceId.isNotEmpty()) {
                    val connection = URL("https://api.realgram.no/api.php?mobile=1&action=call-decline").openConnection() as HttpURLConnection
                    try {
                        connection.requestMethod = "POST"
                        connection.connectTimeout = 3000
                        connection.readTimeout = 3000
                        connection.doOutput = true
                        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
                        val body = "_token=realgram-mobile-diag-v1&device_id=${URLEncoder.encode(deviceId, "UTF-8")}&call_id=$id"
                        connection.outputStream.use { it.write(body.toByteArray()) }
                        connection.inputStream.use { it.readBytes() }
                    } finally { connection.disconnect() }
                }
            } catch (_: Exception) { /* The authoritative ring also expires after 45 seconds. */ }
            finally { pending.finish() }
        }
    }
    companion object { private val executor = Executors.newSingleThreadExecutor() }
}
