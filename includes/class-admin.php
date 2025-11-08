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

        // NEW: Phase 1 migration AJAX handlers
        add_action('wp_ajax_blasti_run_migration', array($this, 'ajax_run_migration'));
        add_action('wp_ajax_blasti_get_migration_status', array($this, 'ajax_get_migration_status'));
        add_action('wp_ajax_blasti_rollback_migration', array($this, 'ajax_rollback_migration'));
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

        // NEW: Phase 1 Data Migration submenu
        add_submenu_page(
            'blasti-configurator',
            __('Data Migration', 'blasti-configurator'),
            __('Data Migration', 'blasti-configurator'),
            'manage_options',
            'blasti-configurator-migration',
            array($this, 'migration_page')
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
     * Migration page for Phase 1: Data Model Enhancement
     * NEW: Requirement 9.3: Add capability checks for admin access
     */
    public function migration_page() {
        // Check user capabilities
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'blasti-configurator'));
        }

        // Get migration instance
        $migration = Blasti_Configurator_Migration::get_instance();
        $status = $migration->get_migration_status();

        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('Phase 1: Data Migration', 'blasti-configurator'); ?></h1>

            <div class="notice notice-info">
                <p><strong><?php _e('About Phase 1 Migration:', 'blasti-configurator'); ?></strong></p>
                <p><?php _e('This migration upgrades your product data to the enhanced Phase 1 schema, which includes:', 'blasti-configurator'); ?></p>
                <ul style="margin-left: 20px;">
                    <li><?php _e('Enhanced dimensions with peg hole grid data for pegboards', 'blasti-configurator'); ?></li>
                    <li><?php _e('Peg configuration data for accessories (positions, dimensions, mounting)', 'blasti-configurator'); ?></li>
                    <li><?php _e('Actual peg hole positions for pegboards', 'blasti-configurator'); ?></li>
                </ul>
                <p><?php _e('This is a non-destructive migration - legacy data will be preserved.', 'blasti-configurator'); ?></p>
            </div>

            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h2><?php _e('Migration Status', 'blasti-configurator'); ?></h2>

                <table class="widefat striped">
                    <tbody>
                        <tr>
                            <th style="width: 50%;"><?php _e('Total Configurator Products', 'blasti-configurator'); ?></th>
                            <td><strong><?php echo esc_html($status['total_products']); ?></strong></td>
                        </tr>
                        <tr>
                            <th><?php _e('Products Migrated', 'blasti-configurator'); ?></th>
                            <td><strong><?php echo esc_html($status['migrated_products']); ?></strong></td>
                        </tr>
                        <tr>
                            <th><?php _e('Products Pending Migration', 'blasti-configurator'); ?></th>
                            <td><strong><?php echo esc_html($status['pending_migration']); ?></strong></td>
                        </tr>
                        <tr>
                            <th><?php _e('Migration Status', 'blasti-configurator'); ?></th>
                            <td>
                                <?php if ($status['migration_complete']): ?>
                                    <span class="dashicons dashicons-yes-alt" style="color: green;"></span>
                                    <strong style="color: green;"><?php _e('Complete', 'blasti-configurator'); ?></strong>
                                <?php else: ?>
                                    <span class="dashicons dashicons-warning" style="color: orange;"></span>
                                    <strong style="color: orange;"><?php _e('Pending', 'blasti-configurator'); ?></strong>
                                <?php endif; ?>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 20px;">
                    <?php if (!$status['migration_complete']): ?>
                        <button type="button" id="run-migration-btn" class="button button-primary button-hero">
                            <span class="dashicons dashicons-update"></span>
                            <?php _e('Run Migration', 'blasti-configurator'); ?>
                        </button>
                        <p class="description">
                            <?php _e('This will migrate all products that have not yet been upgraded to the Phase 1 schema.', 'blasti-configurator'); ?>
                        </p>
                    <?php else: ?>
                        <p style="color: green;">
                            <span class="dashicons dashicons-yes-alt"></span>
                            <?php _e('All products have been migrated to the Phase 1 schema.', 'blasti-configurator'); ?>
                        </p>
                    <?php endif; ?>

                    <?php if ($status['migrated_products'] > 0): ?>
                        <hr style="margin: 20px 0;">
                        <button type="button" id="rollback-migration-btn" class="button button-secondary">
                            <span class="dashicons dashicons-undo"></span>
                            <?php _e('Rollback Migration', 'blasti-configurator'); ?>
                        </button>
                        <p class="description">
                            <?php _e('This will remove all Phase 1 enhanced data and revert to the legacy schema. Use with caution.', 'blasti-configurator'); ?>
                        </p>
                    <?php endif; ?>
                </div>

                <div id="migration-results" style="margin-top: 20px; display: none;">
                    <h3><?php _e('Migration Results', 'blasti-configurator'); ?></h3>
                    <div id="migration-results-content"></div>
                </div>
            </div>
        </div>

        <style>
            .migration-result-success {
                padding: 10px;
                background: #d4edda;
                border: 1px solid #c3e6cb;
                border-radius: 4px;
                color: #155724;
                margin-bottom: 10px;
            }
            .migration-result-error {
                padding: 10px;
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
                color: #721c24;
                margin-bottom: 10px;
            }
            .migration-progress {
                padding: 10px;
                background: #d1ecf1;
                border: 1px solid #bee5eb;
                border-radius: 4px;
                color: #0c5460;
                margin-bottom: 10px;
            }
        </style>

        <script type="text/javascript">
        jQuery(document).ready(function($) {
            var $runBtn = $('#run-migration-btn');
            var $rollbackBtn = $('#rollback-migration-btn');
            var $results = $('#migration-results');
            var $resultsContent = $('#migration-results-content');

            $runBtn.on('click', function() {
                if (!confirm('<?php echo esc_js(__('Are you sure you want to run the migration? This will update product data.', 'blasti-configurator')); ?>')) {
                    return;
                }

                $runBtn.prop('disabled', true).text('<?php echo esc_js(__('Running migration...', 'blasti-configurator')); ?>');
                $results.show();
                $resultsContent.html('<div class="migration-progress"><span class="dashicons dashicons-update"></span> <?php echo esc_js(__('Migration in progress...', 'blasti-configurator')); ?></div>');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'blasti_run_migration',
                        nonce: '<?php echo wp_create_nonce('blasti_migration_nonce'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            var result = response.data;
                            var html = '<div class="migration-result-success">';
                            html += '<h4>' + result.message + '</h4>';
                            html += '<p><strong><?php echo esc_js(__('Succeeded:', 'blasti-configurator')); ?></strong> ' + result.success + '</p>';
                            html += '<p><strong><?php echo esc_js(__('Failed:', 'blasti-configurator')); ?></strong> ' + result.failed + '</p>';
                            html += '<p><strong><?php echo esc_js(__('Skipped:', 'blasti-configurator')); ?></strong> ' + result.skipped + '</p>';

                            if (result.migrated_products && result.migrated_products.length > 0) {
                                html += '<h5><?php echo esc_js(__('Migrated Products:', 'blasti-configurator')); ?></h5><ul>';
                                $.each(result.migrated_products, function(i, product) {
                                    html += '<li>' + product.name + ' (ID: ' + product.id + ', Type: ' + product.type + ')</li>';
                                });
                                html += '</ul>';
                            }

                            if (result.errors && result.errors.length > 0) {
                                html += '<h5 style="color: #721c24;"><?php echo esc_js(__('Errors:', 'blasti-configurator')); ?></h5><ul>';
                                $.each(result.errors, function(i, error) {
                                    html += '<li>' + error.product_name + ' (ID: ' + error.product_id + '): ' + error.error + '</li>';
                                });
                                html += '</ul>';
                            }

                            html += '</div>';
                            $resultsContent.html(html);

                            setTimeout(function() {
                                location.reload();
                            }, 3000);
                        } else {
                            $resultsContent.html('<div class="migration-result-error"><?php echo esc_js(__('Migration failed:', 'blasti-configurator')); ?> ' + (response.data.message || '<?php echo esc_js(__('Unknown error', 'blasti-configurator')); ?>') + '</div>');
                            $runBtn.prop('disabled', false).text('<?php echo esc_js(__('Run Migration', 'blasti-configurator')); ?>');
                        }
                    },
                    error: function() {
                        $resultsContent.html('<div class="migration-result-error"><?php echo esc_js(__('An error occurred during migration.', 'blasti-configurator')); ?></div>');
                        $runBtn.prop('disabled', false).text('<?php echo esc_js(__('Run Migration', 'blasti-configurator')); ?>');
                    }
                });
            });

            $rollbackBtn.on('click', function() {
                if (!confirm('<?php echo esc_js(__('Are you sure you want to rollback the migration? This will remove all Phase 1 enhanced data.', 'blasti-configurator')); ?>')) {
                    return;
                }

                $rollbackBtn.prop('disabled', true).text('<?php echo esc_js(__('Rolling back...', 'blasti-configurator')); ?>');
                $results.show();
                $resultsContent.html('<div class="migration-progress"><span class="dashicons dashicons-update"></span> <?php echo esc_js(__('Rollback in progress...', 'blasti-configurator')); ?></div>');

                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'blasti_rollback_migration',
                        nonce: '<?php echo wp_create_nonce('blasti_migration_nonce'); ?>'
                    },
                    success: function(response) {
                        if (response.success) {
                            $resultsContent.html('<div class="migration-result-success">' + response.data.message + '</div>');
                            setTimeout(function() {
                                location.reload();
                            }, 2000);
                        } else {
                            $resultsContent.html('<div class="migration-result-error"><?php echo esc_js(__('Rollback failed:', 'blasti-configurator')); ?> ' + (response.data.message || '<?php echo esc_js(__('Unknown error', 'blasti-configurator')); ?>') + '</div>');
                            $rollbackBtn.prop('disabled', false).text('<?php echo esc_js(__('Rollback Migration', 'blasti-configurator')); ?>');
                        }
                    },
                    error: function() {
                        $resultsContent.html('<div class="migration-result-error"><?php echo esc_js(__('An error occurred during rollback.', 'blasti-configurator')); ?></div>');
                        $rollbackBtn.prop('disabled', false).text('<?php echo esc_js(__('Rollback Migration', 'blasti-configurator')); ?>');
                    }
                });
            });
        });
        </script>
        <?php
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

    /**
     * AJAX handler for running Phase 1 migration
     * NEW: Phase 1 Data Model Enhancement
     */
    public function ajax_run_migration() {
        // Verify nonce and capabilities
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_migration_nonce') || !current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('Security check failed', 'blasti-configurator')
            ));
        }

        try {
            $migration = Blasti_Configurator_Migration::get_instance();
            $results = $migration->migrate_to_v2();

            // Log activity
            $this->log_activity(
                sprintf(__('Phase 1 migration completed: %d products migrated', 'blasti-configurator'), $results['success']),
                'dashicons-update'
            );

            wp_send_json_success($results);

        } catch (Exception $e) {
            error_log('Blasti Configurator Migration Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('Migration failed: ', 'blasti-configurator') . $e->getMessage()
            ));
        }
    }

    /**
     * AJAX handler for getting migration status
     * NEW: Phase 1 Data Model Enhancement
     */
    public function ajax_get_migration_status() {
        // Verify nonce and capabilities
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_migration_nonce') || !current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('Security check failed', 'blasti-configurator')
            ));
        }

        try {
            $migration = Blasti_Configurator_Migration::get_instance();
            $status = $migration->get_migration_status();

            wp_send_json_success($status);

        } catch (Exception $e) {
            error_log('Blasti Configurator Migration Status Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('Failed to get migration status: ', 'blasti-configurator') . $e->getMessage()
            ));
        }
    }

    /**
     * AJAX handler for rolling back Phase 1 migration
     * NEW: Phase 1 Data Model Enhancement
     */
    public function ajax_rollback_migration() {
        // Verify nonce and capabilities
        if (!wp_verify_nonce($_POST['nonce'], 'blasti_migration_nonce') || !current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('Security check failed', 'blasti-configurator')
            ));
        }

        try {
            $migration = Blasti_Configurator_Migration::get_instance();
            $results = $migration->rollback_all();

            // Log activity
            $this->log_activity(
                sprintf(__('Phase 1 migration rolled back: %d products reverted', 'blasti-configurator'), $results['success']),
                'dashicons-undo'
            );

            wp_send_json_success($results);

        } catch (Exception $e) {
            error_log('Blasti Configurator Migration Rollback Error: ' . $e->getMessage());
            wp_send_json_error(array(
                'message' => __('Rollback failed: ', 'blasti-configurator') . $e->getMessage()
            ));
        }
    }
}