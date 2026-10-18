package expo.modules.roammotion

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.ActivityRecognition
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionRequest
import com.google.android.gms.location.DetectedActivity
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Steps and in-vehicle periods for Roam. The step counter sensor counts since
// boot and is read through a listener kept here (not in JS), so it keeps
// counting while the Roam's foreground service runs with the screen off.
// Activity transitions arrive as broadcasts and are logged by
// ActivityTransitionReceiver, so they survive the app being in the background.
class RoamMotionModule : Module() {
  private val context: Context get() = requireNotNull(appContext.reactContext)
  private var listener: SensorEventListener? = null

  @Volatile private var lastSteps: Long? = null

  override fun definition() = ModuleDefinition {
    Name("RoamMotion")

    // iOS-only range query; Android answers with readStepCounter.
    AsyncFunction("getStepCount") { _: Double, _: Double -> null as Int? }

    // Latest since-boot step count seen since startTracking, or null (no
    // sensor, no permission, or no step taken yet).
    AsyncFunction("readStepCounter") { -> lastSteps?.toDouble() }

    AsyncFunction("startTracking") {
      if (permitted()) {
        startSteps()
        startTransitions()
      }
    }

    AsyncFunction("stopTracking") {
      stopSteps()
      runCatching { ActivityRecognition.getClient(context).removeActivityTransitionUpdates(transitionIntent()) }
    }

    AsyncFunction("getVehicleWindows") { fromMs: Double, toMs: Double ->
      ActivityTransitionReceiver.vehicleWindows(context, fromMs, toMs)
    }
  }

  private fun permitted(): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.Q ||
      ContextCompat.checkSelfPermission(context, Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

  private fun startSteps() {
    if (listener != null) return
    val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return
    val sensor = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER) ?: return
    val l = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        lastSteps = event.values[0].toLong()
      }
      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
    }
    manager.registerListener(l, sensor, SensorManager.SENSOR_DELAY_NORMAL)
    listener = l
  }

  private fun stopSteps() {
    val l = listener ?: return
    (context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager)?.unregisterListener(l)
    listener = null
    lastSteps = null
  }

  private fun startTransitions() {
    val types = listOf(
      DetectedActivity.IN_VEHICLE, DetectedActivity.ON_BICYCLE, DetectedActivity.ON_FOOT,
      DetectedActivity.RUNNING, DetectedActivity.WALKING, DetectedActivity.STILL,
    )
    val transitions = types.flatMap { type ->
      listOf(ActivityTransition.ACTIVITY_TRANSITION_ENTER, ActivityTransition.ACTIVITY_TRANSITION_EXIT).map {
        ActivityTransition.Builder().setActivityType(type).setActivityTransition(it).build()
      }
    }
    runCatching {
      ActivityRecognition.getClient(context)
        .requestActivityTransitionUpdates(ActivityTransitionRequest(transitions), transitionIntent())
    }
  }

  private fun transitionIntent(): PendingIntent {
    val intent = Intent(context, ActivityTransitionReceiver::class.java)
    // Mutable: Play services adds the transition result to this intent.
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    return PendingIntent.getBroadcast(context, 7341, intent, flags)
  }
}
