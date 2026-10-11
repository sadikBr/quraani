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
