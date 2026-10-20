package com.realgram.calling

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.content.Intent
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.realgram.MainActivity

/** Native lock-screen UI: no JavaScript startup is needed to hear/see the ring. */
class IncomingCallActivity : Activity() {
    private val handler = Handler(Looper.getMainLooper())
    private var callId = ""
    private val checkExpired = object : Runnable {
        override fun run() {
            if (System.currentTimeMillis() >= intent.getLongExtra("expires_at", 0) || IncomingCallNotifications.dismissed(this@IncomingCallActivity, callId)) finish()
            else handler.postDelayed(this, 500)
        }
    }
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        callId = intent.getStringExtra("call_id") ?: ""
        if (!IncomingCallNotifications.validId(callId)) { finish(); return }
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
        else window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        val layout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER; setPadding(48, 48, 48, 48) }
        layout.addView(TextView(this).apply { text = "RealGram\nIncoming call\n${intent.getStringExtra("caller") ?: "RealGram"}"; textSize = 26f; gravity = Gravity.CENTER })
        layout.addView(Button(this).apply {
            text = "Answer"
            setOnClickListener {
                startActivity(Intent(this@IncomingCallActivity, MainActivity::class.java)
                    .putExtra("realgram_call_id", callId).putExtra("realgram_call_action", "answer")
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP))
                finish()
            }
        })
        layout.addView(Button(this).apply {
            text = "Decline"
            setOnClickListener {
                sendBroadcast(Intent(this@IncomingCallActivity, CallDeclineReceiver::class.java).putExtra("call_id", callId))
                finish()
            }
        })
        setContentView(layout)
        handler.post(checkExpired)
    }
    override fun onDestroy() { handler.removeCallbacks(checkExpired); super.onDestroy() }
}
