<?php
/**
 * Plugin Name: Blasti 3D Configurator
 * Plugin URI: https://blasti.shop
 * Description: A 3D configurator for pegboards that integrates with WooCommerce to allow customers to design and purchase custom pegboard configurations.
 * Version: 1.0.4
 * Author: Blasti.shop
 * Author URI: https://blasti.shop
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: blasti-configurator
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 * WC tested up to: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('BLASTI_CONFIGURATOR_VERSION', '1.0.4'); // Optimized camera view and framing
define('BLASTI_CONFIGURATOR_PLUGIN_FILE', __FILE__);
define('BLASTI_CONFIGURATOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BLASTI_CONFIGURATOR_PLUGIN_URL', plugin_dir_url(__FILE__));
define('BLASTI_CONFIGURATOR_PLUGIN_BASENAME', plugin_basename(__FILE__));

/**
 * Main plugin class
 */
class Blasti_Configurator {
    
    /**
     * Single instance of the plugin
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
        // Plugin activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        
        // Initialize plugin after WordPress loads
        add_action('plugins_loaded', array($this, 'init'));
        
        // Load text domain for translations
        add_action('init', array($this, 'load_textdomain'));
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Check if WooCommerce is active
        if (!$this->is_woocommerce_active()) {
            add_action('admin_notices', array($this, 'woocommerce_missing_notice'));
            return;
        }
        
        // Include required files
        $this->includes();
        
        // Initialize components
        $this->init_components();
    }
    
    /**
     * Include required files
     */
    private function includes() {
        // Core classes
        require_once BLASTI_CONFIGURATOR_PLUGIN_DIR . 'includes/class-main.php';
        require_once BLASTI_CONFIGURATOR_PLUGIN_DIR . 'includes/class-admin.php';
        require_once BLASTI_CONFIGURATOR_PLUGIN_DIR . 'includes/class-shortcode.php';
        require_once BLASTI_CONFIGURATOR_PLUGIN_DIR . 'includes/class-woocommerce.php';
    }
    
    /**
     * Initialize plugin components
     */
    private function init_components() {
        // Initialize main functionality
        Blasti_Configurator_Main::get_instance();
        
        // Initialize admin functionality
        if (is_admin()) {
            Blasti_Configurator_Admin::get_instance();
        }
        
        // Initialize shortcode handler
        Blasti_Configurator_Shortcode::get_instance();
        
        // Initialize WooCommerce integration
        Blasti_Configurator_WooCommerce::get_instance();
    }
    
    /**
     * Load plugin text domain for translations
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            'blasti-configurator',
            false,
            dirname(BLASTI_CONFIGURATOR_PLUGIN_BASENAME) . '/languages'
        );
    }
    
    /**
     * Check if WooCommerce is active
     */
    private function is_woocommerce_active() {
        return class_exists('WooCommerce');
    }
    
    /**
     * Display notice when WooCommerce is not active
     */
    public function woocommerce_missing_notice() {
        ?>
        <div class="notice notice-error">
            <p>
                <?php 
                echo sprintf(
                    __('Blasti 3D Configurator requires WooCommerce to be installed and active. Please %s.', 'blasti-configurator'),
                    '<a href="' . admin_url('plugin-install.php?s=woocommerce&tab=search&type=term') . '">' . __('install WooCommerce', 'blasti-configurator') . '</a>'
                );
                ?>
            </p>
        </div>
        <?php
    }
    
    /**
     * Plugin activation hook
     */
    public function activate() {
        // Check WordPress version
        if (version_compare(get_bloginfo('version'), '5.0', '<')) {
            deactivate_plugins(BLASTI_CONFIGURATOR_PLUGIN_BASENAME);
            wp_die(__('Blasti 3D Configurator requires WordPress 5.0 or higher.', 'blasti-configurator'));
        }
        
        // Check PHP version
        if (version_compare(PHP_VERSION, '7.4', '<')) {
            deactivate_plugins(BLASTI_CONFIGURATOR_PLUGIN_BASENAME);
            wp_die(__('Blasti 3D Configurator requires PHP 7.4 or higher.', 'blasti-configurator'));
        }
        
        // Create database tables if needed
        $this->create_tables();
        
        // Set default options
        $this->set_default_options();
        
        // Create configurator page
        $this->create_configurator_page();
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation hook
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Clear any cached data
        wp_cache_flush();
    }
    
    /**
     * Create database tables
     */
    private function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Table for storing 3D model associations with products
        $table_name = $wpdb->prefix . 'blasti_product_models';
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            product_id bigint(20) NOT NULL,
            model_url varchar(255) NOT NULL,
            model_type varchar(50) NOT NULL DEFAULT 'pegboard',
            dimensions text,
            compatibility text,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY product_id (product_id),
            KEY model_type (model_type)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Update database version
        update_option('blasti_configurator_db_version', '1.0');
    }
    
    /**
     * Set default plugin options
     */
    private function set_default_options() {
        $default_options = array(
            'version' => BLASTI_CONFIGURATOR_VERSION,
            'configurator_page_id' => 0,
            'enable_mobile_optimization' => true,
            'enable_analytics' => true,
            'cache_3d_models' => true,
            'max_accessories_per_pegboard' => 50,
            'theme_integration' => true,
            'menu_position' => 'main',
            'page_template' => 'default'
        );
        
        foreach ($default_options as $option_name => $default_value) {
            $full_option_name = 'blasti_configurator_' . $option_name;
            if (get_option($full_option_name) === false) {
                update_option($full_option_name, $default_value);
            }
        }
    }
    
    /**
     * Create configurator page during activation
     * Requirement 1.1: Create "Design Your Pegboard" page accessible via WordPress menu
     */
    private function create_configurator_page() {
        // Check if page already exists
        $existing_page_id = get_option('blasti_configurator_configurator_page_id', 0);
        if ($existing_page_id && get_post($existing_page_id)) {
            return $existing_page_id;
        }
        
        // Create the configurator page
        $page_data = array(
            'post_title' => __('Design Your Pegboard', 'blasti-configurator'),
            'post_content' => '[blasti_configurator]',
            'post_status' => 'publish',
            'post_type' => 'page',
            'post_author' => 1,
            'post_slug' => 'design-your-pegboard',
            'comment_status' => 'closed',
            'ping_status' => 'closed'
        );
        
        $page_id = wp_insert_post($page_data);
        
        if ($page_id && !is_wp_error($page_id)) {
            // Save page ID in options
            update_option('blasti_configurator_configurator_page_id', $page_id);
            
            // Add page to main menu if theme integration is enabled
            $this->add_page_to_menu($page_id);
            
            return $page_id;
        }
        
        return false;
    }
    
    /**
     * Add configurator page to WordPress menu
     */
    private function add_page_to_menu($page_id) {
        $menu_position = get_option('blasti_configurator_menu_position', 'main');
        
        if ($menu_position === 'main') {
            // Get the main menu location
            $locations = get_nav_menu_locations();
            $menu_id = isset($locations['primary']) ? $locations['primary'] : 0;
            
            if ($menu_id) {
                // Add menu item
                wp_update_nav_menu_item($menu_id, 0, array(
                    'menu-item-title' => __('Design Your Pegboard', 'blasti-configurator'),
                    'menu-item-object' => 'page',
                    'menu-item-object-id' => $page_id,
                    'menu-item-type' => 'post_type',
                    'menu-item-status' => 'publish'
                ));
            }
        }
    }
}

/**
 * Initialize the plugin
 */
function blasti_configurator() {
    return Blasti_Configurator::get_instance();
}

// Start the plugin
blasti_configurator();