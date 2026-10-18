import CoreMotion
import ExpoModulesCore

// Steps and in-vehicle periods for Roam. CoreMotion keeps its own history, so
// both are queried for any time range — they keep working while the app is in
// the background or was suspended mid-Roam.
public class RoamMotionModule: Module {
  private let pedometer = CMPedometer()
  private let activity = CMMotionActivityManager()

  public func definition() -> ModuleDefinition {
    Name("RoamMotion")

    // Steps taken between two times (ms since epoch); nil when step counting is
    // unavailable or Motion & Fitness access was declined. The first query
    // shows the permission prompt.
    AsyncFunction("getStepCount") { (fromMs: Double, toMs: Double, promise: Promise) in
      guard CMPedometer.isStepCountingAvailable(), CMPedometer.authorizationStatus() != .denied,
            CMPedometer.authorizationStatus() != .restricted else {
        promise.resolve(nil)
        return
      }
      self.pedometer.queryPedometerData(from: Self.date(fromMs), to: Self.date(toMs)) { data, error in
        promise.resolve(error == nil ? data?.numberOfSteps.intValue : nil)
      }
    }

    // Android's raw since-boot counter; iOS answers with getStepCount instead.
    AsyncFunction("readStepCounter") { () -> Int? in nil }

    // Periods (ms since epoch) the phone was confident it was in a vehicle.
    AsyncFunction("getVehicleWindows") { (fromMs: Double, toMs: Double, promise: Promise) in
      guard CMMotionActivityManager.isActivityAvailable(), CMMotionActivityManager.authorizationStatus() == .authorized else {
        promise.resolve([[Double]]())
        return
      }
      self.activity.queryActivityStarting(from: Self.date(fromMs), to: Self.date(toMs), to: .main) { list, error in
        guard let list = list, error == nil else {
          promise.resolve([[Double]]())
          return
        }
        var windows: [[Double]] = []
        var start: Double?
        for a in list {
          let t = max(fromMs, a.startDate.timeIntervalSince1970 * 1000)
          let inVehicle = a.automotive && a.confidence != .low && !a.walking && !a.running && !a.cycling
          if inVehicle, start == nil { start = t }
          if !inVehicle, let s = start {
            windows.append([s, t])
            start = nil
          }
        }
        if let s = start { windows.append([s, toMs]) }
        promise.resolve(windows)
      }
    }

    // Android keeps listeners for these; CoreMotion needs nothing running.
    AsyncFunction("startTracking") {}
    AsyncFunction("stopTracking") {}
  }

  private static func date(_ ms: Double) -> Date { Date(timeIntervalSince1970: ms / 1000) }
}
