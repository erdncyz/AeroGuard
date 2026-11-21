//
//  AppIntent.swift
//  AeroGuardWidget
//
//  Created by Erdinç Yılmaz on 8.01.2026.
//

import AppIntents
import WidgetKit

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Son Ölçüm İstasyonu" }
    static var description: IntentDescription {
        "Widget, AeroGuard uygulamasında belirlenen son ölçüm istasyonunu takip eder."
    }
}
