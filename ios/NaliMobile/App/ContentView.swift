//
//  ContentView.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App
//  Purpose: Companion iOS app dashboard showing live store performance, WidgetKit status,
//           manual sync controls, and deep-link navigation destination handlers.
//

import SwiftUI
import WidgetKit

public struct ContentView: View {
    
    @State private var snapshot: WidgetSnapshot = AppGroupStorage.shared.loadSnapshot() ?? .mock
    @State private var isRefreshing: Bool = false
    @State private var errorMessage: String?
    @State private var selectedDestination: DeepLinkDestination?
    @State private var preferredLanguage: AppLanguage = AppGroupStorage.shared.preferredLanguage
    
    public init() {}
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    
                    // MARK: - Store Status Banner
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("NALI MOBILE POS")
                                .font(.caption.weight(.black))
                                .foregroundStyle(.blue)
                            Text("Store Live Dashboard")
                                .font(.title2.bold())
                        }
                        
                        Spacer()
                        
                        Button {
                            Task { await refreshData() }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: isRefreshing ? "arrow.triangle.2.circlepath" : "arrow.clockwise")
                                    .rotationEffect(Angle(degrees: isRefreshing ? 360 : 0))
                                    .animation(isRefreshing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: isRefreshing)
                                Text("Sync")
                                    .font(.subheadline.bold())
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Capsule().fill(.blue.opacity(0.12)))
                            .foregroundStyle(.blue)
                        }
                        .disabled(isRefreshing)
                    }
                    .padding(.horizontal)
                    .padding(.top, 8)
                    
                    if let error = errorMessage {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(.orange)
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Spacer()
                        }
                        .padding(10)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color.orange.opacity(0.1)))
                        .padding(.horizontal)
                    }
                    
                    // MARK: - Today's Financial Cards
                    VStack(spacing: 12) {
                        // Revenue Card
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Label("Today's Total Sales", systemImage: "chart.line.uptrend.xyaxis")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text("\(snapshot.transactionCountToday) sales")
                                    .font(.caption.weight(.bold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Capsule().fill(Color.blue.opacity(0.12)))
                                    .foregroundStyle(.blue)
                            }
                            
                            Text(snapshot.formattedSalesUSD)
                                .font(.system(size: 32, weight: .bold, design: .rounded))
                            
                            Text(snapshot.formattedSalesIQD)
                                .font(.headline.weight(.medium))
                                .foregroundStyle(.secondary)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 14).fill(Color(uiColor: .secondarySystemGroupedBackground)))
                        
                        // Net Profit Card
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Estimated Net Profit")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Text(snapshot.formattedProfitUSD)
                                    .font(.title3.bold())
                                    .foregroundStyle(.green)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("Profit in IQD")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.secondary)
                                Text(snapshot.formattedProfitIQD)
                                    .font(.subheadline.bold())
                                    .foregroundStyle(.green.opacity(0.8))
                            }
                        }
                        .padding(14)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .secondarySystemGroupedBackground)))
                    }
                    .padding(.horizontal)
                    
                    // MARK: - Latest Cashier Sale
                    VStack(alignment: .leading, spacing: 10) {
                        Label("Latest Cashier Activity", systemImage: "bolt.fill")
                            .font(.headline)
                            .foregroundStyle(.primary)
                        
                        if let lastSale = snapshot.lastSale, !lastSale.id.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(CurrencyFormatter.formatUSD(lastSale.totalUsd))
                                            .font(.title2.bold())
                                        Text(CurrencyFormatter.formatIQD(lastSale.totalIqd))
                                            .font(.caption.weight(.medium))
                                            .foregroundStyle(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    VStack(alignment: .trailing, spacing: 2) {
                                        Text(lastSale.paymentType.uppercased())
                                            .font(.caption2.bold())
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.blue.opacity(0.15))
                                            .foregroundStyle(.blue)
                                            .clipShape(RoundedRectangle(cornerRadius: 4))
                                        
                                        Text(lastSale.relativeTimeFormatted)
                                            .font(.caption2)
                                            .foregroundStyle(.tertiary)
                                    }
                                }
                                
                                Divider()
                                
                                HStack {
                                    Label(lastSale.cashierName, systemImage: "person.circle.fill")
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    if let inv = lastSale.invoiceNo {
                                        Text("#\(inv)")
                                            .font(.caption.monospaced())
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .padding(14)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .secondarySystemGroupedBackground)))
                        } else {
                            Text("No sales completed yet today.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding()
                                .background(RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .secondarySystemGroupedBackground)))
                        }
                    }
                    .padding(.horizontal)
                    
                    // MARK: - Operational Alerts (Low Stock & Debts)
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Operational Alerts")
                            .font(.headline)
                        
                        HStack(spacing: 12) {
                            // Low Stock Alert
                            VStack(alignment: .leading, spacing: 4) {
                                Image(systemName: "shippingbox.fill")
                                    .font(.title2)
                                    .foregroundStyle(.orange)
                                Text("\(snapshot.lowStockCount)")
                                    .font(.title2.bold())
                                Text("Low Stock Items")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .secondarySystemGroupedBackground)))
                            
                            // Overdue Installments
                            VStack(alignment: .leading, spacing: 4) {
                                Image(systemName: "calendar.badge.exclamationmark")
                                    .font(.title2)
                                    .foregroundStyle(.red)
                                Text("\(snapshot.debtsSummary.overdueInstallmentsCount)")
                                    .font(.title2.bold())
                                Text("Overdue Debts")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .secondarySystemGroupedBackground)))
                        }
                    }
                    .padding(.horizontal)
                    
                    // MARK: - WidgetKit Simulator & Configuration
                    VStack(alignment: .leading, spacing: 10) {
                        Text("iPhone Widget Setup")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("How to add widgets on iOS 17+:")
                                .font(.subheadline.bold())
                            
                            Text("1. Touch and hold an empty area on your iPhone Home Screen.\n2. Tap the '+' button in the upper-left corner.\n3. Search for 'Nali Mobile' and select Small, Medium, or Large.\n4. When cashiers make sales, widgets update automatically via APNs push.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineSpacing(3)
                            
                            Divider()
                            
                            HStack {
                                Button {
                                    triggerLocalTestSale()
                                } label: {
                                    HStack {
                                        Image(systemName: "sparkles")
                                        Text("Simulate Cashier Sale")
                                    }
                                    .font(.subheadline.weight(.semibold))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(Capsule().fill(.blue))
                                    .foregroundStyle(.white)
                                }
                                
                                Spacer()
                                
                                Button {
                                    WidgetCenter.shared.reloadAllTimelines()
                                } label: {
                                    Text("Reload Widgets")
                                        .font(.caption.bold())
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(Capsule().stroke(Color.secondary, lineWidth: 1))
                                }
                            }
                        }
                        .padding(14)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .secondarySystemGroupedBackground)))
                    }
                    .padding(.horizontal)
                    
                }
                .padding(.bottom, 24)
            }
            .background(Color(uiColor: .systemGroupedBackground))
            .navigationTitle("Nali Mobile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        toggleLanguage()
                    } label: {
                        Text(preferredLanguage == .kurdish ? "English" : "کوردی")
                            .font(.subheadline.bold())
                    }
                }
            }
            .task {
                await refreshData()
            }
        }
    }
    
    // MARK: - Actions
    
    private func refreshData() async {
        isRefreshing = true
        errorMessage = nil
        defer { isRefreshing = false }
        
        do {
            let fresh = try await SupabaseWidgetClient.shared.fetchLatestSnapshot()
            self.snapshot = fresh
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            self.errorMessage = error.localizedDescription
            if let cached = AppGroupStorage.shared.loadSnapshot() {
                self.snapshot = cached
            }
        }
    }
    
    private func triggerLocalTestSale() {
        let testAmountUsd = Double.random(in: 25...220).rounded()
        let testAmountIqd = (testAmountUsd * 1530).rounded()
        
        let newSale = LastSale(
            id: "sale-\(Int.random(in: 1000...9999))",
            invoiceNo: "INV-\(Int.random(in: 1000...9999))",
            timestamp: ISO8601DateFormatter().string(from: Date()),
            totalIqd: testAmountIqd,
            totalUsd: testAmountUsd,
            cashierName: "Cashier Rebwar",
            paymentType: "cash"
        )
        
        let updatedSnapshot = WidgetSnapshot(
            todaySalesIqd: snapshot.todaySalesIqd + testAmountIqd,
            todaySalesUsd: snapshot.todaySalesUsd + testAmountUsd,
            todayProfitIqd: snapshot.todayProfitIqd + (testAmountIqd * 0.18),
            todayProfitUsd: snapshot.todayProfitUsd + (testAmountUsd * 0.18),
            transactionCountToday: snapshot.transactionCountToday + 1,
            lastSale: newSale,
            lowStockCount: snapshot.lowStockCount,
            debtsSummary: snapshot.debtsSummary,
            generatedAt: ISO8601DateFormatter().string(from: Date())
        )
        
        self.snapshot = updatedSnapshot
        AppGroupStorage.shared.saveSnapshot(updatedSnapshot)
        WidgetCenter.shared.reloadAllTimelines()
    }
    
    private func toggleLanguage() {
        let newLang: AppLanguage = (preferredLanguage == .kurdish) ? .english : .kurdish
        preferredLanguage = newLang
        AppGroupStorage.shared.preferredLanguage = newLang
        WidgetCenter.shared.reloadAllTimelines()
    }
}
