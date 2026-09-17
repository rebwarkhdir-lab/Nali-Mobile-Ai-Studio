//
//  NaliWidgetBundle.swift
//  NaliMobile
//
//  Xcode Target Membership: Widget Extension
//  Purpose: Main entry point for the WidgetKit Extension.
//           Registers NaliWidget with Apple WidgetKit subsystem supporting
//           systemSmall, systemMedium, and systemLarge form factors.
//

import WidgetKit
import SwiftUI

public struct NaliWidget: Widget {
    public let kind: String = "com.nalimobile.widget.dashboard"
    
    public init() {}
    
    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NaliTimelineProvider()) { entry in
            NaliWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Nali Store Live")
        .description("Real-time cashier sales, daily revenue, overdue debt reminders, and low-stock alerts.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

@main
struct NaliWidgetBundle: WidgetBundle {
    var body: some Widget {
        NaliWidget()
    }
}
