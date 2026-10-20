package com.realgram.calling

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import com.realgram.MainActivity

object IncomingCallNotifications {
    const val CHANNEL = "realgram-incoming-calls-v1"
    fun prefs(context: Context) = context.getSharedPreferences("realgram-call-push", Context.MODE_PRIVATE)
    @Volatile var foreground = false
    fun validId(id: String) = Regex("[a-f0-9]{32}").matches(id)
    fun dismissed(context: Context, id: String) = prefs(context).getLong("ended:$id", 0) > System.currentTimeMillis()

    fun dismiss(context: Context, id: String) {
        if (!validId(id)) return
        val preferences = prefs(context)
        val edit = preferences.edit().putLong("ended:$id", System.currentTimeMillis() + 120_000)
        preferences.all.forEach { (key, value) ->
            if (key.startsWith("ended:") && value is Long && value < System.currentTimeMillis()) edit.remove(key)
        }
        edit.apply()
        NotificationManagerCompat.from(context).cancel(id, 4001)
    }

    fun show(context: Context, data: Map<String, String>) {
        val id = data["call_id"] ?: return
        val expiresAt = data["expires_at"]?.toLongOrNull()?.times(1000) ?: return
        val remaining = expiresAt - System.currentTimeMillis()
        if (!validId(id) || remaining !in 1..45_000 || dismissed(context, id)) return
        val preferences = prefs(context)
        if (preferences.getString("device_id", "") != data["device_id"]) return
        if (!preferences.getBoolean("enabled", false)) return
        // The live app handles WebSocket ringing; its resume path also queries
        // call-pending, so a push arriving during reconnect is not lost.
        if (foreground) {
            com.realgram.modules.CallPushModule.emitIncoming()
            return
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel(CHANNEL, "Incoming RealGram calls", NotificationManager.IMPORTANCE_HIGH)
            channel.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
                AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).build())
            channel.enableVibration(true)
            manager.createNotificationChannel(channel)
        }
        val caller = (data["caller_user_id"] ?: "RealGram").take(100)
        fun activity(action: String): PendingIntent {
            val intent = Intent(context, MainActivity::class.java)
                .setAction("realgram.call.$action.$id")
                .putExtra("realgram_call_id", id).putExtra("realgram_call_action", action)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            return PendingIntent.getActivity(context, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
        val declineIntent = Intent(context, CallDeclineReceiver::class.java)
            .setAction("realgram.call.decline.$id").putExtra("call_id", id)
        val decline = PendingIntent.getBroadcast(context, id.hashCode(), declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val fullScreen = Intent(context, IncomingCallActivity::class.java)
            .setAction("realgram.call.ring.$id").putExtra("call_id", id)
            .putExtra("caller", caller).putExtra("expires_at", expiresAt)
        val fullScreenPending = PendingIntent.getActivity(context, id.hashCode(), fullScreen,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentTitle(caller).setContentText(if (data["kind"] == "video") "Incoming video call" else "Incoming call")
            .setStyle(NotificationCompat.CallStyle.forIncomingCall(Person.Builder().setName(caller).build(), decline, activity("answer")))
            .setContentIntent(activity("open"))
            .setCategory(NotificationCompat.CATEGORY_CALL).setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setOngoing(true)
            .setOnlyAlertOnce(true).setTimeoutAfter(remaining)
        if (Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent()) notification.setFullScreenIntent(fullScreenPending, true)
        try {
            val built = notification.build()
            built.flags = built.flags or Notification.FLAG_INSISTENT
            manager.notify(id, 4001, built)
        } catch (_: SecurityException) { /* Notification permission is controlled by the user. */ }
    }
}
