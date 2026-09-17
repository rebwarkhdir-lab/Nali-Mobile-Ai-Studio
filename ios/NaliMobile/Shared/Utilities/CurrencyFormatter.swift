//
//  CurrencyFormatter.swift
//  NaliMobile
//
//  Xcode Target Membership: Main App & Widget Extension (Shared)
//  Purpose: Precision dual-currency formatting for USD ($) and Iraqi Dinar (IQD / د.ع)
//           with native Kurdish Sorani and Western numeral representation.
//

import Foundation

public enum AppLanguage: String, Sendable {
    case english = "en"
    case kurdish = "ku"
}

public struct CurrencyFormatter: Sendable {
    
    // MARK: - USD Formatting
    
    /// Formats an amount into US Dollars (e.g. "$1,250.00")
    public static func formatUSD(_ amount: Double, language: AppLanguage = .english) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "$"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.locale = Locale(identifier: "en_US")
        
        let formatted = formatter.string(from: NSNumber(value: amount)) ?? String(format: "$%.2f", amount)
        
        if language == .kurdish {
            return "\(formatted)"
        }
        return formatted
    }
    
    // MARK: - IQD Formatting
    
    /// Formats an amount into Iraqi Dinars with proper grouping separators (e.g. "1,250,000 IQD" or "١,٢٥٠,٠٠٠ د.ع")
    public static func formatIQD(_ amount: Double, language: AppLanguage = .english, useArabicNumerals: Bool = false) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 0
        formatter.groupingSeparator = ","
        formatter.usesGroupingSeparator = true
        formatter.locale = Locale(identifier: "en_US")
        
        let formattedDigits = formatter.string(from: NSNumber(value: amount)) ?? String(format: "%.0f", amount)
        
        if language == .kurdish {
            if useArabicNumerals {
                let easternArabicDigits = convertToEasternArabicDigits(formattedDigits)
                return "\(easternArabicDigits) د.ع"
            }
            return "\(formattedDigits) د.ع"
        }
        
        return "\(formattedDigits) IQD"
    }
    
    /// Compact abbreviation for widgets (e.g. "$1.4K", "1.2M IQD")
    public static func formatCompactUSD(_ amount: Double) -> String {
        if amount >= 1_000_000 {
            return String(format: "$%.1fM", amount / 1_000_000)
        } else if amount >= 1_000 {
            return String(format: "$%.1fK", amount / 1_000)
        } else {
            return String(format: "$%.0f", amount)
        }
    }
    
    /// Compact abbreviation for IQD in constrained widget spaces
    public static func formatCompactIQD(_ amount: Double, language: AppLanguage = .english) -> String {
        let suffix = (language == .kurdish) ? "د.ع" : "IQD"
        if amount >= 1_000_000_000 {
            return String(format: "%.1fB %@", amount / 1_000_000_000, suffix)
        } else if amount >= 1_000_000 {
            return String(format: "%.1fM %@", amount / 1_000_000, suffix)
        } else if amount >= 1_000 {
            return String(format: "%.0fK %@", amount / 1_000, suffix)
        } else {
            return String(format: "%.0f %@", amount, suffix)
        }
    }
    
    // MARK: - Eastern Arabic Digit Converter (Sorani Kurdish / Arabic)
    
    private static func convertToEasternArabicDigits(_ string: String) -> String {
        let westernToEastern: [Character: Character] = [
            "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤",
            "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩",
            ",": "،"
        ]
        return String(string.map { westernToEastern[$0] ?? $0 })
    }
}
