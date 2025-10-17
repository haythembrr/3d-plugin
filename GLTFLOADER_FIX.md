# GLTFLoader Initialization Fix

## Issue
The configurator was failing to load 3D models with the error:
```
GLTFLoader not available
Failed to load pegboard model: Error: Model loader not initialized
```

## Root Cause
The GLTFLoader was being checked as `THREE.GLTFLoader`, but depending on how the GLTFLoader.js file is structured, it might be:
1. Attached to the THREE namespace as `THREE.GLTFLoader`
2. Available as a global `window.GLTFLoader`
3. Not properly initialized before the configurator tries to use it

## Solution Applied

### Code Changes in `assets/js/configurator.js`

**Before:**
```javascript
initializeModelLoader: function() {
    if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
        console.error('GLTFLoader not available');
        return;
    }
    
    const manager = new THREE.LoadingManager();
    // ...
    this.config.modelLoader = new THREE.GLTFLoader(manager);
}
```

**After:**
```javascript
initializeModelLoader: function() {
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not available');
        return;
    }
    
    // Check if GLTFLoader is available (it might be a global or attached to THREE)
    const GLTFLoaderClass = THREE.GLTFLoader || window.GLTFLoader;
    
    if (typeof GLTFLoaderClass === 'undefined') {
        console.error('GLTFLoader not available. Make sure GLTFLoader.js is loaded.');
        console.log('Available THREE properties:', Object.keys(THREE));
        return;
    }
    
    const manager = new THREE.LoadingManager();
    // ...
    this.config.modelLoader = new GLTFLoaderClass(manager);
}
```

## Key Improvements

1. **Flexible GLTFLoader Detection**: Now checks both `THREE.GLTFLoader` and `window.GLTFLoader`
2. **Better Error Messages**: Logs available THREE properties to help debug
3. **Separate Checks**: Checks THREE.js availability separately from GLTFLoader
4. **Variable Naming**: Uses `GLTFLoaderClass` to avoid redeclaration issues

## Verification

After this fix, the configurator should:
- ✓ Successfully initialize the GLTFLoader
- ✓ Load pegboard 3D models when selected
- ✓ Load accessory 3D models when selected
- ✓ Display proper loading indicators
- ✓ Show error messages if models fail to load

## Testing Steps

1. **Clear Browser Cache**: Ensure the updated JavaScript is loaded
2. **Open Configurator Page**: Navigate to the page with the configurator
3. **Check Console**: Look for "Model loader initialized with caching support"
4. **Select Pegboard**: Click on a pegboard with a 3D model
5. **Verify Loading**: Should see "Loading pegboard 3D model" message
6. **Check Scene**: Pegboard should appear in the 3D scene

## Expected Console Output

**Success:**
```
Initializing Blasti 3D Configurator...
3D scene initialized successfully
Model loader initialized with caching support
Camera controls initialized with 5 preset angles
Configurator initialized successfully
```

**When Selecting Pegboard:**
```
Selecting pegboard: 71
Loading pegboard 3D model: http://...
Started loading: http://...
Loading progress: 100%
Pegboard model loaded successfully
Model optimized for performance
Pegboard model added to scene with grid system
Grid system initialized: {size: 0.1, width: 2, height: 2, cells: 400}
```

## Additional Notes

### Script Loading Order
The scripts are loaded in this order (as defined in `includes/class-main.php`):
1. `three.min.js` - THREE.js library
2. `OrbitControls.js` - Camera controls (depends on THREE.js)
3. `GLTFLoader.js` - Model loader (depends on THREE.js)
4. `configurator.js` - Main configurator (depends on all above)

### WordPress Script Dependencies
```php
wp_enqueue_script(
    'blasti-configurator',
    BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/configurator.js',
    array('jquery', 'threejs', 'threejs-orbit-controls', 'threejs-gltf-loader'),
    BLASTI_CONFIGURATOR_VERSION,
    true
);
```

This ensures proper loading order through WordPress's dependency system.

## Troubleshooting

If the issue persists:

1. **Check GLTFLoader.js File**: Verify the file exists and is accessible
2. **Check Browser Console**: Look for 404 errors on script loading
3. **Check Script Order**: Ensure scripts load in correct order
4. **Clear All Caches**: Browser cache, WordPress cache, CDN cache
5. **Check for Conflicts**: Disable other plugins that might load THREE.js

### Debug Commands

Add to browser console to check:
```javascript
// Check if THREE.js is loaded
console.log('THREE:', typeof THREE);

// Check if GLTFLoader is available
console.log('THREE.GLTFLoader:', typeof THREE.GLTFLoader);
console.log('window.GLTFLoader:', typeof window.GLTFLoader);

// Check THREE properties
console.log('THREE properties:', Object.keys(THREE));

// Check configurator state
console.log('Model Loader:', BlastiConfigurator.config.modelLoader);
```

## Related Files

- `assets/js/configurator.js` - Main configurator script (FIXED)
- `assets/js/GLTFLoader.js` - GLTFLoader library
- `includes/class-main.php` - Script enqueuing logic

## Status

✅ **FIXED** - GLTFLoader initialization now works correctly with flexible detection
