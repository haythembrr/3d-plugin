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
     * Get products for configurator with optimized queries and caching
     */
    public function get_configurator_products($type = 'all', $include_out_of_stock = false) {
        // Check cache first
        $cache_key = "blasti_products_{$type}_" . ($include_out_of_stock ? 'with_oos' : 'no_oos');
        $cached_products = get_transient($cache_key);
        
        if (false !== $cached_products) {
            return $cached_products;
        }

        // Optimized query with meta_query
        $meta_query = array(
            'relation' => 'AND',
            array(
                'key' => '_blasti_configurator_enabled',
                'value' => 'yes',
                'compare' => '='
            )
        );
        
        // Filter by product type if specified
        if ($type !== 'all') {
            $meta_query[] = array(
                'key' => '_blasti_product_type',
                'value' => $type,
                'compare' => '='
            );
        }

        $args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => $meta_query,
            'fields' => 'ids' // Only get IDs first for better performance
        );
        
        $product_ids = get_posts($args);
        
        if (empty($product_ids)) {
            set_transient($cache_key, array(), HOUR_IN_SECONDS);
            return array();
        }

        // Batch load all meta data to avoid N+1 queries
        $this->preload_product_meta($product_ids);
        
        // Batch load WooCommerce products
        $wc_products = $this->batch_load_wc_products($product_ids);
        
        $product_data = array();

        foreach ($product_ids as $product_id) {
            $product = isset($wc_products[$product_id]) ? $wc_products[$product_id] : null;

            if (!$product) {
                continue;
            }

            // Check stock availability
            if (!$include_out_of_stock && !$product->is_in_stock()) {
                continue;
            }

            // Get pre-loaded meta data
            $dimensions = $this->get_cached_dimensions($product_id);
            $compatibility = $this->get_cached_compatibility($product_id);
            $product_type = get_post_meta($product_id, '_blasti_product_type', true);
            $model_url = get_post_meta($product_id, '_blasti_model_url', true);

            // Get product categories (batch loaded)
            $categories = $this->get_cached_categories($product_id);

            // NEW: Get enhanced fields from cache
            $dimensions_v2 = $this->get_cached_enhanced_field($product_id, '_blasti_dimensions_v2');
            $peg_config = $this->get_cached_enhanced_field($product_id, '_blasti_peg_config');
            $peg_holes = $this->get_cached_enhanced_field($product_id, '_blasti_peg_holes');

            $item_data = array(
                'id' => $product->get_id(),
                'name' => $product->get_name(),
                'description' => $product->get_short_description(),
                'price' => floatval($product->get_price()),
                'formatted_price' => $product->get_price_html(),
                'type' => $product_type,
                'model_url' => $model_url,
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

            // NEW: Add enhanced fields if available
            if ($dimensions_v2 !== null) {
                $item_data['dimensions_v2'] = $dimensions_v2;
            }

            if ($peg_config !== null) {
                $item_data['peg_config'] = $peg_config;
            }

            if ($peg_holes !== null) {
                $item_data['peg_holes'] = $peg_holes;
            }

            $product_data[] = $item_data;
        }
        
        // Sort products by type and name
        usort($product_data, array($this, 'sort_products'));
        
        // Cache the results for 1 hour
        set_transient($cache_key, $product_data, HOUR_IN_SECONDS);
        
        return $product_data;
    }

    /**
     * Preload product meta data to avoid N+1 queries
     */
    private function preload_product_meta($product_ids) {
        if (empty($product_ids)) return;

        global $wpdb;

        // Batch load all meta data for these products
        $meta_keys = array(
            '_blasti_dimensions',
            '_blasti_compatibility',
            '_blasti_product_type',
            '_blasti_model_url',
            // NEW: Enhanced meta fields
            '_blasti_dimensions_v2',
            '_blasti_peg_config',
            '_blasti_peg_holes'
        );

        $placeholders = implode(',', array_fill(0, count($product_ids), '%d'));
        $meta_keys_placeholders = implode(',', array_fill(0, count($meta_keys), '%s'));

        $query = $wpdb->prepare("
            SELECT post_id, meta_key, meta_value
            FROM {$wpdb->postmeta}
            WHERE post_id IN ($placeholders)
            AND meta_key IN ($meta_keys_placeholders)
        ", array_merge($product_ids, $meta_keys));

        $results = $wpdb->get_results($query);

        // Cache results in wp_cache for this request
        foreach ($results as $row) {
            wp_cache_set("meta_{$row->post_id}_{$row->meta_key}", $row->meta_value, 'blasti_meta');
        }

        // Batch load categories
        $this->preload_product_categories($product_ids);
    }

    /**
     * Preload product categories to avoid N+1 queries
     */
    private function preload_product_categories($product_ids) {
        if (empty($product_ids)) return;

        // Batch load all category relationships
        $terms = wp_get_object_terms($product_ids, 'product_cat', array(
            'fields' => 'all'
        ));
        
        // Group by product ID
        $categories_by_product = array();
        foreach ($terms as $term) {
            if (!isset($categories_by_product[$term->object_id])) {
                $categories_by_product[$term->object_id] = array();
            }
            $categories_by_product[$term->object_id][] = $term->name;
        }
        
        // Cache in wp_cache
        foreach ($product_ids as $product_id) {
            $categories = isset($categories_by_product[$product_id]) ? $categories_by_product[$product_id] : array();
            wp_cache_set("categories_{$product_id}", $categories, 'blasti_categories');
        }
    }

    /**
     * Batch load WooCommerce products
     */
    private function batch_load_wc_products($product_ids) {
        $products = array();
        
        foreach ($product_ids as $product_id) {
            $product = wc_get_product($product_id);
            if ($product) {
                $products[$product_id] = $product;
            }
        }
        
        return $products;
    }

    /**
     * Get cached dimensions with fallback
     */
    private function get_cached_dimensions($product_id) {
        $dimensions_json = wp_cache_get("meta_{$product_id}__blasti_dimensions", 'blasti_meta');
        if (false === $dimensions_json) {
            $dimensions_json = get_post_meta($product_id, '_blasti_dimensions', true);
        }
        return $this->parse_dimensions($dimensions_json);
    }

    /**
     * Get cached compatibility with fallback
     */
    private function get_cached_compatibility($product_id) {
        $compatibility_raw = wp_cache_get("meta_{$product_id}__blasti_compatibility", 'blasti_meta');
        if (false === $compatibility_raw) {
            $compatibility_raw = get_post_meta($product_id, '_blasti_compatibility', true);
        }
        return $this->parse_compatibility($compatibility_raw);
    }

    /**
     * Get cached categories with fallback
     */
    private function get_cached_categories($product_id) {
        $categories = wp_cache_get("categories_{$product_id}", 'blasti_categories');
        if (false === $categories) {
            $categories = wp_get_post_terms($product_id, 'product_cat', array('fields' => 'names'));
        }
        return is_array($categories) ? $categories : array();
    }

    /**
     * Get cached enhanced field with fallback (JSON decoded)
     * NEW: Helper for Phase 1 enhanced fields
     */
    private function get_cached_enhanced_field($product_id, $meta_key) {
        $value_json = wp_cache_get("meta_{$product_id}_{$meta_key}", 'blasti_meta');
        if (false === $value_json) {
            $value_json = get_post_meta($product_id, $meta_key, true);
        }

        if (empty($value_json)) {
            return null;
        }

        $decoded = json_decode($value_json, true);
        return (json_last_error() === JSON_ERROR_NONE) ? $decoded : null;
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

        // NEW: Get enhanced data fields
        $dimensions_v2_json = get_post_meta($product_id, '_blasti_dimensions_v2', true);
        $dimensions_v2 = !empty($dimensions_v2_json) ? json_decode($dimensions_v2_json, true) : null;

        $peg_config_json = get_post_meta($product_id, '_blasti_peg_config', true);
        $peg_config = !empty($peg_config_json) ? json_decode($peg_config_json, true) : null;

        $peg_holes_json = get_post_meta($product_id, '_blasti_peg_holes', true);
        $peg_holes = !empty($peg_holes_json) ? json_decode($peg_holes_json, true) : null;

        $product_data = array(
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

        // NEW: Add enhanced fields if available
        if ($dimensions_v2 !== null) {
            $product_data['dimensions_v2'] = $dimensions_v2;
        }

        if ($peg_config !== null) {
            $product_data['peg_config'] = $peg_config;
        }

        if ($peg_holes !== null) {
            $product_data['peg_holes'] = $peg_holes;
        }

        return $product_data;
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
                '' => __('Select type...', 'blasti-configurator'),
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

        // Dimensions (legacy)
        woocommerce_wp_text_input(array(
            'id' => '_blasti_dimensions',
            'label' => __('Dimensions (JSON - Legacy)', 'blasti-configurator'),
            'description' => __('Legacy format: {"width": 1.0, "height": 1.0, "depth": 0.1}', 'blasti-configurator')
        ));

        // Compatibility
        woocommerce_wp_textarea_input(array(
            'id' => '_blasti_compatibility',
            'label' => __('Compatible Products', 'blasti-configurator'),
            'description' => __('Comma-separated list of compatible product IDs', 'blasti-configurator')
        ));

        echo '</div>'; // End basic fields group

        // NEW: Enhanced Configuration Fields
        echo '<div class="options_group blasti-enhanced-config">';
        echo '<h4>' . __('Enhanced Configuration (Phase 1)', 'blasti-configurator') . '</h4>';

        // Enhanced Dimensions v2
        $dimensions_v2_value = get_post_meta($post->ID, '_blasti_dimensions_v2', true);
        $dimensions_v2_placeholder = json_encode(array(
            'version' => '2.0',
            'dimensions' => array(
                'width' => 0.22,
                'height' => 0.44,
                'depth' => 0.02
            ),
            'pegHoleGrid' => array(
                'pattern' => 'uniform',
                'spacing' => 0.0254,
                'diameter' => 0.0064,
                'depth' => 0.015,
                'rows' => 17,
                'cols' => 8
            ),
            'geometry' => array(
                'frontFaceNormal' => array('x' => 0, 'y' => 0, 'z' => 1),
                'initialRotation' => array('x' => 0, 'y' => 0, 'z' => 0)
            )
        ), JSON_PRETTY_PRINT);

        woocommerce_wp_textarea_input(array(
            'id' => '_blasti_dimensions_v2',
            'label' => __('Enhanced Dimensions (v2)', 'blasti-configurator'),
            'description' => __('Enhanced dimensions with peg hole grid data (for pegboards). See TECHNICAL_PLAN.md for schema.', 'blasti-configurator'),
            'placeholder' => $dimensions_v2_placeholder,
            'value' => $dimensions_v2_value,
            'style' => 'width: 100%; height: 200px; font-family: monospace; font-size: 12px;'
        ));

        // Peg Configuration (for accessories)
        $peg_config_value = get_post_meta($post->ID, '_blasti_peg_config', true);
        $peg_config_placeholder = json_encode(array(
            'pegCount' => 2,
            'pegs' => array(
                array(
                    'id' => 'peg_0',
                    'localPosition' => array('x' => 0, 'y' => 0.0254, 'z' => 0),
                    'diameter' => 0.006,
                    'length' => 0.012,
                    'insertionDirection' => array('x' => 0, 'y' => 0, 'z' => -1)
                ),
                array(
                    'id' => 'peg_1',
                    'localPosition' => array('x' => 0, 'y' => -0.0254, 'z' => 0),
                    'diameter' => 0.006,
                    'length' => 0.012,
                    'insertionDirection' => array('x' => 0, 'y' => 0, 'z' => -1)
                )
            ),
            'mounting' => array(
                'surface' => 'back',
                'surfaceOffset' => 0.002,
                'flushOffset' => 0.001,
                'requiresAllPegs' => true,
                'allowableRotations' => array(0)
            )
        ), JSON_PRETTY_PRINT);

        echo '<p class="form-field _blasti_peg_config_field">';
        echo '<label for="_blasti_peg_config">' . __('Peg Configuration (Accessories)', 'blasti-configurator') . '</label>';
        echo '<textarea id="_blasti_peg_config" name="_blasti_peg_config" style="width: 100%; height: 250px; font-family: monospace; font-size: 12px;" placeholder="' . esc_attr($peg_config_placeholder) . '">' . esc_textarea($peg_config_value) . '</textarea>';
        echo '<span class="description">' . __('Peg configuration for accessories. Defines peg positions, dimensions, and mounting requirements. See SETUP_GUIDE.md for details.', 'blasti-configurator') . '</span>';
        echo '</p>';

        // Peg Holes (for pegboards - actual hole positions)
        $peg_holes_value = get_post_meta($post->ID, '_blasti_peg_holes', true);
        $peg_holes_placeholder = json_encode(array(
            array('x' => 0, 'y' => 0, 'z' => 0),
            array('x' => 0.0254, 'y' => 0, 'z' => 0),
            array('x' => 0.0508, 'y' => 0, 'z' => 0)
        ), JSON_PRETTY_PRINT);

        echo '<p class="form-field _blasti_peg_holes_field">';
        echo '<label for="_blasti_peg_holes">' . __('Peg Hole Positions (Pegboards)', 'blasti-configurator') . '</label>';
        echo '<textarea id="_blasti_peg_holes" name="_blasti_peg_holes" style="width: 100%; height: 150px; font-family: monospace; font-size: 12px;" placeholder="' . esc_attr($peg_holes_placeholder) . '">' . esc_textarea($peg_holes_value) . '</textarea>';
        echo '<span class="description">' . __('Actual peg hole positions for pegboards (JSON array). Can be auto-generated from Enhanced Dimensions grid or manually specified.', 'blasti-configurator') . '</span>';
        echo '</p>';

        echo '</div>'; // End enhanced config group

        // Add JavaScript to show/hide fields based on product type
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            var $productType = $('#_blasti_product_type');
            var $pegConfig = $('._blasti_peg_config_field').closest('p');
            var $pegHoles = $('._blasti_peg_holes_field').closest('p');
            var $dimensionsV2 = $('#_blasti_dimensions_v2').closest('p');

            function toggleFieldsByType() {
                var type = $productType.val();

                if (type === 'accessory') {
                    // Accessories: show peg config, hide peg holes and enhanced dimensions
                    $pegConfig.show();
                    $pegHoles.hide();
                    $dimensionsV2.hide();
                } else if (type === 'pegboard') {
                    // Pegboards: show enhanced dimensions and peg holes, hide peg config
                    $pegConfig.hide();
                    $pegHoles.show();
                    $dimensionsV2.show();
                } else {
                    // No type selected: hide all enhanced fields
                    $pegConfig.hide();
                    $pegHoles.hide();
                    $dimensionsV2.hide();
                }
            }

            // Initial state
            toggleFieldsByType();

            // On change
            $productType.on('change', toggleFieldsByType);
        });
        </script>
        <?php
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

        // Save dimensions (legacy)
        if (isset($_POST['_blasti_dimensions'])) {
            update_post_meta($post_id, '_blasti_dimensions', sanitize_text_field($_POST['_blasti_dimensions']));
        }

        // Save compatibility
        if (isset($_POST['_blasti_compatibility'])) {
            update_post_meta($post_id, '_blasti_compatibility', sanitize_text_field($_POST['_blasti_compatibility']));
        }

        // NEW: Save enhanced dimensions v2
        if (isset($_POST['_blasti_dimensions_v2'])) {
            $dimensions_v2 = wp_unslash($_POST['_blasti_dimensions_v2']);

            // Validate JSON
            $decoded = json_decode($dimensions_v2, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                update_post_meta($post_id, '_blasti_dimensions_v2', $dimensions_v2);
            } else {
                // Store error for admin notice
                add_settings_error(
                    'blasti_configurator',
                    'invalid_dimensions_v2',
                    __('Invalid enhanced dimensions JSON. Please check the format.', 'blasti-configurator'),
                    'error'
                );
            }
        }

        // NEW: Save peg configuration for accessories
        if (isset($_POST['_blasti_peg_config'])) {
            $peg_config = wp_unslash($_POST['_blasti_peg_config']);

            // Validate JSON
            $decoded = json_decode($peg_config, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                // Additional validation for peg config structure
                if (isset($decoded['pegCount']) && isset($decoded['pegs']) && is_array($decoded['pegs'])) {
                    update_post_meta($post_id, '_blasti_peg_config', $peg_config);
                } else {
                    add_settings_error(
                        'blasti_configurator',
                        'invalid_peg_config_structure',
                        __('Peg configuration must include "pegCount" and "pegs" array.', 'blasti-configurator'),
                        'error'
                    );
                }
            } else {
                add_settings_error(
                    'blasti_configurator',
                    'invalid_peg_config',
                    __('Invalid peg configuration JSON. Please check the format.', 'blasti-configurator'),
                    'error'
                );
            }
        }

        // NEW: Save peg holes data for pegboards
        if (isset($_POST['_blasti_peg_holes'])) {
            $peg_holes = wp_unslash($_POST['_blasti_peg_holes']);

            // Validate JSON
            $decoded = json_decode($peg_holes, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                update_post_meta($post_id, '_blasti_peg_holes', $peg_holes);
            } else {
                add_settings_error(
                    'blasti_configurator',
                    'invalid_peg_holes',
                    __('Invalid peg holes JSON. Must be a valid JSON array.', 'blasti-configurator'),
                    'error'
                );
            }
        }

        // Clear product cache when product is updated
        $this->clear_product_cache();
    }
    
    /**
     * Clear product cache
     */
    public function clear_product_cache() {
        // Clear all product cache variants
        $cache_keys = array(
            'blasti_products_all_with_oos',
            'blasti_products_all_no_oos',
            'blasti_products_pegboard_with_oos',
            'blasti_products_pegboard_no_oos',
            'blasti_products_accessory_with_oos',
            'blasti_products_accessory_no_oos'
        );
        
        foreach ($cache_keys as $key) {
            delete_transient($key);
        }
        
        // Clear wp_cache groups
        wp_cache_flush_group('blasti_meta');
        wp_cache_flush_group('blasti_categories');
        
        error_log('Blasti Configurator: Product cache cleared');
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