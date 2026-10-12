package expo.modules.athan

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.abs

/**
 * The phone's heading for the qibla compass (Android). It comes from the rotation vector, Android's
 * own fusion of the gyroscope, accelerometer and magnetometer (or, without one, from the
 * accelerometer and magnetometer), and is turned to true north with the declination at the place
 * the app gives, so no location permission is needed.
 *
 * Each reading carries the magnetometer's calibration as Android reports it (0 unreliable, 1 low,
 * 2 medium, 3 high; -1 not known yet) and, where the rotation vector gives it, its estimated error
 * in degrees. Expo's own heading reports whichever sensor last changed its accuracy, which is
 * usually the accelerometer (always high), so it cannot say that the compass needs calibrating.
 */
class CompassModule : Module(), SensorEventListener {
  private var manager: SensorManager? = null
  private var declination = 0f
  private var magneticAccuracy = -1
  private var useRotation = false
  private var gravity: FloatArray? = null
  private var geomagnetic: FloatArray? = null
  private var lastSent = 0L
  private var lastHeading = -1f

  private fun sensors(): SensorManager? {
    manager?.let { return it }
    val context = appContext.reactContext ?: return null
    return (context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)?.also { manager = it }
  }

  override fun definition() = ModuleDefinition {
    Name("QiblaCompass")

    Events(HEADING_EVENT)

    /** Whether the phone has a magnetometer, without which there is no compass. */
    Function("isAvailable") {
      sensors()?.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) != null
    }

    /** Starts the readings, true north taken at this place. */
    Function("start") { latitude: Double, longitude: Double ->
      start(latitude, longitude)
    }

    Function("stop") {
      stop()
    }

    OnActivityEntersBackground {
      stop()
    }

    OnDestroy {
      stop()
    }
  }

  private fun start(latitude: Double, longitude: Double): Boolean {
    val sensors = sensors() ?: return false
    stop()
    val magnetic = sensors.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD) ?: return false
    declination = GeomagneticField(latitude.toFloat(), longitude.toFloat(), 0f, System.currentTimeMillis()).declination
    magneticAccuracy = -1
    lastSent = 0L
    lastHeading = -1f
    val rotation = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    useRotation = rotation != null
    // The magnetometer always: for its calibration, and for the heading itself without a rotation vector.
    sensors.registerListener(this, magnetic, SensorManager.SENSOR_DELAY_UI)
    if (rotation != null) {
      sensors.registerListener(this, rotation, SensorManager.SENSOR_DELAY_UI)
    } else {
      val accelerometer = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: run { stop(); return false }
      sensors.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_UI)
    }
    return true
  }

  private fun stop() {
    manager?.unregisterListener(this)
    gravity = null
    geomagnetic = null
  }

  override fun onSensorChanged(event: SensorEvent?) {
    event ?: return
    when (event.sensor.type) {
      Sensor.TYPE_ROTATION_VECTOR -> {
        // Some phones give five values, which older Androids refuse here: the first four suffice.
        val vector = if (event.values.size > 4) event.values.copyOf(4) else event.values
        val matrix = FloatArray(9)
        SensorManager.getRotationMatrixFromVector(matrix, vector)
        val error = if (event.values.size > 4 && event.values[4] > 0f) Math.toDegrees(event.values[4].toDouble()).toFloat() else -1f
        send(azimuth(matrix), error)
      }
      Sensor.TYPE_MAGNETIC_FIELD -> {
        magneticAccuracy = event.accuracy
        if (!useRotation) {
          geomagnetic = event.values.clone()
          fromRaw()
        }
      }
      Sensor.TYPE_ACCELEROMETER -> {
        // Gravity, smoothed, from the accelerometer.
        val last = gravity
        gravity = if (last == null) event.values.clone() else FloatArray(3) { i -> last[i] + SMOOTHING * (event.values[i] - last[i]) }
        fromRaw()
      }
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
    if (sensor?.type == Sensor.TYPE_MAGNETIC_FIELD) magneticAccuracy = accuracy
  }

  private fun fromRaw() {
    val g = gravity ?: return
    val m = geomagnetic ?: return
    val matrix = FloatArray(9)
    if (SensorManager.getRotationMatrix(matrix, null, g, m)) send(azimuth(matrix), -1f)
  }

  /** Where the phone's top points, in degrees clockwise from magnetic north. */
  private fun azimuth(matrix: FloatArray): Float {
    val orientation = FloatArray(3)
    SensorManager.getOrientation(matrix, orientation)
    return Math.toDegrees(orientation[0].toDouble()).toFloat()
  }

  private fun send(magnetic: Float, error: Float) {
    val heading = (((magnetic + declination) % 360f) + 360f) % 360f
    val now = SystemClock.elapsedRealtime()
    val turned = if (lastHeading < 0f) 360f else abs(((heading - lastHeading + 540f) % 360f) - 180f)
    // About 25 a second at most, and only when it has moved (or now and then, for the calibration).
    if (now - lastSent < MIN_INTERVAL_MS || (turned < MIN_TURN && now - lastSent < QUIET_INTERVAL_MS)) return
    lastSent = now
    lastHeading = heading
    sendEvent(HEADING_EVENT, Bundle().apply {
      putDouble("heading", heading.toDouble())
      putInt("accuracy", magneticAccuracy)
      putDouble("error", error.toDouble())
    })
  }

  companion object {
    private const val HEADING_EVENT = "onHeading"
    private const val SMOOTHING = 0.2f
    private const val MIN_INTERVAL_MS = 40L
    private const val QUIET_INTERVAL_MS = 1000L
    private const val MIN_TURN = 0.5f
  }
}
