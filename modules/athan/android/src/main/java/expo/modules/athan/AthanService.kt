package expo.modules.athan

import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import java.io.File

/**
 * Plays a whole athan in the foreground (the system lets an exact alarm start it), on the alarm
 * stream, with a notification to stop it. A call or another app taking the audio stops it.
 */
class AthanService : Service() {
  private var player: MediaPlayer? = null
  /** An AudioFocusRequest (Android 8+), kept untyped so older versions never load the class. */
  private var focus: Any? = null
  private var title = ""
  private var body = ""
  private var notifyAfter = true
  private var screen = AthanScreenText()
  /** Between startForeground and finish: finish runs once per athan. */
  private var active = false
  private val handler = Handler(Looper.getMainLooper())
  private val timeout = Runnable { finish(completed = true) }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val labels = AthanScheduler.labels(this)
    title = intent?.getStringExtra(EXTRA_TITLE) ?: ""
    body = intent?.getStringExtra(EXTRA_BODY) ?: ""
    notifyAfter = intent?.getBooleanExtra(EXTRA_NOTIFY_AFTER, true) ?: true
    screen = AthanScreenText(
      name = intent?.getStringExtra(EXTRA_SCREEN_NAME) ?: "",
      time = intent?.getStringExtra(EXTRA_SCREEN_TIME) ?: "",
      date = intent?.getStringExtra(EXTRA_SCREEN_DATE) ?: "",
      place = intent?.getStringExtra(EXTRA_SCREEN_PLACE) ?: "",
    )
    // A new athan replaces one still playing.
    release()
    // startForeground must come first: a service started for the foreground that stops without it
    // crashes the app.
    val notification = AthanNotifications.playing(this, title, body, labels, screen)
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(AthanNotifications.PLAYING_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
      } else {
        startForeground(AthanNotifications.PLAYING_ID, notification)
      }
    } catch (e: Exception) {
      try {
        // The manifest declares the type as well.
        startForeground(AthanNotifications.PLAYING_ID, notification)
      } catch (again: Exception) {
        AthanNotifications.show(this, title, body, labels, withSound = true)
        stopSelf()
        return START_NOT_STICKY
      }
    }
    active = true
    running = true
    if (intent?.action != ACTION_PLAY || !play(intent.getStringExtra(EXTRA_VOICE) ?: "original")) finish(completed = true)
    return START_NOT_STICKY
  }

  private fun play(voice: String): Boolean {
    val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        .setAudioAttributes(attributes)
        .setOnAudioFocusChangeListener { change ->
          if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) finish(completed = false)
        }
        .build()
      if (audio.requestAudioFocus(request) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) return false
      focus = request
    }
    // Two recordings come with the app (each named, so that resource shrinking keeps them). The
    // others are fetched by the app when chosen and kept in its files (`athan-voices.ts`); one
    // not there yet, or unreadable, gives way to the first that comes with the app.
    val resource = when (voice) {
      "madinah" -> R.raw.athan_full_madinah
      else -> R.raw.athan_full_makkah
    }
    val session = audio.generateAudioSessionId()
    val created = fetched(voice, attributes, session) ?: MediaPlayer.create(this, resource, attributes, session) ?: return false
    created.setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
    created.setOnCompletionListener { finish(completed = true) }
    created.setOnErrorListener { _, _, _ ->
      finish(completed = false)
      true
    }
    player = created
    playing = true
    created.start()
    handler.postDelayed(timeout, MAX_PLAY_MS)
    return true
  }

  /** A player on the recording the app fetched for this voice, if it is on the phone and plays. */
  private fun fetched(voice: String, attributes: AudioAttributes, session: Int): MediaPlayer? {
    if (!voice.matches(Regex("[a-z0-9]{1,24}"))) return null
    val file = File(File(filesDir, "athan"), "athan_full_$voice.ogg")
    if (!file.isFile || file.length() == 0L) return null
    val player = MediaPlayer()
    return try {
      player.setAudioAttributes(attributes)
      player.audioSessionId = session
      player.setDataSource(file.absolutePath)
      player.prepare()
      player
    } catch (e: Exception) {
      player.release()
      null
    }
  }

  private fun release() {
    handler.removeCallbacks(timeout)
    player?.let {
      try {
        it.stop()
      } catch (e: IllegalStateException) {
        // Not started yet.
      }
      it.release()
    }
    player = null
    playing = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      (focus as? AudioFocusRequest)?.let { (getSystemService(Context.AUDIO_SERVICE) as AudioManager).abandonAudioFocusRequest(it) }
    }
    focus = null
  }

  /** Ends the athan; when it ran its course, a plain notification stays to say the time came. */
  private fun finish(completed: Boolean) {
    if (!active) return
    active = false
    release()
    stopForeground(STOP_FOREGROUND_REMOVE)
    if (completed && notifyAfter && title.isNotEmpty()) AthanNotifications.show(this, title, body, AthanScheduler.labels(this), withSound = false)
    stopSelf()
  }

  override fun onDestroy() {
    running = false
    release()
    (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(AthanNotifications.PLAYING_ID)
    super.onDestroy()
  }

  companion object {
    const val ACTION_PLAY = "expo.modules.athan.PLAY"
    const val EXTRA_VOICE = "expo.modules.athan.VOICE"
    const val EXTRA_TITLE = "expo.modules.athan.TITLE"
    const val EXTRA_BODY = "expo.modules.athan.BODY"
    const val EXTRA_NOTIFY_AFTER = "expo.modules.athan.NOTIFY_AFTER"
    const val EXTRA_SCREEN_NAME = "expo.modules.athan.SCREEN_NAME"
    const val EXTRA_SCREEN_TIME = "expo.modules.athan.SCREEN_TIME"
    const val EXTRA_SCREEN_DATE = "expo.modules.athan.SCREEN_DATE"
    const val EXTRA_SCREEN_PLACE = "expo.modules.athan.SCREEN_PLACE"
    /** The longest recording is three and a half minutes. */
    private const val MAX_PLAY_MS = 5 * 60 * 1000L

    @Volatile
    var playing = false
      private set

    /** Between startForeground and onDestroy: only then may the service be stopped from outside. */
    @Volatile
    var running = false
      private set

    fun stop(context: Context): Boolean {
      if (!running) return false
      return context.stopService(Intent(context, AthanService::class.java))
    }
  }
}
