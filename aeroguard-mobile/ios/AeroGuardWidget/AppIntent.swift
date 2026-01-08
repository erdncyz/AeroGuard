//
//  AppIntent.swift
//  AeroGuardWidget
//
//  Created by Erdinç Yılmaz on 8.01.2026.
//

import AppIntents
import WidgetKit

struct ConfigurationAppIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource { "Konum Ayarları" }
    static var description: IntentDescription { "Hava kalitesi takip edilecek konumu seçin." }

    // Örnek parametre: Şehir seçimi (İleride genişletilebilir)
    // Şimdilik varsayılan bırakıyoruz.
    @Parameter(title: "Şehir", default: "Mevcut Konum")
    var city: String
}
