package com.realgram.modules

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import com.realgram.calling.IncomingCallNotifications
import java.lang.ref.WeakReference

class CallPushModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    init { current = WeakReference(context) }
    override fun getName() = "CallPush"
    @ReactMethod fun configure(deviceId: String, enabled: Boolean, promise: Promise) {
        IncomingCallNotifications.prefs(context).edit().putString("device_id", deviceId).putBoolean("enabled", enabled).apply()
        try {
            if (FirebaseApp.getApps(context).isEmpty() && FirebaseApp.initializeApp(context) == null) { promise.resolve(null); return }
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    IncomingCallNotifications.prefs(context).edit().putString("token", task.result).apply()
                    promise.resolve(task.result)
                } else promise.resolve(null)
            }
        } catch (_: Exception) { promise.resolve(null) }
    }
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun existingStorageNamespace(): String? = java.io.File(context.filesDir, "mmkv")
        .listFiles()?.firstOrNull { it.isFile && it.name.endsWith("-v1") && it.name != "realgram-v1" }?.name

    @ReactMethod fun dismiss(callId: String) { IncomingCallNotifications.dismiss(context, callId) }
    @ReactMethod fun consumeAction(promise: Promise) {
        val intent = currentActivity?.intent
        val id = intent?.getStringExtra("realgram_call_id")
        if (id == null) { promise.resolve(null); return }
        val map = Arguments.createMap()
        map.putString("callId", id)
        map.putString("action", intent.getStringExtra("realgram_call_action") ?: "open")
        intent.removeExtra("realgram_call_id"); intent.removeExtra("realgram_call_action")
        promise.resolve(map)
    }
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
    companion object {
        private var current: WeakReference<ReactApplicationContext>? = null
        fun emitIncoming() {
            val context = current?.get() ?: return
            if (context.hasActiveReactInstance()) context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("RealGramCallPush", null)
        }
    }
}
