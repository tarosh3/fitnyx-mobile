// Generated after expo-live-activity's unmodified ActivityAttributes definition.
// Color placeholders are resolved from src/theme/colors.ts by the config plugin.

private enum WorkoutPalette {
  static let background = Color(hex: "__BACKGROUND__")
  static let forest = Color(hex: "__SURFACE__")
  static let mint = Color(hex: "__PRIMARY__")
  static let onMint = Color(hex: "__PRIMARY_TEXT__")
  static let text = Color(hex: "__TEXT__")
  static let muted = Color(hex: "__MUTED__")
}

private enum WorkoutPhase: String {
  case ready, running, paused

  var label: String {
    switch self {
    case .ready: return "Ready to train"
    case .running: return "Workout in progress"
    case .paused: return "Workout paused"
    }
  }

  var shortLabel: String {
    switch self {
    case .ready: return "Ready"
    case .running: return "Running"
    case .paused: return "Paused"
    }
  }

  var actionLabel: String {
    switch self {
    case .ready: return "Start"
    case .running: return "Pause"
    case .paused: return "Resume"
    }
  }

  var action: String { self == .running ? "pause" : "resume" }
  var actionSymbol: String { self == .running ? "pause.fill" : "play.fill" }
  var statusSymbol: String { self == .paused ? "pause.fill" : "dumbbell.fill" }
}

private struct WorkoutPresentation {
  let state: LiveActivityAttributes.ContentState
  let attributes: LiveActivityAttributes

  var phase: WorkoutPhase {
    if let start = state.elapsedTimerStartDateInMilliseconds, start.isFinite, start > 0 { return .running }
    return (state.progress ?? 0) >= 1 ? .paused : .ready
  }

  var title: String { state.title.isEmpty ? "Your workout" : state.title }
  var frozenElapsed: String { state.subtitle.flatMap { $0.isEmpty ? nil : $0 } ?? "0:00" }

  var openURL: URL? {
    guard let raw = attributes.deepLinkUrl,
          var components = URLComponents(string: raw),
          components.scheme == "fitnyxmobile" else { return nil }
    components.queryItems = components.queryItems?.filter {
      $0.name != "notificationAction" && $0.name != "notificationState"
    }
    return components.url
  }

  var actionURL: URL? {
    guard let url = openURL, var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return nil }
    var items = components.queryItems ?? []
    items.append(URLQueryItem(name: "notificationAction", value: phase.action))
    items.append(URLQueryItem(name: "notificationState", value: phase.rawValue))
    components.queryItems = items
    return components.url
  }
}

@available(iOS 16.1, *)
public struct LiveActivityWidget: Widget {
  public var body: some WidgetConfiguration {
    let configuration = ActivityConfiguration(for: LiveActivityAttributes.self) { context in
      WorkoutActivityContent(model: WorkoutPresentation(state: context.state, attributes: context.attributes))
        .activityBackgroundTint(WorkoutPalette.background)
        .activitySystemActionForegroundColor(WorkoutPalette.mint)
        .widgetURL(WorkoutPresentation(state: context.state, attributes: context.attributes).openURL)
    } dynamicIsland: { context in
      let model = WorkoutPresentation(state: context.state, attributes: context.attributes)
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading, priority: 1) {
          VStack(alignment: .leading, spacing: 4) {
            Text("FITNYX")
              .font(.caption2.weight(.bold))
              .tracking(1.5)
              .foregroundStyle(WorkoutPalette.mint)
            Text(model.title)
              .font(.subheadline.weight(.semibold))
              .foregroundStyle(WorkoutPalette.text)
              .lineLimit(1)
              .minimumScaleFactor(0.75)
          }
          .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            WorkoutElapsed(model: model)
              .font(.system(size: 24, weight: .semibold, design: .rounded))
              .frame(width: 112, alignment: .trailing)
            Text(model.phase.shortLabel)
              .font(.caption2.weight(.medium))
              .foregroundStyle(WorkoutPalette.muted)
          }
          .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.bottom) {
          WorkoutActions(model: model)
            .padding(.top, 6)
            .padding(.horizontal, 4)
        }
      } compactLeading: {
        Image(systemName: model.phase.statusSymbol)
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(WorkoutPalette.mint)
          .accessibilityLabel("FitNyx. \(model.phase.label)")
      } compactTrailing: {
        WorkoutElapsed(model: model)
          .font(.system(size: 13, weight: .semibold, design: .rounded))
          .frame(width: 62, alignment: .trailing)
          .multilineTextAlignment(.trailing)
      } minimal: {
        Image(systemName: model.phase.statusSymbol)
          .foregroundStyle(WorkoutPalette.mint)
          .accessibilityLabel("FitNyx. \(model.phase.label)")
      }
      .widgetURL(model.openURL)
      .keylineTint(WorkoutPalette.mint)
    }

    if #available(iOS 18.0, *) {
      return configuration.supplementalActivityFamilies([.small])
    } else {
      return configuration
    }
  }

  public init() {}
}

private struct WorkoutActivityContent: View {
  let model: WorkoutPresentation

  var body: some View {
    if #available(iOS 18.0, *) {
      WorkoutActivityFamilyContent(model: model)
    } else {
      WorkoutLockScreenCard(model: model)
    }
  }
}

@available(iOS 18.0, *)
private struct WorkoutActivityFamilyContent: View {
  @Environment(\.activityFamily) private var activityFamily
  let model: WorkoutPresentation

  var body: some View {
    if activityFamily == .small {
      VStack(alignment: .leading, spacing: 5) {
        Label("FitNyx", systemImage: model.phase.statusSymbol)
          .font(.caption.weight(.semibold))
          .foregroundStyle(WorkoutPalette.mint)
        WorkoutElapsed(model: model)
          .font(.title2.weight(.semibold))
        Text(model.phase.label)
          .font(.caption2)
          .foregroundStyle(WorkoutPalette.muted)
          .lineLimit(1)
          .minimumScaleFactor(0.75)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(10)
    } else {
      WorkoutLockScreenCard(model: model)
    }
  }
}

private struct WorkoutLockScreenCard: View {
  @Environment(\.dynamicTypeSize) private var dynamicTypeSize
  @Environment(\.isLuminanceReduced) private var isLuminanceReduced
  let model: WorkoutPresentation

  var body: some View {
    ViewThatFits(in: .vertical) {
      detailedCard
      condensedCard
    }
    .padding(14)
    .frame(height: 156)
    .background(
      LinearGradient(colors: [WorkoutPalette.forest, WorkoutPalette.background], startPoint: .topLeading, endPoint: .bottomTrailing)
    )
  }

  private var detailedCard: some View {
    VStack(alignment: .leading, spacing: 6) {
      HStack {
        Text("FITNYX")
          .font(.caption2.weight(.bold))
          .tracking(1.8)
          .foregroundStyle(WorkoutPalette.mint)
        Spacer(minLength: 8)
        Text(model.phase.shortLabel)
          .font(.caption2.weight(.semibold))
          .foregroundStyle(WorkoutPalette.mint)
      }
      HStack(alignment: .center, spacing: 12) {
        VStack(alignment: .leading, spacing: 1) {
          Text(model.title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(WorkoutPalette.text)
            .lineLimit(1)
            .minimumScaleFactor(0.75)
          WorkoutElapsed(model: model)
            .font(.system(size: 32, weight: .semibold, design: .rounded))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .layoutPriority(1)
        if !dynamicTypeSize.isAccessibilitySize {
          Image("FitNyxStrength")
            .resizable()
            .scaledToFit()
            .frame(width: 80, height: 56)
            .opacity(isLuminanceReduced ? 0.65 : 1)
            .accessibilityHidden(true)
        }
      }
      WorkoutActions(model: model)
    }
  }

  // At large text sizes, sacrifice decorative branding/artwork before shrinking
  // the elapsed time or losing the actions to the system's 160pt height limit.
  private var condensedCard: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(alignment: .center, spacing: 8) {
        VStack(alignment: .leading, spacing: 2) {
          Text(model.title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(WorkoutPalette.text)
            .lineLimit(1)
            .minimumScaleFactor(0.65)
          Text(model.phase.shortLabel)
            .font(.caption.weight(.medium))
            .foregroundStyle(WorkoutPalette.mint)
            .lineLimit(1)
            .minimumScaleFactor(0.65)
        }
        Spacer(minLength: 0)
        WorkoutElapsed(model: model)
          .font(.system(size: 28, weight: .semibold, design: .rounded))
          .frame(width: 116, alignment: .trailing)
      }
      .frame(maxHeight: .infinity)
      WorkoutActions(model: model)
    }
  }
}

private struct WorkoutElapsed: View {
  let model: WorkoutPresentation

  private var elapsedText: Text {
    if model.phase == .running, let start = model.state.elapsedTimerStartDateInMilliseconds {
      return Text(
        timerInterval: Date(timeIntervalSince1970: start / 1000) ... Date.distantFuture,
        countsDown: false,
        showsHours: true
      )
    }
    return Text(model.frozenElapsed)
  }

  var body: some View {
    elapsedText
    .monospacedDigit()
    .foregroundStyle(WorkoutPalette.text)
    .lineLimit(1)
    .minimumScaleFactor(0.65)
    .accessibilityLabel("Elapsed workout time")
    .accessibilityValue(elapsedText)
    .accessibilityHint(model.phase.label)
  }
}

private struct WorkoutActions: View {
  let model: WorkoutPresentation

  var body: some View {
    HStack(spacing: 8) {
      if let url = model.actionURL {
        Link(destination: url) {
          Label(model.phase.actionLabel, systemImage: model.phase.actionSymbol)
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .minimumScaleFactor(0.65)
            .frame(maxWidth: .infinity, minHeight: 44, maxHeight: 44)
            .foregroundStyle(WorkoutPalette.onMint)
            .background(WorkoutPalette.mint, in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(model.phase.actionLabel) workout")
        .accessibilityHint("Opens FitNyx to \(model.phase.actionLabel.lowercased()) this workout.")
      }
      if let url = model.openURL {
        Link(destination: url) {
          Label("Open", systemImage: "arrow.up.right")
            .font(.subheadline.weight(.semibold))
            .lineLimit(1)
            .minimumScaleFactor(0.65)
            .frame(minWidth: 80, maxWidth: .infinity, minHeight: 44, maxHeight: 44)
            .foregroundStyle(WorkoutPalette.text)
            .background(WorkoutPalette.text.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Open workout in FitNyx")
      }
    }
  }
}

// This name/signature is also consumed by the upstream medium/small helper views
// that remain in the target. The system updates the clock without JS polling.
struct ElapsedTimerText: View {
  let startTimeMilliseconds: Double
  let color: Color?

  var body: some View {
    Text(
      timerInterval: Date(timeIntervalSince1970: startTimeMilliseconds / 1000) ... Date.distantFuture,
      countsDown: false,
      showsHours: true
    )
    .monospacedDigit()
    .foregroundStyle(color ?? WorkoutPalette.text)
  }
}
