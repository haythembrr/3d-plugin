<?php
/**
 * Test file for product data retrieval functionality
 * This file can be used to test the WooCommerce integration
 */

// Include WordPress
require_once('../../wp-config.php');

// Check if WooCommerce is active
if (!class_exists('WooCommerce')) {
    die('WooCommerce is not active. Please activate WooCommerce to test this functionality.');
}

// Include the plugin files
require_once('includes/class-woocommerce.php');

// Get WooCommerce integration instance
$wc_integration = Blasti_Configurator_WooCommerce::get_instance();

echo "<h1>Blasti Configurator - Product Data Retrieval Test</h1>\n";

// Test 1: Get all configurator products
echo "<h2>Test 1: Get All Configurator Products</h2>\n";
$all_products = $wc_integration->get_configurator_products();
echo "<p>Found " . count($all_products) . " products enabled for configurator.</p>\n";

if (!empty($all_products)) {
    echo "<ul>\n";
    foreach ($all_products as $product) {
        echo "<li>{$product['name']} (ID: {$product['id']}, Type: {$product['type']}, Price: {$product['formatted_price']})</li>\n";
    }
    echo "</ul>\n";
} else {
    echo "<p><em>No products found. Make sure you have WooCommerce products with the '_blasti_configurator_enabled' meta field set to 'yes'.</em></p>\n";
}

// Test 2: Get pegboards only
echo "<h2>Test 2: Get Pegboards Only</h2>\n";
$pegboards = $wc_integration->get_pegboards();
echo "<p>Found " . count($pegboards) . " pegboards.</p>\n";

if (!empty($pegboards)) {
    echo "<ul>\n";
    foreach ($pegboards as $pegboard) {
        echo "<li>{$pegboard['name']} - Dimensions: " . json_encode($pegboard['dimensions']) . "</li>\n";
    }
    echo "</ul>\n";
}

// Test 3: Get accessories only
echo "<h2>Test 3: Get Accessories Only</h2>\n";
$accessories = $wc_integration->get_accessories();
echo "<p>Found " . count($accessories) . " accessories.</p>\n";

if (!empty($accessories)) {
    echo "<ul>\n";
    foreach ($accessories as $accessory) {
        echo "<li>{$accessory['name']} - Categories: " . implode(', ', $accessory['categories']) . "</li>\n";
    }
    echo "</ul>\n";
}

// Test 4: Test compatibility checking (if we have products)
if (!empty($pegboards) && !empty($accessories)) {
    echo "<h2>Test 4: Compatibility Testing</h2>\n";
    $pegboard = $pegboards[0];
    $accessory = $accessories[0];
    
    $is_compatible = $wc_integration->is_compatible($accessory['id'], $pegboard['id']);
    echo "<p>Compatibility between '{$accessory['name']}' and '{$pegboard['name']}': " . ($is_compatible ? 'Compatible' : 'Not Compatible') . "</p>\n";
    
    // Test getting compatible accessories for the first pegboard
    $compatible_accessories = $wc_integration->get_compatible_accessories($pegboard['id']);
    echo "<p>Found " . count($compatible_accessories) . " accessories compatible with '{$pegboard['name']}'.</p>\n";
}

// Test 5: Test product validation
if (!empty($all_products)) {
    echo "<h2>Test 5: Product Validation</h2>\n";
    $test_product = $all_products[0];
    $validation_result = $wc_integration->validate_product_data($test_product['id']);
    
    echo "<p>Validation for '{$test_product['name']}':</p>\n";
    echo "<ul>\n";
    echo "<li>Valid: " . ($validation_result['valid'] ? 'Yes' : 'No') . "</li>\n";
    if (!empty($validation_result['errors'])) {
        echo "<li>Errors: " . implode(', ', $validation_result['errors']) . "</li>\n";
    }
    echo "</ul>\n";
}

echo "<h2>Test Complete</h2>\n";
echo "<p>All product data retrieval functions have been tested. Check the output above for results.</p>\n";
?>