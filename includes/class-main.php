<?php
/**
 * Main plugin functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Blasti_Configurator_Main {
    
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
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        
        // Initialize plugin functionality
        add_action('init', array($this, 'init'));
        
        // Add theme integration hooks
        add_action('wp_head', array($this, 'add_theme_integration_styles'));
        add_action('body_class', array($this, 'add_body_classes'));
        
        // AJAX hooks for frontend functionality
        add_action('wp_ajax_blasti_get_products', array($this, 'ajax_get_products'));
        add_action('wp_ajax_nopriv_blasti_get_products', array($this, 'ajax_get_products'));
        add_action('wp_ajax_blasti_add_to_cart', array($this, 'ajax_add_to_cart'));
        add_action('wp_ajax_nopriv_blasti_add_to_cart', array($this, 'ajax_add_to_cart'));
        add_action('wp_ajax_blasti_validate_cart_config', array($this, 'ajax_validate_cart_config'));
        add_action('wp_ajax_nopriv_blasti_validate_cart_config', array($this, 'ajax_validate_cart_config'));
        add_action('wp_ajax_blasti_get_cart_status', array($this, 'ajax_get_cart_status'));
        add_action('wp_ajax_nopriv_blasti_get_cart_status', array($this, 'ajax_get_cart_status'));
    }
    
    /**
     * Initialize plugin functionality
     */
    public function init() {
        // Register settings
        $this->register_settings();
        
        // Initialize theme integration
        $this->init_theme_integration();
        
        // Register post types, taxonomies, etc. if needed
        // This will be expanded in later tasks
    }
    
    /**
     * Register plugin settings
     */
    private function register_settings() {
        // Register settings for plugin options
        register_setting('blasti_configurator_settings', 'blasti_configurator_enable_mobile_optimization');
        register_setting('blasti_configurator_settings', 'blasti_configurator_enable_analytics');
        register_setting('blasti_configurator_settings', 'blasti_configurator_cache_3d_models');
        register_setting('blasti_configurator_settings', 'blasti_configurator_max_accessories_per_pegboard');
        register_setting('blasti_configurator_settings', 'blasti_configurator_theme_integration');
        register_setting('blasti_configurator_settings', 'blasti_configurator_menu_position');
        register_setting('blasti_configurator_settings', 'blasti_configurator_page_template');
    }
    
    /**
     * Initialize theme integration
     * Requirement 11.1: Ensure configurator uses same styling as rest of website
     */
    private function init_theme_integration() {
        if (!get_option('blasti_configurator_theme_integration', true)) {
            return;
        }
        
        // Add theme compatibility filters
        add_filter('body_class', array($this, 'add_configurator_body_class'));
        add_filter('post_class', array($this, 'add_configurator_post_class'));
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function enqueue_scripts() {
        // Only load on configurator page
        if (!$this->is_configurator_page()) {
            return;
        }
        
        // Enqueue Three.js
        wp_enqueue_script(
            'threejs',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/three.min.js',
            array(),
            BLASTI_CONFIGURATOR_VERSION,
            true
        );
        
        // Enqueue OrbitControls for Three.js
        wp_enqueue_script(
            'threejs-orbit-controls',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/OrbitControls.js',
            array('threejs'),
            BLASTI_CONFIGURATOR_VERSION,
            true
        );
        
        // Enqueue GLTFLoader for Three.js
        wp_enqueue_script(
            'threejs-gltf-loader',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/GLTFLoader.js',
            array('threejs'),
            BLASTI_CONFIGURATOR_VERSION,
            true
        );
        
        // Enqueue configurator script
        wp_enqueue_script(
            'blasti-configurator',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/configurator.js',
            array('jquery', 'threejs', 'threejs-orbit-controls', 'threejs-gltf-loader'),
            BLASTI_CONFIGURATOR_VERSION,
            true
        );
        
        // Enqueue configurator styles with theme integration
        $style_dependencies = array();
        if (get_option('blasti_configurator_theme_integration', true)) {
            // Add theme stylesheet as dependency to inherit styling
            $style_dependencies[] = get_template() . '-style';
        }
        
        wp_enqueue_style(
            'blasti-configurator',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/css/configurator.css',
            $style_dependencies,
            BLASTI_CONFIGURATOR_VERSION
        );
        
        // Add mobile-specific styles if mobile optimization is enabled
        if (get_option('blasti_configurator_enable_mobile_optimization', true)) {
            wp_enqueue_style(
                'blasti-configurator-mobile',
                BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/css/configurator-mobile.css',
                array('blasti-configurator'),
                BLASTI_CONFIGURATOR_VERSION,
                'screen and (max-width: 768px)'
            );
        }
        
        // Localize script with AJAX URL and nonce
        wp_localize_script('blasti-configurator', 'blastiConfigurator', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('blasti_configurator_nonce'),
            'pluginUrl' => BLASTI_CONFIGURATOR_PLUGIN_URL,
            'modelsUrl' => BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/models/',
            'settings' => array(
                'mobileOptimization' => get_option('blasti_configurator_enable_mobile_optimization', true),
                'cacheModels' => get_option('blasti_configurator_cache_3d_models', true),
                'maxAccessories' => get_option('blasti_configurator_max_accessories_per_pegboard', 50),
                'themeIntegration' => get_option('blasti_configurator_theme_integration', true)
            ),
            'strings' => array(
                'loading' => __('Loading...', 'blasti-configurator'),
                'error' => __('An error occurred. Please try again.', 'blasti-configurator'),
                'selectPegboard' => __('Please select a pegboard first.', 'blasti-configurator'),
                'addToCart' => __('Add to Cart', 'blasti-configurator'),
                'addToCartSuccess' => __('Items added to cart successfully!', 'blasti-configurator'),
                'addToCartError' => __('Failed to add items to cart. Please try again.', 'blasti-configurator'),
                'maxAccessoriesReached' => __('Maximum number of accessories reached.', 'blasti-configurator'),
                'invalidPlacement' => __('Cannot place accessory at this position.', 'blasti-configurator'),
                'loadingModel' => __('Loading 3D model...', 'blasti-configurator'),
                'subtotal' => __('Subtotal', 'blasti-configurator'),
                'priceError' => __('Price Error', 'blasti-configurator'),
                'noPegboardSelected' => __('No pegboard selected', 'blasti-configurator'),
                'noAccessoriesPlaced' => __('No accessories placed', 'blasti-configurator')
            )
        ));
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_scripts($hook) {
        // Only load on plugin admin pages
        if (strpos($hook, 'blasti-configurator') === false) {
            return;
        }
        
        // Enqueue admin script
        wp_enqueue_script(
            'blasti-configurator-admin',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            BLASTI_CONFIGURATOR_VERSION,
            true
        );
        
        // Enqueue admin styles
        wp_enqueue_style(
            'blasti-configurator-admin',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            BLASTI_CONFIGURATOR_VERSION
        );
        
        // Localize admin script
        wp_localize_script('blasti-configurator-admin', 'blastiConfiguratorAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('blasti_configurator_admin_nonce')
        ));
    }
    
    /**
     * Check if current page is the configurator page
     */
    private function is_configurator_page() {
        global $post;
        
        $configurator_page_id = get_option('blasti_configurator_configurator_page_id', 0);
        
        // Check if it's the dedicated configurator page
        if (is_page($configurator_page_id)) {
            return true;
        }
        
        // Check if current post/page contains the shortcode
        if ($post && has_shortcode($post->post_content, 'blasti_configurator')) {
            return true;
        }
        
        // Check if any widget contains the shortcode (for widget areas)
        if (is_active_sidebar('sidebar-1') || is_active_sidebar('footer-1')) {
            // This is a simplified check - in a real implementation you might want to
            // check widget content more thoroughly
            return apply_filters('blasti_configurator_force_load_assets', false);
        }
        
        return false;
    }
    
    /**
     * Add theme integration styles to head
     * Requirement 11.1: Ensure configurator uses same styling as rest of website
     */
    public function add_theme_integration_styles() {
        if (!$this->is_configurator_page() || !get_option('blasti_configurator_theme_integration', true)) {
            return;
        }
        
        ?>
        <style type="text/css">
        /* Theme integration styles */
        .blasti-configurator-container {
            font-family: inherit;
            color: inherit;
            line-height: inherit;
        }
        
        .blasti-configurator-container h1,
        .blasti-configurator-container h2,
        .blasti-configurator-container h3 {
            font-family: inherit;
            font-weight: inherit;
            color: inherit;
        }
        
        .blasti-configurator-container button {
            font-family: inherit;
        }
        
        .blasti-configurator-container .btn-primary {
            background-color: var(--theme-primary-color, #007cba);
            border-color: var(--theme-primary-color, #007cba);
        }
        </style>
        <?php
    }
    
    /**
     * Add body classes for configurator page
     */
    public function add_body_classes($classes) {
        if ($this->is_configurator_page()) {
            $classes[] = 'blasti-configurator-page';
            
            if (wp_is_mobile()) {
                $classes[] = 'blasti-configurator-mobile';
            }
        }
        
        return $classes;
    }
    
    /**
     * Add configurator-specific body class
     */
    public function add_configurator_body_class($classes) {
        if ($this->is_configurator_page()) {
            $classes[] = 'blasti-configurator-active';
        }
        return $classes;
    }
    
    /**
     * Add configurator-specific post class
     */
    public function add_configurator_post_class($classes) {
        if ($this->is_configurator_page()) {
            $classes[] = 'configurator-content';
        }
        return $classes;
    }
    
    /**
     * AJAX handler to get products - delegates to WooCommerce integration
     */
    public function ajax_get_products() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            wp_send_json_error(__('WooCommerce is required for this functionality', 'blasti-configurator'));
        }
        
        // Delegate to WooCommerce integration
        $woocommerce_integration = Blasti_Configurator_WooCommerce::get_instance();
        $woocommerce_integration->ajax_get_products();
    }
    
    /**
     * AJAX handler to add items to cart - delegates to WooCommerce integration
     */
    public function ajax_add_to_cart() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            wp_send_json_error(__('WooCommerce is required for this functionality', 'blasti-configurator'));
        }
        
        // Delegate to WooCommerce integration
        $woocommerce_integration = Blasti_Configurator_WooCommerce::get_instance();
        $woocommerce_integration->ajax_add_to_cart();
    }
    
    /**
     * AJAX handler to validate cart configuration - delegates to WooCommerce integration
     */
    public function ajax_validate_cart_config() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            wp_send_json_error(__('WooCommerce is required for this functionality', 'blasti-configurator'));
        }
        
        // Delegate to WooCommerce integration
        $woocommerce_integration = Blasti_Configurator_WooCommerce::get_instance();
        $woocommerce_integration->ajax_validate_cart_config();
    }
    
    /**
     * AJAX handler to get cart status - delegates to WooCommerce integration
     */
    public function ajax_get_cart_status() {
        // Check if WooCommerce is active
        if (!class_exists('WooCommerce')) {
            wp_send_json_error(__('WooCommerce is required for this functionality', 'blasti-configurator'));
        }
        
        // Delegate to WooCommerce integration
        $woocommerce_integration = Blasti_Configurator_WooCommerce::get_instance();
        $woocommerce_integration->ajax_get_cart_status();
    }
}