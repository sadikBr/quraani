package expo.modules.athan

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.os.PowerManager

/** Starts the athan, unless the phone is silenced, busy, or the alarm came far too late. */
internal object AthanPlayer {
  private fun mayPlayAloud(context: Context): Boolean {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    if (audio.ringerMode != AudioManager.RINGER_MODE_NORMAL) return false
    if (audio.mode == AudioManager.MODE_IN_CALL || audio.mode == AudioManager.MODE_IN_COMMUNICATION) return false
    val filter = (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).currentInterruptionFilter
    return filter == NotificationManager.INTERRUPTION_FILTER_ALL || filter == NotificationManager.INTERRUPTION_FILTER_UNKNOWN
  }

  fun start(context: Context, athan: Athan, checkSilence: Boolean = true) {
    val labels = AthanScheduler.labels(context)
    val late = System.currentTimeMillis() - athan.at > AthanScheduler.LATE_LIMIT_MS
    if (late || (checkSilence && !mayPlayAloud(context))) {
      // Silenced, or long past: the notification alone, without a sound.
      AthanNotifications.show(context, athan.title, athan.body, labels, withSound = false)
      return
    }
    val intent = Intent(context, AthanService::class.java)
      .setAction(AthanService.ACTION_PLAY)
      .putExtra(AthanService.EXTRA_VOICE, athan.voice)
      .putExtra(AthanService.EXTRA_TITLE, athan.title)
      .putExtra(AthanService.EXTRA_BODY, athan.body)
      .putExtra(AthanService.EXTRA_NOTIFY_AFTER, athan.notifyAfter)
      .putExtra(AthanService.EXTRA_SCREEN_NAME, athan.screen.name)
      .putExtra(AthanService.EXTRA_SCREEN_TIME, athan.screen.time)
      .putExtra(AthanService.EXTRA_SCREEN_DATE, athan.screen.date)
      .putExtra(AthanService.EXTRA_SCREEN_PLACE, athan.screen.place)
    // Keeps the phone awake from the alarm until the player holds its own wake lock.
    (context.getSystemService(Context.POWER_SERVICE) as PowerManager)
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "quraani:athan")
      .acquire(15_000L)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
    } catch (e: Exception) {
      // Android 12+ refuses a foreground service from an inexact alarm: the opening of the athan instead.
      AthanNotifications.show(context, athan.title, athan.body, labels, withSound = true)
    }
  }
}

/** The alarm of an athan, the stop button of its notification, and the refresh of the prayer times notification and widget. */
class AthanAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      AthanScheduler.ACTION_FIRE -> {
        val id = intent.getStringExtra(AthanScheduler.EXTRA_ID)
        val athan = id?.let { AthanScheduler.find(context, it) }
        if (id != null) AthanScheduler.markFired(context, id)
        if (athan != null) AthanPlayer.start(context, athan)
        AthanScheduler.arm(context)
        // The prayer times notification and the widget move on to the next prayer at the same moment.
        AthanTimes.refresh(context)
        PrayerWidget.refresh(context)
      }
      AthanTimes.ACTION_UPDATE -> AthanTimes.refresh(context)
      PrayerWidget.ACTION_UPDATE -> PrayerWidget.refresh(context)
      WirdWidget.ACTION_UPDATE -> WirdWidget.refresh(context)
      AthanScheduler.ACTION_STOP -> AthanService.stop(context)
      AthanScheduler.ACTION_TEST -> AthanScheduler.testAthan(context)?.let { AthanPlayer.start(context, it, checkSilence = false) }
    }
  }
}

/**
 * Alarms do not survive a restart, an update or a change of the clock: arm the next one again, and
 * show the prayer times notification again (a restart clears it).
 */
class AthanBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action !in ACTIONS) return
    AthanScheduler.arm(context)
    AthanTimes.refresh(context)
    PrayerWidget.refresh(context)
    WirdWidget.refresh(context)
  }

  private companion object {
    val ACTIONS = setOf(
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_MY_PACKAGE_REPLACED,
      Intent.ACTION_TIME_CHANGED,
      Intent.ACTION_TIMEZONE_CHANGED,
      "android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED",
    )
  }
}
