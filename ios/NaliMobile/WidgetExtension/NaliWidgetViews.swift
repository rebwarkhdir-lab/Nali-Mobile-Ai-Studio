//
//  NaliWidgetViews.swift
//  NaliMobile
//
//  Xcode Target Membership: Widget Extension
//  Purpose: Native SwiftUI views for Apple WidgetKit supporting systemSmall, systemMedium,
//           and systemLarge with Apple Human Interface Guidelines, Light/Dark mode,
//           and RTL Kurdish Sorani typography.
//

import SwiftUI
import WidgetKit

// MARK: - Root Entry View Dispatcher

public struct NaliWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var colorScheme
    
    public let entry: NaliWidgetEntry
    
    public init(entry: NaliWidgetEntry) {
        self.entry = entry
    }
    
    public var body: some View {
        let isKurdish = AppGroupStorage.shared.preferredLanguage == .kurdish
        
        Group {
            switch family {
            case .systemSmall:
                SmallWidgetView(snapshot: entry.snapshot, isStale: entry.isStale)
            case .systemMedium:
                MediumWidgetView(snapshot: entry.snapshot, isStale: entry.isStale)
            case .systemLarge:
                LargeWidgetView(snapshot: entry.snapshot, isStale: entry.isStale)
            default:
                SmallWidgetView(snapshot: entry.snapshot, isStale: entry.isStale)
            }
        }
        .environment(\.layoutDirection, isKurdish ? .rightToLeft : .leftToRight)
        .widgetURL(DeepLinkDestination.dashboard.url)
    }
}

// MARK: - 1. SYSTEM SMALL WIDGET (2x2)

struct SmallWidgetView: View {
    let snapshot: WidgetSnapshot
    let isStale: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header: App Brand + Alert Indicator
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "iphone.gen3")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.blue)
                    Text("NALI")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundStyle(.primary)
                }
                
                Spacer()
                
                if snapshot.hasCriticalAlerts {
                    HStack(spacing: 2) {
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.system(size: 10, weight: .bold))
                        Text("\(snapshot.alertCountBadge)")
                            .font(.system(size: 10, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background(Capsule().fill(.red))
                } else if isStale {
                    Image(systemName: "wifi.slash")
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                }
            }
            
            Spacer(minLength: 2)
            
            // Primary Metric: Today's Revenue (USD & IQD)
            VStack(alignment: .leading, spacing: 2) {
                Text("TODAY'S SALES")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.secondary)
                
                Text(snapshot.formattedSalesUSD)
                    .font(.system(size: 19, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                
                Text(CurrencyFormatter.formatCompactIQD(snapshot.todaySalesIqd))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            
            Spacer(minLength: 2)
            
            // Footer: Transactions Count & Status
            HStack {
                Label("\(snapshot.transactionCountToday) sales", systemImage: "cart.fill")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                
                Spacer()
                
                if let lastSale = snapshot.lastSale {
                    Text(lastSale.relativeTimeFormatted)
                        .font(.system(size: 9, weight: .regular))
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(12)
        .containerBackground(for: .widget) {
            Color(uiColor: .secondarySystemBackground)
        }
    }
}

// MARK: - 2. SYSTEM MEDIUM WIDGET (4x2)

struct MediumWidgetView: View {
    let snapshot: WidgetSnapshot
    let isStale: Bool
    
    var body: some View {
        HStack(spacing: 14) {
            // Left Column: Today's Financial Summary
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 5) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.blue)
                    Text("NALI MOBILE POS")
                        .font(.system(size: 10, weight: .heavy, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                
                VStack(alignment: .leading, spacing: 1) {
                    Text(snapshot.formattedSalesUSD)
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    
                    Text(snapshot.formattedSalesIQD)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                
                Spacer(minLength: 0)
                
                // Secondary Metrics: Transactions & Profit
                HStack(spacing: 10) {
                    VStack(alignment: .leading, spacing: 1) {
                        Text("TXNS")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text("\(snapshot.transactionCountToday)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.primary)
                    }
                    
                    Divider().frame(height: 18)
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("EST. PROFIT")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text(snapshot.formattedProfitUSD)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.green)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            Divider()
            
            // Right Column: Latest Cashier Sale & Active Alerts
            VStack(alignment: .leading, spacing: 6) {
                if let lastSale = snapshot.lastSale, !lastSale.id.isEmpty {
                    Link(destination: DeepLinkDestination.saleDetail(saleId: lastSale.id).url) {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text("LATEST SALE")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.blue)
                                Spacer()
                                Text(lastSale.relativeTimeFormatted)
                                    .font(.system(size: 9, weight: .regular))
                                    .foregroundStyle(.secondary)
                            }
                            
                            HStack(alignment: .firstTextBaseline) {
                                Text(CurrencyFormatter.formatUSD(lastSale.totalUsd))
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                                    .foregroundStyle(.primary)
                                
                                Text(lastSale.paymentType.uppercased())
                                    .font(.system(size: 8, weight: .bold))
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(Color.blue.opacity(0.15))
                                    .foregroundStyle(.blue)
                                    .clipShape(RoundedRectangle(cornerRadius: 3))
                            }
                            
                            HStack(spacing: 4) {
                                Image(systemName: "person.fill")
                                    .font(.system(size: 9))
                                Text(lastSale.cashierName)
                                    .font(.system(size: 10, weight: .medium))
                            }
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        }
                        .padding(8)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color(uiColor: .tertiarySystemBackground)))
                    }
                } else {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("CASHIER DESK")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text("Ready for next sale")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color(uiColor: .tertiarySystemBackground)))
                }
                
                Spacer(minLength: 0)
                
                // Bottom Alert Badges
                HStack(spacing: 6) {
                    if snapshot.lowStockCount > 0 {
                        Link(destination: DeepLinkDestination.lowStockAlerts.url) {
                            HStack(spacing: 3) {
                                Image(systemName: "shippingbox.fill")
                                Text("\(snapshot.lowStockCount) low")
                            }
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.orange)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Capsule().fill(Color.orange.opacity(0.15)))
                        }
                    }
                    
                    if snapshot.debtsSummary.overdueInstallmentsCount > 0 {
                        Link(destination: DeepLinkDestination.debtsList.url) {
                            HStack(spacing: 3) {
                                Image(systemName: "clock.badge.exclamationmark.fill")
                                Text("\(snapshot.debtsSummary.overdueInstallmentsCount) due")
                            }
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.red)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Capsule().fill(Color.red.opacity(0.15)))
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .containerBackground(for: .widget) {
            Color(uiColor: .secondarySystemBackground)
        }
    }
}

// MARK: - 3. SYSTEM LARGE WIDGET (4x4)

struct LargeWidgetView: View {
    let snapshot: WidgetSnapshot
    let isStale: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            
            // Header Row: Brand, Status, Sync Time
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "storefront.fill")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.blue)
                    Text("NALI MOBILE")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                    Text("EXECUTIVE")
                        .font(.system(size: 9, weight: .bold))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(Color.blue.opacity(0.15)))
                        .foregroundStyle(.blue)
                }
                
                Spacer()
                
                HStack(spacing: 4) {
                    Circle()
                        .fill(isStale ? .orange : .green)
                        .frame(width: 6, height: 6)
                    Text(isStale ? "Cached" : "Live")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
            
            // Primary Financial Dashboard Card
            VStack(spacing: 8) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("TODAY'S REVENUE")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text(snapshot.formattedSalesUSD)
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundStyle(.primary)
                        Text(snapshot.formattedSalesIQD)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("NET PROFIT (EST)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.secondary)
                        Text(snapshot.formattedProfitUSD)
                            .font(.system(size: 19, weight: .bold, design: .rounded))
                            .foregroundStyle(.green)
                        Text(snapshot.formattedProfitIQD)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.green.opacity(0.8))
                    }
                }
                
                Divider()
                
                // Sub-metrics Row
                HStack {
                    Label("\(snapshot.transactionCountToday) Transactions", systemImage: "cart.fill")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    Spacer()
                    
                    if snapshot.transactionCountToday > 0 {
                        let avgTicket = snapshot.todaySalesUsd / Double(snapshot.transactionCountToday)
                        Text("Avg Ticket: \(CurrencyFormatter.formatUSD(avgTicket))")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(10)
            .background(RoundedRectangle(cornerRadius: 10).fill(Color(uiColor: .tertiarySystemBackground)))
            
            // Latest Cashier Transaction Card
            if let lastSale = snapshot.lastSale, !lastSale.id.isEmpty {
                Link(destination: DeepLinkDestination.saleDetail(saleId: lastSale.id).url) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Label("LATEST CASHIER SALE", systemImage: "bolt.fill")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(.blue)
                            Spacer()
                            Text(lastSale.relativeTimeFormatted)
                                .font(.system(size: 10, weight: .regular))
                                .foregroundStyle(.secondary)
                        }
                        
                        HStack {
                            VStack(alignment: .leading, spacing: 1) {
                                Text(CurrencyFormatter.formatUSD(lastSale.totalUsd))
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundStyle(.primary)
                                Text(CurrencyFormatter.formatIQD(lastSale.totalIqd))
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(.secondary)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 1) {
                                Text(lastSale.cashierName)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(.primary)
                                Text(lastSale.paymentType.uppercased())
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.blue)
                            }
                        }
                    }
                    .padding(10)
                    .background(RoundedRectangle(cornerRadius: 10).fill(Color(uiColor: .tertiarySystemBackground)))
                }
            }
            
            // Operational Alerts & Receivables Section
            HStack(spacing: 8) {
                // Low Stock Badge
                Link(destination: DeepLinkDestination.lowStockAlerts.url) {
                    HStack(spacing: 6) {
                        Image(systemName: "shippingbox.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(snapshot.lowStockCount > 0 ? .orange : .secondary)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("\(snapshot.lowStockCount) ITEMS")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundStyle(.primary)
                            Text("Low Stock Threshold")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(8)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color(uiColor: .tertiarySystemBackground)))
                }
                .frame(maxWidth: .infinity)
                
                // Overdue Debts & Installments Badge
                Link(destination: DeepLinkDestination.debtsList.url) {
                    HStack(spacing: 6) {
                        Image(systemName: "calendar.badge.exclamationmark")
                            .font(.system(size: 14))
                            .foregroundStyle(snapshot.debtsSummary.overdueInstallmentsCount > 0 ? .red : .secondary)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("\(snapshot.debtsSummary.overdueInstallmentsCount) OVERDUE")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundStyle(snapshot.debtsSummary.overdueInstallmentsCount > 0 ? .red : .primary)
                            Text("Installments Due")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(.secondary)
                        }
                        Spacer(minLength: 0)
                    }
                    .padding(8)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color(uiColor: .tertiarySystemBackground)))
                }
                .frame(maxWidth: .infinity)
            }
            
            // Total Outstanding Debts Bar
            HStack {
                Text("Outstanding Receivables:")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(snapshot.formattedOutstandingDebtsUSD) • \(CurrencyFormatter.formatCompactIQD(snapshot.debtsSummary.totalOutstandingIqd))")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.primary)
            }
            .padding(.horizontal, 4)
        }
        .padding(14)
        .containerBackground(for: .widget) {
            Color(uiColor: .secondarySystemBackground)
        }
    }
}

// MARK: - SwiftUI Previews

#Preview("Small Widget", as: .systemSmall) {
    NaliWidget()
} timeline: {
    NaliWidgetEntry(date: Date(), snapshot: .mock)
}

#Preview("Medium Widget", as: .systemMedium) {
    NaliWidget()
} timeline: {
    NaliWidgetEntry(date: Date(), snapshot: .mock)
}

#Preview("Large Widget", as: .systemLarge) {
    NaliWidget()
} timeline: {
    NaliWidgetEntry(date: Date(), snapshot: .mock)
}
