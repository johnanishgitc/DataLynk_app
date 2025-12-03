# Development Build Setup for Background Features

## Why You Need a Development Build

**Expo Go** has limitations and doesn't support:
- Background fetch/tasks
- Push notifications (remote)
- Some native modules

To test these features, you need a **development build**.

## Quick Setup

### 1. Install EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure EAS Build
```bash
eas build:configure
```

### 4. Build for Android (Recommended for Testing)
```bash
# Build APK for local testing
eas build --profile development --platform android --local

# OR build in the cloud (requires Expo account)
eas build --profile development --platform android
```

### 5. Install on Your Device
Once the build is complete:
- Download the APK to your Android device
- Install it (you may need to enable "Install from unknown sources")
- The app will have all native features enabled

## Testing Background Checks

After installing the development build:

1. **Open the app** and log in
2. **Go to Authorize Vouchers** → ⚙️ Settings
3. **Enable auto-check** and set frequency (e.g., 1 minute)
4. **Put the app in background** (press home button)
5. **Wait for the interval** (1 minute)
6. **Check notifications** - you should receive alerts for new vouchers

## Alternative: Use Test Check Now

If you don't want to build:
- The "Test Check Now" button works perfectly in Expo Go
- It's essentially the same functionality, just triggered manually
- Checks for new vouchers with MasterID > current highest
- Shows notification-style alerts

## Background Fetch Behavior

### In Development/Production Builds:
- ✅ Runs every N minutes (as configured)
- ✅ Works when app is in background
- ✅ Works even after device restart (if configured)
- ✅ Shows system notifications

### In Expo Go:
- ❌ Background tasks don't run
- ✅ Manual "Test Check Now" works
- ✅ UI and configuration works
- ✅ All other features work

## Platform-Specific Notes

### Android
- More reliable background execution
- WorkManager ensures tasks run
- Better battery optimization control

### iOS
- Requires Background App Refresh permission
- May be throttled by iOS
- Background execution is more restricted

## Troubleshooting

### Build fails?
```bash
# Clear cache and try again
eas build --clear-cache --profile development --platform android
```

### Can't install APK?
- Enable "Install from unknown sources" in Android settings
- Allow app to install from this source

### Background checks not working?
- Check battery optimization settings
- Ensure Background App Refresh is enabled (iOS)
- Check app permissions

## Production Build

For App Store/Play Store release:
```bash
# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

---

**For now:** Use "Test Check Now" in Expo Go - it works perfectly and provides the same functionality!

