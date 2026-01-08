//
//  AeroGuardWidgetBundle.swift
//  AeroGuardWidget
//
//  Created by Erdinç Yılmaz on 8.01.2026.
//

import WidgetKit
import SwiftUI

@main
struct AeroGuardWidgetBundle: WidgetBundle {
    var body: some Widget {
        AeroGuardWidget()
        AeroGuardWidgetControl()
        AeroGuardWidgetLiveActivity()
    }
}
