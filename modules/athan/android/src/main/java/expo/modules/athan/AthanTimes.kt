package expo.modules.athan

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/**
 * The prayer times notification: always there and quiet. Collapsed, it shows the next prayer, the
 * time left and the ones after it; expanded, the date and the day's six times as a list, the next
 * one in colour and those past dimmed. The app sends the times of the coming weeks with their text
 * (see `show`); this keeps them and refreshes the notification at each prayer and at midnight, and
 * after a restart, an update or a change of the clock.
 */
internal object AthanTimes {
  const val ACTION_UPDATE = "expo.modules.athan.TIMES_UPDATE"
  private const val NOTIFICATION_ID = 7310
  private const val CHANNEL_ID = "prayer-times"
  private const val GROUP = "expo.modules.athan.TIMES"
  private const val REQUEST_UPDATE = 7311
  private const val REQUEST_OPEN = 7312
  private const val PREFS = "expo.modules.athan"
  private const val KEY_TIMES = "times"
  /** The prayers after the next one, in the collapsed view. */
  private const val FOLLOWING = 2
  private val PRAYERS = listOf("fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha")

  private class Moment(val prayer: String, val at: Long)
  private class Day(val day: String, val date: String, val times: List<Moment>)
  private class Times(
    val channel: String,
    val tomorrow: String,
    val countdown: String,
    val place: String,
    val url: String,
    val names: Map<String, String>,
    val days: List<Day>,
  )

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /**
   * `{ "labels": { "channel", "tomorrow", "countdown" (with %s) }, "place", "url", "names": { "fajr": … },
   * "days": [{ "day": "2026-10-11", "date", "times": [{ "prayer", "at" }] }] }`, days in the phone's
   * calendar, `at` in epoch milliseconds.
   */
  fun show(context: Context, json: String) {
    // Read it all first, so a malformed list fails here and not at the next prayer.
    parse(json)
    prefs(context).edit().putString(KEY_TIMES, json).apply()
    refresh(context)
  }

  fun hide(context: Context) {
    prefs(context).edit().remove(KEY_TIMES).apply()
    manager(context).cancel(NOTIFICATION_ID)
    alarms(context).cancel(updateIntent(context))
  }

  private fun parse(json: String): Times {
    val root = JSONObject(json)
    val labels = root.getJSONObject("labels")
    val names = root.getJSONObject("names")
    val list = root.getJSONArray("days")
    val days = (0 until list.length()).map { i ->
      val item = list.getJSONObject(i)
      val times = item.getJSONArray("times")
      Day(item.getString("day"), item.optString("date", ""), (0 until times.length()).map { j ->
        val t = times.getJSONObject(j)
        Moment(t.getString("prayer"), t.getLong("at"))
      })
    }
    return Times(
      channel = labels.optString("channel", "Prayer times"),
      tomorrow = labels.optString("tomorrow", ""),
      countdown = labels.optString("countdown", "%s"),
      place = root.optString("place", ""),
      url = root.optString("url", ""),
      names = PRAYERS.associateWith { names.optString(it, it) },
      days = days,
    )
  }

  /** Shows the times as they stand now and arms the next refresh; nothing when they are off or ran out. */
  fun refresh(context: Context) {
    val json = prefs(context).getString(KEY_TIMES, null) ?: return
    val times = try {
      parse(json)
    } catch (e: Exception) {
      hide(context)
      return
    }
    val now = System.currentTimeMillis()
    val day = times.days.firstOrNull { d -> d.times.any { it.at > now } }
    val next = day?.times?.firstOrNull { it.at > now }
    if (day == null || next == null) {
      // The app has not been opened for weeks: nothing left to show until it sends new times.
      manager(context).cancel(NOTIFICATION_ID)
      return
    }
    try {
      manager(context).notify(NOTIFICATION_ID, build(context, times, day, next, now))
    } catch (e: Exception) {
      // Notifications not allowed: the app works without this one.
    }
    arm(context, minOf(next.at, nextMidnight(now)))
  }

  /** Clock times in the phone's current zone, like the app ("16:33"). */
  private fun clock(at: Long): String = SimpleDateFormat("HH:mm", Locale.US).format(Date(at))
  private fun dayKey(at: Long): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(at))

  private fun nextMidnight(now: Long): Long {
    val calendar = Calendar.getInstance()
    calendar.timeInMillis = now
    calendar.add(Calendar.DAY_OF_YEAR, 1)
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
  }

  private fun name(times: Times, moment: Moment) = times.names[moment.prayer] ?: moment.prayer

  /**
   * The next prayer, its time and the time left (a countdown running in the notification itself).
   * Without exact alarms the refresh can come up to ten minutes late, so the countdown, which would
   * then run below zero, is left out.
   */
  private fun nextLine(context: Context, views: RemoteViews, times: Times, next: Moment, now: Long) {
    views.setTextViewText(R.id.athan_times_next_name, name(times, next))
    views.setTextViewText(R.id.athan_times_next_time, clock(next.at))
    if (AthanScheduler.canScheduleExact(context)) {
      views.setChronometer(R.id.athan_times_countdown, SystemClock.elapsedRealtime() + (next.at - now), times.countdown, true)
      views.setChronometerCountDown(R.id.athan_times_countdown, true)
      views.setViewVisibility(R.id.athan_times_countdown, View.VISIBLE)
    } else {
      views.setViewVisibility(R.id.athan_times_countdown, View.GONE)
    }
  }

  private fun build(context: Context, times: Times, day: Day, next: Moment, now: Long): Notification {
    // After Isha it shows the next day; before dawn, a prayer of the evening before can still be due.
    val date = if (day.day > dayKey(now) && times.tomorrow.isNotEmpty()) "${times.tomorrow} · ${day.date}" else day.date

    val collapsed = RemoteViews(context.packageName, R.layout.athan_times_collapsed)
    nextLine(context, collapsed, times, next, now)
    val following = day.times.filter { it.at > next.at }.take(FOLLOWING)
    collapsed.setTextViewText(R.id.athan_times_following,
      if (following.isEmpty()) date else following.joinToString("  ·  ") { "${name(times, it)} ${clock(it.at)}" })

    val expanded = RemoteViews(context.packageName, R.layout.athan_times_expanded)
    nextLine(context, expanded, times, next, now)
    expanded.setTextViewText(R.id.athan_times_date, date)
    for (moment in day.times) {
      val variants = ROWS[moment.prayer] ?: continue
      // Each row has its normal, next and past versions in the layout, coloured there for light and dark.
      val shown = when {
        moment === next -> 1
        moment.at <= now -> 2
        else -> 0
      }
      for ((index, variant) in variants.withIndex()) {
        expanded.setViewVisibility(variant.row, if (index == shown) View.VISIBLE else View.GONE)
        if (index == shown) {
          expanded.setTextViewText(variant.name, name(times, moment))
          expanded.setTextViewText(variant.time, clock(moment.at))
        }
      }
    }

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, times.channel, NotificationManager.IMPORTANCE_LOW)
      channel.setShowBadge(false)
      channel.setSound(null, null)
      channel.enableVibration(false)
      channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      manager(context).createNotificationChannel(channel)
      Notification.Builder(context, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(context).setPriority(Notification.PRIORITY_LOW)
    }
    builder.setSmallIcon(smallIcon(context))
      // For what cannot show the views (a watch, a screen reader): the same in text.
      .setContentTitle("${name(times, next)} ${clock(next.at)}")
      .setContentText(day.times.joinToString(" · ") { "${name(times, it)} ${clock(it.at)}" })
      .setStyle(Notification.DecoratedCustomViewStyle())
      .setCustomContentView(collapsed)
      .setCustomBigContentView(expanded)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setLocalOnly(true)
      .setGroup(GROUP)
      .setCategory(Notification.CATEGORY_STATUS)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
    if (times.place.isNotEmpty()) builder.setSubText(times.place)
    accent(context)?.let { builder.setColor(it) }
    openTimes(context, times.url)?.let { builder.setContentIntent(it) }
    return builder.build()
  }

  private fun smallIcon(context: Context): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun accent(context: Context): Int? {
    val id = context.resources.getIdentifier("notification_icon_color", "color", context.packageName)
    return if (id != 0) context.getColor(id) else null
  }

  /** The app's prayer times screen by its link, else the app. */
  private fun openTimes(context: Context, url: String): PendingIntent? {
    val link = if (url.isNotEmpty()) Intent(Intent.ACTION_VIEW, Uri.parse(url)).setPackage(context.packageName) else null
    val intent = link?.takeIf { it.resolveActivity(context.packageManager) != null }
      ?: context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: return null
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return PendingIntent.getActivity(context, REQUEST_OPEN, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun alarms(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

  private fun updateIntent(context: Context): PendingIntent {
    val intent = Intent(context, AthanAlarmReceiver::class.java).setAction(ACTION_UPDATE)
    return PendingIntent.getBroadcast(context, REQUEST_UPDATE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  /**
   * The next refresh. It does not wake the phone (nobody sees the notification then) and is not an
   * "allow while idle" alarm, so it never competes with the athan's; it comes when the phone wakes.
   * Without exact alarms Android may deliver it up to ten minutes late.
   */
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

  private class Variant(val row: Int, val name: Int, val time: Int)

  /** Each prayer's row in the expanded view: its normal, next and past versions, in that order. */
  private val ROWS: Map<String, List<Variant>> = mapOf(
    "fajr" to listOf(
      Variant(R.id.athan_times_fajr_normal, R.id.athan_times_fajr_normal_name, R.id.athan_times_fajr_normal_time),
      Variant(R.id.athan_times_fajr_next, R.id.athan_times_fajr_next_name, R.id.athan_times_fajr_next_time),
      Variant(R.id.athan_times_fajr_past, R.id.athan_times_fajr_past_name, R.id.athan_times_fajr_past_time),
    ),
    "sunrise" to listOf(
      Variant(R.id.athan_times_sunrise_normal, R.id.athan_times_sunrise_normal_name, R.id.athan_times_sunrise_normal_time),
      Variant(R.id.athan_times_sunrise_next, R.id.athan_times_sunrise_next_name, R.id.athan_times_sunrise_next_time),
      Variant(R.id.athan_times_sunrise_past, R.id.athan_times_sunrise_past_name, R.id.athan_times_sunrise_past_time),
    ),
    "dhuhr" to listOf(
      Variant(R.id.athan_times_dhuhr_normal, R.id.athan_times_dhuhr_normal_name, R.id.athan_times_dhuhr_normal_time),
      Variant(R.id.athan_times_dhuhr_next, R.id.athan_times_dhuhr_next_name, R.id.athan_times_dhuhr_next_time),
      Variant(R.id.athan_times_dhuhr_past, R.id.athan_times_dhuhr_past_name, R.id.athan_times_dhuhr_past_time),
    ),
    "asr" to listOf(
      Variant(R.id.athan_times_asr_normal, R.id.athan_times_asr_normal_name, R.id.athan_times_asr_normal_time),
      Variant(R.id.athan_times_asr_next, R.id.athan_times_asr_next_name, R.id.athan_times_asr_next_time),
      Variant(R.id.athan_times_asr_past, R.id.athan_times_asr_past_name, R.id.athan_times_asr_past_time),
    ),
    "maghrib" to listOf(
      Variant(R.id.athan_times_maghrib_normal, R.id.athan_times_maghrib_normal_name, R.id.athan_times_maghrib_normal_time),
      Variant(R.id.athan_times_maghrib_next, R.id.athan_times_maghrib_next_name, R.id.athan_times_maghrib_next_time),
      Variant(R.id.athan_times_maghrib_past, R.id.athan_times_maghrib_past_name, R.id.athan_times_maghrib_past_time),
    ),
    "isha" to listOf(
      Variant(R.id.athan_times_isha_normal, R.id.athan_times_isha_normal_name, R.id.athan_times_isha_normal_time),
      Variant(R.id.athan_times_isha_next, R.id.athan_times_isha_next_name, R.id.athan_times_isha_next_time),
      Variant(R.id.athan_times_isha_past, R.id.athan_times_isha_past_name, R.id.athan_times_isha_past_time),
    ),
  )
}
