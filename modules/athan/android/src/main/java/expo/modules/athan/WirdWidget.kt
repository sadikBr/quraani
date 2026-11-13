package expo.modules.athan

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/** The home-screen widget of the day's wird. Android asks it to draw itself; WirdWidget does. */
class WirdWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    WirdWidget.refresh(context)
  }

  override fun onEnabled(context: Context) {
    WirdWidget.refresh(context)
  }

  override fun onDisabled(context: Context) {
    WirdWidget.disarm(context)
  }
}

/**
 * The day's wird on the home screen: a heading (what is due, or that it is done), the portion,
 * a line under it, and the run of days in a pill. The app writes every word, as it stands on
 * `day` and as it will stand on the days after if the app is not opened again (see `save`); this
 * keeps them and redraws at midnight. Without them it says to open the app. A tap opens `url`.
 */
internal object WirdWidget {
  const val ACTION_UPDATE = "expo.modules.athan.WIRD_UPDATE"
  private const val PREFS = "expo.modules.athan"
  private const val KEY = "wird_widget"
  private const val REQUEST_UPDATE = 7331
  private const val REQUEST_OPEN = 7332

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
  private fun alarms(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  private fun provider(context: Context) = ComponentName(context, WirdWidgetProvider::class.java)

  /**
   * `{ "day": "2026-11-13", "today": { "heading", "title", "detail" }, "later": { … }, "streak",
   * "streakUntil": "2026-11-14", "url" }`: `today` is shown on `day` and `later` on the days after
   * it; `streak` up to `streakUntil` (the run is over after it). An empty string forgets them.
   */
  fun save(context: Context, json: String) {
    if (json.isEmpty()) {
      prefs(context).edit().remove(KEY).apply()
    } else {
      // Read first, so a malformed one fails here and not at midnight.
      JSONObject(json).getString("day")
      prefs(context).edit().putString(KEY, json).apply()
    }
    refresh(context)
  }

  fun refresh(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = try {
      manager.getAppWidgetIds(provider(context))
    } catch (e: Exception) {
      return
    }
    if (ids.isEmpty()) return
    val now = System.currentTimeMillis()
    val today = AthanTimes.dayKey(now)
    val saved = prefs(context).getString(KEY, null)?.let {
      try {
        JSONObject(it)
      } catch (e: Exception) {
        null
      }
    }
    val views = RemoteViews(context.packageName, R.layout.wird_widget)
    // A day before `day` (the clock went back): the words of `day` still stand.
    val shown = saved?.optJSONObject(if (today > saved.optString("day")) "later" else "today")
    if (saved != null && shown != null && shown.optString("title").isNotEmpty()) {
      views.setTextViewText(R.id.wird_widget_heading, shown.optString("heading"))
      views.setTextViewText(R.id.wird_widget_title, shown.optString("title"))
      text(views, R.id.wird_widget_detail, shown.optString("detail"))
      text(views, R.id.wird_widget_streak, if (today <= saved.optString("streakUntil")) saved.optString("streak") else "")
    }
    // Otherwise the layout's own words stand: the widget's name, and to open the app.
    AthanTimes.openTimes(context, saved?.optString("url") ?: "", REQUEST_OPEN)?.let { views.setOnClickPendingIntent(R.id.wird_widget_root, it) }
    try {
      manager.updateAppWidget(ids, views)
    } catch (e: Exception) {
      // The launcher refused it: the next redraw tries again.
    }
    arm(context, AthanTimes.nextMidnight(now))
  }

  /** A line that is shown only when it has words. */
  private fun text(views: RemoteViews, id: Int, value: String) {
    views.setTextViewText(id, value)
    views.setViewVisibility(id, if (value.isEmpty()) View.GONE else View.VISIBLE)
  }

  private fun updateIntent(context: Context): PendingIntent {
    val intent = Intent(context, AthanAlarmReceiver::class.java).setAction(ACTION_UPDATE)
    return PendingIntent.getBroadcast(context, REQUEST_UPDATE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun disarm(context: Context) {
    alarms(context).cancel(updateIntent(context))
  }

  /** The redraw at midnight: it does not wake the phone, and may come a little late. */
  private fun arm(context: Context, at: Long) {
    try {
      alarms(context).setWindow(AlarmManager.RTC, at, 60_000L, updateIntent(context))
    } catch (e: Exception) {
      // Android's half-hourly update still redraws it.
    }
  }
}
