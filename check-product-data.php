<?php
/**
 * Debug script to check product data
 * Access this file directly in your browser to see product configuration
 */

// Load WordPress
require_once('../../../wp-load.php');

// Check if user is admin
if (!current_user_can('manage_options')) {
    die('Access denied. You must be an administrator.');
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Blasti Configurator - Product Data Check</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        .error { color: red; font-weight: bold; }
        .success { color: green; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Blasti Configurator - Product Data Check</h1>
    
    <?php
    // Get all products with configurator enabled
    $args = array(
        'post_type' => 'product',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'meta_query' => array(
            array(
                'key' => '_blasti_configurator_enabled',
                'value' => 'yes',
                'compare' => '='
            )
        )
    );
    
    $products = get_posts($args);
    
    if (empty($products)) {
        echo '<p class="error">No products found with configurator enabled!</p>';
        echo '<p>Please enable products for the configurator in the admin panel.</p>';
    } else {
        echo '<p class="success">Found ' . count($products) . ' products enabled for configurator</p>';
        
        echo '<table>';
        echo '<tr>';
        echo '<th>ID</th>';
        echo '<th>Name</th>';
        echo '<th>Type</th>';
        echo '<th>Model URL</th>';
        echo '<th>Dimensions</th>';
        echo '<th>Status</th>';
        echo '</tr>';
        
        foreach ($products as $product_post) {
            $product_id = $product_post->ID;
            $product = wc_get_product($product_id);
            
            $type = get_post_meta($product_id, '_blasti_product_type', true);
            $model_url = get_post_meta($product_id, '_blasti_model_url', true);
            $dimensions = get_post_meta($product_id, '_blasti_dimensions', true);
            
            $issues = array();
            if (empty($type)) $issues[] = 'No type';
            if (empty($model_url)) $issues[] = 'No model URL';
            if (empty($dimensions)) $issues[] = 'No dimensions';
            
            $status_class = empty($issues) ? 'success' : 'error';
            $status_text = empty($issues) ? '✓ OK' : '✗ ' . implode(', ', $issues);
            
            echo '<tr>';
            echo '<td>' . $product_id . '</td>';
            echo '<td>' . esc_html($product->get_name()) . '</td>';
            echo '<td>' . ($type ? esc_html($type) : '<span class="error">Not set</span>') . '</td>';
            echo '<td>' . ($model_url ? '<code>' . esc_html($model_url) . '</code>' : '<span class="error">Not set</span>') . '</td>';
            echo '<td>' . ($dimensions ? '<code>' . esc_html($dimensions) . '</code>' : '<span class="error">Not set</span>') . '</td>';
            echo '<td class="' . $status_class . '">' . $status_text . '</td>';
            echo '</tr>';
        }
        
        echo '</table>';
        
        // Show detailed data for first product
        if (!empty($products)) {
            $first_product = $products[0];
            echo '<h2>Detailed Data for Product: ' . esc_html($first_product->post_title) . '</h2>';
            echo '<pre>';
            echo 'Product ID: ' . $first_product->ID . "\n";
            echo '_blasti_configurator_enabled: ' . get_post_meta($first_product->ID, '_blasti_configurator_enabled', true) . "\n";
            echo '_blasti_product_type: ' . get_post_meta($first_product->ID, '_blasti_product_type', true) . "\n";
            echo '_blasti_model_url: ' . get_post_meta($first_product->ID, '_blasti_model_url', true) . "\n";
            echo '_blasti_dimensions: ' . get_post_meta($first_product->ID, '_blasti_dimensions', true) . "\n";
            echo '_blasti_compatibility: ' . get_post_meta($first_product->ID, '_blasti_compatibility', true) . "\n";
            echo '</pre>';
        }
    }
    ?>
    
    <h2>How to Fix</h2>
    <ol>
        <li>Go to WordPress Admin → Blasti Configurator → Enable Products</li>
        <li>Click "Configure" on each product</li>
        <li>Set the following:
            <ul>
                <li><strong>Product Type:</strong> pegboard or accessory</li>
                <li><strong>3D Model URL:</strong> Path to your GLB file (e.g., /wp-content/uploads/blasti-models/pegboard.glb)</li>
                <li><strong>Dimensions:</strong> Width, Height, Depth in meters</li>
            </ul>
        </li>
        <li>Save the configuration</li>
    </ol>
    
    <p><a href="<?php echo admin_url('admin.php?page=blasti-configurator-products'); ?>">Go to Enable Products Page</a></p>
</body>
</html>
