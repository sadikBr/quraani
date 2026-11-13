package expo.modules.athan

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

/**
 * The whole athan at prayer times (Android). The app gives the coming athans with their text;
 * this module arms an alarm for each in turn and plays it in a foreground service.
 */
class AthanModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "The React context is not available" }.applicationContext

  private fun open(intent: Intent): Boolean = try {
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    true
  } catch (e: ActivityNotFoundException) {
    false
  }

  override fun definition() = ModuleDefinition {
    Name("Athan")

    /** Replaces the scheduled athans: `{ "labels": {...}, "athans": [...] }`. */
    Function("schedule") { json: String ->
      AthanScheduler.replace(context, json)
    }

    /** Plays an athan now, to try a voice and the volume: `{ "labels": {...}, "athan": {...} }`. */
    Function("play") { json: String ->
      val root = JSONObject(json)
      root.optJSONObject("labels")?.let { AthanScheduler.saveLabels(context, it) }
      AthanPlayer.start(context, AthanScheduler.parseAthan(root.getJSONObject("athan")), checkSilence = false)
    }

    /** The athan by the alarm path in `seconds`, to see and hear what a prayer brings. */
    Function("test") { json: String, seconds: Int ->
      AthanScheduler.armTest(context, json, seconds)
    }

    /** Shows (or updates) the prayer times notification: see AthanTimes.show for the JSON. */
    Function("showTimes") { json: String ->
      AthanTimes.show(context, json)
    }

    Function("hideTimes") {
      AthanTimes.hide(context)
    }

    /** The times the home-screen widget shows (the same JSON as showTimes), or none (an empty string). */
    Function("setWidgetTimes") { json: String ->
      PrayerWidget.save(context, json)
    }

    /** What the wird widget shows (see WirdWidget.save), or nothing (an empty string). */
    Function("setWirdWidget") { json: String ->
      WirdWidget.save(context, json)
    }

    /**
     * Asks the launcher to add a widget to the home screen (`prayer`, `prayer-small` or `wird`);
     * false where it cannot be asked.
     */
    Function("pinWidget") { kind: String ->
      when (kind) {
        "wird" -> PrayerWidget.pin(context, WirdWidgetProvider::class.java)
        "prayer-small" -> PrayerWidget.pin(context, PrayerSmallWidgetProvider::class.java)
        else -> PrayerWidget.pin(context, PrayerWidgetProvider::class.java)
      }
    }

    /** How the athan's screen looks: `{ "background", "dim", "motion", "date" }`. */
    Function("setScreenStyle") { json: String ->
      AthanScheduler.saveScreenStyle(context, json)
    }

    /** Opens the athan's screen now, silent, as it will look: `{ "heading", "name", "time", "date", "place", "close" }`. */
    Function("previewScreen") { json: String ->
      val item = JSONObject(json)
      val text = AthanScreenText(
        heading = item.optString("heading", ""),
        name = item.optString("name", ""),
        time = item.optString("time", ""),
        date = item.optString("date", ""),
        place = item.optString("place", ""),
      )
      try {
        context.startActivity(AthanActivity.intent(context, text, item.optString("close", ""), preview = true))
        true
      } catch (e: ActivityNotFoundException) {
        false
      }
    }

    Function("canUseFullScreenIntent") {
      AthanNotifications.canUseFullScreen(context)
    }

    Function("openFullScreenIntentSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        open(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:${context.packageName}")))
      } else {
        false
      }
    }

    Function("stop") {
      AthanService.stop(context)
    }

    Function("isPlaying") {
      AthanService.playing
    }

    Function("canScheduleExactAlarms") {
      AthanScheduler.canScheduleExact(context)
    }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        open(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")))
      } else {
        false
      }
    }

    Function("isIgnoringBatteryOptimizations") {
      (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("openBatteryOptimizationSettings") {
      open(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))) ||
        open(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
    }
  }
}
