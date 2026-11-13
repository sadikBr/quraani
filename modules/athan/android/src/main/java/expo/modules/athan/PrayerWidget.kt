package expo.modules.athan

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews

/** The home-screen widget of the prayer times. Android asks it to draw itself; PrayerWidget does. */
class PrayerWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    PrayerWidget.refresh(context)
  }

  override fun onEnabled(context: Context) {
    PrayerWidget.refresh(context)
  }

  /** Resized: its layout follows its height. */
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
    PrayerWidget.refresh(context)
  }

  override fun onDisabled(context: Context) {
    PrayerWidget.disarm(context)
  }
}

/** The small widget (two cells by two): the next prayer alone. */
class PrayerSmallWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    PrayerWidget.refresh(context)
  }

  override fun onEnabled(context: Context) {
    PrayerWidget.refresh(context)
  }

  override fun onDisabled(context: Context) {
    PrayerWidget.disarm(context)
  }
}

/**
 * The prayer times on the home screen, in two widgets. The wide one: the next prayer in gold with
 * its time, the time left in a pill, the place and the date, then the day's six times in a row,
 * the next one lit in a box of its own and those past dimmed; where its cell is tall (Xiaomi's
 * launcher gives two tall rows) it is laid out to fill the height, the next prayer large and
 * centred. The small one: the next prayer, its time and the time left.
 *
 * Both are given the same times as the prayer times notification (see AthanTimes.show), keep
 * them, and redraw at each prayer and at midnight, on the athan's own alarm, and after a restart,
 * an update or a change of the clock. Always right to left, in the app's own colours. A tap opens
 * the prayer times.
 */
internal object PrayerWidget {
  const val ACTION_UPDATE = "expo.modules.athan.WIDGET_UPDATE"
  private const val PREFS = "expo.modules.athan"
  private const val KEY_TIMES = "widget_times"
  private const val REQUEST_UPDATE = 7321
  private const val REQUEST_OPEN = 7322

  /** One of the day's six times: its box (lit for the next prayer), its name and its time. */
  private class Cell(val box: Int, val name: Int, val time: Int)

  private val CELLS: Map<String, Cell> = mapOf(
    "fajr" to Cell(R.id.athan_widget_fajr, R.id.athan_widget_fajr_name, R.id.athan_widget_fajr_time),
    "sunrise" to Cell(R.id.athan_widget_sunrise, R.id.athan_widget_sunrise_name, R.id.athan_widget_sunrise_time),
    "dhuhr" to Cell(R.id.athan_widget_dhuhr, R.id.athan_widget_dhuhr_name, R.id.athan_widget_dhuhr_time),
    "asr" to Cell(R.id.athan_widget_asr, R.id.athan_widget_asr_name, R.id.athan_widget_asr_time),
    "maghrib" to Cell(R.id.athan_widget_maghrib, R.id.athan_widget_maghrib_name, R.id.athan_widget_maghrib_time),
    "isha" to Cell(R.id.athan_widget_isha, R.id.athan_widget_isha_name, R.id.athan_widget_isha_time),
  )

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun alarms(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  /** From this height (dp) the wide widget is laid out to fill it. */
  private const val TALL_DP = 180

  private fun ids(context: Context, manager: AppWidgetManager, provider: Class<*>): IntArray = try {
    manager.getAppWidgetIds(ComponentName(context, provider))
  } catch (e: Exception) {
    IntArray(0)
  }

  /** The widget's height in portrait (dp), or 0 when the launcher does not say. */
  private fun heightOf(manager: AppWidgetManager, id: Int): Int = try {
    manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
  } catch (e: Exception) {
    0
  }

  /** Keeps the times (the JSON of AthanTimes.show), or forgets them when given none, and redraws. */
  fun save(context: Context, json: String) {
    if (json.isEmpty()) {
      prefs(context).edit().remove(KEY_TIMES).apply()
    } else {
      // Read it all first, so a malformed list fails here and not at the next prayer.
      AthanTimes.parse(json)
      prefs(context).edit().putString(KEY_TIMES, json).apply()
    }
    refresh(context)
  }

  /** Asks the launcher to offer a widget for the home screen (Android 8+, where the launcher allows it). */
  fun pin(context: Context, provider: Class<*>): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    val manager = AppWidgetManager.getInstance(context)
    return try {
      manager.isRequestPinAppWidgetSupported && manager.requestPinAppWidget(ComponentName(context, provider), null, null)
    } catch (e: Exception) {
      false
    }
  }

  /** Draws every widget on the home screen as the times stand now, and arms the next redraw. */
  fun refresh(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val wide = ids(context, manager, PrayerWidgetProvider::class.java)
    val small = ids(context, manager, PrayerSmallWidgetProvider::class.java)
    if (wide.isEmpty() && small.isEmpty()) return
    val times = prefs(context).getString(KEY_TIMES, null)?.let {
      try {
        AthanTimes.parse(it)
      } catch (e: Exception) {
        null
      }
    }
    val now = System.currentTimeMillis()
    val day = times?.days?.firstOrNull { d -> d.times.any { it.at > now } }
    val next = day?.times?.firstOrNull { it.at > now }
    for (id in wide) {
      val layout = if (heightOf(manager, id) >= TALL_DP) R.layout.athan_widget_tall else R.layout.athan_widget
      draw(context, manager, id, layout, true, times, day, next, now)
    }
    for (id in small) draw(context, manager, id, R.layout.athan_widget_small, false, times, day, next, now)
    if (next != null) arm(context, minOf(next.at, AthanTimes.nextMidnight(now)))
  }

  /** One widget in `layout`; `whole`: with the date and the day's six times (the wide widget). */
  private fun draw(
    context: Context, manager: AppWidgetManager, id: Int, layout: Int, whole: Boolean,
    times: AthanTimes.Times?, day: AthanTimes.Day?, next: AthanTimes.Moment?, now: Long,
  ) {
    val views = RemoteViews(context.packageName, layout)
    if (times == null || day == null || next == null) {
      // No place chosen yet, or the app was not opened for weeks: it says to open the app.
      views.setViewVisibility(R.id.athan_widget_content, View.GONE)
      views.setViewVisibility(R.id.athan_widget_empty, View.VISIBLE)
    } else {
      views.setViewVisibility(R.id.athan_widget_empty, View.GONE)
      views.setViewVisibility(R.id.athan_widget_content, View.VISIBLE)
      views.setTextViewText(R.id.athan_widget_next_name, AthanTimes.name(times, next))
      views.setTextViewText(R.id.athan_widget_next_time, AthanTimes.clock(next.at))
      // Without exact alarms the redraw can come late, and the countdown would run below zero.
      if (AthanScheduler.canScheduleExact(context)) {
        views.setChronometer(R.id.athan_widget_countdown, SystemClock.elapsedRealtime() + (next.at - now), times.countdown, true)
        views.setChronometerCountDown(R.id.athan_widget_countdown, true)
        views.setViewVisibility(R.id.athan_widget_countdown, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.athan_widget_countdown, View.GONE)
      }
      if (whole) {
        // After Isha it shows the next day.
        val date = if (day.day > AthanTimes.dayKey(now) && times.tomorrow.isNotEmpty()) "${times.tomorrow} · ${day.date}" else day.date
        views.setTextViewText(R.id.athan_widget_date, if (times.place.isNotEmpty()) "${times.place} · $date" else date)
        val accent = context.getColor(R.color.athan_widget_accent)
        val text = context.getColor(R.color.athan_widget_text)
        val past = context.getColor(R.color.athan_widget_past)
        for (moment in day.times) {
          val cell = CELLS[moment.prayer] ?: continue
          val color = when {
            moment === next -> accent
            moment.at <= now -> past
            else -> text
          }
          views.setTextViewText(cell.name, AthanTimes.name(times, moment))
          views.setTextViewText(cell.time, AthanTimes.clock(moment.at))
          views.setTextColor(cell.name, color)
          views.setTextColor(cell.time, color)
          views.setInt(cell.box, "setBackgroundResource", if (moment === next) R.drawable.athan_widget_next else 0)
        }
      }
    }
    AthanTimes.openTimes(context, times?.url ?: "", REQUEST_OPEN)?.let { views.setOnClickPendingIntent(R.id.athan_widget_root, it) }
    try {
      manager.updateAppWidget(id, views)
    } catch (e: Exception) {
      // The launcher refused it: the next redraw tries again.
    }
  }

  private fun updateIntent(context: Context): PendingIntent {
    val intent = Intent(context, AthanAlarmReceiver::class.java).setAction(ACTION_UPDATE)
    return PendingIntent.getBroadcast(context, REQUEST_UPDATE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /** A kind of widget is off the home screen: with none of either left, nothing is redrawn. */
  fun disarm(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    if (ids(context, manager, PrayerWidgetProvider::class.java).isEmpty() && ids(context, manager, PrayerSmallWidgetProvider::class.java).isEmpty()) {
      alarms(context).cancel(updateIntent(context))
    }
  }

  /** The next redraw: it does not wake the phone, and is never an "allow while idle" alarm (those are the athan's). */
  private fun arm(context: Context, at: Long) {
    val alarms = alarms(context)
    val pending = updateIntent(context)
    try {
      if (AthanScheduler.canScheduleExact(context)) {
        alarms.setExact(AlarmManager.RTC, at, pending)
      } else {
        alarms.setWindow(AlarmManager.RTC, at, 60_000L, pending)
      }
    } catch (e: SecurityException) {
      alarms.setWindow(AlarmManager.RTC, at, 60_000L, pending)
    }
  }
}
