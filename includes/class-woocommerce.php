<?php
/**
 * WooCommerce integration
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Blasti_Configurator_WooCommerce {
    
    /**
     * Single instance
     */
    private static $instance = null;
    
    /**
     * Get single instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor
     */
    private function __construct() {
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // AJAX handlers for cart operations
        add_action('wp_ajax_blasti_add_to_cart', array($this, 'ajax_add_to_cart'));
        add_action('wp_ajax_nopriv_blasti_add_to_cart', array($this, 'ajax_add_to_cart'));
        
        // AJAX handlers for product data
        add_action('wp_ajax_blasti_get_products', array($this, 'ajax_get_products'));
        add_action('wp_ajax_nopriv_blasti_get_products', array($this, 'ajax_get_products'));
        
        // AJAX handler for getting single product
        add_action('wp_ajax_blasti_get_product', array($this, 'ajax_get_product'));
        add_action('wp_ajax_nopriv_blasti_get_product', array($this, 'ajax_get_product'));
        
        // AJAX handler for checking compatibility
        add_action('wp_ajax_blasti_check_compatibility', array($this, 'ajax_check_compatibility'));
        add_action('wp_ajax_nopriv_blasti_check_compatibility', array($this, 'ajax_check_compatibility'));
        
        // AJAX handler for validating product data
        add_action('wp_ajax_blasti_validate_product', array($this, 'ajax_validate_product'));
        add_action('wp_ajax_nopriv_blasti_validate_product', array($this, 'ajax_validate_product'));
        
        // AJAX handler for validating cart configuration
        add_action('wp_ajax_blasti_validate_cart_config', array($this, 'ajax_validate_cart_config'));
        add_action('wp_ajax_nopriv_blasti_validate_cart_config', array($this, 'ajax_validate_cart_config'));
        
        // AJAX handler for getting cart status
        add_action('wp_ajax_blasti_get_cart_status', array($this, 'ajax_get_cart_status'));
        add_action('wp_ajax_nopriv_blasti_get_cart_status', array($this, 'ajax_get_cart_status'));
        
        // AJAX handler for price calculation
        add_action('wp_ajax_blasti_calculate_price', array($this, 'ajax_calculate_price'));
        add_action('wp_ajax_nopriv_blasti_calculate_price', array($this, 'ajax_calculate_price'));
        
        // AJAX handler for getting product prices
        add_action('wp_ajax_blasti_get_product_prices', array($this, 'ajax_get_product_prices'));
        add_action('wp_ajax_nopriv_blasti_get_product_prices', array($this, 'ajax_get_product_prices'));
        
        // Add custom fields to WooCommerce products
        add_action('woocommerce_product_options_general_product_data', array($this, 'add_product_fields'));
        add_action('woocommerce_process_product_meta', array($this, 'save_product_fields'));
    }
    
    /**
     * AJAX handler for adding items to cart
     * Requirements: 6.1, 6.2, 6.3, 6.5
     */
    public function ajax_add_to_cart() {
        try {
            // Verify nonce for security
            if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
                wp_send_json_error(array(
                    'message' => __('Security check failed', 'blasti-configurator'),
                    'code' => 'SECURITY_ERROR'
                ));
            }
            
            // Check if WooCommerce is active
            if (!class_exists('WooCommerce') || !function_exists('WC')) {
                wp_send_json_error(array(
                    'message' => __('WooCommerce is not available', 'blasti-configurator'),
                    'code' => 'WOOCOMMERCE_UNAVAILABLE'
                ));
            }
            
            // Get and validate configuration data
            $configuration = $this->validate_cart_request($_POST);
            
            if (is_wp_error($configuration)) {
                wp_send_json_error(array(
                    'message' => $configuration->get_error_message(),
                    'code' => $configuration->get_error_code(),
                    'validation_errors' => $configuration->get_error_data()
                ));
            }
            
            // Add items to cart with comprehensive validation
            $result = $this->add_configuration_to_cart($configuration);
            
            if ($result['success']) {
                wp_send_json_success($result);
            } else {
                wp_send_json_error(array(
                    'message' => $result['message'],
                    'code' => $result['code'] ?? 'CART_ERROR',
                    'details' => $result['details'] ?? array()
                ));
            }
            
        } catch (Exception $e) {
            error_log('Blasti Configurator Cart Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('An unexpected error occurred. Please try again.', 'blasti-configurator'),
                'code' => 'UNEXPECTED_ERROR'
            ));
        }
    }
    
    /**
     * AJAX handler for getting product data
     */
    public function ajax_get_products() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
            wp_die(__('Security check failed', 'blasti-configurator'));
        }
        
        $product_type = isset($_POST['product_type']) ? sanitize_text_field($_POST['product_type']) : 'all';
        $include_out_of_stock = isset($_POST['include_out_of_stock']) ? (bool) $_POST['include_out_of_stock'] : false;
        $pegboard_id = isset($_POST['pegboard_id']) ? intval($_POST['pegboard_id']) : 0;
        
        // Handle different request types
        if ($pegboard_id > 0 && $product_type === 'accessory') {
            // Get accessories compatible with specific pegboard
            $products = $this->get_compatible_accessories($pegboard_id, $include_out_of_stock);
        } else {
            // Get all products of specified type
            $products = $this->get_configurator_products($product_type, $include_out_of_stock);
        }
        
        wp_send_json_success(array(
            'products' => $products,
            'total_count' => count($products),
            'filters_applied' => array(
                'type' => $product_type,
                'include_out_of_stock' => $include_out_of_stock,
                'pegboard_id' => $pegboard_id
            )
        ));
    }
    
    /**
     * Validate cart request data
     * Requirements: 6.1, 6.2
     */
    private function validate_cart_request($request_data) {
        $errors = array();
        
        // Extract configuration data
        $configuration = array();
        
        // Handle different input formats
        if (isset($request_data['configuration'])) {
            // JSON format
            $config_json = stripslashes($request_data['configuration']);
            $configuration = json_decode($config_json, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                return new WP_Error('INVALID_JSON', __('Invalid configuration format', 'blasti-configurator'));
            }
        } else {
            // Individual parameters format
            if (isset($request_data['pegboard_id'])) {
                $configuration['pegboard_id'] = intval($request_data['pegboard_id']);
            }
            
            if (isset($request_data['accessories'])) {
                $configuration['accessories'] = $request_data['accessories'];
            }
        }
        
        // Validate pegboard
        if (empty($configuration['pegboard_id'])) {
            $errors['pegboard'] = __('Please select a pegboard', 'blasti-configurator');
        } else {
            $pegboard_validation = $this->validate_product_for_cart($configuration['pegboard_id'], 'pegboard');
            if (is_wp_error($pegboard_validation)) {
                $errors['pegboard'] = $pegboard_validation->get_error_message();
            }
        }
        
        // Validate accessories
        if (isset($configuration['accessories']) && is_array($configuration['accessories'])) {
            $accessory_errors = array();
            
            foreach ($configuration['accessories'] as $index => $accessory) {
                if (!isset($accessory['id']) || empty($accessory['id'])) {
                    $accessory_errors[$index] = __('Invalid accessory ID', 'blasti-configurator');
                    continue;
                }
                
                $accessory_id = intval($accessory['id']);
                $accessory_validation = $this->validate_product_for_cart($accessory_id, 'accessory');
                
                if (is_wp_error($accessory_validation)) {
                    $accessory_errors[$index] = $accessory_validation->get_error_message();
                }
                
                // Validate compatibility if pegboard is selected
                if (!empty($configuration['pegboard_id'])) {
                    if (!$this->is_compatible($accessory_id, $configuration['pegboard_id'])) {
                        $accessory_errors[$index] = sprintf(
                            __('Accessory "%s" is not compatible with selected pegboard', 'blasti-configurator'),
                            get_the_title($accessory_id)
                        );
                    }
                }
            }
            
            if (!empty($accessory_errors)) {
                $errors['accessories'] = $accessory_errors;
            }
        }
        
        // Check for errors
        if (!empty($errors)) {
            return new WP_Error('VALIDATION_FAILED', __('Configuration validation failed', 'blasti-configurator'), $errors);
        }
        
        return $configuration;
    }
    
    /**
     * Validate individual product for cart addition
     * Requirements: 6.2
     */
    private function validate_product_for_cart($product_id, $expected_type = null) {
        // Check if product exists
        $product = wc_get_product($product_id);
        if (!$product) {
            return new WP_Error('PRODUCT_NOT_FOUND', sprintf(
                __('Product with ID %d not found', 'blasti-configurator'),
                $product_id
            ));
        }
        
        // Check if product is published
        if ($product->get_status() !== 'publish') {
            return new WP_Error('PRODUCT_UNAVAILABLE', sprintf(
                __('Product "%s" is not available', 'blasti-configurator'),
                $product->get_name()
            ));
        }
        
        // Check if product is enabled for configurator
        $enabled = get_post_meta($product_id, '_blasti_configurator_enabled', true);
        if ($enabled !== 'yes') {
            return new WP_Error('PRODUCT_NOT_ENABLED', sprintf(
                __('Product "%s" is not available in configurator', 'blasti-configurator'),
                $product->get_name()
            ));
        }
        
        // Check product type if specified
        if ($expected_type) {
            $product_type = get_post_meta($product_id, '_blasti_product_type', true);
            if ($product_type !== $expected_type) {
                return new WP_Error('INVALID_PRODUCT_TYPE', sprintf(
                    __('Product "%s" is not a %s', 'blasti-configurator'),
                    $product->get_name(),
                    $expected_type
                ));
            }
        }
        
        // Check stock availability
        if (!$product->is_in_stock()) {
            return new WP_Error('OUT_OF_STOCK', sprintf(
                __('Product "%s" is out of stock', 'blasti-configurator'),
                $product->get_name()
            ));
        }
        
        // Check if product can be purchased
        if (!$product->is_purchasable()) {
            return new WP_Error('NOT_PURCHASABLE', sprintf(
                __('Product "%s" cannot be purchased', 'blasti-configurator'),
                $product->get_name()
            ));
        }
        
        return true;
    }
    
    /**
     * Add configuration to WooCommerce cart with enhanced validation and error handling
     * Requirements: 6.1, 6.2, 6.3, 6.5
     */
    public function add_configuration_to_cart($configuration) {
        try {
            // Clear any previous cart errors
            wc_clear_notices();
            
            $cart_items = array();
            $added_products = array();
            $total_price = 0;
            
            // Add pegboard to cart first
            if (isset($configuration['pegboard_id'])) {
                $pegboard_id = intval($configuration['pegboard_id']);
                
                // Double-check pegboard before adding
                $pegboard_validation = $this->validate_product_for_cart($pegboard_id, 'pegboard');
                if (is_wp_error($pegboard_validation)) {
                    throw new Exception($pegboard_validation->get_error_message());
                }
                
                $cart_item_key = WC()->cart->add_to_cart($pegboard_id, 1);
                
                if (!$cart_item_key) {
                    // Get WooCommerce notices for more specific error
                    $notices = wc_get_notices('error');
                    $error_message = !empty($notices) ? $notices[0]['notice'] : __('Failed to add pegboard to cart', 'blasti-configurator');
                    throw new Exception($error_message);
                }
                
                $cart_items[] = $cart_item_key;
                $pegboard = wc_get_product($pegboard_id);
                $added_products[] = array(
                    'id' => $pegboard_id,
                    'name' => $pegboard->get_name(),
                    'price' => $pegboard->get_price(),
                    'type' => 'pegboard'
                );
                $total_price += floatval($pegboard->get_price());
            }
            
            // Add accessories to cart
            if (isset($configuration['accessories']) && is_array($configuration['accessories'])) {
                $accessory_count = 0;
                $max_accessories = get_option('blasti_configurator_max_accessories_per_pegboard', 50);
                
                foreach ($configuration['accessories'] as $accessory_data) {
                    if (!isset($accessory_data['id'])) {
                        continue;
                    }
                    
                    $accessory_id = intval($accessory_data['id']);
                    
                    // Check accessory limit
                    if ($accessory_count >= $max_accessories) {
                        throw new Exception(sprintf(
                            __('Maximum of %d accessories allowed per pegboard', 'blasti-configurator'),
                            $max_accessories
                        ));
                    }
                    
                    // Validate accessory
                    $accessory_validation = $this->validate_product_for_cart($accessory_id, 'accessory');
                    if (is_wp_error($accessory_validation)) {
                        throw new Exception($accessory_validation->get_error_message());
                    }
                    
                    // Add to cart
                    $cart_item_key = WC()->cart->add_to_cart($accessory_id, 1);
                    
                    if (!$cart_item_key) {
                        $notices = wc_get_notices('error');
                        $error_message = !empty($notices) ? $notices[0]['notice'] : sprintf(
                            __('Failed to add accessory "%s" to cart', 'blasti-configurator'),
                            get_the_title($accessory_id)
                        );
                        throw new Exception($error_message);
                    }
                    
                    $cart_items[] = $cart_item_key;
                    $accessory = wc_get_product($accessory_id);
                    $added_products[] = array(
                        'id' => $accessory_id,
                        'name' => $accessory->get_name(),
                        'price' => $accessory->get_price(),
                        'type' => 'accessory',
                        'position' => $accessory_data['position'] ?? null
                    );
                    $total_price += floatval($accessory->get_price());
                    $accessory_count++;
                }
            }
            
            // Calculate cart totals
            WC()->cart->calculate_totals();
            
            // Get cart URL with proper filters applied
            $cart_url = apply_filters('blasti_configurator_cart_redirect_url', wc_get_cart_url());
            
            // Prepare success response
            $response = array(
                'success' => true,
                'message' => sprintf(
                    __('Configuration added to cart successfully! %d items added.', 'blasti-configurator'),
                    count($cart_items)
                ),
                'cart_url' => $cart_url,
                'cart_items' => $cart_items,
                'added_products' => $added_products,
                'total_price' => $total_price,
                'cart_total' => WC()->cart->get_cart_total(),
                'cart_count' => WC()->cart->get_cart_contents_count(),
                'redirect_delay' => apply_filters('blasti_configurator_redirect_delay', 1500) // 1.5 seconds
            );
            
            // Allow other plugins to modify the response
            return apply_filters('blasti_configurator_cart_success_response', $response, $configuration);
            
        } catch (Exception $e) {
            // Log the error for debugging
            error_log('Blasti Configurator Cart Addition Error: ' . $e->getMessage());
            
            return array(
                'success' => false,
                'message' => $e->getMessage(),
                'code' => 'CART_ADDITION_FAILED',
                'details' => array(
                    'configuration' => $configuration,
                    'cart_contents_count' => WC()->cart ? WC()->cart->get_cart_contents_count() : 0
                )
            );
        }
    }
    
    /**
     * Get products for configurator with enhanced filtering and metadata
     */
    public function get_configurator_products($type = 'all', $include_out_of_stock = false) {
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
        
        // Filter by product type if specified
        if ($type !== 'all') {
            $args['meta_query'][] = array(
                'key' => '_blasti_product_type',
                'value' => $type,
                'compare' => '='
            );
        }
        
        $products = get_posts($args);
        $product_data = array();
        
        foreach ($products as $product_post) {
            $product = wc_get_product($product_post->ID);
            
            if (!$product) {
                continue;
            }
            
            // Check stock availability
            if (!$include_out_of_stock && !$product->is_in_stock()) {
                continue;
            }
            
            // Get and parse dimensions
            $dimensions_json = get_post_meta($product->get_id(), '_blasti_dimensions', true);
            $dimensions = $this->parse_dimensions($dimensions_json);
            
            // Get and parse compatibility
            $compatibility_raw = get_post_meta($product->get_id(), '_blasti_compatibility', true);
            $compatibility = $this->parse_compatibility($compatibility_raw);
            
            // Get product category for accessories
            $categories = wp_get_post_terms($product->get_id(), 'product_cat', array('fields' => 'names'));
            
            $product_data[] = array(
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'description' => $product->get_short_description(),
                'price' => floatval($product->get_price()),
                'formatted_price' => $product->get_price_html(),
                'type' => get_post_meta($product->get_id(), '_blasti_product_type', true),
                'model_url' => get_post_meta($product->get_id(), '_blasti_model_url', true),
                'dimensions' => $dimensions,
                'compatibility' => $compatibility,
                'categories' => $categories,
                'image_url' => wp_get_attachment_image_url($product->get_image_id(), 'medium'),
                'thumbnail_url' => wp_get_attachment_image_url($product->get_image_id(), 'thumbnail'),
                'in_stock' => $product->is_in_stock(),
                'stock_quantity' => $product->get_stock_quantity(),
                'sku' => $product->get_sku(),
                'weight' => $product->get_weight(),
                'featured' => $product->is_featured(),
                'date_created' => $product->get_date_created()->date('Y-m-d H:i:s')
            );
        }
        
        // Sort products by type and name
        usort($product_data, array($this, 'sort_products'));
        
        return $product_data;
    }
    
    /**
     * Get pegboards specifically
     */
    public function get_pegboards($include_out_of_stock = false) {
        return $this->get_configurator_products('pegboard', $include_out_of_stock);
    }
    
    /**
     * Get accessories specifically
     */
    public function get_accessories($include_out_of_stock = false) {
        return $this->get_configurator_products('accessory', $include_out_of_stock);
    }
    
    /**
     * Get accessories compatible with a specific pegboard
     */
    public function get_compatible_accessories($pegboard_id, $include_out_of_stock = false) {
        $accessories = $this->get_accessories($include_out_of_stock);
        $compatible_accessories = array();
        
        foreach ($accessories as $accessory) {
            if ($this->is_compatible($accessory['id'], $pegboard_id)) {
                $compatible_accessories[] = $accessory;
            }
        }
        
        return $compatible_accessories;
    }
    
    /**
     * Check if two products are compatible
     */
    public function is_compatible($accessory_id, $pegboard_id) {
        $accessory_compatibility = get_post_meta($accessory_id, '_blasti_compatibility', true);
        $pegboard_compatibility = get_post_meta($pegboard_id, '_blasti_compatibility', true);
        
        $accessory_compatible_ids = $this->parse_compatibility($accessory_compatibility);
        $pegboard_compatible_ids = $this->parse_compatibility($pegboard_compatibility);
        
        // Check if accessory is compatible with pegboard
        if (in_array($pegboard_id, $accessory_compatible_ids)) {
            return true;
        }
        
        // Check if pegboard is compatible with accessory
        if (in_array($accessory_id, $pegboard_compatible_ids)) {
            return true;
        }
        
        // If no specific compatibility is set, assume compatible
        if (empty($accessory_compatible_ids) && empty($pegboard_compatible_ids)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Parse dimensions JSON string
     */
    private function parse_dimensions($dimensions_json) {
        if (empty($dimensions_json)) {
            return array(
                'width' => 1.0,
                'height' => 1.0,
                'depth' => 0.1
            );
        }
        
        $dimensions = json_decode($dimensions_json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return array(
                'width' => 1.0,
                'height' => 1.0,
                'depth' => 0.1
            );
        }
        
        // Ensure all required dimensions are present
        $dimensions = wp_parse_args($dimensions, array(
            'width' => 1.0,
            'height' => 1.0,
            'depth' => 0.1
        ));
        
        // Convert to floats
        $dimensions['width'] = floatval($dimensions['width']);
        $dimensions['height'] = floatval($dimensions['height']);
        $dimensions['depth'] = floatval($dimensions['depth']);
        
        return $dimensions;
    }
    
    /**
     * Parse compatibility string into array of IDs
     */
    private function parse_compatibility($compatibility_raw) {
        if (empty($compatibility_raw)) {
            return array();
        }
        
        // Split by comma and clean up
        $ids = explode(',', $compatibility_raw);
        $clean_ids = array();
        
        foreach ($ids as $id) {
            $clean_id = intval(trim($id));
            if ($clean_id > 0) {
                $clean_ids[] = $clean_id;
            }
        }
        
        return $clean_ids;
    }
    
    /**
     * Sort products for consistent ordering
     */
    private function sort_products($a, $b) {
        // First sort by type (pegboards first)
        if ($a['type'] !== $b['type']) {
            if ($a['type'] === 'pegboard') return -1;
            if ($b['type'] === 'pegboard') return 1;
        }
        
        // Then sort by featured status
        if ($a['featured'] !== $b['featured']) {
            return $b['featured'] ? 1 : -1;
        }
        
        // Finally sort by name
        return strcmp($a['name'], $b['name']);
    }
    
    /**
     * Get product by ID with configurator metadata
     */
    public function get_product_by_id($product_id) {
        $product = wc_get_product($product_id);
        
        if (!$product) {
            return null;
        }
        
        // Check if product is enabled for configurator
        $enabled = get_post_meta($product_id, '_blasti_configurator_enabled', true);
        if ($enabled !== 'yes') {
            return null;
        }
        
        $dimensions_json = get_post_meta($product_id, '_blasti_dimensions', true);
        $dimensions = $this->parse_dimensions($dimensions_json);
        
        $compatibility_raw = get_post_meta($product_id, '_blasti_compatibility', true);
        $compatibility = $this->parse_compatibility($compatibility_raw);
        
        $categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'names'));
        
        return array(
            'id' => $product->get_id(),
            'name' => $product->get_name(),
            'description' => $product->get_short_description(),
            'price' => floatval($product->get_price()),
            'formatted_price' => $product->get_price_html(),
            'type' => get_post_meta($product_id, '_blasti_product_type', true),
            'model_url' => get_post_meta($product_id, '_blasti_model_url', true),
            'dimensions' => $dimensions,
            'compatibility' => $compatibility,
            'categories' => $categories,
            'image_url' => wp_get_attachment_image_url($product->get_image_id(), 'medium'),
            'thumbnail_url' => wp_get_attachment_image_url($product->get_image_id(), 'thumbnail'),
            'in_stock' => $product->is_in_stock(),
            'stock_quantity' => $product->get_stock_quantity(),
            'sku' => $product->get_sku(),
            'weight' => $product->get_weight(),
            'featured' => $product->is_featured(),
            'date_created' => $product->get_date_created()->date('Y-m-d H:i:s')
        );
    }
    
    /**
     * Validate product data for configurator use
     */
    public function validate_product_data($product_id) {
        $product = $this->get_product_by_id($product_id);
        
        if (!$product) {
            return array(
                'valid' => false,
                'errors' => array('Product not found or not enabled for configurator')
            );
        }
        
        $errors = array();
        
        // Check required fields
        if (empty($product['type'])) {
            $errors[] = 'Product type not set';
        }
        
        if (empty($product['model_url'])) {
            $errors[] = '3D model URL not set';
        }
        
        if (empty($product['dimensions']) || 
            !isset($product['dimensions']['width']) || 
            !isset($product['dimensions']['height']) || 
            !isset($product['dimensions']['depth'])) {
            $errors[] = 'Product dimensions not properly configured';
        }
        
        return array(
            'valid' => empty($errors),
            'errors' => $errors,
            'product' => $product
        );
    }
    
    /**
     * Add custom fields to WooCommerce product data
     */
    public function add_product_fields() {
        global $post;
        
        echo '<div class="options_group">';
        
        // Enable configurator checkbox
        woocommerce_wp_checkbox(array(
            'id' => '_blasti_configurator_enabled',
            'label' => __('Enable in Configurator', 'blasti-configurator'),
            'description' => __('Check this to make the product available in the 3D configurator', 'blasti-configurator')
        ));
        
        // Product type select
        woocommerce_wp_select(array(
            'id' => '_blasti_product_type',
            'label' => __('Product Type', 'blasti-configurator'),
            'options' => array(
                'pegboard' => __('Pegboard', 'blasti-configurator'),
                'accessory' => __('Accessory', 'blasti-configurator')
            )
        ));
        
        // 3D Model URL
        woocommerce_wp_text_input(array(
            'id' => '_blasti_model_url',
            'label' => __('3D Model URL', 'blasti-configurator'),
            'description' => __('URL to the GLB/GLTF 3D model file', 'blasti-configurator'),
            'type' => 'url'
        ));
        
        // Dimensions
        woocommerce_wp_text_input(array(
            'id' => '_blasti_dimensions',
            'label' => __('Dimensions (JSON)', 'blasti-configurator'),
            'description' => __('Product dimensions in JSON format: {"width": 1.0, "height": 1.0, "depth": 0.1}', 'blasti-configurator')
        ));
        
        // Compatibility
        woocommerce_wp_textarea_input(array(
            'id' => '_blasti_compatibility',
            'label' => __('Compatible Products', 'blasti-configurator'),
            'description' => __('Comma-separated list of compatible product IDs', 'blasti-configurator')
        ));
        
        echo '</div>';
    }
    
    /**
     * Save custom product fields
     */
    public function save_product_fields($post_id) {
        // Save configurator enabled
        $enabled = isset($_POST['_blasti_configurator_enabled']) ? 'yes' : 'no';
        update_post_meta($post_id, '_blasti_configurator_enabled', $enabled);
        
        // Save product type
        if (isset($_POST['_blasti_product_type'])) {
            update_post_meta($post_id, '_blasti_product_type', sanitize_text_field($_POST['_blasti_product_type']));
        }
        
        // Save model URL
        if (isset($_POST['_blasti_model_url'])) {
            update_post_meta($post_id, '_blasti_model_url', esc_url_raw($_POST['_blasti_model_url']));
        }
        
        // Save dimensions
        if (isset($_POST['_blasti_dimensions'])) {
            update_post_meta($post_id, '_blasti_dimensions', sanitize_text_field($_POST['_blasti_dimensions']));
        }
        
        // Save compatibility
        if (isset($_POST['_blasti_compatibility'])) {
            update_post_meta($post_id, '_blasti_compatibility', sanitize_text_field($_POST['_blasti_compatibility']));
        }
    }
    
    /**
     * AJAX handler for getting single product data
     */
    public function ajax_get_product() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
            wp_die(__('Security check failed', 'blasti-configurator'));
        }
        
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        if ($product_id <= 0) {
            wp_send_json_error(__('Invalid product ID', 'blasti-configurator'));
        }
        
        $product = $this->get_product_by_id($product_id);
        
        if (!$product) {
            wp_send_json_error(__('Product not found or not available in configurator', 'blasti-configurator'));
        }
        
        wp_send_json_success($product);
    }
    
    /**
     * AJAX handler for checking product compatibility
     */
    public function ajax_check_compatibility() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
            wp_die(__('Security check failed', 'blasti-configurator'));
        }
        
        $accessory_id = isset($_POST['accessory_id']) ? intval($_POST['accessory_id']) : 0;
        $pegboard_id = isset($_POST['pegboard_id']) ? intval($_POST['pegboard_id']) : 0;
        
        if ($accessory_id <= 0 || $pegboard_id <= 0) {
            wp_send_json_error(__('Invalid product IDs', 'blasti-configurator'));
        }
        
        $is_compatible = $this->is_compatible($accessory_id, $pegboard_id);
        
        wp_send_json_success(array(
            'compatible' => $is_compatible,
            'accessory_id' => $accessory_id,
            'pegboard_id' => $pegboard_id
        ));
    }
    
    /**
     * AJAX handler for validating product data
     */
    public function ajax_validate_product() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
            wp_die(__('Security check failed', 'blasti-configurator'));
        }
        
        $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
        
        if ($product_id <= 0) {
            wp_send_json_error(__('Invalid product ID', 'blasti-configurator'));
        }
        
        $validation_result = $this->validate_product_data($product_id);
        
        if ($validation_result['valid']) {
            wp_send_json_success($validation_result);
        } else {
            wp_send_json_error($validation_result);
        }
    }
    
    /**
     * AJAX handler for validating cart configuration before adding to cart
     * Requirements: 6.2
     */
    public function ajax_validate_cart_config() {
        try {
            // Verify nonce
            if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
                wp_send_json_error(array(
                    'message' => __('Security check failed', 'blasti-configurator'),
                    'code' => 'SECURITY_ERROR'
                ));
            }
            
            // Validate configuration
            $configuration = $this->validate_cart_request($_POST);
            
            if (is_wp_error($configuration)) {
                wp_send_json_error(array(
                    'message' => $configuration->get_error_message(),
                    'code' => $configuration->get_error_code(),
                    'validation_errors' => $configuration->get_error_data()
                ));
            }
            
            // Calculate total price for validation
            $total_price = 0;
            $product_details = array();
            
            // Get pegboard details
            if (isset($configuration['pegboard_id'])) {
                $pegboard = wc_get_product($configuration['pegboard_id']);
                if ($pegboard) {
                    $total_price += floatval($pegboard->get_price());
                    $product_details['pegboard'] = array(
                        'id' => $pegboard->get_id(),
                        'name' => $pegboard->get_name(),
                        'price' => $pegboard->get_price(),
                        'formatted_price' => $pegboard->get_price_html()
                    );
                }
            }
            
            // Get accessory details
            if (isset($configuration['accessories']) && is_array($configuration['accessories'])) {
                $product_details['accessories'] = array();
                foreach ($configuration['accessories'] as $accessory_data) {
                    if (isset($accessory_data['id'])) {
                        $accessory = wc_get_product($accessory_data['id']);
                        if ($accessory) {
                            $total_price += floatval($accessory->get_price());
                            $product_details['accessories'][] = array(
                                'id' => $accessory->get_id(),
                                'name' => $accessory->get_name(),
                                'price' => $accessory->get_price(),
                                'formatted_price' => $accessory->get_price_html()
                            );
                        }
                    }
                }
            }
            
            wp_send_json_success(array(
                'valid' => true,
                'message' => __('Configuration is valid and ready to add to cart', 'blasti-configurator'),
                'total_price' => $total_price,
                'formatted_total' => wc_price($total_price),
                'product_details' => $product_details,
                'item_count' => 1 + (isset($configuration['accessories']) ? count($configuration['accessories']) : 0)
            ));
            
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => __('Validation failed', 'blasti-configurator'),
                'code' => 'VALIDATION_ERROR',
                'details' => $e->getMessage()
            ));
        }
    }
    
    /**
     * AJAX handler for getting current cart status
     * Requirements: 6.3
     */
    public function ajax_get_cart_status() {
        try {
            // Verify nonce
            if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
                wp_send_json_error(array(
                    'message' => __('Security check failed', 'blasti-configurator'),
                    'code' => 'SECURITY_ERROR'
                ));
            }
            
            // Check if WooCommerce is available
            if (!class_exists('WooCommerce') || !function_exists('WC')) {
                wp_send_json_error(array(
                    'message' => __('WooCommerce is not available', 'blasti-configurator'),
                    'code' => 'WOOCOMMERCE_UNAVAILABLE'
                ));
            }
            
            $cart = WC()->cart;
            
            wp_send_json_success(array(
                'cart_count' => $cart->get_cart_contents_count(),
                'cart_total' => $cart->get_cart_total(),
                'cart_subtotal' => $cart->get_cart_subtotal(),
                'cart_url' => wc_get_cart_url(),
                'checkout_url' => wc_get_checkout_url(),
                'is_empty' => $cart->is_empty(),
                'needs_shipping' => $cart->needs_shipping(),
                'cart_hash' => $cart->get_cart_hash()
            ));
            
        } catch (Exception $e) {
            wp_send_json_error(array(
                'message' => __('Failed to get cart status', 'blasti-configurator'),
                'code' => 'CART_STATUS_ERROR',
                'details' => $e->getMessage()
            ));
        }
    }
    
    /**
     * AJAX handler for calculating configuration price
     * Requirements: 7.1, 7.2, 7.5
     */
    public function ajax_calculate_price() {
        try {
            // Verify nonce
            if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
                wp_send_json_error(array(
                    'message' => __('Security check failed', 'blasti-configurator'),
                    'code' => 'SECURITY_ERROR'
                ));
            }
            
            // Get configuration data
            $pegboard_id = isset($_POST['pegboard_id']) ? intval($_POST['pegboard_id']) : 0;
            $accessory_ids = isset($_POST['accessory_ids']) ? array_map('intval', $_POST['accessory_ids']) : array();
            
            // Calculate price
            $price_data = $this->calculate_configuration_price($pegboard_id, $accessory_ids);
            
            if (is_wp_error($price_data)) {
                wp_send_json_error(array(
                    'message' => $price_data->get_error_message(),
                    'code' => $price_data->get_error_code()
                ));
            }
            
            wp_send_json_success($price_data);
            
        } catch (Exception $e) {
            error_log('Blasti Configurator Price Calculation Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('Failed to calculate price', 'blasti-configurator'),
                'code' => 'PRICE_CALCULATION_ERROR'
            ));
        }
    }
    
    /**
     * AJAX handler for getting product prices
     * Requirements: 7.5
     */
    public function ajax_get_product_prices() {
        try {
            // Verify nonce
            if (!wp_verify_nonce($_POST['nonce'], 'blasti_configurator_nonce')) {
                wp_send_json_error(array(
                    'message' => __('Security check failed', 'blasti-configurator'),
                    'code' => 'SECURITY_ERROR'
                ));
            }
            
            $product_ids = isset($_POST['product_ids']) ? array_map('intval', $_POST['product_ids']) : array();
            
            if (empty($product_ids)) {
                wp_send_json_error(array(
                    'message' => __('No product IDs provided', 'blasti-configurator'),
                    'code' => 'MISSING_PRODUCT_IDS'
                ));
            }
            
            $prices = $this->get_product_prices($product_ids);
            
            wp_send_json_success(array(
                'prices' => $prices,
                'currency_symbol' => get_woocommerce_currency_symbol(),
                'currency_code' => get_woocommerce_currency(),
                'price_format' => get_woocommerce_price_format(),
                'decimal_separator' => wc_get_price_decimal_separator(),
                'thousand_separator' => wc_get_price_thousand_separator(),
                'decimals' => wc_get_price_decimals()
            ));
            
        } catch (Exception $e) {
            error_log('Blasti Configurator Get Prices Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('Failed to get product prices', 'blasti-configurator'),
                'code' => 'GET_PRICES_ERROR'
            ));
        }
    }
    
    /**
     * Calculate total price for a configuration
     * Requirements: 7.1, 7.2, 7.5
     */
    public function calculate_configuration_price($pegboard_id = 0, $accessory_ids = array()) {
        $price_breakdown = array(
            'pegboard' => null,
            'accessories' => array(),
            'subtotal' => 0,
            'total' => 0,
            'currency_symbol' => get_woocommerce_currency_symbol(),
            'currency_code' => get_woocommerce_currency(),
            'formatted_total' => '',
            'formatted_subtotal' => ''
        );
        
        // Calculate pegboard price
        if ($pegboard_id > 0) {
            $pegboard = wc_get_product($pegboard_id);
            
            if (!$pegboard) {
                return new WP_Error('INVALID_PEGBOARD', __('Invalid pegboard selected', 'blasti-configurator'));
            }
            
            // Validate pegboard is enabled for configurator
            $enabled = get_post_meta($pegboard_id, '_blasti_configurator_enabled', true);
            if ($enabled !== 'yes') {
                return new WP_Error('PEGBOARD_NOT_ENABLED', __('Selected pegboard is not available', 'blasti-configurator'));
            }
            
            $pegboard_price = floatval($pegboard->get_price());
            $price_breakdown['pegboard'] = array(
                'id' => $pegboard_id,
                'name' => $pegboard->get_name(),
                'price' => $pegboard_price,
                'formatted_price' => wc_price($pegboard_price),
                'sku' => $pegboard->get_sku(),
                'in_stock' => $pegboard->is_in_stock()
            );
            
            $price_breakdown['subtotal'] += $pegboard_price;
        }
        
        // Calculate accessory prices
        if (!empty($accessory_ids)) {
            foreach ($accessory_ids as $accessory_id) {
                $accessory = wc_get_product($accessory_id);
                
                if (!$accessory) {
                    continue; // Skip invalid accessories
                }
                
                // Validate accessory is enabled for configurator
                $enabled = get_post_meta($accessory_id, '_blasti_configurator_enabled', true);
                if ($enabled !== 'yes') {
                    continue; // Skip disabled accessories
                }
                
                $accessory_price = floatval($accessory->get_price());
                $price_breakdown['accessories'][] = array(
                    'id' => $accessory_id,
                    'name' => $accessory->get_name(),
                    'price' => $accessory_price,
                    'formatted_price' => wc_price($accessory_price),
                    'sku' => $accessory->get_sku(),
                    'in_stock' => $accessory->is_in_stock()
                );
                
                $price_breakdown['subtotal'] += $accessory_price;
            }
        }
        
        // Calculate total (same as subtotal for now, but allows for future tax/discount calculations)
        $price_breakdown['total'] = $price_breakdown['subtotal'];
        
        // Format totals
        $price_breakdown['formatted_total'] = wc_price($price_breakdown['total']);
        $price_breakdown['formatted_subtotal'] = wc_price($price_breakdown['subtotal']);
        
        return $price_breakdown;
    }
    
    /**
     * Get prices for multiple products
     * Requirements: 7.5
     */
    public function get_product_prices($product_ids) {
        $prices = array();
        
        foreach ($product_ids as $product_id) {
            $product = wc_get_product($product_id);
            
            if (!$product) {
                continue;
            }
            
            $price = floatval($product->get_price());
            $prices[$product_id] = array(
                'id' => $product_id,
                'price' => $price,
                'formatted_price' => wc_price($price),
                'regular_price' => floatval($product->get_regular_price()),
                'sale_price' => $product->is_on_sale() ? floatval($product->get_sale_price()) : null,
                'formatted_regular_price' => wc_price($product->get_regular_price()),
                'formatted_sale_price' => $product->is_on_sale() ? wc_price($product->get_sale_price()) : null,
                'is_on_sale' => $product->is_on_sale(),
                'in_stock' => $product->is_in_stock(),
                'currency_symbol' => get_woocommerce_currency_symbol()
            );
        }
        
        return $prices;
    }
    
    /**
     * Get current WooCommerce price for a single product
     * Requirements: 7.5
     */
    public function get_product_price($product_id) {
        $product = wc_get_product($product_id);
        
        if (!$product) {
            return 0;
        }
        
        return floatval($product->get_price());
    }
    
    /**
     * Format price according to WooCommerce settings
     * Requirements: 7.1, 7.2
     */
    public function format_price($price) {
        return wc_price($price);
    }
}