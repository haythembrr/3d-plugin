<?php
/**
 * Debug Products - Quick Diagnostic Tool
 * 
 * This script shows you exactly what's happening with your products
 * and why they might not be showing up in the configurator
 */

// Include WordPress
require_once('../../../wp-config.php');

// Security check
if (!current_user_can('manage_options')) {
    die('Access denied. You must be an administrator.');
}

// Check WooCommerce
if (!class_exists('WooCommerce')) {
    die('WooCommerce is not active.');
}

?>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Debug Products - Blasti Configurator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
        }
        h1 { color: #333; }
        h2 { color: #666; border-bottom: 2px solid #007cba; padding-bottom: 10px; }
        .success { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 10px 0; }
        .error { background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545; margin: 10px 0; }
        .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0; }
        .info { background: #d1ecf1; padding: 15px; border-left: 4px solid #17a2b8; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f9f9f9; font-weight: 600; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-danger { background: #f8d7da; color: #721c24; }
        .badge-warning { background: #fff3cd; color: #856404; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Product Debug Tool</h1>
        <p>This tool shows you exactly what's happening with your products.</p>
        
        <?php
        // Get all WooCommerce products
        $all_products_args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1
        );
        $all_products = get_posts($all_products_args);
        
        echo "<h2>📊 Overview</h2>";
        echo "<div class='info'>";
        echo "<strong>Total WooCommerce Products:</strong> " . count($all_products) . "<br>";
        
        // Count enabled products
        $enabled_count = 0;
        $pegboard_count = 0;
        $accessory_count = 0;
        
        foreach ($all_products as $product_post) {
            $enabled = get_post_meta($product_post->ID, '_blasti_configurator_enabled', true);
            $type = get_post_meta($product_post->ID, '_blasti_product_type', true);
            
            if ($enabled === 'yes') {
                $enabled_count++;
                if ($type === 'pegboard') $pegboard_count++;
                if ($type === 'accessory') $accessory_count++;
            }
        }
        
        echo "<strong>Enabled for Configurator:</strong> " . $enabled_count . "<br>";
        echo "<strong>Pegboards:</strong> " . $pegboard_count . "<br>";
        echo "<strong>Accessories:</strong> " . $accessory_count . "<br>";
        echo "</div>";
        
        if ($enabled_count === 0) {
            echo "<div class='error'>";
            echo "<strong>⚠️ PROBLEM FOUND:</strong> No products are enabled for the configurator!<br><br>";
            echo "<strong>Solution:</strong> Use the <a href='enable-products-for-configurator.php'>Enable Products Tool</a> to configure your products.";
            echo "</div>";
        }
        
        // Show all products with their status
        echo "<h2>📦 All Products</h2>";
        
        if (empty($all_products)) {
            echo "<div class='warning'>No WooCommerce products found. Please create some products first.</div>";
        } else {
            echo "<table>";
            echo "<thead><tr>";
            echo "<th>ID</th>";
            echo "<th>Product Name</th>";
            echo "<th>Enabled?</th>";
            echo "<th>Type</th>";
            echo "<th>Model URL</th>";
            echo "<th>Dimensions</th>";
            echo "<th>Issues</th>";
            echo "</tr></thead>";
            echo "<tbody>";
            
            foreach ($all_products as $product_post) {
                $product = wc_get_product($product_post->ID);
                $enabled = get_post_meta($product_post->ID, '_blasti_configurator_enabled', true);
                $type = get_post_meta($product_post->ID, '_blasti_product_type', true);
                $model_url = get_post_meta($product_post->ID, '_blasti_model_url', true);
                $dimensions = get_post_meta($product_post->ID, '_blasti_dimensions', true);
                
                $issues = array();
                
                // Check for issues
                if ($enabled !== 'yes') {
                    $issues[] = 'Not enabled';
                }
                if (empty($type)) {
                    $issues[] = 'No type set';
                }
                if (empty($model_url)) {
                    $issues[] = 'No model URL';
                }
                if (empty($dimensions)) {
                    $issues[] = 'No dimensions';
                }
                
                echo "<tr>";
                echo "<td>" . $product_post->ID . "</td>";
                echo "<td><strong>" . esc_html($product->get_name()) . "</strong></td>";
                echo "<td>";
                if ($enabled === 'yes') {
                    echo "<span class='badge badge-success'>✓ Yes</span>";
                } else {
                    echo "<span class='badge badge-danger'>✗ No</span>";
                }
                echo "</td>";
                echo "<td>" . ($type ? esc_html($type) : '<em>Not set</em>') . "</td>";
                echo "<td>" . ($model_url ? '<code>' . esc_html(basename($model_url)) . '</code>' : '<em>Not set</em>') . "</td>";
                echo "<td>" . ($dimensions ? '<code>' . esc_html(substr($dimensions, 0, 30)) . '...</code>' : '<em>Not set</em>') . "</td>";
                echo "<td>";
                if (empty($issues)) {
                    echo "<span class='badge badge-success'>✓ OK</span>";
                } else {
                    echo "<span class='badge badge-warning'>" . implode(', ', $issues) . "</span>";
                }
                echo "</td>";
                echo "</tr>";
            }
            
            echo "</tbody></table>";
        }
        
        // Test AJAX endpoint
        echo "<h2>🔌 AJAX Endpoint Test</h2>";
        echo "<div class='info'>";
        echo "<p>Testing the AJAX endpoint that loads products...</p>";
        echo "<button onclick='testAjax()' style='padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;'>Test AJAX Load</button>";
        echo "<div id='ajax-result' style='margin-top: 15px;'></div>";
        echo "</div>";
        
        // Show meta keys for debugging
        echo "<h2>🔧 Product Meta Keys</h2>";
        echo "<div class='info'>";
        echo "<p>These are the meta keys the configurator looks for:</p>";
        echo "<ul>";
        echo "<li><code>_blasti_configurator_enabled</code> - Must be 'yes'</li>";
        echo "<li><code>_blasti_product_type</code> - Must be 'pegboard' or 'accessory'</li>";
        echo "<li><code>_blasti_model_url</code> - Path to GLB file</li>";
        echo "<li><code>_blasti_dimensions</code> - JSON: {\"width\":1.0,\"height\":0.6,\"depth\":0.02}</li>";
        echo "<li><code>_blasti_compatibility</code> - Comma-separated product IDs (optional)</li>";
        echo "</ul>";
        echo "</div>";
        
        // Show sample product data
        if (!empty($all_products)) {
            $sample_product = $all_products[0];
            echo "<h2>📋 Sample Product Data</h2>";
            echo "<p>Here's what the first product looks like:</p>";
            echo "<pre>";
            echo "Product ID: " . $sample_product->ID . "\n";
            echo "Product Name: " . get_the_title($sample_product->ID) . "\n";
            echo "\nMeta Data:\n";
            echo "_blasti_configurator_enabled: " . get_post_meta($sample_product->ID, '_blasti_configurator_enabled', true) . "\n";
            echo "_blasti_product_type: " . get_post_meta($sample_product->ID, '_blasti_product_type', true) . "\n";
            echo "_blasti_model_url: " . get_post_meta($sample_product->ID, '_blasti_model_url', true) . "\n";
            echo "_blasti_dimensions: " . get_post_meta($sample_product->ID, '_blasti_dimensions', true) . "\n";
            echo "_blasti_compatibility: " . get_post_meta($sample_product->ID, '_blasti_compatibility', true) . "\n";
            echo "</pre>";
        }
        
        // Quick fix section
        echo "<h2>🚀 Quick Actions</h2>";
        echo "<div class='info'>";
        echo "<p>Use these tools to fix common issues:</p>";
        echo "<a href='enable-products-for-configurator.php' style='display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px;'>Configure Products</a>";
        echo "<a href='test-product-retrieval.php' style='display: inline-block; padding: 10px 20px; background: #17a2b8; color: white; text-decoration: none; border-radius: 4px;'>Test Product Retrieval</a>";
        echo "</div>";
        
        ?>
    </div>
    
    <script>
        function testAjax() {
            const resultDiv = document.getElementById('ajax-result');
            resultDiv.innerHTML = '<p>Testing AJAX endpoint...</p>';
            
            // Get WordPress AJAX URL
            const ajaxUrl = '<?php echo admin_url('admin-ajax.php'); ?>';
            const nonce = '<?php echo wp_create_nonce('blasti_configurator_nonce'); ?>';
            
            fetch(ajaxUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'blasti_get_products',
                    nonce: nonce
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('AJAX Response:', data);
                
                if (data.success) {
                    const products = data.data.products;
                    resultDiv.innerHTML = `
                        <div style="background: #d4edda; padding: 15px; border-left: 4px solid #28a745;">
                            <strong>✓ AJAX Working!</strong><br>
                            Found ${products.length} products<br>
                            <pre>${JSON.stringify(data.data, null, 2)}</pre>
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <div style="background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545;">
                            <strong>✗ AJAX Error</strong><br>
                            ${data.data || 'Unknown error'}
                        </div>
                    `;
                }
            })
            .catch(error => {
                console.error('AJAX Error:', error);
                resultDiv.innerHTML = `
                    <div style="background: #f8d7da; padding: 15px; border-left: 4px solid #dc3545;">
                        <strong>✗ Request Failed</strong><br>
                        ${error.message}
                    </div>
                `;
            });
        }
    </script>
</body>
</html>
