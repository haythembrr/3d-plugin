<?php
/**
 * Enable Products for Blasti Configurator
 * 
 * This script helps you enable existing WooCommerce products for the configurator
 * and set up their metadata (type, model URL, dimensions, etc.)
 * 
 * USAGE:
 * 1. Upload this file to your plugin directory
 * 2. Access it via: http://yoursite.com/wp-content/plugins/blasti-3d-configurator/enable-products-for-configurator.php
 * 3. Follow the on-screen instructions
 */

// Include WordPress
require_once('../../../wp-config.php');

// Security check - only allow admins
if (!current_user_can('manage_options')) {
    die('Access denied. You must be an administrator to use this tool.');
}

// Check if WooCommerce is active
if (!class_exists('WooCommerce')) {
    die('WooCommerce is not active. Please activate WooCommerce first.');
}

// Handle form submission
$message = '';
$message_type = '';

if (isset($_POST['action']) && $_POST['action'] === 'enable_product') {
    $product_id = intval($_POST['product_id']);
    $product_type = sanitize_text_field($_POST['product_type']);
    $model_url = sanitize_text_field($_POST['model_url']);
    $width = floatval($_POST['width']);
    $height = floatval($_POST['height']);
    $depth = floatval($_POST['depth']);
    
    // Enable product for configurator
    update_post_meta($product_id, '_blasti_configurator_enabled', 'yes');
    update_post_meta($product_id, '_blasti_product_type', $product_type);
    update_post_meta($product_id, '_blasti_model_url', $model_url);
    
    // Set dimensions
    $dimensions = array(
        'width' => $width,
        'height' => $height,
        'depth' => $depth
    );
    update_post_meta($product_id, '_blasti_dimensions', json_encode($dimensions));
    
    $message = 'Product enabled successfully!';
    $message_type = 'success';
}

// Get all WooCommerce products
$args = array(
    'post_type' => 'product',
    'post_status' => 'publish',
    'posts_per_page' => -1,
    'orderby' => 'title',
    'order' => 'ASC'
);

$products = get_posts($args);

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enable Products for Blasti Configurator</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            margin: 0;
            padding: 20px;
            background: #f0f0f1;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #1d2327;
            margin-top: 0;
        }
        
        .info-box {
            background: #e7f3ff;
            border-left: 4px solid #0073aa;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .success-box {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin-bottom: 20px;
            color: #155724;
        }
        
        .product-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .product-table th,
        .product-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .product-table th {
            background: #f9f9f9;
            font-weight: 600;
        }
        
        .product-table tr:hover {
            background: #f9f9f9;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .status-enabled {
            background: #d4edda;
            color: #155724;
        }
        
        .status-disabled {
            background: #f8d7da;
            color: #721c24;
        }
        
        .btn {
            display: inline-block;
            padding: 8px 16px;
            background: #0073aa;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn:hover {
            background: #005a87;
        }
        
        .btn-small {
            padding: 4px 8px;
            font-size: 12px;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background: white;
            margin: 50px auto;
            padding: 30px;
            width: 90%;
            max-width: 600px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .modal-header h2 {
            margin: 0;
        }
        
        .close {
            font-size: 28px;
            font-weight: bold;
            color: #aaa;
            cursor: pointer;
        }
        
        .close:hover {
            color: #000;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
        }
        
        .form-group input,
        .form-group select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-group small {
            display: block;
            margin-top: 5px;
            color: #666;
        }
        
        .dimensions-group {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
        }
        
        .quick-actions {
            margin-bottom: 20px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 4px;
        }
        
        .quick-actions h3 {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Enable Products for Blasti Configurator</h1>
        
        <?php if ($message): ?>
            <div class="<?php echo $message_type === 'success' ? 'success-box' : 'info-box'; ?>">
                <?php echo esc_html($message); ?>
            </div>
        <?php endif; ?>
        
        <div class="info-box">
            <strong>ℹ️ Instructions:</strong>
            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>This tool helps you enable existing WooCommerce products for the 3D configurator</li>
                <li>Click "Configure" next to any product to set it up</li>
                <li>You'll need to specify: Product Type, 3D Model URL, and Dimensions</li>
                <li>Make sure you've uploaded your GLB model files first</li>
            </ul>
        </div>
        
        <div class="quick-actions">
            <h3>Quick Actions</h3>
            <button class="btn" onclick="enableAllAsAccessories()">Enable All as Accessories</button>
            <button class="btn" onclick="window.location.reload()">Refresh Page</button>
            <a href="test-product-retrieval.php" class="btn">Test Product Retrieval</a>
        </div>
        
        <h2>Your WooCommerce Products (<?php echo count($products); ?>)</h2>
        
        <?php if (empty($products)): ?>
            <p><em>No products found. Please create some WooCommerce products first.</em></p>
        <?php else: ?>
            <table class="product-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Product Name</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Type</th>
                        <th>Model URL</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($products as $product_post): 
                        $product = wc_get_product($product_post->ID);
                        $enabled = get_post_meta($product_post->ID, '_blasti_configurator_enabled', true);
                        $product_type = get_post_meta($product_post->ID, '_blasti_product_type', true);
                        $model_url = get_post_meta($product_post->ID, '_blasti_model_url', true);
                        $dimensions = get_post_meta($product_post->ID, '_blasti_dimensions', true);
                    ?>
                        <tr>
                            <td><?php echo $product_post->ID; ?></td>
                            <td><strong><?php echo esc_html($product->get_name()); ?></strong></td>
                            <td><?php echo $product->get_price_html(); ?></td>
                            <td>
                                <?php if ($enabled === 'yes'): ?>
                                    <span class="status-badge status-enabled">✓ Enabled</span>
                                <?php else: ?>
                                    <span class="status-badge status-disabled">✗ Disabled</span>
                                <?php endif; ?>
                            </td>
                            <td><?php echo $product_type ? esc_html($product_type) : '<em>Not set</em>'; ?></td>
                            <td>
                                <?php if ($model_url): ?>
                                    <small><?php echo esc_html(basename($model_url)); ?></small>
                                <?php else: ?>
                                    <em>Not set</em>
                                <?php endif; ?>
                            </td>
                            <td>
                                <button class="btn btn-small" onclick="openConfigModal(<?php echo $product_post->ID; ?>, '<?php echo esc_js($product->get_name()); ?>', '<?php echo esc_js($product_type); ?>', '<?php echo esc_js($model_url); ?>', '<?php echo esc_js($dimensions); ?>')">
                                    Configure
                                </button>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <h3>Next Steps</h3>
            <ol>
                <li>Configure your products using the buttons above</li>
                <li>Upload your GLB model files to <code>/wp-content/uploads/blasti-models/</code></li>
                <li>Test product retrieval using the <a href="test-product-retrieval.php">Test Product Retrieval</a> page</li>
                <li>View your configurator page to see the products</li>
            </ol>
        </div>
    </div>
    
    <!-- Configuration Modal -->
    <div id="configModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Configure Product</h2>
                <span class="close" onclick="closeConfigModal()">&times;</span>
            </div>
            
            <form method="POST" action="">
                <input type="hidden" name="action" value="enable_product">
                <input type="hidden" name="product_id" id="modal_product_id">
                
                <div class="form-group">
                    <label>Product Name</label>
                    <input type="text" id="modal_product_name" disabled>
                </div>
                
                <div class="form-group">
                    <label for="modal_product_type">Product Type *</label>
                    <select name="product_type" id="modal_product_type" required>
                        <option value="">-- Select Type --</option>
                        <option value="pegboard">Pegboard</option>
                        <option value="accessory">Accessory</option>
                    </select>
                    <small>Choose whether this is a pegboard or an accessory</small>
                </div>
                
                <div class="form-group">
                    <label for="modal_model_url">3D Model URL *</label>
                    <input type="text" name="model_url" id="modal_model_url" required placeholder="/wp-content/uploads/blasti-models/your-model.glb">
                    <small>Path to your GLB model file (e.g., /wp-content/uploads/blasti-models/pegboard.glb)</small>
                </div>
                
                <div class="form-group">
                    <label>Dimensions (in meters) *</label>
                    <div class="dimensions-group">
                        <div>
                            <label for="modal_width">Width</label>
                            <input type="number" name="width" id="modal_width" step="0.01" value="1.0" required>
                        </div>
                        <div>
                            <label for="modal_height">Height</label>
                            <input type="number" name="height" id="modal_height" step="0.01" value="0.6" required>
                        </div>
                        <div>
                            <label for="modal_depth">Depth</label>
                            <input type="number" name="depth" id="modal_depth" step="0.01" value="0.02" required>
                        </div>
                    </div>
                    <small>Typical pegboard: 1.0m wide × 0.6m high × 0.02m deep</small>
                </div>
                
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn">Save Configuration</button>
                    <button type="button" class="btn" onclick="closeConfigModal()" style="background: #666;">Cancel</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        function openConfigModal(productId, productName, productType, modelUrl, dimensions) {
            document.getElementById('modal_product_id').value = productId;
            document.getElementById('modal_product_name').value = productName;
            document.getElementById('modal_product_type').value = productType || '';
            document.getElementById('modal_model_url').value = modelUrl || '';
            
            // Parse dimensions if available
            if (dimensions) {
                try {
                    const dims = JSON.parse(dimensions);
                    document.getElementById('modal_width').value = dims.width || 1.0;
                    document.getElementById('modal_height').value = dims.height || 0.6;
                    document.getElementById('modal_depth').value = dims.depth || 0.02;
                } catch (e) {
                    console.error('Error parsing dimensions:', e);
                }
            }
            
            document.getElementById('configModal').style.display = 'block';
        }
        
        function closeConfigModal() {
            document.getElementById('configModal').style.display = 'none';
        }
        
        function enableAllAsAccessories() {
            if (confirm('This will enable ALL products as accessories with default settings. Continue?')) {
                alert('This feature requires additional implementation. Please configure products individually for now.');
            }
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('configModal');
            if (event.target == modal) {
                closeConfigModal();
            }
        }
    </script>
</body>
</html>
