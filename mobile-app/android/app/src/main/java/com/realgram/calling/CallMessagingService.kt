package com.realgram.calling

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.realgram.modules.CallPushModule

class CallMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        IncomingCallNotifications.prefs(this).edit().putString("token", token).apply()
        CallPushModule.emitIncoming() // Re-register a rotated token while JS is alive.
    }
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val preferences = IncomingCallNotifications.prefs(this)
        if (data["device_id"] != preferences.getString("device_id", "")) return
        when (data["type"]) {
            "call:incoming" -> IncomingCallNotifications.show(this, data)
            "call:ended" -> {
                IncomingCallNotifications.dismiss(this, data["call_id"] ?: "")
                CallPushModule.emitIncoming()
            }
        }
    }
}
