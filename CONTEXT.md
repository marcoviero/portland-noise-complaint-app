# Portland Noise Complaint App — Context

## The Law

Portland's gas-powered leaf blower ban took effect **January 1, 2026** under Title 18 of the Portland City Code. All gas-powered leaf blowers (backpack, handheld, wheeled) are prohibited in the city limits. Violations can be reported to the Portland Noise Control Program.

References:
- [About the Gas Leaf Blower Phase-out](https://www.portland.gov/bps/climate-action/leaf-blowers/glb-phase-out)
- [Leaf Blower FAQs](https://www.portland.gov/ppd/noise/leaf-blower-faqs)
- [Portland Title 18 Noise Code](https://www.portland.gov/ppd/noise/about-noise-program/title-18-noise-code)

## Official Complaint Channels

**Only two accepted channels for initial complaints:**
1. Online form: https://www.portland.gov/ppd/noise/noise-concerns
2. Portland 311 (phone 503-823-4000 or web)

Note: noisecomplaints@portlandoregon.gov is for **follow-up documentation only**, not initial complaints.

## The Official Form (5 steps)

The Portland noise complaint form collects:
1. **Complaint Source** — residency/property/business status in Portland (yes/no)
2. **Complaint Type** — noise vs. pollution; equipment type; count
3. **Complaint Details** — location (map picker), date, time, description, formal/anonymous preferences
4. **Final Steps** — reporter personal info: name, address, phone, email
5. **Complete** — confirmation

The form prioritizes complaints with specific dates, times, and descriptions. Allow 2+ weeks for processing.

## This App's Purpose

Reduce complaint filing time from ~10 minutes to ~30 seconds by:
- Saving personal info (profile) so it never needs to be retyped
- Auto-detecting GPS location and date/time
- Pre-setting defaults for the most common scenario (gas backpack leaf blower × 1, formal=yes, anonymous=no)
- Producing a compact reference card the user reads from while filling the official form in Safari

## Tech Stack

- **Framework**: Capacitor 8.x wrapping vanilla HTML/CSS/JavaScript
- **Pattern**: Identical to the bilingual-reader app at `../bilingual-reader/`
- **App ID**: `com.mviero.portlandnoise`
- **No build tools**: No webpack, no TypeScript, no framework — plain files copied to `www/`

## Build & Deploy

```bash
npm install
npm run build          # copies files to www/
npx cap sync           # syncs to iOS project
open ios/App/App.xcworkspace   # open in Xcode → run on device
```

Target device: iPad (developer mode already enabled).
