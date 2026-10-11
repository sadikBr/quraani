package expo.modules.athan

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build

/** The notifications of the whole athan: while it plays (with a stop button), and instead of it. */
internal object AthanNotifications {
  const val PLAYING_ID = 7302
  private const val SHOWN_ID = 7303
  private const val CHANNEL_ID = "prayer-athan-full"
  private const val REQUEST_OPEN = 7304
  private const val REQUEST_STOP = 7305
  private const val REQUEST_SCREEN = 7306

  private fun manager(context: Context) = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  /** The app's notification icon (set up by expo-notifications), else its launcher icon. */
  private fun smallIcon(context: Context): Int {
    val id = context.resources.getIdentifier("notification_icon", "drawable", context.packageName)
    return if (id != 0) id else context.applicationInfo.icon
  }

  private fun accent(context: Context): Int? {
    val id = context.resources.getIdentifier("notification_icon_color", "color", context.packageName)
    return if (id != 0) context.getColor(id) else null
  }

  /** A silent channel that still pops up: the sound is the athan itself. */
  private fun channel(context: Context, labels: AthanLabels): String {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(CHANNEL_ID, labels.channel, NotificationManager.IMPORTANCE_HIGH)
      channel.setSound(null, null)
      channel.enableVibration(false)
      channel.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      manager(context).createNotificationChannel(channel)
    }
    return CHANNEL_ID
  }

  private fun openApp(context: Context): PendingIntent? {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
    return PendingIntent.getActivity(context, REQUEST_OPEN, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun stopIntent(context: Context): PendingIntent {
    val intent = Intent(context, AthanAlarmReceiver::class.java).setAction(AthanScheduler.ACTION_STOP)
    return PendingIntent.getBroadcast(context, REQUEST_STOP, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  @Suppress("DEPRECATION")
  private fun builder(context: Context, channelId: String, title: String, body: String, category: String): Notification.Builder {
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(context, channelId) else Notification.Builder(context)
    builder.setSmallIcon(smallIcon(context))
      .setContentTitle(title)
      .setContentText(body)
      .setCategory(category)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setShowWhen(true)
      .setWhen(System.currentTimeMillis())
    openApp(context)?.let { builder.setContentIntent(it) }
    accent(context)?.let { builder.setColor(it) }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) builder.setPriority(Notification.PRIORITY_HIGH)
    return builder
  }

  /**
   * Shown while the athan plays; stopping it (button or dismissal) stops the athan. On a locked
   * phone the athan's screen opens over the lock screen (when Android allows full-screen
   * notifications); tapping the notification opens it too.
   */
  fun playing(context: Context, title: String, body: String, labels: AthanLabels): Notification {
    val stop = stopIntent(context)
    val action = Notification.Action.Builder(Icon.createWithResource(context, smallIcon(context)), labels.stop, stop).build()
    val screen = PendingIntent.getActivity(context, REQUEST_SCREEN, AthanActivity.intent(context, title, body, labels.stop),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    return builder(context, channel(context, labels), title, body, Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setDeleteIntent(stop)
      .addAction(action)
      .setContentIntent(screen)
      .setFullScreenIntent(screen, true)
      .build()
  }

  /** Android 14+ lets the user withhold full-screen notifications; earlier versions allow them. */
  fun canUseFullScreen(context: Context): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) manager(context).canUseFullScreenIntent() else true

  /**
   * Instead of the athan: after it ended, or when it could not be played aloud. With `withSound`,
   * on the app's takbir channel when it exists.
   */
  fun show(context: Context, title: String, body: String, labels: AthanLabels, withSound: Boolean) {
    var channelId = channel(context, labels)
    val fallback = labels.fallbackChannel
    if (withSound && fallback != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager(context).getNotificationChannel(fallback) != null) {
      channelId = fallback
    }
    try {
      // A reminder, not an alarm: "Do not disturb" keeps it quiet.
      manager(context).notify(SHOWN_ID, builder(context, channelId, title, body, Notification.CATEGORY_REMINDER).setAutoCancel(true).build())
    } catch (e: SecurityException) {
      // Notifications are not allowed: nothing to show.
    }
  }
}
