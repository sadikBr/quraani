package expo.modules.athan

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/**
 * The athan's screen over the lock screen, opened by the playing notification's full-screen
 * intent (when the phone is locked or its screen is off). It shows the prayer and a button to stop
 * the athan, and closes itself when the athan ends.
 */
class AthanActivity : Activity() {
  private val handler = Handler(Looper.getMainLooper())
  private var sawPlaying = false
  private var checks = 0
  private val watch = object : Runnable {
    override fun run() {
      checks++
      if (AthanService.playing) sawPlaying = true
      // The athan ended, or never started (the service stops at once when it cannot play). The
      // service runs before its notification opens this screen; a few seconds' grace in any case.
      if (!AthanService.playing && (sawPlaying || !AthanService.running || checks > 10)) {
        finish()
        return
      }
      handler.postDelayed(this, 500)
    }
  }

  private fun dp(value: Float) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, resources.displayMetrics)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    setContentView(layout())
    handler.postDelayed(watch, 500)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    setContentView(layout())
  }

  private fun layout(): View {
    val title = intent.getStringExtra(EXTRA_TITLE) ?: ""
    val body = intent.getStringExtra(EXTRA_BODY) ?: ""
    val stop = intent.getStringExtra(EXTRA_STOP) ?: "Stop"
    val id = resources.getIdentifier("notification_icon_color", "color", packageName)
    val background = if (id != 0) getColor(id) else Color.rgb(16, 62, 53)

    val root = LinearLayout(this)
    root.orientation = LinearLayout.VERTICAL
    root.gravity = Gravity.CENTER
    root.layoutDirection = View.LAYOUT_DIRECTION_RTL
    root.setBackgroundColor(background)
    val padding = dp(32f).toInt()
    root.setPadding(padding, padding, padding, padding)

    val heading = TextView(this)
    heading.text = title
    heading.setTextColor(Color.WHITE)
    heading.setTextSize(TypedValue.COMPLEX_UNIT_SP, 30f)
    heading.typeface = Typeface.DEFAULT_BOLD
    heading.gravity = Gravity.CENTER
    root.addView(heading, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

    val detail = TextView(this)
    detail.text = body
    detail.setTextColor(Color.argb(210, 255, 255, 255))
    detail.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
    detail.gravity = Gravity.CENTER
    val detailParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
    detailParams.topMargin = dp(12f).toInt()
    root.addView(detail, detailParams)

    val button = Button(this)
    button.text = stop
    button.isAllCaps = false
    button.setTextColor(background)
    button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f)
    button.typeface = Typeface.DEFAULT_BOLD
    val shape = GradientDrawable()
    shape.cornerRadius = dp(28f)
    shape.setColor(Color.WHITE)
    button.background = shape
    button.minHeight = dp(56f).toInt()
    button.setOnClickListener {
      AthanService.stop(this)
      finish()
    }
    val buttonParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56f).toInt())
    buttonParams.topMargin = dp(48f).toInt()
    root.addView(button, buttonParams)
    return root
  }

  override fun onDestroy() {
    handler.removeCallbacks(watch)
    super.onDestroy()
  }

  companion object {
    const val EXTRA_TITLE = "expo.modules.athan.SCREEN_TITLE"
    const val EXTRA_BODY = "expo.modules.athan.SCREEN_BODY"
    const val EXTRA_STOP = "expo.modules.athan.SCREEN_STOP"

    fun intent(context: Context, title: String, body: String, stop: String): Intent =
      Intent(context, AthanActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
        .putExtra(EXTRA_TITLE, title)
        .putExtra(EXTRA_BODY, body)
        .putExtra(EXTRA_STOP, stop)
  }
}
