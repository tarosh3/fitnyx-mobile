import ActivityKit
import AppIntents
import Foundation

// Stored inside the existing subtitle field so the package's Codable schema
// stays compatible across app, extension, and expo-live-activity upgrades.
struct WorkoutActivityData: Codable {
  var kind: String?
  var activityType: String?
  var distanceM: Double?
  var pace: String?
  var speed: String?
  var gps: String?
  var sessionId: String
  var elapsed: Double
  var sets: Int
  var volumeKg: Double
  var exercise: String?
  var restEnd: Double?
  var revision: Double

  static func read(_ state: LiveActivityAttributes.ContentState) -> WorkoutActivityData {
    if let raw = state.subtitle?.data(using: .utf8), let value = try? JSONDecoder().decode(Self.self, from: raw) { return value }
    let parts = (state.subtitle ?? "0:00").split(separator: ":").compactMap { Double($0) }
    let elapsed = parts.count == 2 ? parts[0] * 60 + parts[1] : 0
    return Self(sessionId: "", elapsed: elapsed, sets: 0, volumeKg: 0, revision: 0)
  }

  func encoded() throws -> String { String(decoding: try JSONEncoder().encode(self), as: UTF8.self) }
}

@available(iOS 17.0, *)
struct WorkoutControlIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Control workout"
  static var description = IntentDescription("Pause, resume, or adjust rest in your current FitNyx workout.")
  static var openAppWhenRun = false
  static var isDiscoverable = false
  static var authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed
  @available(iOS 26.0, *)
  static var supportedModes: IntentModes { .background }

  @Parameter(title: "Activity") var activityId: String
  @Parameter(title: "Session") var sessionId: String
  @Parameter(title: "Action") var action: String
  @Parameter(title: "Expected state") var expectedState: String

  init() {}
  init(activityId: String, sessionId: String, action: String, expectedState: String) {
    self.activityId = activityId
    self.sessionId = sessionId
    self.action = action
    self.expectedState = expectedState
  }

  func perform() async throws -> some IntentResult {
    #if FITNYX_APP
    try await WorkoutControlEngine.perform(activityId: activityId, sessionId: sessionId, action: action, expectedState: expectedState)
    #endif
    return .result()
  }
}
