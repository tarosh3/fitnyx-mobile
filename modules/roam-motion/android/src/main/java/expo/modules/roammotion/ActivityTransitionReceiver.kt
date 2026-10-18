package expo.modules.roammotion

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import com.google.android.gms.location.ActivityTransition
import com.google.android.gms.location.ActivityTransitionResult
import com.google.android.gms.location.DetectedActivity
import org.json.JSONArray

// Logs IN_VEHICLE enter/exit as [wallClockMs, entered] pairs. Other
// transitions (on foot, cycling, still) end a vehicle period.
class ActivityTransitionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val result = ActivityTransitionResult.extractResult(intent) ?: return
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val log = JSONArray(prefs.getString(KEY, "[]"))
    val nowWall = System.currentTimeMillis()
    val nowElapsed = SystemClock.elapsedRealtimeNanos()
    for (event in result.transitionEvents) {
      val wallMs = nowWall - (nowElapsed - event.elapsedRealTimeNanos) / 1_000_000
      val entered = event.activityType == DetectedActivity.IN_VEHICLE &&
        event.transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER
      val leftVehicle = event.activityType == DetectedActivity.IN_VEHICLE &&
        event.transitionType == ActivityTransition.ACTIVITY_TRANSITION_EXIT
      val otherEnter = event.activityType != DetectedActivity.IN_VEHICLE &&
        event.transitionType == ActivityTransition.ACTIVITY_TRANSITION_ENTER
      if (entered || leftVehicle || otherEnter) log.put(JSONArray().put(wallMs).put(entered))
    }
    // Keep the last day only.
    val trimmed = JSONArray()
    for (i in 0 until log.length()) {
      val e = log.getJSONArray(i)
      if (e.getLong(0) > nowWall - DAY_MS) trimmed.put(e)
    }
    prefs.edit().putString(KEY, trimmed.toString()).apply()
  }

  companion object {
    private const val PREFS = "roam_motion"
    private const val KEY = "transitions"
    private const val DAY_MS = 24 * 60 * 60 * 1000L

    fun vehicleWindows(context: Context, fromMs: Double, toMs: Double): List<List<Double>> {
      val log = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"))
      val events = (0 until log.length()).map { log.getJSONArray(it) }
        .map { it.getLong(0).toDouble() to it.getBoolean(1) }
        .sortedBy { it.first }
      val windows = mutableListOf<List<Double>>()
      var start: Double? = null
      for ((t, entered) in events) {
        if (t > toMs) break
        if (entered && start == null) start = maxOf(t, fromMs)
        if (!entered && start != null) {
          if (t > fromMs) windows.add(listOf(start, t))
          start = null
        }
      }
      start?.let { windows.add(listOf(it, toMs)) }
      return windows.filter { it[1] > it[0] }
    }
  }
}
