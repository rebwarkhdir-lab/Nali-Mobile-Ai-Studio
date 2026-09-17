//
//  AppDelegate.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App
//  Purpose: Handles Apple Push Notification Service (APNs) registration and background
//           silent push notifications ('content-available: 1').
//           Wakes up in background when a cashier completes a sale, refreshes the App Group
//           snapshot, and immediately executes WidgetCenter.shared.reloadAllTimelines().
//

import UIKit
import UserNotifications
import WidgetKit

public final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    public func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        
        // 1. Configure Notification Center
        UNUserNotificationCenter.current().delegate = self
        
        // 2. Request Notification Authorization
        requestPushNotificationAuthorization(application)
        
        return true
    }
    
    // MARK: - Push Authorization & Registration
    
    public func requestPushNotificationAuthorization(_ application: UIApplication = UIApplication.shared) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            } else if let error = error {
                print("[AppDelegate] Notification authorization error: \(error.localizedDescription)")
            }
        }
    }
    
    public func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let tokenString = tokenParts.joined()
        print("[AppDelegate] APNs Device Token registered: \(tokenString)")
        
        // Persist token locally in App Group
        UserDefaults(suiteName: AppGroupStorage.appGroupIdentifier)?.set(tokenString, forKey: "nali_apns_device_token")
        
        // Asynchronously register device token with Supabase backend
        Task {
            await registerDeviceTokenWithSupabase(token: tokenString)
        }
    }
    
    public func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("[AppDelegate] Failed to register for remote notifications: \(error.localizedDescription)")
    }
    
    // MARK: - Silent Background Notification Receiver (Cashier Sale Push Trigger)
    
    public func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        print("[AppDelegate] Received background remote notification: \(userInfo)")
        
        // Woken up by Supabase Edge Function via APNs silent push ('content-available: 1')
        Task {
            do {
                // 1. Fetch fresh snapshot directly from Supabase RPC
                let snapshot = try await SupabaseWidgetClient.shared.fetchLatestSnapshot()
                
                // 2. Save fresh snapshot into shared App Group storage
                AppGroupStorage.shared.saveSnapshot(snapshot)
                
                // 3. Immediately reload all WidgetKit timelines
                WidgetCenter.shared.reloadAllTimelines()
                print("[AppDelegate] WidgetKit timelines reloaded successfully after cashier sale.")
                
                completionHandler(.newData)
            } catch {
                print("[AppDelegate] Background snapshot refresh failed: \(error.localizedDescription)")
                
                // Even on network failure, trigger timeline reload to show existing cache
                WidgetCenter.shared.reloadAllTimelines()
                completionHandler(.failed)
            }
        }
    }
    
    // MARK: - Supabase Device Token Registration
    
    private func registerDeviceTokenWithSupabase(token: String) async {
        guard let config = AppGroupStorage.shared.loadSupabaseConfig() else { return }
        
        let trimmedUrl = config.url.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let url = URL(string: "\(trimmedUrl)/rest/v1/apns_device_tokens") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        
        if let token = AppGroupStorage.shared.getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        }
        
        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif
        
        let payload: [String: Any] = [
            "device_token": token,
            "environment": environment,
            "device_model": UIDevice.current.model,
            "os_version": UIDevice.current.systemVersion,
            "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0",
            "is_active": true,
            "last_seen_at": ISO8601DateFormatter().string(from: Date())
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
        _ = try? await URLSession.shared.data(for: request)
    }
}
