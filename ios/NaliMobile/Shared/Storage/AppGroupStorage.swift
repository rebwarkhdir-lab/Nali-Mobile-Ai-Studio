//
//  AppGroupStorage.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App & Widget Extension (Shared)
//  Purpose: Thread-safe, unified manager bridging the Main iOS App and WidgetKit
//           extension via App Group shared container ('group.com.nalimobile.app').
//

import Foundation

public final class AppGroupStorage: @unchecked Sendable {
    
    // MARK: - Singleton Instance
    
    public static let shared = AppGroupStorage()
    
    // MARK: - Configuration Constants
    
    public static let appGroupIdentifier = "group.com.nalimobile.app"
    
    private enum StorageKeys {
        static let widgetSnapshotData = "nali_widget_snapshot_data"
        static let lastSavedTimestamp = "nali_widget_last_saved"
        static let supabaseUrl = "nali_supabase_url"
        static let supabaseAnonKey = "nali_supabase_anon_key"
        static let selectedStoreId = "nali_selected_store_id"
        static let preferredLanguage = "nali_preferred_language"
        static let preferredCurrency = "nali_preferred_currency"
    }
    
    private let userDefaults: UserDefaults
    private let lock = NSLock()
    
    // MARK: - Initialization
    
    private init() {
        if let sharedDefaults = UserDefaults(suiteName: AppGroupStorage.appGroupIdentifier) {
            self.userDefaults = sharedDefaults
        } else {
            // Fallback for previews and test harnesses
            self.userDefaults = UserDefaults.standard
        }
    }
    
    // MARK: - Widget Snapshot Persistence
    
    /// Thread-safe write of the latest WidgetSnapshot to the shared App Group container
    public func saveSnapshot(_ snapshot: WidgetSnapshot) {
        lock.lock()
        defer { lock.unlock() }
        
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(snapshot)
            userDefaults.set(data, forKey: StorageKeys.widgetSnapshotData)
            userDefaults.set(Date().timeIntervalSince1970, forKey: StorageKeys.lastSavedTimestamp)
            userDefaults.synchronize()
        } catch {
            print("[AppGroupStorage] Failed to encode WidgetSnapshot: \(error)")
        }
    }
    
    /// Thread-safe read of the cached WidgetSnapshot
    public func loadSnapshot() -> WidgetSnapshot? {
        lock.lock()
        defer { lock.unlock() }
        
        guard let data = userDefaults.data(forKey: StorageKeys.widgetSnapshotData) else {
            return nil
        }
        
        do {
            let decoder = JSONDecoder()
            return try decoder.decode(WidgetSnapshot.self, from: data)
        } catch {
            print("[AppGroupStorage] Failed to decode WidgetSnapshot: \(error)")
            return nil
        }
    }
    
    /// Returns the timestamp when the snapshot was last saved
    public func lastSavedDate() -> Date? {
        lock.lock()
        defer { lock.unlock() }
        
        let interval = userDefaults.double(forKey: StorageKeys.lastSavedTimestamp)
        guard interval > 0 else { return nil }
        return Date(timeIntervalSince1970: interval)
    }
    
    /// Determines whether the snapshot is stale (older than specified threshold, default 15 mins)
    public func isSnapshotStale(maxAgeInMinutes: Double = 15.0) -> Bool {
        guard let lastSaved = lastSavedDate() else { return true }
        let elapsedSeconds = Date().timeIntervalSince(lastSaved)
        return elapsedSeconds > (maxAgeInMinutes * 60.0)
    }
    
    // MARK: - Secure Auth Token Access via Keychain
    
    /// Saves the active Supabase session JWT token to the shared Keychain
    public func saveAuthToken(_ token: String) {
        KeychainHelper.shared.save(key: "supabase_auth_token", value: token)
    }
    
    /// Retrieves the active read-only Supabase session JWT token from the shared Keychain
    public func getAuthToken() -> String? {
        KeychainHelper.shared.read(key: "supabase_auth_token")
    }
    
    /// Clears the auth token upon user sign-out
    public func clearAuthToken() {
        KeychainHelper.shared.delete(key: "supabase_auth_token")
    }
    
    // MARK: - Supabase Project Configuration
    
    public func saveSupabaseConfig(url: String, anonKey: String, storeId: String? = nil) {
        lock.lock()
        defer { lock.unlock() }
        
        userDefaults.set(url, forKey: StorageKeys.supabaseUrl)
        userDefaults.set(anonKey, forKey: StorageKeys.supabaseAnonKey)
        if let storeId = storeId {
            userDefaults.set(storeId, forKey: StorageKeys.selectedStoreId)
        }
        userDefaults.synchronize()
    }
    
    public func loadSupabaseConfig() -> (url: String, anonKey: String, storeId: String?)? {
        lock.lock()
        defer { lock.unlock() }
        
        guard let url = userDefaults.string(forKey: StorageKeys.supabaseUrl),
              let anonKey = userDefaults.string(forKey: StorageKeys.supabaseAnonKey) else {
            return nil
        }
        let storeId = userDefaults.string(forKey: StorageKeys.selectedStoreId)
        return (url, anonKey, storeId)
    }
    
    // MARK: - Preferences (Language & Display Currency)
    
    public var preferredLanguage: AppLanguage {
        get {
            lock.lock()
            defer { lock.unlock() }
            let code = userDefaults.string(forKey: StorageKeys.preferredLanguage) ?? "en"
            return AppLanguage(rawValue: code) ?? .english
        }
        set {
            lock.lock()
            defer { lock.unlock() }
            userDefaults.set(newValue.rawValue, forKey: StorageKeys.preferredLanguage)
            userDefaults.synchronize()
        }
    }
    
    public var preferredCurrency: String {
        get {
            lock.lock()
            defer { lock.unlock() }
            return userDefaults.string(forKey: StorageKeys.preferredCurrency) ?? "USD"
        }
        set {
            lock.lock()
            defer { lock.unlock() }
            userDefaults.set(newValue, forKey: StorageKeys.preferredCurrency)
            userDefaults.synchronize()
        }
    }
}
