<?php
/**
 * Admin functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Blasti_Configurator_Admin {
    
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
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
        
        // Enqueue admin assets
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        
        // Add plugin action links
        add_filter('plugin_action_links_' . BLASTI_CONFIGURATOR_PLUGIN_BASENAME, array($this, 'add_action_links'));
        
        // Add capability checks to admin pages
        add_action('admin_init', array($this, 'admin_init_capability_checks'));
        
        // Add AJAX handlers for admin functionality
        add_action('wp_ajax_blasti_save_settings', array($this, 'ajax_save_settings'));
        add_action('wp_ajax_blasti_upload_model', array($this, 'ajax_upload_model'));
        add_action('wp_ajax_blasti_get_stats', array($this, 'ajax_get_stats'));
    }
    
    /**
     * Add admin menu pages
     */
    public function add_admin_menu() {
        // Main menu page
        add_menu_page(
            __('Blasti Configurator', 'blasti-configurator'),
            __('Blasti Configurator', 'blasti-configurator'),
            'manage_options',
            'blasti-configurator',
            array($this, 'admin_page'),
            'dashicons-admin-customizer',
            30
        );
        
        // Settings submenu
        add_submenu_page(
            'blasti-configurator',
            __('Settings', 'blasti-configurator'),
            __('Settings', 'blasti-configurator'),
            'manage_options',
            'blasti-configurator-settings',
            array($this, 'settings_page')
        );
        
        // Products submenu
        add_submenu_page(
            'blasti-configurator',
            __('3D Models', 'blasti-configurator'),
            __('3D Models', 'blasti-configurator'),
            'manage_options',
            'blasti-configurator-models',
            array($this, 'models_page')
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        // Register all settings with proper sanitization
        $settings = array(
            'blasti_configurator_enable_mobile_optimization' => 'boolean',
            'blasti_configurator_enable_analytics' => 'boolean',
            'blasti_configurator_cache_3d_models' => 'boolean',
            'blasti_configurator_max_accessories_per_pegboard' => 'integer',
            'blasti_configurator_theme_integration' => 'boolean',
            'blasti_configurator_default_theme' => 'string',
            'blasti_configurator_default_width' => 'string',
            'blasti_configurator_default_height' => 'string',
            'blasti_configurator_model_quality' => 'string',
            'blasti_configurator_preload_models' => 'boolean',
            'blasti_configurator_debug_mode' => 'boolean',
            'blasti_configurator_custom_css' => 'textarea',
            'blasti_configurator_api_endpoint' => 'url'
        );
        
        foreach ($settings as $setting_name => $type) {
            register_setting(
                'blasti_configurator_settings',
                $setting_name,
                array(
                    'type' => $type,
                    'sanitize_callback' => array($this, 'sanitize_setting'),
                    'default' => $this->get_setting_default($setting_name)
                )
            );
        }
        
        // Add settings sections
        add_settings_section(
            'blasti_configurator_general',
            __('General Settings', 'blasti-configurator'),
            array($this, 'general_section_callback'),
            'blasti_configurator_settings'
        );
        
        // Add settings fields
        add_settings_field(
            'enable_mobile_optimization',
            __('Enable Mobile Optimization', 'blasti-configurator'),
            array($this, 'checkbox_field_callback'),
            'blasti_configurator_settings',
            'blasti_configurator_general',
            array('option_name' => 'blasti_configurator_enable_mobile_optimization')
        );
        
        add_settings_field(
            'enable_analytics',
            __('Enable Analytics', 'blasti-configurator'),
            array($this, 'checkbox_field_callback'),
            'blasti_configurator_settings',
            'blasti_configurator_general',
            array('option_name' => 'blasti_configurator_enable_analytics')
        );
        
        add_settings_field(
            'cache_3d_models',
            __('Cache 3D Models', 'blasti-configurator'),
            array($this, 'checkbox_field_callback'),
            'blasti_configurator_settings',
            'blasti_configurator_general',
            array('option_name' => 'blasti_configurator_cache_3d_models')
        );
        
        add_settings_field(
            'max_accessories_per_pegboard',
            __('Max Accessories per Pegboard', 'blasti-configurator'),
            array($this, 'number_field_callback'),
            'blasti_configurator_settings',
            'blasti_configurator_general',
            array('option_name' => 'blasti_configurator_max_accessories_per_pegboard')
        );
    }
    
    /**
     * Admin init capability checks
     * Requirement 9.3: Add capability checks for admin access
     */
    public function admin_init_capability_checks() {
        // Check capabilities on our admin pages
        if (isset($_GET['page']) && strpos($_GET['page'], 'blasti-configurator') !== false) {
            if (!current_user_can('manage_options')) {
                wp_redirect(admin_url());
                exit;
            }
        }
    }
    
    /**
     * Sanitize settings based on type
     */
    public function sanitize_setting($value, $option_name = '') {
        // Get the setting type from our registration
        $setting_types = array(
            'blasti_configurator_enable_mobile_optimization' => 'boolean',
            'blasti_configurator_enable_analytics' => 'boolean',
            'blasti_configurator_cache_3d_models' => 'boolean',
            'blasti_configurator_max_accessories_per_pegboard' => 'integer',
            'blasti_configurator_theme_integration' => 'boolean',
            'blasti_configurator_default_theme' => 'string',
            'blasti_configurator_default_width' => 'string',
            'blasti_configurator_default_height' => 'string',
            'blasti_configurator_model_quality' => 'string',
            'blasti_configurator_preload_models' => 'boolean',
            'blasti_configurator_debug_mode' => 'boolean',
            'blasti_configurator_custom_css' => 'textarea',
            'blasti_configurator_api_endpoint' => 'url'
        );
        
        // Get current filter to determine which setting we're sanitizing
        $setting_name = $option_name;
        if (empty($setting_name) && function_exists('current_filter')) {
            $current_filter = current_filter();
            $setting_name = str_replace('sanitize_option_', '', $current_filter);
        }
        
        if (!isset($setting_types[$setting_name])) {
            return $this->sanitize_text_field_fallback($value);
        }
        
        $type = $setting_types[$setting_name];
        
        switch ($type) {
            case 'boolean':
                return (bool) $value;
            case 'integer':
                return function_exists('absint') ? absint($value) : abs((int) $value);
            case 'url':
                return function_exists('esc_url_raw') ? esc_url_raw($value) : filter_var($value, FILTER_SANITIZE_URL);
            case 'textarea':
                return function_exists('wp_kses_post') ? wp_kses_post($value) : strip_tags($value);
            case 'string':
            default:
                return $this->sanitize_text_field_fallback($value);
        }
    }
    
    /**
     * Fallback for sanitize_text_field when WordPress functions are not available
     */
    private function sanitize_text_field_fallback($value) {
        if (function_exists('sanitize_text_field')) {
            return sanitize_text_field($value);
        }
        
        // Basic sanitization fallback
        return trim(strip_tags($value));
    }
    
    /**
     * Get default value for a setting
     */
    private function get_setting_default($setting_name) {
        $defaults = array(
            'blasti_configurator_enable_mobile_optimization' => true,
            'blasti_configurator_enable_analytics' => true,
            'blasti_configurator_cache_3d_models' => true,
            'blasti_configurator_max_accessories_per_pegboard' => 50,
            'blasti_configurator_theme_integration' => true,
            'blasti_configurator_default_theme' => 'default',
            'blasti_configurator_default_width' => '100%',
            'blasti_configurator_default_height' => '600px',
            'blasti_configurator_model_quality' => 'medium',
            'blasti_configurator_preload_models' => false,
            'blasti_configurator_debug_mode' => false,
            'blasti_configurator_custom_css' => '',
            'blasti_configurator_api_endpoint' => ''
        );
        
        return isset($defaults[$setting_name]) ? $defaults[$setting_name] : '';
    }
    
    /**
     * Main admin page
     * Requirement 9.3: Add capability checks for admin access
     */
    public function admin_page() {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'blasti-configurator'));
        }
        
        include BLASTI_CONFIGURATOR_PLUGIN_DIR . 'templates/admin-page.php';
    }
    
    /**
     * Settings page
     * Requirement 9.3: Add capability checks for admin access
     */
    public function settings_page() {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'blasti-configurator'));
        }
        
        include BLASTI_CONFIGURATOR_PLUGIN_DIR . 'templates/admin-settings.php';
    }
    
    /**
     * 3D Models page
     * Requirement 9.3: Add capability checks for admin access
     */
    public function models_page() {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'blasti-configurator'));
        }
        
        include BLASTI_CONFIGURATOR_PLUGIN_DIR . 'templates/admin-models.php';
    }
    
    /**
     * General settings section callback
     */
    public function general_section_callback() {
        echo '<p>' . __('Configure general settings for the Blasti 3D Configurator.', 'blasti-configurator') . '</p>';
    }
    
    /**
     * Checkbox field callback
     */
    public function checkbox_field_callback($args) {
        $option_name = $args['option_name'];
        $value = get_option($option_name, false);
        echo '<input type="checkbox" name="' . esc_attr($option_name) . '" value="1" ' . checked(1, $value, false) . ' />';
    }
    
    /**
     * Number field callback
     */
    public function number_field_callback($args) {
        $option_name = $args['option_name'];
        $value = get_option($option_name, 50);
        echo '<input type="number" name="' . esc_attr($option_name) . '" value="' . esc_attr($value) . '" min="1" max="100" />';
    }
    
    /**
     * Add plugin action links
     */
    public function add_action_links($links) {
        // Check user capabilities before adding settings link
        if (current_user_can('manage_options')) {
            $settings_link = '<a href="' . admin_url('admin.php?page=blasti-configurator-settings') . '">' . __('Settings', 'blasti-configurator') . '</a>';
            array_unshift($links, $settings_link);
        }
        return $links;
    }
    
    /**
     * Get count of pegboard products
     * Used in admin dashboard
     */
    public function get_pegboard_count() {
        $count = get_posts(array(
            'post_type' => 'product',
            'meta_query' => array(
                array(
                    'key' => '_blasti_configurator_enabled',
                    'value' => 'yes',
                    'compare' => '='
                ),
                array(
                    'key' => '_blasti_product_type',
                    'value' => 'pegboard',
                    'compare' => '='
                )
            ),
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'fields' => 'ids'
        ));
        
        return count($count);
    }
    
    /**
     * Get count of accessory products
     * Used in admin dashboard
     */
    public function get_accessory_count() {
        $count = get_posts(array(
            'post_type' => 'product',
            'meta_query' => array(
                array(
                    'key' => '_blasti_configurator_enabled',
                    'value' => 'yes',
                    'compare' => '='
                ),
                array(
                    'key' => '_blasti_product_type',
                    'value' => 'accessory',
                    'compare' => '='
                )
            ),
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'fields' => 'ids'
        ));
        
        return count($count);
    }
    
    /**
     * Get count of configurations created
     * Used in admin dashboard for basic analytics
     */
    public function get_configuration_count() {
        // Get from analytics option or return 0 if not tracking
        $analytics_enabled = get_option('blasti_configurator_enable_analytics', true);
        if (!$analytics_enabled) {
            return 0;
        }
        
        return get_option('blasti_configurator_total_configurations', 0);
    }
    
    /**
     * Get count of cart additions
     * Used in admin dashboard for basic analytics
     */
    public function get_cart_additions_count() {
        // Get from analytics option or return 0 if not tracking
        $analytics_enabled = get_option('blasti_configurator_enable_analytics', true);
        if (!$analytics_enabled) {
            return 0;
        }
        
        return get_option('blasti_configurator_total_cart_additions', 0);
    }
    
    /**
     * Get recent activities for dashboard
     * Used in admin dashboard
     */
    public function get_recent_activities() {
        $activities = array();
        
        // Check if analytics is enabled
        $analytics_enabled = get_option('blasti_configurator_enable_analytics', true);
        if (!$analytics_enabled) {
            return $activities;
        }
        
        // Get recent activities from options (stored as array)
        $recent_activities = get_option('blasti_configurator_recent_activities', array());
        
        // Limit to last 10 activities
        $activities = array_slice($recent_activities, -10);
        
        // If no activities, add some sample data for demonstration
        if (empty($activities)) {
            $activities = array(
                array(
                    'message' => __('Plugin activated successfully', 'blasti-configurator'),
                    'time' => human_time_diff(time() - 3600) . ' ' . __('ago', 'blasti-configurator'),
                    'icon' => 'dashicons-yes-alt'
                ),
                array(
                    'message' => __('Configurator page created', 'blasti-configurator'),
                    'time' => human_time_diff(time() - 3600) . ' ' . __('ago', 'blasti-configurator'),
                    'icon' => 'dashicons-admin-page'
                )
            );
        }
        
        return $activities;
    }
    
    /**
     * Add activity to recent activities log
     * Used for basic analytics tracking
     */
    public function log_activity($message, $icon = 'dashicons-admin-generic') {
        $analytics_enabled = get_option('blasti_configurator_enable_analytics', true);
        if (!$analytics_enabled) {
            return;
        }
        
        $activities = get_option('blasti_configurator_recent_activities', array());
        
        $new_activity = array(
            'message' => $message,
            'time' => human_time_diff(time()) . ' ' . __('ago', 'blasti-configurator'),
            'icon' => $icon,
            'timestamp' => time()
        );
        
        $activities[] = $new_activity;
        
        // Keep only last 50 activities
        if (count($activities) > 50) {
            $activities = array_slice($activities, -50);
        }
        
        update_option('blasti_configurator_recent_activities', $activities);
    }
    
    /**
     * Check if user has required capabilities for admin access
     * Requirement 9.3: Add capability checks for admin access
     */
    public function check_admin_capabilities() {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'blasti-configurator'));
        }
    }
    
    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_assets($hook) {
        // Only load on our admin pages
        if (strpos($hook, 'blasti-configurator') === false) {
            return;
        }
        
        // Enqueue admin CSS
        wp_enqueue_style(
            'blasti-configurator-admin',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/css/admin.css',
            array(),
            BLASTI_CONFIGURATOR_VERSION
        );
        
        // Enqueue admin JavaScript
        wp_enqueue_script(
            'blasti-configurator-admin',
            BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            BLASTI_CONFIGURATOR_VERSION,
            true
        );
        
        // Localize script for AJAX
        wp_localize_script('blasti-configurator-admin', 'blastiConfiguratorAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('blasti_admin_nonce'),
            'strings' => array(
                'confirm_delete' => __('Are you sure you want to delete this item?', 'blasti-configurator'),
                'error_occurred' => __('An error occurred. Please try again.', 'blasti-configurator'),
                'success' => __('Operation completed successfully.', 'blasti-configurator')
            )
        ));
    }
    
    /**
     * AJAX handler for saving settings
     */
    public function ajax_save_settings() {
        // Verify nonce and capabilities
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_admin_nonce') || !current_user_can('manage_options')) {
            wp_die('Security check failed');
        }
        
        // This is handled by WordPress Settings API automatically
        // Just return success for now
        wp_send_json_success('Settings saved successfully');
    }
    
    // Model upload functionality removed - not currently used
    // Models are managed through WordPress media library instead
    
    /**
     * AJAX handler for getting statistics
     */
    public function ajax_get_stats() {
        // Verify nonce and capabilities
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_admin_nonce') || !current_user_can('manage_options')) {
            wp_die('Security check failed');
        }
        
        $stats = array(
            'pegboards' => $this->get_pegboard_count(),
            'accessories' => $this->get_accessory_count(),
            'configurations' => $this->get_configuration_count(),
            'cart_additions' => $this->get_cart_additions_count()
        );
        
        wp_send_json_success($stats);
    }
}