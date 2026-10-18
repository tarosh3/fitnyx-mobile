package com.fitnyx.app

import android.app.*
import android.content.*
import android.graphics.Color
import android.os.SystemClock
import android.os.Handler
import android.os.Looper
import android.os.Bundle
import android.net.Uri
import android.widget.RemoteViews
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactPackage
import com.facebook.react.uimanager.ViewManager
import org.json.JSONArray
import org.json.JSONObject

// Replace the location service's existing notification, preserving its channel
// and foreground-service ID. No second notification or extra GPS service.
object RoamNotification {
  private const val PREF = "fitnyx.roam.controls"
  var reactContext: ReactApplicationContext? = null
  private val handler = Handler(Looper.getMainLooper())
  private var retry: Runnable? = null
  private fun prefs(c: Context) = c.getSharedPreferences(PREF, Context.MODE_PRIVATE)
  private fun manager(c: Context) = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  private fun service(c: Context) = manager(c).activeNotifications.firstOrNull { it.notification.channelId?.endsWith(":fitnyx-roam-location") == true }
  @Synchronized fun pending(c: Context): JSONArray = JSONArray(prefs(c).getString("pending", "[]"))
  @Synchronized fun acknowledge(c: Context, ids: Set<String>) {
    val old = pending(c); val next = JSONArray()
    for (i in 0 until old.length()) if (!ids.contains(old.getJSONObject(i).getString("id"))) next.put(old.getJSONObject(i))
    prefs(c).edit().putString("pending", next.toString()).commit()
  }
  @Synchronized fun update(c: Context, incoming: JSONObject) {
    val journal = pending(c)
    for (i in 0 until journal.length()) if (journal.getJSONObject(i).optString("sessionId") == incoming.optString("sessionId")) return
    val current = prefs(c).getString("snapshot", null)?.let { JSONObject(it) }
    // A JS GPS update may have been enqueued before a native pause tap.
    if (current?.optString("sessionId") == incoming.optString("sessionId") && current.optDouble("revision", 0.0) > incoming.optDouble("revision", 0.0)) return
    prefs(c).edit().putString("snapshot", incoming.toString()).commit()
    renderWhenReady(c.applicationContext, incoming.optString("sessionId"), 8)
  }
  // Expo binds its foreground service asynchronously. Retry the first render
  // without waiting for a GPS fix, and always read the latest native snapshot.
  @Synchronized private fun renderWhenReady(c: Context, id: String, attempts: Int) {
    retry?.let { handler.removeCallbacks(it) }; retry = null
    val data = prefs(c).getString("snapshot", null)?.let { JSONObject(it) } ?: return
    if (data.optString("sessionId") != id) return
    val existing = service(c)
    if (existing != null && existing.notification.extras.getDouble("fitnyx.roam.revision", -1.0) != data.optDouble("revision")) render(c, data)
    // A second route mounting can re-bind Expo's service after it was already
    // visible. Observe the short startup window even after a successful render.
    if (attempts > 0) {
      val task = Runnable { renderWhenReady(c, id, attempts - 1) }
      retry = task; handler.postDelayed(task, 400)
    }
  }
  @Synchronized fun clear(c: Context) {
    retry?.let { handler.removeCallbacks(it) }; retry = null
    prefs(c).edit().remove("snapshot").remove("pending").commit()
  }
  @Synchronized fun action(c: Context, id: String, action: String, expected: String) {
    val raw = prefs(c).getString("snapshot", null) ?: return
    val data = JSONObject(raw)
    if (service(c) == null || data.optString("sessionId") != id || data.optString("phase") != expected) return
    val now = System.currentTimeMillis()
    if (action == "pause" && expected == "running") {
      data.put("elapsed", ((now - data.optDouble("anchor", now.toDouble())) / 1000).toInt().coerceAtLeast(0))
      data.remove("anchor"); data.put("phase", "paused")
    } else if (action == "resume" && expected == "paused") {
      data.put("anchor", now - data.optDouble("elapsed", 0.0) * 1000); data.put("phase", "running")
    } else return
    data.put("revision", now)
    val entry = JSONObject().put("id", java.util.UUID.randomUUID().toString()).put("kind", "roam")
      .put("sessionId", id).put("action", action).put("timestampMs", now).put("content", data.toString())
    val journal = pending(c).put(entry)
    prefs(c).edit().putString("pending", journal.toString()).putString("snapshot", data.toString()).commit()
    render(c, data)
    reactContext?.takeIf { it.hasActiveReactInstance() }?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)?.emit("onRoamControl", null)
  }
  private fun actionIntent(c: Context, d: JSONObject): PendingIntent {
    val paused = d.optString("phase") == "paused"
    val intent = Intent(c, RoamControlReceiver::class.java).setAction(if (paused) "resume" else "pause")
      .setData(Uri.parse("fitnyxmobile://roam-control/${d.getString("sessionId")}/${d.getString("phase")}"))
      .putExtra("sessionId", d.getString("sessionId")).putExtra("phase", d.getString("phase"))
    return PendingIntent.getBroadcast(c, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
  private fun render(c: Context, d: JSONObject) {
    val service = service(c) ?: return
    val paused = d.optString("phase") == "paused"
    val type = d.optString("activityType")
    val title = "FITNYX ROAM · " + (if (paused) "PAUSED" else if (type == "cycle") "RIDE" else type.uppercase())
    val distance = String.format(java.util.Locale.US, "%.2f", d.optDouble("distanceM", 0.0) / 1000)
    val metric = if (type == "cycle") "${d.optString("speed", "—")} km/h" else "${d.optString("pace", "—")} /km"
    val elapsed = d.optInt("elapsed", 0)
    val time = String.format(java.util.Locale.US, "%d:%02d", elapsed / 60, elapsed % 60)
    val open = Intent(Intent.ACTION_VIEW, Uri.parse("fitnyxmobile:///roam/record")).setPackage(c.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    val openIntent = PendingIntent.getActivity(c, 412, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val view = RemoteViews(c.packageName, R.layout.roam_notification)
    view.setTextViewText(R.id.roam_brand, title)
    view.setTextViewText(R.id.roam_distance, distance)
    view.setTextViewText(R.id.roam_pace, metric)
    view.setTextViewText(R.id.roam_status, if (paused) "Route recording paused" else d.optString("gps", "GPS connected"))
    view.setChronometer(R.id.roam_time, SystemClock.elapsedRealtime() - (if (paused) elapsed * 1000L else (System.currentTimeMillis() - d.optDouble("anchor").toLong())), null, !paused)
    view.setTextViewText(R.id.roam_toggle, if (paused) "▶  Resume" else "Ⅱ  Pause")
    view.setOnClickPendingIntent(R.id.roam_toggle, actionIntent(c, d)); view.setOnClickPendingIntent(R.id.roam_open, openIntent)
    val notification = Notification.Builder(c, service.notification.channelId)
      .setSmallIcon(R.drawable.ic_stat_notification).setColor(Color.parseColor("#071C15")).setColorized(true)
      .setContentTitle(title).setContentText("$distance km  ·  $metric" + if (paused) "  ·  $time paused" else "")
      .setContentIntent(openIntent).setOngoing(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_WORKOUT)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .addExtras(Bundle().apply { putDouble("fitnyx.roam.revision", d.optDouble("revision")) })
      .setWhen(if (paused) 0 else d.optDouble("anchor").toLong()).setShowWhen(!paused).setUsesChronometer(!paused)
      .setStyle(Notification.DecoratedCustomViewStyle()).setCustomBigContentView(view)
      .build()
    manager(c).notify(service.id, notification)
  }
}
class RoamControlReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    RoamNotification.action(context, intent.getStringExtra("sessionId") ?: return, intent.action ?: return, intent.getStringExtra("phase") ?: return)
  }
}
class FitNyxRoamControls(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  init { RoamNotification.reactContext = context }
  override fun getName() = "FitNyxRoamControls"
  @ReactMethod fun update(raw: String, promise: Promise) { try { RoamNotification.update(reactApplicationContext, JSONObject(raw)); promise.resolve(null) } catch (e: Exception) { promise.reject("ROAM_NOTIFICATION", e) } }
  @ReactMethod fun clear(promise: Promise) { RoamNotification.clear(reactApplicationContext); promise.resolve(null) }
  @ReactMethod fun getPendingActions(promise: Promise) { promise.resolve(RoamNotification.pending(reactApplicationContext).toString()) }
  @ReactMethod fun acknowledgeActions(ids: ReadableArray, promise: Promise) { RoamNotification.acknowledge(reactApplicationContext, (0 until ids.size()).map { ids.getString(it)!! }.toSet()); promise.resolve(null) }
  @ReactMethod fun addListener(name: String) {}
  @ReactMethod fun removeListeners(count: Double) {}
}
class FitNyxRoamControlsPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(FitNyxRoamControls(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
