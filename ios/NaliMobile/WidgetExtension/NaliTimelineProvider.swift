//
//  NaliTimelineProvider.swift
//  NaliMobile
//
//  Xcode Target Membership: Widget Extension
//  Purpose: Implementation of WidgetKit's TimelineProvider for iOS 17+.
//           Coordinates zero-delay cache retrieval from App Group with fallback
//           to direct Supabase REST RPC call when data is stale.
//

import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

public struct NaliWidgetEntry: TimelineEntry, Sendable {
    public let date: Date
    public let snapshot: WidgetSnapshot
    public let isPlaceholder: Bool
    public let isStale: Bool
    
    public init(
        date: Date,
        snapshot: WidgetSnapshot,
        isPlaceholder: Bool = false,
        isStale: Bool = false
    ) {
        self.date = date
        self.snapshot = snapshot
        self.isPlaceholder = isPlaceholder
        self.isStale = isStale
    }
}

// MARK: - Timeline Provider

public struct NaliTimelineProvider: TimelineProvider {
    
    public typealias Entry = NaliWidgetEntry
    
    // MARK: - Placeholder (Skeleton State)
    
    public func placeholder(in context: Context) -> NaliWidgetEntry {
        NaliWidgetEntry(
            date: Date(),
            snapshot: .placeholder,
            isPlaceholder: true,
            isStale: false
        )
    }
    
    // MARK: - Snapshot (Widget Gallery & Quick Previews)
    
    public func getSnapshot(in context: Context, completion: @escaping (NaliWidgetEntry) -> Void) {
        if context.isPreview {
            completion(NaliWidgetEntry(date: Date(), snapshot: .mock, isPlaceholder: false))
            return
        }
        
        // Return instantly using cached snapshot from shared App Group
        if let cached = AppGroupStorage.shared.loadSnapshot() {
            completion(NaliWidgetEntry(date: Date(), snapshot: cached, isPlaceholder: false))
        } else {
            completion(NaliWidgetEntry(date: Date(), snapshot: .mock, isPlaceholder: false))
        }
    }
    
    // MARK: - Timeline Generation (Active Widget Lifecycle)
    
    public func getTimeline(in context: Context, completion: @escaping (Timeline<NaliWidgetEntry>) -> Void) {
        let currentDate = Date()
        let refreshDate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate) ?? currentDate.addingTimeInterval(900)
        
        // 1. Attempt to load existing cached snapshot
        let cachedSnapshot = AppGroupStorage.shared.loadSnapshot()
        let isStale = AppGroupStorage.shared.isSnapshotStale(maxAgeInMinutes: 15.0)
        
        // 2. If we have fresh cached data (e.g. from recent push notification or app open), use it immediately
        if let snapshot = cachedSnapshot, !isStale {
            let entry = NaliWidgetEntry(date: currentDate, snapshot: snapshot, isPlaceholder: false, isStale: false)
            let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
            completion(timeline)
            return
        }
        
        // 3. Otherwise, fetch fresh snapshot directly via lightweight Supabase RPC client
        Task {
            do {
                let freshSnapshot = try await SupabaseWidgetClient.shared.fetchLatestSnapshot()
                let entry = NaliWidgetEntry(date: currentDate, snapshot: freshSnapshot, isPlaceholder: false, isStale: false)
                let timeline = Timeline(entries: [entry], policy: .after(refreshDate))
                completion(timeline)
            } catch {
                print("[NaliTimelineProvider] Network refresh failed: \(error.localizedDescription)")
                
                // Fallback to cached snapshot even if older, or mock data
                let fallbackSnapshot = cachedSnapshot ?? .mock
                let entry = NaliWidgetEntry(
                    date: currentDate,
                    snapshot: fallbackSnapshot,
                    isPlaceholder: false,
                    isStale: cachedSnapshot != nil
                )
                
                // Retry sooner (in 5 minutes) on network error
                let retryDate = Calendar.current.date(byAdding: .minute, value: 5, to: currentDate) ?? currentDate.addingTimeInterval(300)
                let timeline = Timeline(entries: [entry], policy: .after(retryDate))
                completion(timeline)
            }
        }
    }
}
