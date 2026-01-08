//
//  AeroGuardWidgetLiveActivity.swift
//  AeroGuardWidget
//
//  Created by Erdinç Yılmaz on 8.01.2026.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct AeroGuardWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct AeroGuardWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: AeroGuardWidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension AeroGuardWidgetAttributes {
    fileprivate static var preview: AeroGuardWidgetAttributes {
        AeroGuardWidgetAttributes(name: "World")
    }
}

extension AeroGuardWidgetAttributes.ContentState {
    fileprivate static var smiley: AeroGuardWidgetAttributes.ContentState {
        AeroGuardWidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: AeroGuardWidgetAttributes.ContentState {
         AeroGuardWidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: AeroGuardWidgetAttributes.preview) {
   AeroGuardWidgetLiveActivity()
} contentStates: {
    AeroGuardWidgetAttributes.ContentState.smiley
    AeroGuardWidgetAttributes.ContentState.starEyes
}
