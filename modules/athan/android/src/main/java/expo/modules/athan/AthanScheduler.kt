package expo.modules.athan

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * A whole athan to play: when (epoch milliseconds), in which voice, and its notification's text.
 * `notifyAfter`: when it ends on its own, a plain notification stays (not for a test). The athan's
 * screen shows `screen` (empty in lists saved by an earlier version: it then shows the title).
 */
internal data class Athan(
  val id: String,
  val at: Long,
  val voice: String,
  val title: String,
  val body: String,
  val notifyAfter: Boolean = true,
  val screen: AthanScreenText = AthanScreenText(),
)

/** Text the app passes in its language. `fallbackChannel` plays the takbir; `heading` tops the athan's screen. */
internal data class AthanLabels(val stop: String, val channel: String, val fallbackChannel: String?, val heading: String = "")

/**
 * Keeps the list of athans the app scheduled (the app sends about a month) and arms one alarm, for
 * the next of them. Each alarm, a reboot, an update or a change of the clock arms the next one.
 */
internal object AthanScheduler {
  const val ACTION_FIRE = "expo.modules.athan.FIRE"
  const val ACTION_STOP = "expo.modules.athan.STOP"
  const val ACTION_TEST = "expo.modules.athan.TEST"
  const val EXTRA_ID = "expo.modules.athan.ID"
  private const val PREFS = "expo.modules.athan"
  private const val KEY_ATHANS = "athans"
  private const val KEY_LABELS = "labels"
  private const val KEY_FIRED = "fired"
  private const val KEY_TEST = "test"
  private const val KEY_SCREEN = "screen"
  private const val REQUEST_ALARM = 7301
  private const val REQUEST_TEST = 7307
  /** An athan this late still plays (a delayed alarm, a phone restarted at that moment); later, it only notifies. */
  const val LATE_LIMIT_MS = 10 * 60 * 1000L

  private fun prefs(context: Context): SharedPreferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  /** `{ "labels": {...}, "athans": [{ "id", "at", "voice", "title", "body" }] }`. */
  fun replace(context: Context, json: String) {
    val root = JSONObject(json)
    val athans = root.optJSONArray("athans") ?: JSONArray()
    // Read every entry before saving, so a malformed list fails here and not when an alarm fires.
    for (i in 0 until athans.length()) parseAthan(athans.getJSONObject(i))
    val editor = prefs(context).edit().putString(KEY_ATHANS, athans.toString())
    root.optJSONObject("labels")?.let { editor.putString(KEY_LABELS, it.toString()) }
    editor.apply()
    arm(context)
  }

  fun saveLabels(context: Context, labels: JSONObject) {
    prefs(context).edit().putString(KEY_LABELS, labels.toString()).apply()
  }

  fun labels(context: Context): AthanLabels {
    val saved = try {
      JSONObject(prefs(context).getString(KEY_LABELS, null) ?: "{}")
    } catch (e: Exception) {
      JSONObject()
    }
    val fallback = saved.optString("fallbackChannel", "")
    return AthanLabels(
      stop = saved.optString("stop", "Stop").ifEmpty { "Stop" },
      channel = saved.optString("channel", "Athan").ifEmpty { "Athan" },
      fallbackChannel = fallback.ifEmpty { null },
      heading = saved.optString("heading", ""),
    )
  }

  /** How the athan's screen looks, as chosen in the app. */
  fun saveScreenStyle(context: Context, json: String) {
    AthanScreenStyle.parse(json)
    prefs(context).edit().putString(KEY_SCREEN, json).apply()
  }

  fun screenStyle(context: Context): AthanScreenStyle = AthanScreenStyle.parse(prefs(context).getString(KEY_SCREEN, null))

  fun parseAthan(item: JSONObject): Athan = Athan(
    id = item.getString("id"),
    at = item.getLong("at"),
    voice = item.optString("voice", "original"),
    title = item.optString("title", ""),
    body = item.optString("body", ""),
    notifyAfter = item.optBoolean("notifyAfter", true),
    screen = AthanScreenText(
      name = item.optString("name", ""),
      time = item.optString("time", ""),
      date = item.optString("date", ""),
      place = item.optString("place", ""),
    ),
  )

  private fun athans(context: Context): List<Athan> {
    val result = ArrayList<Athan>()
    try {
      val list = JSONArray(prefs(context).getString(KEY_ATHANS, null) ?: "[]")
      for (i in 0 until list.length()) result.add(parseAthan(list.getJSONObject(i)))
    } catch (e: Exception) {
      // Nothing usable saved: no alarm.
    }
    return result
  }

  fun find(context: Context, id: String): Athan? = athans(context).firstOrNull { it.id == id }

  fun canScheduleExact(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarms.canScheduleExactAlarms()
  }

  private fun alarmIntent(context: Context, id: String?, flags: Int): PendingIntent? {
    val intent = Intent(context, AthanAlarmReceiver::class.java).setAction(ACTION_FIRE)
    if (id != null) intent.putExtra(EXTRA_ID, id)
    return PendingIntent.getBroadcast(context, REQUEST_ALARM, intent, flags or PendingIntent.FLAG_IMMUTABLE)
  }

  /**
   * A test of the athan in `seconds` (now if 0), by the same alarm path as a prayer, so the user can
   * lock the phone and see what comes: `{ "labels": {...}, "athan": {...} }`.
   */
  fun armTest(context: Context, json: String, seconds: Int) {
    val root = JSONObject(json)
    val item = root.getJSONObject("athan")
    val athan = parseAthan(item)
    val editor = prefs(context).edit().putString(KEY_TEST, item.toString())
    root.optJSONObject("labels")?.let { editor.putString(KEY_LABELS, it.toString()) }
    editor.apply()
    if (seconds <= 0) {
      AthanPlayer.start(context, athan.copy(at = System.currentTimeMillis()), checkSilence = false)
      return
    }
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = Intent(context, AthanAlarmReceiver::class.java).setAction(ACTION_TEST)
    val pending = PendingIntent.getBroadcast(context, REQUEST_TEST, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val at = System.currentTimeMillis() + seconds * 1000L
    try {
      if (canScheduleExact(context)) {
        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      } else {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      }
    } catch (e: SecurityException) {
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
    }
  }

  /** The test armed last, due now. */
  fun testAthan(context: Context): Athan? = try {
    prefs(context).getString(KEY_TEST, null)?.let { parseAthan(JSONObject(it)).copy(at = System.currentTimeMillis()) }
  } catch (e: Exception) {
    null
  }

  /** Remembers the athan an alarm just delivered, so it is never armed again. */
  fun markFired(context: Context, id: String) {
    prefs(context).edit().putString(KEY_FIRED, id).apply()
  }

  /**
   * Arms the alarm for the next athan not yet delivered, replacing any armed before. One whose time
   * passed less than LATE_LIMIT_MS ago (its alarm was late, or cancelled by a new list) fires now.
   */
  fun arm(context: Context) {
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmIntent(context, null, PendingIntent.FLAG_NO_CREATE)?.let { alarms.cancel(it) }
    val now = System.currentTimeMillis()
    val fired = prefs(context).getString(KEY_FIRED, null)
    val next = athans(context).filter { it.at > now - LATE_LIMIT_MS && it.id != fired }.minByOrNull { it.at } ?: return
    val pending = alarmIntent(context, next.id, PendingIntent.FLAG_UPDATE_CURRENT) ?: return
    val at = maxOf(next.at, now)
    try {
      if (canScheduleExact(context)) {
        alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      } else {
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
      }
    } catch (e: SecurityException) {
      // The exact-alarm permission was withdrawn in between.
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
    }
  }
}
