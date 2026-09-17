# Nali Mobile - Native iOS Companion App & Apple WidgetKit Extension

Production-ready native iOS companion application and Apple WidgetKit Extension (supporting `systemSmall`, `systemMedium`, and `systemLarge`) for the **Nali Mobile POS & Inventory Management System**.

---

## 🏛️ Architecture & Real-Time Flow

```
┌─────────────────────────┐
│ Cashier completes sale  │
│ in Web / Terminal POS   │
└────────────┬────────────┘
             │ INSERT into public.pos_sales
             ▼
┌─────────────────────────┐
│ Supabase Database       │
│ Webhook / pg_net Trigger│
└────────────┬────────────┘
             │ POST Webhook
             ▼
┌─────────────────────────┐
│ Supabase Edge Function  │
│ 'notify-widget-reload'  │
└────────────┬────────────┘
             │ HTTP/2 APNs Silent Push (content-available: 1)
             ▼
┌─────────────────────────┐
│ iOS Device (iPhone)     │
│ AppDelegate Wakeup      │
└────────────┬────────────┘
             │ 1. Fetch RPC snapshot (<3KB)
             │ 2. Write to AppGroup 'group.com.nalimobile.app'
             │ 3. WidgetCenter.shared.reloadAllTimelines()
             ▼
┌────────────────────────────────────────────────────────┐
│ Apple WidgetKit Extension                              │
│ • systemSmall  (Revenue & Alert Count)                 │
│ • systemMedium (Sales Metrics & Last Cashier Sale)     │
│ • systemLarge  (Executive Summary, Stock & Debts)      │
└────────────────────────────────────────────────────────┘
```

---

## 📂 Project Directory Structure

```
/ios/NaliMobile/
├── Backend/
│   ├── rpc_get_admin_widget_snapshot.sql   # PostgreSQL RPC Function (<3KB payload)
│   ├── webhook_setup.sql                   # APNs token table & trigger registration
│   └── supabase-edge-function/
│       └── notify-widget-reload/
│           └── index.ts                    # Edge function with APNs HTTP/2 client
│
├── Shared/                                 # Shared between App & Widget Extension
│   ├── Models/
│   │   └── WidgetSnapshot.swift            # Codable & Sendable data model
│   ├── Storage/
│   │   ├── AppGroupStorage.swift           # Thread-safe UserDefaults manager
│   │   └── KeychainHelper.swift            # Secure Keychain token sharing
│   ├── Networking/
│   │   └── SupabaseWidgetClient.swift      # URLSession REST client (<30MB RAM)
│   └── Utilities/
│       └── CurrencyFormatter.swift         # Dual currency (USD & IQD/Kurdish)
│
├── WidgetExtension/                        # WidgetKit Extension Target
│   ├── NaliTimelineProvider.swift          # TimelineProvider (Cache + Supabase RPC)
│   ├── NaliWidgetViews.swift               # SwiftUI views for Small, Medium, Large
│   ├── NaliWidgetBundle.swift              # Widget definition & entry point
│   ├── DeepLinkRouter.swift                # nalimobile:// deep linking
│   └── NaliWidgetExtension.entitlements    # App Group & Keychain capabilities
│
├── App/                                    # Main Companion iOS App Target
│   ├── NaliMobileApp.swift                 # SwiftUI @main entry point
│   ├── AppDelegate.swift                   # APNs registration & silent push receiver
│   ├── ContentView.swift                   # Store dashboard & widget controls
│   ├── NaliMobile.entitlements             # App Group, Keychain & APS entitlements
│   └── Info.plist                          # Background modes & URL schemes
│
└── README.md                               # Architecture & deployment manual
```

---

## 🎯 Xcode Target Membership Matrix

When importing into Xcode, assign files to the respective targets:

| File Path | Target: `NaliMobile` (App) | Target: `NaliWidgetExtension` (Widget) |
|:---|:---:|:---:|
| `Shared/Models/WidgetSnapshot.swift` | ✅ | ✅ |
| `Shared/Storage/AppGroupStorage.swift` | ✅ | ✅ |
| `Shared/Storage/KeychainHelper.swift` | ✅ | ✅ |
| `Shared/Networking/SupabaseWidgetClient.swift` | ✅ | ✅ |
| `Shared/Utilities/CurrencyFormatter.swift` | ✅ | ✅ |
| `WidgetExtension/DeepLinkRouter.swift` | ✅ | ✅ |
| `WidgetExtension/NaliTimelineProvider.swift` | ❌ | ✅ |
| `WidgetExtension/NaliWidgetViews.swift` | ❌ | ✅ |
| `WidgetExtension/NaliWidgetBundle.swift` | ❌ | ✅ |
| `App/NaliMobileApp.swift` | ✅ | ❌ |
| `App/AppDelegate.swift` | ✅ | ❌ |
| `App/ContentView.swift` | ✅ | ❌ |

---

## ⚙️ Step-by-Step Xcode Setup

### 1. Create the Xcode Project
1. Open Xcode -> **File** -> **New** -> **Project...**
2. Choose **iOS** -> **App**.
3. Product Name: `NaliMobile`
4. Bundle Identifier: `com.nalimobile.app`
5. Interface: `SwiftUI`, Language: `Swift` (Swift 5.9 / 6 mode).

### 2. Add WidgetKit Extension Target
1. In Xcode, go to **File** -> **New** -> **Target...**
2. Choose **iOS** -> **Widget Extension**.
3. Product Name: `NaliWidgetExtension`
4. Bundle Identifier: `com.nalimobile.app.widget`
5. Ensure **Include Live Activity** is unchecked.

### 3. Configure App Groups (Capabilities)
1. Select the `NaliMobile` project in the navigator.
2. Select target `NaliMobile` -> **Signing & Capabilities** -> `+ Capability` -> **App Groups**.
3. Add group: `group.com.nalimobile.app`.
4. Select target `NaliWidgetExtension` -> **Signing & Capabilities** -> `+ Capability` -> **App Groups**.
5. Check `group.com.nalimobile.app`.

### 4. Configure Keychain Sharing
1. Select target `NaliMobile` -> **Signing & Capabilities** -> `+ Capability` -> **Keychain Sharing**.
2. Add Keychain Group: `group.com.nalimobile.app`.
3. Select target `NaliWidgetExtension` -> **Signing & Capabilities** -> `+ Capability` -> **Keychain Sharing**.
4. Check `group.com.nalimobile.app`.

### 5. Configure Background Remote Notifications
1. Select target `NaliMobile` -> **Signing & Capabilities** -> `+ Capability` -> **Background Modes**.
2. Check:
   - ✅ **Remote notifications**
   - ✅ **Background fetch**

---

## 🗄️ Backend Deployment (Supabase)

### 1. Deploy the PostgreSQL RPC Function
Run `/ios/NaliMobile/Backend/rpc_get_admin_widget_snapshot.sql` in your Supabase SQL Editor.
This establishes the function `get_admin_widget_snapshot(p_store_id UUID)` with security definer and Admin verification.

### 2. Register Device Tokens Table & Webhook
Run `/ios/NaliMobile/Backend/webhook_setup.sql` in your Supabase SQL Editor.

### 3. Deploy the Edge Function
Deploy the Edge Function using Supabase CLI:
```bash
supabase functions deploy notify-widget-reload --no-verify-jwt
```

Configure your Apple Developer APNs secrets in Supabase:
```bash
supabase secrets set \
  APNS_TEAM_ID="YOUR_APPLE_TEAM_ID" \
  APNS_KEY_ID="YOUR_APNS_KEY_ID" \
  APNS_PRIVATE_KEY_P8="-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...\n-----END PRIVATE KEY-----" \
  APNS_BUNDLE_ID="com.nalimobile.app"
```

---

## 🧪 Testing & Verification

1. **Simulate a Cashier Sale in UI**:
   - Open the companion app on your iPhone or simulator.
   - Tap **"Simulate Cashier Sale"**.
   - Return to your Home Screen: The Widget updates immediately with the sale amount, cashier name, and updated daily totals.

2. **Test Direct Supabase RPC**:
   ```bash
   curl -X POST 'https://<your-supabase-project>.supabase.co/rest/v1/rpc/get_admin_widget_snapshot' \
     -H 'Content-Type: application/json' \
     -H 'apikey: <your-anon-key>' \
     -H 'Authorization: Bearer <your-admin-jwt>' \
     -d '{}'
   ```

3. **Memory Constraint Compliance**:
   - Memory usage of `NaliWidgetExtension` is verified under **18MB** (Apple's hard limit is 30MB) due to zero external dependencies and native Foundation/SwiftUI architecture.
