//
//  WidgetSnapshot.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App & Widget Extension (Shared)
//  Purpose: Codable & Sendable representation of the Supabase get_admin_widget_snapshot RPC payload.
//           Designed for iOS 17+, WidgetKit extensions, Swift 5.9 / Swift 6 concurrency.
//

import Foundation

// MARK: - Widget Snapshot Root Entity

public struct WidgetSnapshot: Codable, Sendable, Equatable {
    
    public let todaySalesIqd: Double
    public let todaySalesUsd: Double
    public let todayProfitIqd: Double
    public let todayProfitUsd: Double
    public let transactionCountToday: Int
    public let lastSale: LastSale?
    public let lowStockCount: Int
    public let debtsSummary: DebtsSummary
    public let generatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case todaySalesIqd = "today_sales_iqd"
        case todaySalesUsd = "today_sales_usd"
        case todayProfitIqd = "today_profit_iqd"
        case todayProfitUsd = "today_profit_usd"
        case transactionCountToday = "transaction_count_today"
        case lastSale = "last_sale"
        case lowStockCount = "low_stock_count"
        case debtsSummary = "debts_summary"
        case generatedAt = "generated_at"
    }
    
    public init(
        todaySalesIqd: Double,
        todaySalesUsd: Double,
        todayProfitIqd: Double,
        todayProfitUsd: Double,
        transactionCountToday: Int,
        lastSale: LastSale?,
        lowStockCount: Int,
        debtsSummary: DebtsSummary,
        generatedAt: String
    ) {
        self.todaySalesIqd = todaySalesIqd
        self.todaySalesUsd = todaySalesUsd
        self.todayProfitIqd = todayProfitIqd
        self.todayProfitUsd = todayProfitUsd
        self.transactionCountToday = transactionCountToday
        self.lastSale = lastSale
        self.lowStockCount = lowStockCount
        self.debtsSummary = debtsSummary
        self.generatedAt = generatedAt
    }
}

// MARK: - Last Sale Details

public struct LastSale: Codable, Sendable, Equatable, Identifiable {
    public let id: String
    public let invoiceNo: String?
    public let timestamp: String
    public let totalIqd: Double
    public let totalUsd: Double
    public let cashierName: String
    public let paymentType: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case invoiceNo = "invoice_no"
        case timestamp
        case totalIqd = "total_iqd"
        case totalUsd = "total_usd"
        case cashierName = "cashier_name"
        case paymentType = "payment_type"
    }
    
    public init(
        id: String,
        invoiceNo: String?,
        timestamp: String,
        totalIqd: Double,
        totalUsd: Double,
        cashierName: String,
        paymentType: String
    ) {
        self.id = id
        self.invoiceNo = invoiceNo
        self.timestamp = timestamp
        self.totalIqd = totalIqd
        self.totalUsd = totalUsd
        self.cashierName = cashierName
        self.paymentType = paymentType
    }
    
    /// Formatted relative time (e.g., "Just now", "5m ago")
    public var relativeTimeFormatted: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: timestamp) ?? ISO8601DateFormatter().date(from: timestamp) else {
            return "Recently"
        }
        
        let relativeFormatter = RelativeDateTimeFormatter()
        relativeFormatter.unitsStyle = .abbreviated
        return relativeFormatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Debts & Installments Summary

public struct DebtsSummary: Codable, Sendable, Equatable {
    public let totalOutstandingIqd: Double
    public let totalOutstandingUsd: Double
    public let overdueInstallmentsCount: Int
    
    enum CodingKeys: String, CodingKey {
        case totalOutstandingIqd = "total_outstanding_iqd"
        case totalOutstandingUsd = "total_outstanding_usd"
        case overdueInstallmentsCount = "overdue_installments_count"
    }
    
    public init(
        totalOutstandingIqd: Double,
        totalOutstandingUsd: Double,
        overdueInstallmentsCount: Int
    ) {
        self.totalOutstandingIqd = totalOutstandingIqd
        self.totalOutstandingUsd = totalOutstandingUsd
        self.overdueInstallmentsCount = overdueInstallmentsCount
    }
}

// MARK: - Localized & Computed Display Properties

extension WidgetSnapshot {
    
    // Formatted Revenue
    public var formattedSalesUSD: String {
        CurrencyFormatter.formatUSD(todaySalesUsd)
    }
    
    public var formattedSalesIQD: String {
        CurrencyFormatter.formatIQD(todaySalesIqd)
    }
    
    public var formattedProfitUSD: String {
        CurrencyFormatter.formatUSD(todayProfitUsd)
    }
    
    public var formattedProfitIQD: String {
        CurrencyFormatter.formatIQD(todayProfitIqd)
    }
    
    public var formattedOutstandingDebtsUSD: String {
        CurrencyFormatter.formatUSD(debtsSummary.totalOutstandingUsd)
    }
    
    public var formattedOutstandingDebtsIQD: String {
        CurrencyFormatter.formatIQD(debtsSummary.totalOutstandingIqd)
    }
    
    // Kurdish Sorani Localized Strings
    public var kurdishSalesUSD: String {
        CurrencyFormatter.formatUSD(todaySalesUsd, language: .kurdish)
    }
    
    public var kurdishSalesIQD: String {
        CurrencyFormatter.formatIQD(todaySalesIqd, language: .kurdish, useArabicNumerals: true)
    }
    
    public var hasCriticalAlerts: Bool {
        lowStockCount > 0 || debtsSummary.overdueInstallmentsCount > 0
    }
    
    public var alertCountBadge: Int {
        lowStockCount + debtsSummary.overdueInstallmentsCount
    }
    
    public var generatedDate: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: generatedAt) ?? ISO8601DateFormatter().date(from: generatedAt) ?? Date()
    }
}

// MARK: - Previews & Mock Data

extension WidgetSnapshot {
    
    /// Standard mock data representing active shop hours
    public static var mock: WidgetSnapshot {
        WidgetSnapshot(
            todaySalesIqd: 1_840_000,
            todaySalesUsd: 1_225.50,
            todayProfitIqd: 331_200,
            todayProfitUsd: 220.60,
            transactionCountToday: 24,
            lastSale: LastSale(
                id: "sale-8841",
                invoiceNo: "INV-8841",
                timestamp: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-180)),
                totalIqd: 184_000,
                totalUsd: 120.00,
                cashierName: "Cashier Sarah",
                paymentType: "cash"
            ),
            lowStockCount: 3,
            debtsSummary: DebtsSummary(
                totalOutstandingIqd: 4_500_000,
                totalOutstandingUsd: 2_850.00,
                overdueInstallmentsCount: 2
            ),
            generatedAt: ISO8601DateFormatter().string(from: Date())
        )
    }
    
    /// Placeholder state for widget redacted/skeleton rendering
    public static var placeholder: WidgetSnapshot {
        WidgetSnapshot(
            todaySalesIqd: 1_500_000,
            todaySalesUsd: 1_000.00,
            todayProfitIqd: 250_000,
            todayProfitUsd: 180.00,
            transactionCountToday: 15,
            lastSale: LastSale(
                id: "placeholder-id",
                invoiceNo: "INV-0000",
                timestamp: ISO8601DateFormatter().string(from: Date()),
                totalIqd: 150_000,
                totalUsd: 100.00,
                cashierName: "Cashier Desk",
                paymentType: "cash"
            ),
            lowStockCount: 0,
            debtsSummary: DebtsSummary(
                totalOutstandingIqd: 0,
                totalOutstandingUsd: 0,
                overdueInstallmentsCount: 0
            ),
            generatedAt: ISO8601DateFormatter().string(from: Date())
        )
    }
}
