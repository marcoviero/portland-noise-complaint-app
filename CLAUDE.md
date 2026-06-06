# Portland Noise Complaint App — Claude Context

## What this app does
iPhone/iPad app to quickly file gas-powered leaf blower noise complaints with Portland (banned Jan 1 2026, Title 18). Reduces ~10-minute web form to ~30 seconds. Built with **Capacitor 8 + vanilla HTML/CSS/JS** — same stack as `../bilingual-reader/`.

## Current state (as of last session)
App is fully functional and deployable to iPad (developer mode, team Z4Y3WM4454).

**Working features:**
- Two-tab UI: Quick Complaint + My Profile
- GPS auto-detect on launch → reverse-geocoded street address via Nominatim
- Location picker sheet: full-screen Leaflet map (CartoDB dark tiles), tap-to-place pin, drag pin, address search (Nominatim forward geocoding), "Use My GPS" button
- Equipment type dropdown + count stepper (1–10)
- Noise/Pollution segmented toggle
- Formal complaint + Anonymous toggles (defaults: Yes/No)
- Optional notes textarea
- Date auto-fill; tappable time field with ±offset buttons
- Profile tab: name, email, phone, home address, residency status — persisted to localStorage
- **Submit Complaint** → reference card overlay showing all info → **Open Form** → Portland form opens full-screen in-app via `@capacitor/browser` (SFSafariViewController, NOT an external browser)

## What is NOT working yet
- **Auto-fill**: The Portland form fields are not programmatically filled. User still fills them manually, but stays in-app and has the reference card to copy from.
- Attempted a native `WebFormPlugin` (WKWebView with JS injection) but `CAPBridgedPlugin` and `registerPluginInstance` do NOT exist in Capacitor 8's SPM distribution — caused compile failure + black screen. Those Swift files (`ViewController.swift`, `WebFormPlugin.swift`, `WebFormViewController.swift`) are on disk but NOT in `project.pbxproj`.

## Key technical facts
- **App ID**: `com.mviero.portlandnoise`
- **GitHub**: `marcoviero/portland-noise-complaint-app` (may need `gh repo create` — was blocked by auth)
- **Build**: `npm run build && npx cap sync` then Xcode → run on device
- **Xcode project**: `ios/App/App.xcodeproj` — only `AppDelegate.swift` is in the Sources build phase
- **Portland form**: `https://www.portland.gov/ppd/noise/noise-concerns` — 5-step Drupal webform, no discoverable REST API, map picker requires user interaction
- **Submission channels**: Only the web form and Portland 311 are official. Email is follow-up only.
- **Capacitor 8 plugin limitation**: `CAPBridgedPlugin` protocol does not exist in this install. Local plugins cannot be registered via `bridge?.registerPluginInstance`. The storyboard must stay pointed at `CAPBridgeViewController` (not a subclass).

## Next session priorities
1. **Push to GitHub** — run: `! gh repo create marcoviero/portland-noise-complaint-app --public --source=. --remote=origin --push`
2. **Inspect Portland form fields** — open the form in Safari with developer tools (Mac Safari → Develop → [device] → [page]) while the app is running, inspect the field IDs/names, then write targeted JS selectors for auto-fill
3. **Auto-fill via URL scheme or WKScriptMessageHandler** — the only viable path for JS injection into the Portland form within Capacitor 8; needs research into what hooks Capacitor 8 exposes
4. **Icon** — app has no custom icon yet

## File structure
```
portland-noise-complaint-app/
├── index.html          # Single-page app shell + overlays
├── js/app.js           # All logic (GPS, location picker, form state, submit)
├── css/style.css       # iOS dark-mode design + all overlay styles
├── manifest.json
├── capacitor.config.json
├── package.json        # Capacitor 8 + @capacitor/browser/geolocation/status-bar
├── CONTEXT.md          # Portland law + form structure reference
├── CLAUDE.md           # This file
└── ios/App/
    ├── App.xcodeproj/project.pbxproj   # Only AppDelegate.swift in Sources
    ├── App/AppDelegate.swift
    ├── App/Info.plist                   # Has NSLocationWhenInUseUsageDescription
    ├── App/Base.lproj/Main.storyboard  # Points to CAPBridgeViewController
    └── App/[ViewController|WebForm*.swift]  # On disk, NOT in project — broken attempt
```
