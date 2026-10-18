import Foundation
import React
import ActivityKit

@objc(FitNyxWorkoutControls)
final class FitNyxWorkoutControls: RCTEventEmitter {
  private var observer: NSObjectProtocol?

  override static func requiresMainQueueSetup() -> Bool { true }
  override func supportedEvents() -> [String]! { ["onWorkoutControl"] }
  override func startObserving() {
    observer = NotificationCenter.default.addObserver(forName: WorkoutControlStore.event, object: nil, queue: .main) { [weak self] _ in
      self?.sendEvent(withName: "onWorkoutControl", body: [:])
    }
  }
  override func stopObserving() {
    if let observer { NotificationCenter.default.removeObserver(observer) }
    observer = nil
  }

  @objc(getPendingActions:rejecter:)
  func getPendingActions(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(WorkoutControlStore.pending)
  }

  @objc(getActiveActivityIds:rejecter:)
  func getActiveActivityIds(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    if #available(iOS 16.2, *) {
      resolve(Activity<LiveActivityAttributes>.activities.filter {
        $0.activityState == .active || $0.activityState == .stale
      }.map { $0.id })
    } else { resolve([]) }
  }

  @objc(acknowledgeActions:resolver:rejecter:)
  func acknowledgeActions(_ ids: [String], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let acknowledged = Set(ids)
      WorkoutControlStore.pending = WorkoutControlStore.pending.filter { !acknowledged.contains($0["id"] as? String ?? "") }
      resolve(nil)
    }
  }
}
