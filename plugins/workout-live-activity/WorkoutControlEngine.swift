import ActivityKit
import Foundation

// LiveActivityIntent runs in the app process without foregrounding it. These
// values stay in the app sandbox; no auth tokens or shared App Group are needed.
enum WorkoutControlStore {
  static let pendingKey = "fitnyx.workout.native-actions.v1"
  static let event = Notification.Name("FitNyxWorkoutControl")
  static var pending: [[String: Any]] {
    get { UserDefaults.standard.array(forKey: pendingKey) as? [[String: Any]] ?? [] }
    set { UserDefaults.standard.set(newValue, forKey: pendingKey) }
  }
}

@available(iOS 16.2, *)
@MainActor
enum WorkoutControlEngine {
  static func perform(activityId: String, sessionId: String, action: String, expectedState: String) async throws {
    guard let activity = Activity<LiveActivityAttributes>.activities.first(where: { $0.id == activityId }),
          let deepLink = activity.attributes.deepLinkUrl, URL(string: deepLink)?.scheme == "fitnyxmobile",
          !sessionId.isEmpty else { return }
    var state = activity.content.state
    var data = WorkoutActivityData.read(state)
    guard data.sessionId == sessionId else { return }
    if data.kind == "roam" && action != "pause" && action != "resume" { return }
    // The durable journal also closes the short gap before ActivityKit's content
    // update becomes visible to a second rapid tap.
    if let last = WorkoutControlStore.pending.last(where: { $0["sessionId"] as? String == sessionId }),
       let raw = last["content"] as? String, let bytes = raw.data(using: .utf8),
       let previous = try? JSONDecoder().decode(WorkoutActivityData.self, from: bytes), previous.revision > data.revision {
      data = previous
      state.progress = last["progress"] as? Double
      state.elapsedTimerStartDateInMilliseconds = last["anchor"] as? Double
    }
    let now = Date().timeIntervalSince1970 * 1000
    let running = state.elapsedTimerStartDateInMilliseconds != nil
    let phase = running ? "running" : (state.progress ?? 0) == 0 ? "ready" : "paused"
    guard phase == expectedState else { return }
    if let anchor = state.elapsedTimerStartDateInMilliseconds { data.elapsed = max(0, floor((now - anchor) / 1000)) }
    switch action {
    case "pause" where running:
      state.elapsedTimerStartDateInMilliseconds = nil
      state.progress = 1
    case "resume" where !running:
      state.elapsedTimerStartDateInMilliseconds = now - data.elapsed * 1000
      state.progress = nil
    case "rest" where phase != "ready": data.restEnd = now + 60000
    case "extendRest" where phase != "ready": data.restEnd = max(now, data.restEnd ?? now) + 30000
    case "skipRest": data.restEnd = nil
    default: return
    }
    data.revision = now
    state.subtitle = try data.encoded()
    var entry: [String: Any] = [
      "id": UUID().uuidString, "sessionId": sessionId, "action": action, "kind": data.kind ?? "workout",
      "timestamp": ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: now / 1000)),
      "content": state.subtitle!, "elapsed": data.elapsed,
    ]
    if let anchor = state.elapsedTimerStartDateInMilliseconds { entry["anchor"] = anchor }
    if let progress = state.progress { entry["progress"] = progress }
    var pending = WorkoutControlStore.pending
    pending.append(entry)
    WorkoutControlStore.pending = pending
    await activity.update(ActivityContent(state: state, staleDate: nil))
    NotificationCenter.default.post(name: WorkoutControlStore.event, object: nil)
  }
}
