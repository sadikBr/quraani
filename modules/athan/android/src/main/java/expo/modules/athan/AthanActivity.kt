package expo.modules.athan

import android.animation.Animator
import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.animation.ValueAnimator
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min

/** What the athan's screen says: «حان وقت صلاة», the prayer, its time, the Hijri date and the place. */
internal data class AthanScreenText(
  val heading: String = "",
  val name: String = "",
  val time: String = "",
  val date: String = "",
  val place: String = "",
) {
  /** An athan saved by an earlier version has only its notification's title and body. */
  fun withFallback(heading: String, title: String, body: String): AthanScreenText =
    if (name.isNotEmpty()) copy(heading = this.heading.ifEmpty { heading }) else AthanScreenText(name = title, place = body)
}

/**
 * How the screen looks, chosen in the app: a photo (or a plain colour), how much it is darkened,
 * the movement (rings pulsing out, a breathing glow, or none) and whether the Hijri date shows.
 */
internal data class AthanScreenStyle(val background: String, val dim: String, val motion: String, val date: Boolean) {
  companion object {
    val DEFAULT = AthanScreenStyle("makkah_night", "medium", "pulse", true)

    fun parse(json: String?): AthanScreenStyle = try {
      val o = JSONObject(json ?: "{}")
      AthanScreenStyle(
        background = o.optString("background", DEFAULT.background),
        dim = o.optString("dim", DEFAULT.dim),
        motion = o.optString("motion", DEFAULT.motion),
        date = o.optBoolean("date", DEFAULT.date),
      )
    } catch (e: Exception) {
      DEFAULT
    }
  }
}

/**
 * The athan's screen over the lock screen, opened by the playing notification's full-screen intent
 * (when the phone is locked or its screen is off), or from the app as a silent preview. A photo of
 * a mosque drifting slowly, darkened for the text; rings pulsing out from the time (or a breathing
 * glow); the prayer, its time, the date and the place; and a button to stop the athan. It closes
 * itself when the athan ends.
 */
class AthanActivity : Activity() {
  private val handler = Handler(Looper.getMainLooper())
  private var preview = false
  private var sawPlaying = false
  private var checks = 0
  private val animators = ArrayList<Animator>()
  private var pulse: PulseView? = null
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
    edgeToEdge()
    render()
  }

  /**
   * The athan shows over the lock screen, wakes the screen and keeps it on; a preview from the app
   * does none of that.
   */
  private fun overLockScreen(on: Boolean) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(on)
      setTurnScreenOn(on)
    } else {
      @Suppress("DEPRECATION")
      val flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      if (on) window.addFlags(flags) else window.clearFlags(flags)
    }
    if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  /** A preview left (home, another app, the screen off) is done with; the athan's screen stays. */
  override fun onStop() {
    super.onStop()
    if (preview) finish()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    render()
  }

  private fun render() {
    stopMotion()
    handler.removeCallbacks(watch)
    preview = intent.getBooleanExtra(EXTRA_PREVIEW, false)
    overLockScreen(!preview)
    setContentView(build(AthanScheduler.screenStyle(this)))
    if (!preview) handler.postDelayed(watch, 500)
  }

  /** Drawn behind the status and navigation bars, which stay transparent over the photo. */
  @Suppress("DEPRECATION")
  private fun edgeToEdge() {
    window.setBackgroundDrawable(ColorDrawable(Color.BLACK))
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT
    window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
      View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
      View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
  }

  /** The system bars' heights, to keep the text and the button clear of them. */
  private fun barInsets(insets: WindowInsets): Pair<Int, Int> =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val bars = insets.getInsets(WindowInsets.Type.systemBars())
      bars.top to bars.bottom
    } else {
      @Suppress("DEPRECATION")
      (insets.systemWindowInsetTop to insets.systemWindowInsetBottom)
    }

  /** `fixed`: in dp, not scaled by the font size setting (the name and the time, which must fit on one line). */
  private fun text(size: Float, alpha: Int, typeface: Typeface, shadow: Boolean = true, fixed: Boolean = false): TextView {
    val view = TextView(this)
    view.setTextColor(Color.argb(alpha, 255, 255, 255))
    view.setTextSize(if (fixed) TypedValue.COMPLEX_UNIT_DIP else TypedValue.COMPLEX_UNIT_SP, size)
    view.typeface = typeface
    view.gravity = Gravity.CENTER
    view.includeFontPadding = false
    view.maxLines = 2
    view.ellipsize = TextUtils.TruncateAt.END
    // Keeps white text readable over a bright part of a photo.
    if (shadow) view.setShadowLayer(dp(14f), 0f, dp(1f), Color.argb(110, 0, 0, 0))
    return view
  }

  private fun build(style: AthanScreenStyle): View {
    val words = AthanScreenText(
      heading = intent.getStringExtra(EXTRA_HEADING) ?: "",
      name = intent.getStringExtra(EXTRA_NAME) ?: "",
      time = intent.getStringExtra(EXTRA_TIME) ?: "",
      date = intent.getStringExtra(EXTRA_DATE) ?: "",
      place = intent.getStringExtra(EXTRA_PLACE) ?: "",
    )
    val match = FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    val root = FrameLayout(this)
    root.layoutDirection = View.LAYOUT_DIRECTION_RTL
    root.setBackgroundColor(Color.BLACK)
    val moving = style.motion != "none"

    val photo = PHOTOS[style.background]
    if (photo != null) {
      val image = ImageView(this)
      image.scaleType = ImageView.ScaleType.CENTER_CROP
      image.setImageResource(photo)
      root.addView(image, match)
      // A slow drift, so the photo feels alive without drawing the eye.
      if (moving) {
        val drift = ObjectAnimator.ofPropertyValuesHolder(image,
          PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.1f),
          PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.1f))
        drift.duration = 30_000L
        drift.repeatCount = ValueAnimator.INFINITE
        drift.repeatMode = ValueAnimator.REVERSE
        drift.interpolator = AccelerateDecelerateInterpolator()
        drift.start()
        animators.add(drift)
      }
    } else {
      val colors = PLAIN[style.background] ?: PLAIN.getValue("green")
      root.background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, colors)
    }

    // Darker at the top and much darker at the bottom, where the text and the button sit.
    val dim = DIMS[style.dim] ?: DIMS.getValue("medium")
    val scrim = View(this)
    scrim.background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
      dim.map { Color.argb((it * if (photo != null) 255 else 120).toInt(), 0, 0, 0) }.toIntArray())
    root.addView(scrim, match)

    val rings = if (moving) PulseView(this, glow = style.motion == "glow") else null
    rings?.let { root.addView(it, match) }
    pulse = rings

    val column = LinearLayout(this)
    column.orientation = LinearLayout.VERTICAL
    column.gravity = Gravity.CENTER_HORIZONTAL
    column.addView(View(this), LinearLayout.LayoutParams(0, 0, 0.82f))

    val block = LinearLayout(this)
    block.orientation = LinearLayout.VERTICAL
    block.gravity = Gravity.CENTER_HORIZONTAL
    val wrap = { top: Float -> LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).also { it.topMargin = dp(top).toInt() } }
    if (words.heading.isNotEmpty()) {
      val heading = text(17f, 220, Typeface.create("sans-serif-medium", Typeface.NORMAL))
      heading.text = words.heading
      heading.letterSpacing = 0.02f
      block.addView(heading, wrap(0f))
    }
    val name = text(46f, 255, Typeface.create("sans-serif", Typeface.BOLD), fixed = true)
    name.maxLines = 1
    name.text = words.name
    block.addView(name, wrap(10f))
    val time = text(92f, 255, Typeface.create("sans-serif-thin", Typeface.NORMAL), fixed = true)
    time.maxLines = 1
    time.text = words.time
    time.textDirection = View.TEXT_DIRECTION_LTR
    time.letterSpacing = -0.02f
    time.visibility = if (words.time.isEmpty()) View.GONE else View.VISIBLE
    block.addView(time, wrap(2f))
    if (style.date && words.date.isNotEmpty()) {
      val date = text(17f, 235, Typeface.create("sans-serif", Typeface.NORMAL))
      date.text = words.date
      block.addView(date, wrap(14f))
    }
    if (words.place.isNotEmpty()) {
      val place = text(15f, 190, Typeface.create("sans-serif", Typeface.NORMAL))
      place.text = words.place
      block.addView(place, wrap(6f))
    }
    column.addView(block, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
    column.addView(View(this), LinearLayout.LayoutParams(0, 0, 1.18f))

    val label = intent.getStringExtra(EXTRA_STOP)?.ifEmpty { null } ?: if (preview) "Close" else "Stop"
    val button = text(19f, 255, Typeface.create("sans-serif-medium", Typeface.NORMAL), shadow = false)
    button.text = label
    button.maxLines = 1
    button.isClickable = true
    button.isFocusable = true
    button.contentDescription = label
    button.background = glass()
    button.setOnClickListener {
      if (!preview) AthanService.stop(this)
      finish()
    }
    column.addView(button, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(60f).toInt()))
    root.addView(column, match)

    val side = dp(28f).toInt()
    root.setOnApplyWindowInsetsListener { _, insets ->
      val (top, bottom) = barInsets(insets)
      column.setPadding(side, top + dp(16f).toInt(), side, bottom + dp(28f).toInt())
      insets
    }
    // The rings open around the prayer's name and its time.
    block.addOnLayoutChangeListener { _, _, _, _, _, _, _, _, _ ->
      val bottom = if (time.visibility == View.VISIBLE) time.bottom else name.bottom
      rings?.center(column.left + block.left + block.width / 2f, column.top + block.top + (name.top + bottom) / 2f)
    }

    // The text rises in, then the button.
    block.alpha = 0f
    block.translationY = dp(24f)
    block.animate().alpha(1f).translationY(0f).setDuration(900L).setInterpolator(DecelerateInterpolator(2f)).start()
    button.alpha = 0f
    button.animate().alpha(1f).setStartDelay(450L).setDuration(700L).start()
    rings?.start()
    return root
  }

  /** A frosted button: a light veil with a fine edge, brighter when pressed. */
  private fun glass(): StateListDrawable {
    fun shape(fill: Int, edge: Int) = GradientDrawable().also {
      it.cornerRadius = dp(18f)
      it.setColor(Color.argb(fill, 255, 255, 255))
      it.setStroke(dp(1f).toInt(), Color.argb(edge, 255, 255, 255))
    }
    val states = StateListDrawable()
    states.addState(intArrayOf(android.R.attr.state_pressed), shape(80, 120))
    states.addState(intArrayOf(), shape(40, 90))
    return states
  }

  private fun stopMotion() {
    animators.forEach { it.cancel() }
    animators.clear()
    pulse?.stop()
    pulse = null
  }

  override fun onDestroy() {
    handler.removeCallbacks(watch)
    stopMotion()
    super.onDestroy()
  }

  /**
   * Rings that open out from the time and fade, one after another, like a call spreading; or, as a
   * glow, a soft light that slowly breathes behind it.
   */
  private class PulseView(context: Context, private val glow: Boolean) : View(context) {
    private var cx = -1f
    private var cy = -1f
    private var phase = 0f
    private val density = context.resources.displayMetrics.density
    private val ring = Paint(Paint.ANTI_ALIAS_FLAG).also {
      it.style = Paint.Style.STROKE
      it.color = Color.WHITE
      it.strokeWidth = 1.5f * density
    }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val animator = ValueAnimator.ofFloat(0f, 1f).also {
      it.duration = if (glow) 5_000L else 3_600L
      it.repeatCount = ValueAnimator.INFINITE
      it.interpolator = LinearInterpolator()
      it.addUpdateListener { a ->
        phase = a.animatedValue as Float
        invalidate()
      }
    }

    fun center(x: Float, y: Float) {
      cx = x
      cy = y
      shade()
      invalidate()
    }

    fun start() = animator.start()
    fun stop() = animator.cancel()

    private fun base() = min(width, height) * 0.36f

    private fun shade() {
      if (cx < 0 || base() <= 0f) return
      fill.shader = if (glow) {
        RadialGradient(cx, cy, base() * 1.5f, intArrayOf(Color.argb(90, 255, 255, 255), Color.argb(28, 255, 255, 255), Color.argb(0, 255, 255, 255)),
          floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP)
      } else {
        null
      }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
      super.onSizeChanged(w, h, oldw, oldh)
      shade()
    }

    override fun onDraw(canvas: Canvas) {
      if (cx < 0 || base() <= 0f) return
      val base = base()
      if (glow) {
        // 0 → 1 → 0 over each cycle.
        val breath = ((1 - cos(phase * 2 * PI)) / 2).toFloat()
        canvas.save()
        val scale = 0.88f + 0.22f * breath
        canvas.scale(scale, scale, cx, cy)
        fill.alpha = (150 + 105 * breath).toInt()
        canvas.drawCircle(cx, cy, base * 1.5f, fill)
        canvas.restore()
        ring.alpha = (40 + 60 * breath).toInt()
        canvas.drawCircle(cx, cy, base * (0.96f + 0.06f * breath), ring)
      } else {
        // A still halo, and three rings leaving it in turn.
        fill.color = Color.argb(18, 255, 255, 255)
        canvas.drawCircle(cx, cy, base, fill)
        ring.alpha = 80
        canvas.drawCircle(cx, cy, base, ring)
        val span = min(width, height) * 0.30f
        for (i in 0 until 3) {
          val t = (phase + i / 3f) % 1f
          ring.alpha = ((1 - t) * (1 - t) * 120).toInt()
          canvas.drawCircle(cx, cy, base + span * t, ring)
        }
      }
    }
  }

  companion object {
    const val EXTRA_HEADING = "expo.modules.athan.SCREEN_HEADING"
    const val EXTRA_NAME = "expo.modules.athan.SCREEN_NAME"
    const val EXTRA_TIME = "expo.modules.athan.SCREEN_TIME"
    const val EXTRA_DATE = "expo.modules.athan.SCREEN_DATE"
    const val EXTRA_PLACE = "expo.modules.athan.SCREEN_PLACE"
    const val EXTRA_STOP = "expo.modules.athan.SCREEN_STOP"
    const val EXTRA_PREVIEW = "expo.modules.athan.SCREEN_PREVIEW"

    /** The photos, in `res/drawable-nodpi` (sources in `modules/athan/PHOTOS.md`). */
    private val PHOTOS = mapOf(
      "makkah_night" to R.drawable.athan_screen_makkah_night,
      "makkah_day" to R.drawable.athan_screen_makkah_day,
      "madinah" to R.drawable.athan_screen_madinah,
      "madinah_night" to R.drawable.athan_screen_madinah_night,
      "aqsa" to R.drawable.athan_screen_aqsa,
      "hassan2" to R.drawable.athan_screen_hassan2,
      "koutoubia" to R.drawable.athan_screen_koutoubia,
    )

    /** Plain backgrounds, top to bottom. */
    private val PLAIN = mapOf(
      "green" to intArrayOf(Color.rgb(20, 84, 70), Color.rgb(9, 42, 35), Color.rgb(4, 22, 18)),
      "night" to intArrayOf(Color.rgb(28, 40, 74), Color.rgb(11, 17, 36), Color.rgb(3, 5, 12)),
    )

    /** How dark the veil is, top, upper middle, lower middle and bottom (0–1). */
    private val DIMS = mapOf(
      "light" to floatArrayOf(0.30f, 0.10f, 0.25f, 0.62f),
      "medium" to floatArrayOf(0.45f, 0.22f, 0.40f, 0.75f),
      "strong" to floatArrayOf(0.62f, 0.42f, 0.55f, 0.85f),
    )

    internal fun intent(context: Context, text: AthanScreenText, button: String, preview: Boolean): Intent =
      Intent(context, AthanActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
        .putExtra(EXTRA_HEADING, text.heading)
        .putExtra(EXTRA_NAME, text.name)
        .putExtra(EXTRA_TIME, text.time)
        .putExtra(EXTRA_DATE, text.date)
        .putExtra(EXTRA_PLACE, text.place)
        .putExtra(EXTRA_STOP, button)
        .putExtra(EXTRA_PREVIEW, preview)
  }
}
