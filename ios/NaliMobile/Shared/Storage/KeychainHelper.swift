//
//  KeychainHelper.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App & Widget Extension (Shared)
//  Purpose: Secure, hardware-backed storage for Supabase RLS JWT tokens across
//           Main App and WidgetKit Extension using Shared Keychain Access Groups.
//

import Foundation
import Security

public final class KeychainHelper: Sendable {
    
    public static let shared = KeychainHelper()
    
    // Shared Keychain Access Group (set in Capabilities -> Keychain Sharing)
    private let accessGroup = "group.com.nalimobile.app"
    private let serviceName = "com.nalimobile.pos.auth"
    
    private init() {}
    
    /// Saves a secret string (e.g. Supabase Auth Token) into the shared Keychain
    @discardableResult
    public func save(key: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }
        
        // Remove any existing item first
        delete(key: key)
        
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        #if !targetEnvironment(simulator)
        query[kSecAttrAccessGroup as String] = accessGroup
        #endif
        
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    /// Retrieves a secret string from the shared Keychain
    public func read(key: String) -> String? {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        #if !targetEnvironment(simulator)
        query[kSecAttrAccessGroup as String] = accessGroup
        #endif
        
        var dataTypeRef: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)
        
        if status == errSecSuccess, let data = dataTypeRef as? Data {
            return String(data: data, encoding: .utf8)
        }
        return nil
    }
    
    /// Deletes a key from the shared Keychain
    @discardableResult
    public func delete(key: String) -> Bool {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceName,
            kSecAttrAccount as String: key
        ]
        
        #if !targetEnvironment(simulator)
        query[kSecAttrAccessGroup as String] = accessGroup
        #endif
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
