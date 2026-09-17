//
//  DeepLinkRouter.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App & Widget Extension (Shared)
//  Purpose: Type-safe deep linking schema ('nalimobile://...') connecting WidgetKit touch targets
//           directly to specific screens (Sales, Debts, Low Stock, POS) in the companion app.
//

import Foundation

public enum DeepLinkDestination: Equatable, Sendable {
    case dashboard
    case posTerminal
    case saleDetail(saleId: String)
    case debtsList
    case lowStockAlerts
    
    public var url: URL {
        switch self {
        case .dashboard:
            return URL(string: "nalimobile://dashboard")!
        case .posTerminal:
            return URL(string: "nalimobile://pos")!
        case .saleDetail(let saleId):
            return URL(string: "nalimobile://sales/\(saleId)")!
        case .debtsList:
            return URL(string: "nalimobile://debts")!
        case .lowStockAlerts:
            return URL(string: "nalimobile://inventory/low-stock")!
        }
    }
    
    public static func parse(url: URL) -> DeepLinkDestination? {
        guard url.scheme?.lowercased() == "nalimobile" else { return nil }
        
        let host = url.host?.lowercased() ?? ""
        let pathComponents = url.pathComponents.filter { $0 != "/" && !$0.isEmpty }
        
        switch host {
        case "sales":
            if let saleId = pathComponents.first {
                return .saleDetail(saleId: saleId)
            }
            return .dashboard
        case "debts":
            return .debtsList
        case "pos":
            return .posTerminal
        case "inventory":
            if pathComponents.contains("low-stock") {
                return .lowStockAlerts
            }
            return .dashboard
        case "dashboard":
            return .dashboard
        default:
            return .dashboard
        }
    }
}
