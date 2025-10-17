# Cache Refresh Instructions

## Problem
The browser is loading old cached JavaScript files, causing the GLTFLoader to show placeholder messages instead of actually loading models.

## Solution

### Step 1: Clear WordPress Cache
If you're using a caching plugin (W3 Total Cache, WP Super Cache, etc.):
1. Go to WordPress Admin
2. Find your caching plugin settings
3. Click "Clear All Cache" or "Purge Cache"

### Step 2: Clear Browser Cache
**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Click "Clear data"

**Or use Hard Refresh:**
- Press `Ctrl + F5` (Windows)
- Or `Ctrl + Shift + R`

### Step 3: Verify Files Are Updated
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for `GLTFLoader.js?ver=1.0.1`
5. Click on it and check the Response tab
6. Should see "GLTFLoader initialized - Ready to load GLTF/GLB models"

### Step 4: Test Model Loading
1. Go to your configurator page
2. Open browser console (F12)
3. Click on a pegboard
4. Should see: "GLTFLoader: Created scene with X meshes"
5. NOT: "GLTFLoader placeholder loaded"

## What Was Fixed

### 1. GLTFLoader.js - Complete Rewrite
- Removed placeholder code
- Added real GLTF/GLB parsing
- Supports binary GLB format
- Creates Three.js meshes from GLTF data

### 2. Version Bump
- Changed version from 1.0.0 to 1.0.1
- Forces browsers to reload JavaScript files
- Bypasses cache

## Expected Console Output

### ✅ CORRECT (After Cache Clear):
```
GLTFLoader initialized - Ready to load GLTF/GLB models
Selecting pegboard: 71
Loading pegboard 3D model: http://...
GLTFLoader: Created scene with 1 meshes
Pegboard model loaded successfully
Pegboard model added to scene
```

### ❌ WRONG (Old Cached Version):
```
GLTFLoader placeholder loaded - will be fully implemented in task 4.3
GLTFLoader.load called for: http://...
Full GLTF loading will be implemented in task 4.3
Error: GLTFLoader not yet implemented
```

## Currency Issue

The currency showing as € instead of TND is a WooCommerce setting:

1. Go to **WooCommerce > Settings > General**
2. Find **Currency** dropdown
3. Select **Tunisian Dinar (TND)**
4. Scroll down and click **Save changes**
5. Refresh your configurator page

The configurator displays whatever currency WooCommerce is configured to use.

## Still Not Working?

### Check 1: File Actually Updated
```bash
# In your plugin directory
tail -20 assets/js/GLTFLoader.js
```

Should show:
```javascript
console.log('GLTFLoader initialized - Ready to load GLTF/GLB models');
```

NOT:
```javascript
console.log('GLTFLoader placeholder loaded - will be fully implemented in task 4.3');
```

### Check 2: WordPress Loading Correct File
View page source and look for:
```html
<script src='.../GLTFLoader.js?ver=1.0.1'></script>
```

If it shows `?ver=1.0.0`, WordPress is still using old version.

### Check 3: Disable All Caching
Temporarily disable:
- WordPress caching plugins
- Server-side caching (if any)
- CDN caching (if any)
- Browser cache (use Incognito mode)

### Check 4: Force Reload in WordPress
1. Go to WordPress Admin > Plugins
2. Deactivate "Blasti 3D Configurator"
3. Activate it again
4. Clear all caches
5. Test again

## Quick Test Command

Run this in browser console after page loads:
```javascript
// Check if GLTFLoader is properly loaded
if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') {
    console.log('✓ GLTFLoader is loaded');
    
    // Try to create an instance
    var loader = new THREE.GLTFLoader();
    console.log('✓ GLTFLoader instance created:', loader);
    
    // Check if it has the load method
    if (typeof loader.load === 'function') {
        console.log('✓ GLTFLoader.load method exists');
    } else {
        console.log('✗ GLTFLoader.load method missing');
    }
} else {
    console.log('✗ GLTFLoader not loaded');
}
```

Expected output:
```
✓ GLTFLoader is loaded
✓ GLTFLoader instance created: THREE.GLTFLoader {manager: LoadingManager}
✓ GLTFLoader.load method exists
```

## Summary

1. **Clear all caches** (WordPress + Browser)
2. **Hard refresh** the page (Ctrl + F5)
3. **Check console** for correct messages
4. **Change currency** in WooCommerce settings
5. **Test model loading** by clicking products

The GLTFLoader is now properly implemented and will load your GLB models!
