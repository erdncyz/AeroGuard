import SwiftUI
import GoogleMobileAds
import AppTrackingTransparency
import UserNotifications
#if canImport(FirebaseCore)
import FirebaseCore
#endif
#if canImport(FirebaseMessaging)
import FirebaseMessaging
#endif

@main
struct AeroGuardApp: App {
    @StateObject private var appLifecycleObserver = AppLifecycleObserver()
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    init() {
        #if canImport(FirebaseCore)
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
            print("FirebaseApp.configure() init icinde cagrildi")
        }
        #endif
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appLifecycleObserver)
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                    // Request ATT permission when app becomes active
                    requestTrackingPermission()
                }
        }
    }
    
    private func requestTrackingPermission() {
        // Wait a moment for the UI to be ready
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            ATTrackingManager.requestTrackingAuthorization { status in
                switch status {
                case .authorized:
                    print("ATT: Kullanıcı izin verdi")
                case .denied:
                    print("ATT: Kullanıcı reddetti")
                case .restricted:
                    print("ATT: Kısıtlı")
                case .notDetermined:
                    print("ATT: Henüz belirlenmedi")
                @unknown default:
                    print("ATT: Bilinmeyen durum")
                }
                
                // Show App Open Ad after ATT dialog
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    AdManager.shared.showAppOpenAdIfAvailable()
                }
            }
        }
    }
}

// MARK: - App Delegate for AdMob initialization
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    private var latestFCMToken: String?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        // Initialize Google Mobile Ads SDK
        AdManager.shared.initialize()
        AnalyticsManager.shared.trackAppOpened()

        #if canImport(FirebaseCore)
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        #endif

        UNUserNotificationCenter.current().delegate = self
        #if canImport(FirebaseMessaging)
        print("Firebase Messaging: aktif")
        Messaging.messaging().delegate = self
        Messaging.messaging().token { token, error in
            if let error {
                print("FCM token ilk alma hatasi: \(error.localizedDescription)")
            } else if let token {
                print("FCM Token (ilk): \(token)")
                self.latestFCMToken = token
                self.logUserTokenAndCity(trigger: "ilk_acilis")
            } else {
                print("FCM Token (ilk): bos dondu")
            }
        }
        #else
        print("Firebase Messaging: pasif (dependency bulunamadi)")
        #endif

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCityUpdated),
            name: .aeroGuardCityUpdated,
            object: nil
        )
        requestPushPermission(application: application)

        return true
    }

    private func requestPushPermission(application: UIApplication) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error {
                print("Push izin hatasi: \(error.localizedDescription)")
                return
            }

            print("Push izin verildi: \(granted)")
            AnalyticsManager.shared.trackPushPermission(granted: granted)
            guard granted else { return }

            DispatchQueue.main.async {
                application.registerForRemoteNotifications()
            }
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        #if canImport(FirebaseMessaging)
        let apnsToken = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("APNs Token: \(apnsToken)")
        Messaging.messaging().apnsToken = deviceToken
        Messaging.messaging().token { token, error in
            if let error {
                print("FCM token alma hatasi: \(error.localizedDescription)")
            } else if let token {
                print("FCM Token: \(token)")
                self.latestFCMToken = token
                self.logUserTokenAndCity(trigger: "apns_kaydi")
            } else {
                print("FCM Token: bos dondu")
            }
        }
        #endif
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs token alinamadi: \(error.localizedDescription)")
    }

    #if canImport(FirebaseMessaging)
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else { return }
        print("FCM Token: \(fcmToken)")
        latestFCMToken = fcmToken
        logUserTokenAndCity(trigger: "delegate_token")
        // TODO: Token'i backend'e gönder (kullaniciya baglayarak saklayin).
    }
    #endif

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("Push alindi (foreground): \(notification.request.content.userInfo)")
        AnalyticsManager.shared.trackPushReceived(source: "foreground")
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        print("Push tiklandi: \(response.notification.request.content.userInfo)")
        AnalyticsManager.shared.trackPushOpened()
        completionHandler()
    }

    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable : Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("Remote payload geldi: \(userInfo)")
        AnalyticsManager.shared.trackPushReceived(source: "background")
        completionHandler(.newData)
    }

    @objc private func handleCityUpdated() {
        logUserTokenAndCity(trigger: "il_guncellendi")
    }

    private func logUserTokenAndCity(trigger: String) {
        guard let token = latestFCMToken, !token.isEmpty else { return }
        let city = UserDefaults(suiteName: AppConfig.appGroupId)?
            .string(forKey: "currentLocation") ?? "Bilinmeyen Konum"
        AnalyticsManager.shared.trackTokenAndCity(city: city, source: trigger)
        print("Analytics: kullanici_token_il gonderildi | il=\(city)")
    }
}

#if canImport(FirebaseMessaging)
extension AppDelegate: MessagingDelegate {}
#endif

extension Notification.Name {
    static let aeroGuardCityUpdated = Notification.Name("aeroGuardCityUpdated")
}
