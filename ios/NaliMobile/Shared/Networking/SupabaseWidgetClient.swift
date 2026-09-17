//
//  SupabaseWidgetClient.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App & Widget Extension (Shared)
//  Purpose: Ultra-lightweight, zero-external-dependency REST client using native URLSession.
//           Designed specifically to keep WidgetKit extension memory well under 30MB.
//

import Foundation

public enum WidgetClientError: Error, LocalizedError, Sendable {
    case unconfigured
    case unauthorized
    case networkFailure(String)
    case invalidResponse(Int)
    case decodingError(String)
    
    public var errorDescription: String? {
        switch self {
        case .unconfigured:
            return "Supabase credentials not configured in App Group."
        case .unauthorized:
            return "Authentication failed. Admin session token is missing or expired."
        case .networkFailure(let message):
            return "Network request failed: \(message)"
        case .invalidResponse(let statusCode):
            return "Server responded with HTTP \(statusCode)"
        case .decodingError(let details):
            return "Failed to parse snapshot response: \(details)"
        }
    }
}

public final class SupabaseWidgetClient: Sendable {
    
    public static let shared = SupabaseWidgetClient()
    
    private let urlSession: URLSession
    
    private init() {
        let configuration = URLSessionConfiguration.ephemeral
        // Aggressive timeouts to prevent iOS from killing the widget extension
        configuration.timeoutIntervalForRequest = 10.0
        configuration.timeoutIntervalForResource = 12.0
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        self.urlSession = URLSession(configuration: configuration)
    }
    
    /// Fetches the latest WidgetSnapshot directly from Supabase RPC endpoint
    public func fetchLatestSnapshot(storeId: String? = nil) async throws -> WidgetSnapshot {
        guard let config = AppGroupStorage.shared.loadSupabaseConfig() else {
            throw WidgetClientError.unconfigured
        }
        
        let trimmedUrl = config.url.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let endpointUrl = URL(string: "\(trimmedUrl)/rest/v1/rpc/get_admin_widget_snapshot") else {
            throw WidgetClientError.networkFailure("Invalid Supabase URL")
        }
        
        var request = URLRequest(url: endpointUrl)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(config.anonKey, forHTTPHeaderField: "apikey")
        
        // Attach user's active session token from shared Keychain
        if let userToken = AppGroupStorage.shared.getAuthToken(), !userToken.isEmpty {
            request.setValue("Bearer \(userToken)", forHTTPHeaderField: "Authorization")
        } else {
            // Fallback to anon key if no user token exists
            request.setValue("Bearer \(config.anonKey)", forHTTPHeaderField: "Authorization")
        }
        
        // Request payload
        let effectiveStoreId = storeId ?? config.storeId
        let body: [String: Any] = effectiveStoreId != nil ? ["p_store_id": effectiveStoreId!] : [:]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await urlSession.data(for: request)
        } catch {
            throw WidgetClientError.networkFailure(error.localizedDescription)
        }
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WidgetClientError.invalidResponse(0)
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                throw WidgetClientError.unauthorized
            }
            throw WidgetClientError.invalidResponse(httpResponse.statusCode)
        }
        
        do {
            let decoder = JSONDecoder()
            let snapshot = try decoder.decode(WidgetSnapshot.self, from: data)
            
            // Automatically cache successful snapshot into App Group storage
            AppGroupStorage.shared.saveSnapshot(snapshot)
            
            return snapshot
        } catch {
            throw WidgetClientError.decodingError(error.localizedDescription)
        }
    }
}
