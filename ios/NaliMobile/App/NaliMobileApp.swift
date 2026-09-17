//
//  NaliMobileApp.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App
//  Purpose: Application entry point for the Nali Mobile companion iOS app.
//           Handles application lifecycle, UIApplicationDelegate adaptor for APNs push,
//           and incoming widget deep-links.
//

import SwiftUI
import WidgetKit

@main
struct NaliMobileApp: App {
    
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var activeDestination: DeepLinkDestination?
    
    init() {
        // Pre-seed default configuration into App Group if running first time
        if AppGroupStorage.shared.loadSupabaseConfig() == nil {
            // Can be populated with the store's backend environment
            AppGroupStorage.shared.saveSupabaseConfig(
                url: "https://aje5ynxorrjp35enpdo3wh.supabase.co",
                anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key"
            )
        }
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    handleIncomingDeepLink(url: url)
                }
        }
    }
    
    private func handleIncomingDeepLink(url: URL) {
        guard let destination = DeepLinkRouter.parse(url: url) else { return }
        print("[NaliMobileApp] Deep link received from Widget: \(destination)")
        self.activeDestination = destination
    }
}
