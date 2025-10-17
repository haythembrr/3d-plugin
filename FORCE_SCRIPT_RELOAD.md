# Force Script Reload - Cache Busting

## Problem
The GLTFLoader.js script is not loading or executing, even after updates. This is likely due to:
1. Browser cache
2. WordPress cache
3. CDN cache
4. Server-side cache

## Solution: Force Script Reload

### Method 1: Change Version Number (RECOMMENDED)

Edit `blasti-configurator.php` and increment the version number:

```php
// Find this line:
define('BLASTI_CONFIGURATOR_VERSION', '1.0.1');

// Change to:
define('BLASTI_CONFIGURATOR_VERSION', '1.0.2');
```

This will force WordPress to reload all scripts with the new version parameter.

### Method 2: Clear All Caches

1. **Browser Cache:**
   - Chrome/Edge: Ctrl+Shift+Delete → Clear cached images and files
   - Or: Hard refresh with Ctrl+Shift+R

2. **WordPress Cache:**
   ```php
   // Add to wp-config.php temporarily:
   define('WP_CACHE', false);
   ```

3. **Plugin Cache (if using caching plugin):**
   - WP Super Cache: Settings → Delete Cache
   - W3 Total Cache: Performance → Empty All Caches
   - WP Rocket: Clear Cache

4. **Server Cache:**
   - Contact hosting provider
   - Or restart web server if you have access

### Method 3: Add Timestamp to Script URL

Edit `includes/class-main.php`:

```php
// Find the GLTFLoader enqueue:
wp_enqueue_script(
    'threejs-gltf-loader',
    BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/GLTFLoader.js',
    array('threejs'),
    BLASTI_CONFIGURATOR_VERSION, // ← Change this
    true
);

// Change to:
wp_enqueue_script(
    'threejs-gltf-loader',
    BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/GLTFLoader.js',
    array('threejs'),
    BLASTI_CONFIGURATOR_VERSION . '.' . time(), // ← Add timestamp
    true
);
```

### Method 4: Disable Script Concatenation

Add to `wp-config.php`:

```php
define('CONCATENATE_SCRIPTS', false);
```

### Method 5: Check File Permissions

Ensure the file is readable:

```bash
# On server:
chmod 644 wp-content/plugins/blasti-configurator/assets/js/GLTFLoader.js
```

## Verification Steps

After applying fixes:

1. **Clear browser cache** completely
2. **Open DevTools** (F12)
3. **Go to Network tab**
4. **Check "Disable cache"** checkbox
5. **Refresh page** (Ctrl+Shift+R)
6. **Look for GLTFLoader.js** in network requests
7. **Check status code** (should be 200)
8. **Click on the file** and verify content is correct
9. **Check console** for "GLTFLoader initialized" message

## Quick Test Script

Run this in browser console to verify the file is accessible:

```javascript
fetch('/wordpress/wp-content/plugins/blasti-configurator/assets/js/GLTFLoader.js')
    .then(r => r.text())
    .then(text => {
        console.log('File size:', text.length);
        console.log('Contains THREE.GLTFLoader:', text.includes('THREE.GLTFLoader'));
        console.log('Contains initGLTFLoader:', text.includes('initGLTFLoader'));
        if (text.length < 100) {
            console.error('File seems empty or corrupted!');
        }
    })
    .catch(e => console.error('Cannot fetch file:', e));
```

## If Still Not Working

### Check WordPress Script Queue

Add this to your theme's `functions.php` temporarily:

```php
add_action('wp_print_scripts', function() {
    global $wp_scripts;
    echo '<script>console.log("Enqueued scripts:", ' . json_encode(array_keys($wp_scripts->registered)) . ');</script>';
});
```

Look for `threejs-gltf-loader` in the console output.

### Manual Script Injection

As a last resort, add directly to template:

Edit `templates/configurator.php` and add before the closing `</div>`:

```php
<script>
console.log('Manually loading GLTFLoader...');
(function() {
    if (typeof THREE === 'undefined') {
        console.error('THREE not loaded yet');
        return;
    }
    
    // Inline GLTFLoader code here
    THREE.GLTFLoader = function(manager) {
        this.manager = manager || THREE.DefaultLoadingManager;
    };
    
    // ... rest of GLTFLoader code ...
    
    console.log('GLTFLoader manually initialized');
})();
</script>
```

## Expected Result

After successful fix, you should see in console:

```
THREE.js loaded
GLTFLoader initialized - Ready to load GLTF/GLB models
Model loader initialized with caching support
```

## Status

⚠️ **ACTION REQUIRED** - Need to clear caches and verify script is loading
