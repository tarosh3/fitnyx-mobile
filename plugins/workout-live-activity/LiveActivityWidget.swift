// Generated after expo-live-activity's unmodified ActivityAttributes definition.
// Native timers continue while JavaScript is suspended.
private enum WorkoutPalette {
  static let background = Color(hex: "__BACKGROUND__")
  static let mint = Color(hex: "__PRIMARY__")
  static let onMint = Color(hex: "__PRIMARY_TEXT__")
  static let text = Color(hex: "__TEXT__")
  static let muted = Color(hex: "__MUTED__")
}

private struct WorkoutPresentation {
  let activityId: String
  let state: LiveActivityAttributes.ContentState
  let attributes: LiveActivityAttributes
  var data: WorkoutActivityData { WorkoutActivityData.read(state) }
  var isRoam: Bool { data.kind == "roam" }
  var activityLabel: String { data.activityType == "cycle" ? "RIDE" : data.activityType == "walk" ? "WALK" : "RUN" }
  var activitySymbol: String { data.activityType == "cycle" ? "bicycle" : data.activityType == "walk" ? "figure.walk" : "figure.run" }
  var distance: String { String(format: "%.2f", (data.distanceM ?? 0) / 1000) }
  var phase: String { state.elapsedTimerStartDateInMilliseconds != nil ? "running" : (state.progress ?? 0) >= 1 ? "paused" : "ready" }
  var action: String { phase == "running" ? "pause" : "resume" }
  var actionLabel: String { phase == "running" ? "Pause" : phase == "ready" ? "Start" : "Resume" }
  var symbol: String { phase == "running" ? "pause.fill" : "play.fill" }
  var status: String { phase == "running" ? (isRoam ? activityLabel : "TRAINING") : phase == "ready" ? "READY WHEN YOU ARE" : "PAUSED" }
  var restEnd: Date? { data.restEnd.map { Date(timeIntervalSince1970: $0 / 1000) } }
  var openURL: URL? { attributes.deepLinkUrl.flatMap(URL.init(string:)) }
  var volume: String { data.volumeKg.formatted(.number.precision(.fractionLength(0...1)).notation(data.volumeKg >= 10000 ? .compactName : .automatic)) }
}

@available(iOS 16.1, *)
public struct LiveActivityWidget: Widget {
  public init() {}
  public var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveActivityAttributes.self) { context in
      ActivityCard(model: WorkoutPresentation(activityId: context.activityID, state: context.state, attributes: context.attributes))
        .activityBackgroundTint(WorkoutPalette.background)
        .activitySystemActionForegroundColor(WorkoutPalette.mint)
        .widgetURL(context.attributes.deepLinkUrl.flatMap(URL.init(string:)))
    } dynamicIsland: { context in
      let model = WorkoutPresentation(activityId: context.activityID, state: context.state, attributes: context.attributes)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          VStack(alignment: .leading, spacing: 4) {
            Text("FITNYX").font(.system(size: 11, weight: .heavy)).tracking(2).foregroundStyle(WorkoutPalette.mint).lineLimit(1)
            Text(model.status).font(.system(size: 9, weight: .semibold)).tracking(1).foregroundStyle(WorkoutPalette.muted)
          }.padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.trailing) {
          WorkoutElapsed(model: model).font(.system(size: 26, weight: .bold, design: .rounded)).frame(width: 82, alignment: .trailing).padding(.trailing, 6)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 10) {
            HStack {
              Label(model.isRoam ? "\(model.distance) km" : "\(model.data.sets) sets", systemImage: model.isRoam ? model.activitySymbol : "checkmark.circle.fill")
              Spacer()
              Text(model.isRoam ? (model.data.activityType == "cycle" ? "\(model.data.speed ?? "—") km/h" : "\(model.data.pace ?? "—") /km") : "\(model.volume) kg lifted")
            }.font(.system(size: 12, weight: .medium)).foregroundStyle(WorkoutPalette.muted)
            WorkoutActions(model: model)
          }.padding(.horizontal, 6).padding(.top, 4)
        }
      } compactLeading: {
        Image(systemName: model.phase == "paused" ? "pause.fill" : model.isRoam ? model.activitySymbol : "dumbbell.fill")
          .foregroundStyle(WorkoutPalette.mint).accessibilityLabel("FitNyx \(model.status)")
      } compactTrailing: {
        if model.isRoam {
          Text(model.distance).font(.system(size: 14, weight: .bold, design: .rounded)).monospacedDigit().foregroundStyle(WorkoutPalette.mint).accessibilityLabel("\(model.distance) kilometres")
        } else {
          WorkoutElapsed(model: model).font(.system(size: 13, weight: .bold, design: .rounded)).frame(width: 62)
        }
      } minimal: {
        Image(systemName: model.phase == "paused" ? "pause.fill" : model.isRoam ? model.activitySymbol : "dumbbell.fill").foregroundStyle(WorkoutPalette.mint)
      }
      .keylineTint(WorkoutPalette.mint)
      .widgetURL(model.openURL)
    }
  }
}

private struct ActivityCard: View {
  let model: WorkoutPresentation
  var body: some View {
    if model.isRoam { RoamLockScreenCard(model: model) }
    else { WorkoutLockScreenCard(model: model) }
  }
}

private struct RoamLockScreenCard: View {
  let model: WorkoutPresentation
  var body: some View {
    VStack(alignment: .leading, spacing: 11) {
      HStack {
        Label("FITNYX ROAM", systemImage: model.activitySymbol).font(.system(size: 11, weight: .heavy)).tracking(1.4)
        Spacer()
        Text(model.phase == "paused" ? "PAUSED" : model.activityLabel).font(.system(size: 10, weight: .bold)).tracking(1)
      }.foregroundStyle(WorkoutPalette.mint)
      HStack(alignment: .firstTextBaseline, spacing: 14) {
        VStack(alignment: .leading, spacing: 1) {
          Text(model.distance).font(.system(size: 38, weight: .bold, design: .rounded)).monospacedDigit().foregroundStyle(WorkoutPalette.mint)
          caption("KILOMETRES")
        }.frame(maxWidth: .infinity, alignment: .leading).layoutPriority(1)
        VStack(alignment: .leading, spacing: 4) {
          WorkoutElapsed(model: model).font(.system(size: 22, weight: .semibold, design: .rounded)).frame(width: 82, alignment: .leading)
          caption("TIME")
        }
        VStack(alignment: .leading, spacing: 4) {
          Text(model.data.activityType == "cycle" ? model.data.speed ?? "—" : model.data.pace ?? "—")
            .font(.system(size: 22, weight: .semibold, design: .rounded)).monospacedDigit().foregroundStyle(WorkoutPalette.text)
          caption(model.data.activityType == "cycle" ? "AVG KM/H" : "AVG /KM")
        }.frame(minWidth: 65, alignment: .leading)
      }.lineLimit(1).minimumScaleFactor(0.65)
      WorkoutActions(model: model)
      if model.phase != "paused", let gps = model.data.gps, gps != "GPS connected" {
        Label(gps, systemImage: "location.slash").font(.system(size: 10, weight: .medium)).foregroundStyle(WorkoutPalette.muted).lineLimit(1)
      }
    }.padding(.horizontal, 18).padding(.vertical, 14)
      .background(LinearGradient(colors: [WorkoutPalette.mint.opacity(0.06), .clear], startPoint: .topLeading, endPoint: .bottomTrailing))
  }
  private func caption(_ text: String) -> some View {
    Text(text).font(.system(size: 9, weight: .semibold)).tracking(1).foregroundStyle(WorkoutPalette.muted).lineLimit(1)
  }
}

private struct WorkoutLockScreenCard: View {
  let model: WorkoutPresentation
  var body: some View {
    VStack(alignment: .leading, spacing: 11) {
      HStack(spacing: 6) {
        Image(systemName: "dumbbell.fill").font(.system(size: 12, weight: .bold))
        Text("FITNYX").font(.system(size: 11, weight: .heavy)).tracking(2)
        Spacer()
        Circle().fill(WorkoutPalette.mint.opacity(model.phase == "running" ? 1 : 0.35)).frame(width: 5, height: 5)
        Text(model.status).font(.system(size: 9, weight: .bold)).tracking(1)
      }.foregroundStyle(WorkoutPalette.mint)
      HStack(alignment: .firstTextBaseline, spacing: 14) {
        VStack(alignment: .leading, spacing: 0) {
          WorkoutElapsed(model: model).font(.system(size: 38, weight: .bold, design: .rounded)).frame(maxWidth: .infinity, alignment: .leading)
          caption("ELAPSED")
        }.frame(maxWidth: .infinity, alignment: .leading).layoutPriority(1)
        metric("\(model.data.sets)", label: "SETS")
        metric(model.volume, label: "KG LIFTED")
      }
      WorkoutActions(model: model)
    }
    .padding(.horizontal, 18).padding(.vertical, 14)
    .background(LinearGradient(colors: [WorkoutPalette.mint.opacity(0.06), .clear], startPoint: .topLeading, endPoint: .bottomTrailing))
  }
  private func caption(_ title: String) -> some View {
    Text(title).font(.system(size: 9, weight: .semibold)).tracking(1.1).foregroundStyle(WorkoutPalette.muted).lineLimit(1).minimumScaleFactor(0.8)
  }
  private func metric(_ value: String, label: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(value).font(.system(size: 24, weight: .semibold, design: .rounded)).monospacedDigit().foregroundStyle(WorkoutPalette.text).lineLimit(1).minimumScaleFactor(0.7)
      caption(label)
    }.frame(minWidth: label == "KG LIFTED" ? 64 : 44)
  }
}

private struct WorkoutElapsed: View {
  let model: WorkoutPresentation
  var body: some View {
    Group {
      if let anchor = model.state.elapsedTimerStartDateInMilliseconds {
        Text(timerInterval: Date(timeIntervalSince1970: anchor / 1000)...Date.distantFuture, countsDown: false, showsHours: true)
      } else {
        Text(String(format: "%d:%02d", Int(model.data.elapsed) / 60, Int(model.data.elapsed) % 60))
      }
    }.monospacedDigit().foregroundStyle(WorkoutPalette.mint).lineLimit(1).minimumScaleFactor(0.6)
      .accessibilityLabel("Elapsed \(model.isRoam ? "activity" : "workout") time")
  }
}

private struct WorkoutActions: View {
  let model: WorkoutPresentation
  var body: some View {
    HStack(spacing: 8) {
      if #available(iOS 17.0, *), !model.data.sessionId.isEmpty {
        control(model.action, label: model.actionLabel, symbol: model.symbol, primary: true)
        if model.isRoam, let url = model.openURL {
          Link(destination: url) {
            Label("View route", systemImage: "map").font(.system(size: 12, weight: .bold))
              .frame(maxWidth: .infinity, minHeight: 44)
              .foregroundStyle(WorkoutPalette.text)
              .background(WorkoutPalette.text.opacity(0.09), in: Capsule())
          }.buttonStyle(.plain)
        } else if let end = model.restEnd {
          HStack(spacing: 4) {
            Image(systemName: "timer").font(.system(size: 12))
            Text(timerInterval: min(Date(), end)...max(Date(), end), countsDown: true, showsHours: false)
              .monospacedDigit().frame(width: 40)
          }.font(.system(size: 13, weight: .semibold)).foregroundStyle(WorkoutPalette.text).accessibilityLabel("Rest remaining")
          control("extendRest", label: "+30s", symbol: nil)
          control("skipRest", label: "Skip", symbol: nil)
        } else if model.phase != "ready" {
          control("rest", label: "Rest 1m", symbol: "timer")
        } else {
          Text("Your next rep starts here.").font(.system(size: 11, weight: .medium)).foregroundStyle(WorkoutPalette.muted).frame(maxWidth: .infinity)
        }
      } else if let url = model.openURL {
        Link(destination: url) {
          Label("Open workout", systemImage: "arrow.up.right").frame(maxWidth: .infinity, minHeight: 44)
        }.foregroundStyle(WorkoutPalette.mint)
      }
    }
  }
  @available(iOS 17.0, *)
  private func control(_ action: String, label: String, symbol: String?, primary: Bool = false) -> some View {
    Button(intent: WorkoutControlIntent(activityId: model.activityId, sessionId: model.data.sessionId, action: action, expectedState: model.phase)) {
      HStack(spacing: 6) {
        if let symbol { Image(systemName: symbol).font(.system(size: 12, weight: .bold)) }
        Text(label).font(.system(size: 12, weight: .bold)).lineLimit(1).minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, minHeight: 44)
      .padding(.horizontal, 8)
      .foregroundStyle(primary ? WorkoutPalette.onMint : WorkoutPalette.text)
      .background(primary ? WorkoutPalette.mint : WorkoutPalette.text.opacity(0.09), in: Capsule())
    }.buttonStyle(.plain).accessibilityLabel(action == "pause" || action == "resume" ? "\(label) \(model.isRoam ? "activity" : "workout")" : label)
  }
}

// Upstream helper views still reference this name.
struct ElapsedTimerText: View {
  let startTimeMilliseconds: Double
  let color: Color?
  var body: some View {
    Text(timerInterval: Date(timeIntervalSince1970: startTimeMilliseconds / 1000)...Date.distantFuture, countsDown: false, showsHours: true)
      .monospacedDigit().foregroundStyle(color ?? WorkoutPalette.text)
  }
}
