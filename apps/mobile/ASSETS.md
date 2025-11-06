# Mobile App Assets Guide

This document provides instructions and specifications for all Noteece mobile app assets.

## App Icon (1024x1024)

### Design Concept
The Noteece app icon represents the fusion of note-taking, time tracking, and personal intelligence. The design features:

- **Base Color**: Deep space blue (#0A0E27) - representing the "vault" concept
- **Primary Accent**: Indigo (#6366F1) - modern, trustworthy, intelligent
- **Symbol**: A stylized "N" merged with a lock/key symbol, suggesting security and knowledge

### SVG Template (Export at 1024x1024)

```svg
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" rx="226" fill="#0A0E27"/>

  <!-- Gradient overlay -->
  <rect width="1024" height="1024" rx="226" fill="url(#gradient)"/>

  <!-- Main N symbol with lock integration -->
  <path d="M 300 350 L 300 674 L 380 674 L 380 480 L 644 674 L 724 674 L 724 350 L 644 350 L 644 544 L 380 350 Z" fill="#6366F1" stroke="#8B5CF6" stroke-width="8"/>

  <!-- Lock accent (top right of N) -->
  <circle cx="680" cy="380" r="48" fill="none" stroke="#8B5CF6" stroke-width="12"/>
  <rect x="652" y="400" width="56" height="40" rx="8" fill="#8B5CF6"/>
  <circle cx="680" cy="420" r="8" fill="#0A0E27"/>

  <!-- Subtle dot pattern (representing notes/data) -->
  <circle cx="450" cy="280" r="6" fill="#6366F180" opacity="0.6"/>
  <circle cx="520" cy="260" r="6" fill="#6366F180" opacity="0.6"/>
  <circle cx="590" cy="280" r="6" fill="#6366F180" opacity="0.6"/>

  <circle cx="450" cy="744" r="6" fill="#6366F180" opacity="0.6"/>
  <circle cx="520" cy="764" r="6" fill="#6366F180" opacity="0.6"/>
  <circle cx="590" cy="744" r="6" fill="#6366F180" opacity="0.6"/>

  <!-- Gradient definition -->
  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E2235" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
</svg>
```

### Generation Instructions

1. **Using Figma/Sketch/Adobe XD:**
   - Import the SVG above
   - Export at 1024x1024 PNG (32-bit with alpha)
   - Save as `icon.png`

2. **Using ImageMagick (CLI):**
   ```bash
   convert -size 1024x1024 xc:"#0A0E27" \
     -fill "#6366F1" -font Arial-Bold -pointsize 600 \
     -gravity center -annotate +0+0 "N" \
     icon.png
   ```

3. **Place file at:**
   - `apps/mobile/assets/icon.png`

---

## Splash Screen (2048x2048)

### Design Concept
Clean, minimal splash screen that matches the app's dark theme with the app icon centered.

### SVG Template

```svg
<svg width="2048" height="2048" viewBox="0 0 2048 2048" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="2048" height="2048" fill="#0A0E27"/>

  <!-- Centered app icon (scaled down) -->
  <g transform="translate(524, 524)">
    <!-- Same N symbol as icon but at 1000x1000 -->
    <path d="M 200 250 L 200 750 L 280 750 L 280 450 L 720 750 L 800 750 L 800 250 L 720 250 L 720 550 L 280 250 Z" fill="#6366F1" stroke="#8B5CF6" stroke-width="12"/>

    <!-- Lock accent -->
    <circle cx="760" cy="300" r="48" fill="none" stroke="#8B5CF6" stroke-width="12"/>
    <rect x="732" y="330" width="56" height="40" rx="8" fill="#8B5CF6"/>
  </g>

  <!-- App name below icon -->
  <text x="1024" y="1650" font-family="Inter, sans-serif" font-weight="700" font-size="80" fill="#E4E7EC" text-anchor="middle">
    Noteece
  </text>

  <!-- Tagline -->
  <text x="1024" y="1750" font-family="Inter, sans-serif" font-weight="400" font-size="48" fill="#64748B" text-anchor="middle">
    Your Personal Intelligence Vault
  </text>
</svg>
```

### Generation Instructions

1. Export at 2048x2048 PNG
2. Save as `apps/mobile/assets/splash.png`
3. Update `app.json`:
   ```json
   "splash": {
     "image": "./assets/splash.png",
     "resizeMode": "contain",
     "backgroundColor": "#0A0E27"
   }
   ```

---

## Adaptive Icon (Android)

Android uses adaptive icons with two layers: foreground and background.

### Background Layer (1024x1024)

```svg
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#0A0E27"/>

  <!-- Gradient overlay -->
  <rect width="1024" height="1024" fill="url(#gradient)"/>

  <defs>
    <linearGradient id="gradient" x1="0" y1="0" x2="1024" y2="1024" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1E2235" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#6366F1" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
</svg>
```

### Foreground Layer (1024x1024)

```svg
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- N symbol (centered with safe zone) -->
  <path d="M 350 400 L 350 624 L 410 624 L 410 500 L 614 624 L 674 624 L 674 400 L 614 400 L 614 524 L 410 400 Z" fill="#6366F1" stroke="#8B5CF6" stroke-width="8"/>

  <!-- Lock accent -->
  <circle cx="640" cy="425" r="36" fill="none" stroke="#8B5CF6" stroke-width="10"/>
  <rect x="616" y="440" width="48" height="32" rx="6" fill="#8B5CF6"/>
  <circle cx="640" cy="456" r="6" fill="#0A0E27"/>
</svg>
```

### Generation Instructions

1. Export both layers at 1024x1024 PNG
2. Save as:
   - `apps/mobile/assets/adaptive-icon.png` (foreground)
   - Background color already in app.json: `#0A0E27`

---

## Screenshots

### Required Sizes

**iOS:**
- iPhone 14 Pro Max: 1290x2796
- iPhone 14 Pro: 1179x2556
- iPad Pro 12.9": 2048x2732

**Android:**
- Phone: 1080x1920
- 7" Tablet: 1200x1920
- 10" Tablet: 1600x2560

### Screenshot Scenarios

1. **Today View** - Show the Fused Reality timeline with daily brief
2. **Tasks** - Show task list with filters and priorities
3. **Insights** - Show Foresight insights with suggested actions
4. **Capture** - Show quick capture interface
5. **More** - Show settings and sync options

### Capture Instructions

Using Expo:
```bash
# iOS
expo start --ios
# Press 's' to take screenshot

# Android
expo start --android
# Use Android Studio's screenshot tool
```

Using physical devices:
- iOS: Volume Up + Side Button
- Android: Volume Down + Power Button

### Post-processing

Add marketing frame using tools like:
- [App Mockup](https://app-mockup.com/)
- [Previewed](https://previewed.app/)
- [Figma with device frames](https://www.figma.com/)

---

## Asset Checklist

- [ ] icon.png (1024x1024)
- [ ] splash.png (2048x2048)
- [ ] adaptive-icon.png (1024x1024)
- [ ] favicon.png (48x48) for web
- [ ] iOS screenshots (3 sizes × 5 screens = 15 images)
- [ ] Android screenshots (3 sizes × 5 screens = 15 images)

---

## Branding Guidelines

### Colors

- **Primary**: #6366F1 (Indigo)
- **Secondary**: #8B5CF6 (Purple)
- **Background**: #0A0E27 (Deep Space)
- **Surface**: #1E2235 (Elevated Dark)
- **Text Primary**: #E4E7EC (Light Gray)

### Typography

- **Display**: Inter Bold (700)
- **Headings**: Inter SemiBold (600)
- **Body**: Inter Regular (400)

### Design Principles

1. **Dark-first**: App is designed for dark mode
2. **Minimal**: Clean interfaces without clutter
3. **Secure**: Visual emphasis on privacy and encryption
4. **Intelligent**: Subtle hints at AI/correlation features
5. **Personal**: Warm, approachable despite technical nature

---

## Tools & Resources

### Recommended Tools

- **Vector Design**: Figma (free), Inkscape (FOSS), Adobe Illustrator
- **Icon Export**: [App Icon Generator](https://www.appicon.co/)
- **Screenshot Framing**: [Previewed](https://previewed.app/)
- **Color Palette**: [Coolors](https://coolors.co/)

### Asset Generators

- [Expo Icon/Splash Generator](https://docs.expo.dev/guides/app-icons/)
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/)
- [iOS App Icon Template](https://www.figma.com/community/file/1057032439642846056)

### Expo Asset Commands

```bash
# Generate all icon sizes from 1024x1024 source
npx expo-asset-generator generate -i ./assets/icon.png -o ./assets

# Validate icons
npx expo-asset-generator validate ./assets
```

---

## Implementation

Once assets are created, update `app.json`:

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0A0E27"
    },
    "ios": {
      "icon": "./assets/icon.png"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0A0E27"
      }
    }
  }
}
```
