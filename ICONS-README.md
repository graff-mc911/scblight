# SCB Light App Icons

## 📱 Icon Configuration Complete

All app icons have been configured for iOS, Android, and Web/PWA platforms.

## 🎨 Icon Specifications

### Brand Colors
- **Primary**: #FF7A00 (Orange)
- **Secondary**: #FF6600 (Dark Orange)
- **Gradient**: Linear gradient from primary to secondary

### Design
- Orange gradient background
- White construction/calculator symbol
- "SCB" text in white (on larger icons)
- Professional, modern look

## 📦 Icon Sizes Generated

### iOS (Apple)
- 1024x1024 (App Store)
- 180x180 (iPhone Retina)
- 167x167 (iPad Pro)
- 152x152 (iPad Retina)
- 120x120 (iPhone)
- 87x87 (iPhone @3x)
- 80x80 (iPad @2x)
- 76x76 (iPad)
- 60x60 (iPhone @2x)
- 58x58 (iPhone @2x)
- 40x40 (iPad)
- 29x29 (Settings)

### Android
- 192x192 (xxxhdpi)
- 144x144 (xxhdpi)
- 96x96 (xhdpi)
- 72x72 (hdpi)
- 48x48 (mdpi)
- 36x36 (ldpi)

### Web/PWA
- 1024x1024 (High-res)
- 512x512 (PWA standard)
- 384x384
- 256x256
- 192x192 (PWA minimum)
- 128x128
- 96x96

### Favicon
- 64x64
- 48x48
- 32x32
- 16x16
- favicon.ico

## 🔧 How to Generate High-Quality Icons

The current icons are placeholder files. To create proper high-quality icons:

### Method 1: Use the Built-in Generator (Recommended)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open in browser:
   ```
   http://localhost:5173/generate-icons.html
   ```

3. Click "Download All as ZIP"

4. Extract the downloaded ZIP file

5. Replace the placeholder files in `public/` folder with the generated icons

### Method 2: Use Professional Design Tools

1. Create a 1024x1024px icon in:
   - Adobe Illustrator
   - Figma
   - Sketch
   - Photoshop

2. Use online tools to generate all sizes:
   - https://realfavicongenerator.net/
   - https://www.favicon-generator.org/
   - https://icon.kitchen/

3. Place generated icons in `public/` folder

## 📁 File Locations

### Public Folder (`/public/`)
```
public/
├── favicon.ico
├── favicon-16x16.png
├── favicon-32x32.png
├── icon-48x48.png
├── icon-64x64.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-180x180.png
├── icon-192x192.png
├── icon-256x256.png
├── icon-384x384.png
├── icon-512x512.png
├── icon-1024x1024.png
├── apple-touch-icon.png (180x180)
├── apple-touch-icon-120x120.png
├── apple-touch-icon-152x152.png
├── apple-touch-icon-180x180.png
└── manifest.json (references all icons)
```

## ✅ Configuration Files Updated

### 1. `index.html`
- ✅ Favicon links (all sizes)
- ✅ Apple Touch Icons
- ✅ iOS meta tags
- ✅ Android meta tags

### 2. `manifest.json`
- ✅ All icon sizes (16x16 to 1024x1024)
- ✅ Proper purpose attributes
- ✅ Maskable icons for Android

## 🚀 Deployment

Icons are automatically copied to `dist/` folder during build:
```bash
npm run build
```

## 📱 Testing

### iOS (Safari)
1. Open the app in Safari on iPhone/iPad
2. Tap Share button
3. Select "Add to Home Screen"
4. Verify icon appears correctly

### Android (Chrome)
1. Open the app in Chrome on Android
2. Tap the three dots menu
3. Select "Install app" or "Add to Home Screen"
4. Verify icon appears correctly

### Web (Desktop)
1. Open the app in browser
2. Check favicon in browser tab
3. Bookmark the page to verify icon

## 🎯 Icon Best Practices

✅ **DO:**
- Use simple, recognizable symbols
- Maintain good contrast
- Test on different backgrounds
- Use safe area (avoid important content near edges)
- Keep design consistent across sizes

❌ **DON'T:**
- Use text (except for very large icons)
- Use complex gradients that don't scale well
- Use transparency for iOS icons
- Make icons too detailed (won't scale down well)

## 📚 Resources

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Icon Design Guidelines](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
- [PWA Icons Guide](https://web.dev/add-manifest/#icons)
- [Favicon Generator](https://realfavicongenerator.net/)

## 🔄 Updating Icons

To update icons in the future:

1. Update the icon generator HTML:
   ```
   public/generate-icons.html
   ```

2. Modify the `drawIcon()` function to change the design

3. Regenerate all icons using the web interface

4. Replace files in `public/` folder

5. Rebuild the project:
   ```bash
   npm run build
   ```

## 🐛 Troubleshooting

### Icons not showing in browser?
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for 404 errors
- Verify files exist in `public/` folder

### Icons not updating after changes?
- Hard refresh the page
- Clear service worker cache
- Uninstall and reinstall PWA

### Icons look blurry?
- Generate higher resolution icons
- Use proper PNG format (not JPEG)
- Ensure antialiasing is enabled

---

**Last Updated:** March 29, 2026
**Version:** 1.0.0
