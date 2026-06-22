# UYIR Android App — Build Guide for Play Store

This guide covers building the UYIR Android app from this codebase for the Google Play Store.

## Overview

UYIR is a **Capacitor** hybrid mobile app built on React + Vite. The same codebase runs as:
- A web app (deployed on Render)
- An Android native app (APK/AAB for Play Store)
- An iOS app (future)

## Prerequisites

### Required Tools
1. **Node.js 20+** with npm
2. **Android Studio** (with SDK Manager)
3. **JDK 17** (Android Studio bundles this)
4. **Android SDK** (minimum API 22, target API 36)

### Install Capacitor CLI
```bash
cd client
npm install -g @capacitor/cli
```

## Project Structure

```
client/
  android/                    # Android native project
    app/src/main/             # Android source
      AndroidManifest.xml     # Permissions, activity config
      assets/public/          # Web assets (auto-copied by Capacitor)
      res/values/             # Colors, strings, styles
      res/xml/                # File paths, config
    build.gradle              # App-level build config
    gradle.properties         # Gradle settings
    create-keystore.sh        # Keystore generation script
    local.properties.template # SDK path template
    google-services.json      # Firebase push config (placeholder)
  src/                        # React web app
  vite.config.ts              # Vite config (relative base for mobile)
  capacitor.config.ts         # Capacitor configuration
  .env.production             # API URL pointing to production
```

## Quick Build (Debug APK)

```bash
cd client

# 1. Install dependencies
npm install

# 2. Build web assets
npm run build

# 3. Copy assets to Android
npx cap sync android

# 4. Build debug APK
cd android
./gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

## Release Build (for Play Store)

### Step 1: Generate Signing Keystore
```bash
cd client/android
./create-keystore.sh
```

Or manually:
```bash
keytool -genkey -v \
  -keystore UYIR.keystore \
  -alias uyir \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=UYIR Blood Network, O=UYIR, C=IN"
```

### Step 2: Configure Environment Variables
```bash
export ANDROID_RELEASE_STORE_FILE=/path/to/UYIR.keystore
export ANDROID_RELEASE_STORE_PASSWORD=your-password
export ANDROID_RELEASE_KEY_ALIAS=uyir
export ANDROID_RELEASE_KEY_PASSWORD=your-password
```

Or set them in your CI/CD pipeline (GitHub Actions, etc.)

### Step 3: Build Release APK
```bash
cd client
npm run build
npx cap sync android
cd android
./gradlew assembleRelease

# APK: app/build/outputs/apk/release/app-release.apk
```

### Step 4: Build AAB for Play Store
```bash
cd client/android
./gradlew bundleRelease

# AAB: app/build/outputs/bundle/release/app-release.aab
```

## Play Store Requirements

### 1. App Bundle (AAB)
Google Play requires **AAB** (Android App Bundle) for new apps. Upload the `.aab` file:
```
client/android/app/build/outputs/bundle/release/app-release.aab
```

### 2. App Signing
- Create a keystore (keep it safe forever)
- Google Play may require you to enroll in App Signing
- Upload your AAB and let Google manage the signing

### 3. Firebase Setup (Push Notifications)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project for UYIR
3. Add Android app with package ID: `com.uyir.blood`
4. Download `google-services.json`
5. Replace the placeholder at: `client/android/app/google-services.json`
6. Rebuild the app

### 4. API Key
- The Google Maps API key is embedded in `client/index.html`
- Ensure it is restricted to the production domain and the Android app
- Add the Android app SHA-1 fingerprint in Google Cloud Console

### 5. Privacy Policy
- Required by Google Play for all apps
- Create a simple privacy policy page on your website
- Link it in the Play Console listing

## CI/CD (GitHub Actions)

A pre-configured workflow is at: `client/.github/workflows/android.yml`

To use it:
1. Push to GitHub
2. Go to Actions → Build Android App
3. Run workflow manually (debug, release, or bundle)
4. Download the artifact

### Required Secrets for GitHub Actions
- `ANDROID_RELEASE_STORE_FILE` (base64-encoded keystore)
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_KEY_PASSWORD`

## Configuration Details

### Router (HashRouter)
The app uses `HashRouter` instead of `BrowserRouter` for mobile compatibility:
- Mobile apps run on `file://` URLs, not real URLs
- HashRouter uses `/#/path` for navigation, which works everywhere

### Base Path
`vite.config.ts` sets `base: "./"` for production:
- All assets load with relative paths
- Works in both web and mobile environments

### Permissions
The AndroidManifest.xml includes:
- `INTERNET` — Required for all network operations
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — GPS for nearby donors
- `RECORD_AUDIO` — Voice search via speech recognition
- `CAMERA` — Document/photo uploads
- `POST_NOTIFICATIONS` — Push notification alerts
- `RECEIVE_BOOT_COMPLETED` — Keep notifications working after reboot

### Build Config
- `minSdkVersion`: 22 (Android 5.1)
- `targetSdkVersion`: 34 (Android 14)
- `compileSdkVersion`: 34
- `versionCode`: 1
- `versionName`: "1.0.0"

## Fastlane (Optional)

Fastlane config is in `client/fastlane/`:
```bash
cd client
fastlane android debug    # Build debug APK
fastlane android release  # Build release APK
fastlane android bundle   # Build AAB
```

## Troubleshooting

### SDK not found
```bash
cd client/android
# Create local.properties with your SDK path
echo "sdk.dir=/Users/<username>/Library/Android/sdk" > local.properties
# Or for Linux: sdk.dir=/home/<username>/Android/Sdk
```

### Build fails with "No such file or directory"
Ensure you've run `npx cap sync android` after building the web app.

### Push notifications not working
Check that `google-services.json` is properly configured and the Firebase project matches the app ID.

### App shows blank screen
Check the browser console in Android Studio's Logcat for JavaScript errors.

### API not connecting
Ensure `client/.env.production` has the correct API URL:
```
VITE_API_URL=https://uyirproduction.onrender.com/api
```

## Release Checklist

- [ ] Build release APK and test on a real device
- [ ] Test GPS, voice, camera, and push notifications
- [ ] Verify app signing with keystore
- [ ] Build AAB for Play Store
- [ ] Configure Firebase for push notifications
- [ ] Write privacy policy
- [ ] Create Play Store listing (screenshots, description)
- [ ] Upload AAB to Google Play Console
- [ ] Set up Google Play App Signing
- [ ] Test internal release track
- [ ] Promote to production

## Support

For issues, check:
- Capacitor docs: https://capacitorjs.com
- Android Studio docs: https://developer.android.com/studio
- Play Console: https://play.google.com/console
