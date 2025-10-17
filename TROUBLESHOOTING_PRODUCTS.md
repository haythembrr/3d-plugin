# Troubleshooting: Products Not Showing in Configurator

## Problem

You've created WooCommerce products and uploaded GLB files, but they're not appearing in the configurator interface.

## Root Cause

Products need to be **explicitly enabled** for the configurator by setting specific metadata fields. Simply creating a WooCommerce product is not enough.

## Solution

### Step 1: Use the Product Configuration Tool

1. Navigate to: `http://yoursite.com/wp-content/plugins/blasti-3d-configurator/enable-products-for-configurator.php`

2. You'll see a list of all your WooCommerce products

3. Click "Configure" next to each product you want to enable

4. Fill in the required fields:
   - **Product Type**: Choose "Pegboard" or "Accessory"
   - **3D Model URL**: Path to your GLB file (e.g., `/wp-content/uploads/blasti-models/pegboard.glb`)
   - **Dimensions**: Width, Height, Depth in meters (e.g., 1.0 × 0.6 × 0.02)

5. Click "Save Configuration"

### Step 2: Verify Configuration

1. Navigate to: `http://yoursite.com/wp-content/plugins/blasti-3d-configurator/debug-products.php`

2. Check the overview section:
   - **Total WooCommerce Products**: Should show your products
   - **Enabled for Configurator**: Should be > 0
   - **Pegboards**: Should show your pegboard count
   - **Accessories**: Should show your accessory count

3. Look at the product table:
   - "Enabled?" column should show ✓ Yes
   - "Type" should show "pegboard" or "accessory"
   - "Model URL" should show your GLB filename
   - "Issues" should show ✓ OK

### Step 3: Test AJAX Endpoint

1. On the debug page, click "Test AJAX Load"

2. You should see:
   ```json
   {
     "success": true,
     "data": {
       "products": [
         {
           "id": 123,
           "name": "Your Product",
           "type": "pegboard",
           "model_url": "/path/to/model.glb",
           ...
         }
       ]
     }
   }
   ```

3. If you see `"products": []`, your products aren't properly configured

## Manual Configuration (Alternative Method)

If you prefer to configure products manually via WordPress admin:

### For Each Product:

1. Go to **Products > All Products**
2. Edit the product
3. Scroll down to **Custom Fields** section
4. Add these meta fields:

| Meta Key | Meta Value | Example |
|----------|------------|---------|
| `_blasti_configurator_enabled` | `yes` | `yes` |
| `_blasti_product_type` | `pegboard` or `accessory` | `pegboard` |
| `_blasti_model_url` | Path to GLB file | `/wp-content/uploads/blasti-models/pegboard.glb` |
| `_blasti_dimensions` | JSON dimensions | `{"width":1.0,"height":0.6,"depth":0.02}` |

5. Click "Update" to save

## Common Issues and Solutions

### Issue 1: "No products found"

**Symptoms:**
- Configurator shows empty product lists
- Debug tool shows "Enabled for Configurator: 0"

**Solution:**
- Use the enable-products tool to configure your products
- Make sure `_blasti_configurator_enabled` is set to `yes`

### Issue 2: "Products show but no 3D models load"

**Symptoms:**
- Products appear in the list
- Clicking them shows loading indicator
- Error: "Failed to load 3D model"

**Solution:**
- Check that GLB files are uploaded to the correct location
- Verify the `_blasti_model_url` path is correct
- Test the URL directly in your browser
- Ensure file permissions allow web server to read the files

### Issue 3: "AJAX returns empty array"

**Symptoms:**
- Debug tool shows products exist
- AJAX test returns `"products": []`

**Solution:**
- Check that `_blasti_configurator_enabled` is exactly `yes` (not `Yes` or `1`)
- Verify `_blasti_product_type` is either `pegboard` or `accessory`
- Clear any caching plugins
- Try the test-product-retrieval.php script

### Issue 4: "Products show in admin but not frontend"

**Symptoms:**
- Admin tools show products correctly
- Configurator page shows no products

**Solution:**
- Check browser console for JavaScript errors
- Verify AJAX nonce is valid
- Check that scripts are loading (Three.js, configurator.js)
- Test with browser cache disabled

## Verification Checklist

Use this checklist to verify everything is set up correctly:

- [ ] WooCommerce is installed and active
- [ ] Products are created and published
- [ ] GLB model files are uploaded
- [ ] Products are configured using the enable-products tool
- [ ] Debug tool shows products as "Enabled"
- [ ] AJAX test returns products successfully
- [ ] Model URLs are accessible
- [ ] Configurator page has the shortcode `[blasti_configurator]`
- [ ] Browser console shows no JavaScript errors

## Testing Workflow

Follow this workflow to test your setup:

### 1. Create Test Products

```
Product 1: Basic Pegboard
- Name: "Basic White Pegboard"
- Price: $49.99
- Type: pegboard
- Model: /wp-content/uploads/blasti-models/pegboard-basic.glb
- Dimensions: 1.0 × 0.6 × 0.02

Product 2: Small Hook
- Name: "Metal Hook - Small"
- Price: $5.99
- Type: accessory
- Model: /wp-content/uploads/blasti-models/hook-small.glb
- Dimensions: 0.1 × 0.05 × 0.05
```

### 2. Upload GLB Files

```bash
# Create directory
mkdir -p /path/to/wordpress/wp-content/uploads/blasti-models/

# Upload your GLB files
# - pegboard-basic.glb
# - hook-small.glb
```

### 3. Configure Products

1. Go to `enable-products-for-configurator.php`
2. Configure both products
3. Save

### 4. Verify

1. Go to `debug-products.php`
2. Check "Enabled for Configurator: 2"
3. Click "Test AJAX Load"
4. Should see both products in JSON response

### 5. Test Frontend

1. Go to your configurator page
2. Should see "Select Pegboard" with your pegboard
3. Should see "Add Accessories" with your hook
4. Click pegboard - should load 3D model

## File Locations Reference

```
Plugin Directory:
/wp-content/plugins/blasti-3d-configurator/

Tools:
├── enable-products-for-configurator.php  (Configure products)
├── debug-products.php                     (Debug tool)
└── test-product-retrieval.php            (Test retrieval)

Model Files:
/wp-content/uploads/blasti-models/
├── pegboard-basic.glb
├── pegboard-large.glb
├── hook-small.glb
├── hook-large.glb
└── ...

Templates:
/wp-content/plugins/blasti-3d-configurator/templates/
└── configurator.php                       (Main template)
```

## Database Structure

Products are stored with these meta fields:

```sql
-- Check product meta in database
SELECT 
    p.ID,
    p.post_title,
    pm1.meta_value as enabled,
    pm2.meta_value as type,
    pm3.meta_value as model_url
FROM wp_posts p
LEFT JOIN wp_postmeta pm1 ON p.ID = pm1.post_id AND pm1.meta_key = '_blasti_configurator_enabled'
LEFT JOIN wp_postmeta pm2 ON p.ID = pm2.post_id AND pm2.meta_key = '_blasti_product_type'
LEFT JOIN wp_postmeta pm3 ON p.ID = pm3.post_id AND pm3.meta_key = '_blasti_model_url'
WHERE p.post_type = 'product'
AND p.post_status = 'publish';
```

## Quick Fix Commands

### Enable a Product via WP-CLI

```bash
# Enable product ID 123 as a pegboard
wp post meta update 123 _blasti_configurator_enabled yes
wp post meta update 123 _blasti_product_type pegboard
wp post meta update 123 _blasti_model_url /wp-content/uploads/blasti-models/pegboard.glb
wp post meta update 123 _blasti_dimensions '{"width":1.0,"height":0.6,"depth":0.02}'
```

### Check Product Meta via WP-CLI

```bash
# Check product 123
wp post meta list 123 --keys=_blasti_configurator_enabled,_blasti_product_type,_blasti_model_url
```

## Support Resources

- **Enable Products Tool**: `enable-products-for-configurator.php`
- **Debug Tool**: `debug-products.php`
- **Test Retrieval**: `test-product-retrieval.php`
- **Testing Guide**: `TESTING_WITH_3D_MODELS.md`
- **API Reference**: `MODEL_LOADING_API.md`

## Still Having Issues?

If you've followed all steps and products still aren't showing:

1. **Check PHP Error Log**:
   - Location: `/wp-content/debug.log`
   - Enable: Add `define('WP_DEBUG_LOG', true);` to `wp-config.php`

2. **Check Browser Console**:
   - Press F12 in browser
   - Look for JavaScript errors
   - Check Network tab for failed AJAX requests

3. **Test with Default Theme**:
   - Switch to Twenty Twenty-Three theme
   - Test if products show
   - Rules out theme conflicts

4. **Disable Other Plugins**:
   - Temporarily disable all plugins except WooCommerce and Blasti Configurator
   - Test if products show
   - Rules out plugin conflicts

5. **Check File Permissions**:
   ```bash
   # Ensure web server can read files
   chmod 644 /path/to/wordpress/wp-content/uploads/blasti-models/*.glb
   ```

## Summary

The key requirement is that products must have these meta fields set:

1. `_blasti_configurator_enabled` = `yes`
2. `_blasti_product_type` = `pegboard` or `accessory`
3. `_blasti_model_url` = path to GLB file
4. `_blasti_dimensions` = JSON with width, height, depth

Use the provided tools to configure your products, then verify with the debug tool.
