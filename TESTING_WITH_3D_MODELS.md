# Testing the Blasti 3D Configurator with Products and 3D Models

This guide explains how to add test products and 3D model files to test the configurator functionality.

## Overview

The Blasti 3D Configurator requires:
1. **WooCommerce Products** (pegboards and accessories)
2. **3D Model Files** (GLB/GLTF format)
3. **Product Metadata** (linking products to 3D models)

## Part 1: Obtaining 3D Model Files

### Option A: Free 3D Model Resources

Download free GLB/GLTF models from these sources:

1. **Sketchfab** (https://sketchfab.com/)
   - Search for "pegboard", "shelf", "hook", or "storage"
   - Filter by "Downloadable" and select "glTF" format
   - Free models available with Creative Commons licenses

2. **Poly Haven** (https://polyhaven.com/models)
   - High-quality free 3D models
   - Download in GLB format
   - Public domain (CC0) license

3. **Three.js Examples** (https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf)
   - Sample GLTF models for testing
   - Simple geometric shapes good for initial testing

4. **Kenney Assets** (https://kenney.nl/assets)
   - Free game assets including 3D models
   - Some models available in GLB format

### Option B: Create Simple Test Models

Use free 3D modeling tools to create basic test models:

1. **Blender** (https://www.blender.org/)
   - Free and open-source
   - Export as GLB: File > Export > glTF 2.0 (.glb/.gltf)
   - Tutorial: Create a simple cube or plane for testing

2. **Tinkercad** (https://www.tinkercad.com/)
   - Browser-based, beginner-friendly
   - Export as GLB via third-party converters

### Recommended Test Models

For initial testing, create or download:
- **Pegboard**: Rectangular board with holes (1m x 0.6m recommended)
- **Hook**: Simple curved hook (10cm x 5cm)
- **Shelf**: Small shelf bracket (20cm x 15cm)
- **Bin**: Small storage container (15cm x 10cm x 10cm)

## Part 2: Preparing 3D Model Files

### File Format Requirements

- **Format**: GLB (binary) or GLTF (text + separate files)
- **Recommended**: GLB format (single file, easier to manage)
- **Version**: glTF 2.0
- **File Size**: Keep under 5MB per model for good performance

### Optimization Tips

1. **Reduce Polygon Count**
   - Use Blender's "Decimate" modifier
   - Target: 5,000-20,000 triangles per model

2. **Optimize Textures**
   - Maximum texture size: 2048x2048 pixels
   - Use compressed formats (JPEG for color, PNG for transparency)
   - Consider using vertex colors instead of textures for simple models

3. **Clean Up Models**
   - Remove unnecessary objects, lights, cameras
   - Apply all transformations
   - Center the model at origin (0, 0, 0)

### Converting Models to GLB

If you have models in other formats (OBJ, FBX, STL):

**Using Blender:**
```
1. Open Blender
2. File > Import > [Your Format]
3. Select your model file
4. File > Export > glTF 2.0 (.glb/.gltf)
5. Choose "glTF Binary (.glb)" format
6. Click "Export glTF 2.0"
```

**Using Online Converters:**
- https://products.aspose.app/3d/conversion
- https://imagetostl.com/convert/file/glb
- Upload your file and convert to GLB

## Part 3: Adding Models to WordPress

### Step 1: Upload Model Files

1. **Via WordPress Media Library:**
   ```
   - Go to WordPress Admin > Media > Add New
   - Upload your .glb files
   - Note: You may need to allow GLB uploads (see below)
   ```

2. **Via FTP/File Manager:**
   ```
   - Upload to: wp-content/uploads/blasti-models/
   - Create folders: pegboards/, accessories/
   - Example: wp-content/uploads/blasti-models/pegboards/basic-pegboard.glb
   ```

3. **Via Plugin Admin (Recommended):**
   ```
   - Go to WordPress Admin > Blasti Configurator > Models
   - Click "Upload Model"
   - Select your GLB file
   - Models stored in: wp-content/plugins/blasti-3d-configurator/assets/models/
   ```

### Step 2: Allow GLB File Uploads

Add this to your theme's `functions.php` or create a custom plugin:

```php
// Allow GLB and GLTF file uploads
add_filter('upload_mimes', 'blasti_allow_3d_model_uploads');
function blasti_allow_3d_model_uploads($mimes) {
    $mimes['glb'] = 'model/gltf-binary';
    $mimes['gltf'] = 'model/gltf+json';
    return $mimes;
}

// Fix MIME type check for GLB files
add_filter('wp_check_filetype_and_ext', 'blasti_fix_3d_model_mime_type', 10, 4);
function blasti_fix_3d_model_mime_type($data, $file, $filename, $mimes) {
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    
    if ($ext === 'glb') {
        $data['ext'] = 'glb';
        $data['type'] = 'model/gltf-binary';
    } elseif ($ext === 'gltf') {
        $data['ext'] = 'gltf';
        $data['type'] = 'model/gltf+json';
    }
    
    return $data;
}
```

## Part 4: Creating Test Products in WooCommerce

### Step 1: Create Pegboard Products

1. Go to **Products > Add New**
2. Fill in product details:
   ```
   Product Name: Basic Pegboard - White
   Regular Price: 49.99
   Product Type: Simple Product
   Categories: Pegboards
   ```

3. Add product metadata (scroll down to "Custom Fields" or use plugin interface):
   ```
   Meta Key: _blasti_product_type
   Meta Value: pegboard
   
   Meta Key: _blasti_3d_model_url
   Meta Value: /wp-content/uploads/blasti-models/pegboards/basic-pegboard.glb
   
   Meta Key: _blasti_dimensions
   Meta Value: {"width": 1.0, "height": 0.6, "depth": 0.02}
   ```

4. Publish the product

### Step 2: Create Accessory Products

1. Go to **Products > Add New**
2. Fill in product details:
   ```
   Product Name: Metal Hook - Small
   Regular Price: 5.99
   Product Type: Simple Product
   Categories: Accessories
   ```

3. Add product metadata:
   ```
   Meta Key: _blasti_product_type
   Meta Value: accessory
   
   Meta Key: _blasti_3d_model_url
   Meta Value: /wp-content/uploads/blasti-models/accessories/hook-small.glb
   
   Meta Key: _blasti_dimensions
   Meta Value: {"width": 0.1, "height": 0.05, "depth": 0.05}
   
   Meta Key: _blasti_compatible_pegboards
   Meta Value: [123, 124, 125]  (Product IDs of compatible pegboards)
   ```

4. Publish the product

### Step 3: Using the Plugin Admin Interface

**Easier Method** (if admin interface is implemented):

1. Go to **Blasti Configurator > Products**
2. Click **"Add Pegboard"** or **"Add Accessory"**
3. Fill in the form:
   - Select WooCommerce Product
   - Upload 3D Model (GLB file)
   - Set Dimensions
   - Set Compatibility (for accessories)
4. Click **"Save"**

## Part 5: Testing the Model Loading System

### Test 1: Basic Model Loading

1. Go to the configurator page
2. Open browser console (F12)
3. Select a pegboard product
4. Check console for:
   ```
   Started loading: [model URL]
   Model loading: 50%
   Model loaded successfully: [model URL]
   Model optimized for performance
   ```

### Test 2: Model Caching

1. Select a pegboard
2. Remove the pegboard
3. Select the same pegboard again
4. Check console for:
   ```
   Loading model from cache: [product ID]
   ```
   (Should be instant, no loading indicator)

### Test 3: Error Handling

1. Create a product with invalid model URL
2. Try to select it
3. Should see:
   - Loading indicator appears
   - Error message displays
   - Console shows error details

### Test 4: Multiple Models

1. Select a pegboard
2. Add multiple accessories
3. Check that all models load correctly
4. Verify performance remains smooth

## Part 6: Sample Test Data

### Quick Test Setup

Create these test products for a complete test:

**Pegboards:**
1. Small Pegboard (60cm x 40cm) - $39.99
2. Medium Pegboard (100cm x 60cm) - $49.99
3. Large Pegboard (120cm x 80cm) - $69.99

**Accessories:**
1. Small Hook - $4.99
2. Large Hook - $6.99
3. Small Shelf - $12.99
4. Storage Bin - $8.99
5. Tool Holder - $9.99

### Sample Model URLs

If using the plugin's assets folder:
```
Pegboards:
- /wp-content/plugins/blasti-3d-configurator/assets/models/pegboard-small.glb
- /wp-content/plugins/blasti-3d-configurator/assets/models/pegboard-medium.glb
- /wp-content/plugins/blasti-3d-configurator/assets/models/pegboard-large.glb

Accessories:
- /wp-content/plugins/blasti-3d-configurator/assets/models/hook-small.glb
- /wp-content/plugins/blasti-3d-configurator/assets/models/hook-large.glb
- /wp-content/plugins/blasti-3d-configurator/assets/models/shelf-small.glb
- /wp-content/plugins/blasti-3d-configurator/assets/models/bin.glb
- /wp-content/plugins/blasti-3d-configurator/assets/models/tool-holder.glb
```

## Part 7: Troubleshooting

### Issue: Models Not Loading

**Check:**
1. File path is correct and accessible
2. File is valid GLB/GLTF format
3. Browser console for specific errors
4. File permissions (should be readable by web server)

**Solutions:**
```bash
# Check file exists (Windows Command Prompt)
dir "C:\xampp\htdocs\wordpress\wp-content\uploads\blasti-models\*.glb"

# Check file permissions
# Right-click file > Properties > Security
# Ensure "Users" have Read permissions
```

### Issue: "Failed to load 3D model"

**Possible causes:**
1. Invalid GLB file format
2. Corrupted file during upload
3. File too large (>10MB)
4. CORS issues (if loading from external URL)

**Solutions:**
- Re-export model from Blender
- Validate GLB file: https://gltf-viewer.donmccurdy.com/
- Reduce file size
- Host models on same domain

### Issue: Models Load But Don't Display

**Check:**
1. Model scale (might be too small or too large)
2. Model position (might be outside camera view)
3. Materials (might be transparent or black)

**Solutions:**
```javascript
// Test in browser console
BlastiConfigurator.loadModel('/path/to/model.glb', 'test-123')
    .then(function(model) {
        console.log('Model loaded:', model);
        console.log('Model bounds:', model.geometry.boundingBox);
    })
    .catch(function(error) {
        console.error('Load failed:', error);
    });
```

### Issue: Slow Performance

**Optimize:**
1. Reduce polygon count (use Blender Decimate modifier)
2. Compress textures
3. Use simpler materials
4. Clear model cache periodically

```javascript
// Clear cache in browser console
BlastiConfigurator.clearModelCache();
```

## Part 8: Advanced Testing

### Performance Testing

```javascript
// Check cache statistics
BlastiConfigurator.getModelCacheStats();

// Output:
// {
//   cachedModels: 5,
//   loadingModels: 0,
//   cacheKeys: ["123", "124", "125", "126", "127"]
// }
```

### Load Testing

1. Create 20+ products with models
2. Rapidly switch between products
3. Monitor:
   - Memory usage (Chrome DevTools > Memory)
   - Frame rate (Chrome DevTools > Performance)
   - Network requests (should see caching working)

### Browser Compatibility Testing

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Part 9: Sample Code for Bulk Product Creation

Use this PHP script to create test products programmatically:

```php
<?php
// Add to functions.php or run as standalone script

function blasti_create_test_products() {
    // Sample pegboards
    $pegboards = [
        [
            'name' => 'Small White Pegboard',
            'price' => 39.99,
            'model' => 'pegboard-small.glb',
            'dimensions' => ['width' => 0.6, 'height' => 0.4, 'depth' => 0.02]
        ],
        [
            'name' => 'Medium Black Pegboard',
            'price' => 49.99,
            'model' => 'pegboard-medium.glb',
            'dimensions' => ['width' => 1.0, 'height' => 0.6, 'depth' => 0.02]
        ],
        [
            'name' => 'Large Gray Pegboard',
            'price' => 69.99,
            'model' => 'pegboard-large.glb',
            'dimensions' => ['width' => 1.2, 'height' => 0.8, 'depth' => 0.02]
        ]
    ];
    
    $pegboard_ids = [];
    
    foreach ($pegboards as $pegboard) {
        $product = new WC_Product_Simple();
        $product->set_name($pegboard['name']);
        $product->set_regular_price($pegboard['price']);
        $product->set_status('publish');
        $product_id = $product->save();
        
        // Add metadata
        update_post_meta($product_id, '_blasti_product_type', 'pegboard');
        update_post_meta($product_id, '_blasti_3d_model_url', 
            '/wp-content/plugins/blasti-3d-configurator/assets/models/' . $pegboard['model']);
        update_post_meta($product_id, '_blasti_dimensions', json_encode($pegboard['dimensions']));
        
        $pegboard_ids[] = $product_id;
        echo "Created pegboard: {$pegboard['name']} (ID: {$product_id})\n";
    }
    
    // Sample accessories
    $accessories = [
        [
            'name' => 'Small Metal Hook',
            'price' => 4.99,
            'model' => 'hook-small.glb',
            'dimensions' => ['width' => 0.1, 'height' => 0.05, 'depth' => 0.05]
        ],
        [
            'name' => 'Storage Bin',
            'price' => 8.99,
            'model' => 'bin.glb',
            'dimensions' => ['width' => 0.15, 'height' => 0.1, 'depth' => 0.1]
        ]
    ];
    
    foreach ($accessories as $accessory) {
        $product = new WC_Product_Simple();
        $product->set_name($accessory['name']);
        $product->set_regular_price($accessory['price']);
        $product->set_status('publish');
        $product_id = $product->save();
        
        // Add metadata
        update_post_meta($product_id, '_blasti_product_type', 'accessory');
        update_post_meta($product_id, '_blasti_3d_model_url', 
            '/wp-content/plugins/blasti-3d-configurator/assets/models/' . $accessory['model']);
        update_post_meta($product_id, '_blasti_dimensions', json_encode($accessory['dimensions']));
        update_post_meta($product_id, '_blasti_compatible_pegboards', json_encode($pegboard_ids));
        
        echo "Created accessory: {$accessory['name']} (ID: {$product_id})\n";
    }
    
    echo "\nTest products created successfully!\n";
}

// Run this function once to create test products
// blasti_create_test_products();
```

## Summary

1. **Get Models**: Download or create GLB files
2. **Upload Models**: Add to WordPress media or plugin folder
3. **Create Products**: Set up WooCommerce products with metadata
4. **Test Loading**: Verify models load correctly in configurator
5. **Optimize**: Adjust model files for best performance

The model loading system (Task 4.3) is now complete with:
- ✅ GLTFLoader setup
- ✅ Model caching for performance
- ✅ Loading states and progress indicators
- ✅ Comprehensive error handling
- ✅ Model optimization

You're ready to test the 3D configurator with real products!
