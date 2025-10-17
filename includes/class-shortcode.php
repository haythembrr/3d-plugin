<?php
/**
 * Shortcode functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Blasti_Configurator_Shortcode {
    
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
        // Register shortcode
        add_action('init', array($this, 'register_shortcode'));
        
        // Add shortcode button to editor (admin only)
        if (is_admin()) {
            add_action('admin_init', array($this, 'add_shortcode_button'));
        }
    }
    
    /**
     * Register the configurator shortcode
     */
    public function register_shortcode() {
        add_shortcode('blasti_configurator', array($this, 'render_shortcode'));
        
        // Also register alternative shortcode names for flexibility
        add_shortcode('blasti_3d_configurator', array($this, 'render_shortcode'));
        add_shortcode('pegboard_configurator', array($this, 'render_shortcode'));
    }
    
    /**
     * Add shortcode button to WordPress editor (for admin convenience)
     */
    public function add_shortcode_button() {
        // Only add for users who can edit posts
        if (!current_user_can('edit_posts') && !current_user_can('edit_pages')) {
            return;
        }
        
        // Add button to TinyMCE editor
        add_filter('mce_buttons', array($this, 'register_mce_button'));
        add_filter('mce_external_plugins', array($this, 'add_mce_plugin'));
    }
    
    /**
     * Register MCE button
     */
    public function register_mce_button($buttons) {
        array_push($buttons, 'blasti_configurator_button');
        return $buttons;
    }
    
    /**
     * Add MCE plugin
     */
    public function add_mce_plugin($plugin_array) {
        $plugin_array['blasti_configurator_button'] = BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/js/shortcode-button.js';
        return $plugin_array;
    }
    
    /**
     * Render the configurator shortcode
     * Handles shortcode attributes and parameters as per requirements 1.1, 1.2
     */
    public function render_shortcode($atts, $content = null) {
        // Parse shortcode attributes with comprehensive defaults
        $atts = shortcode_atts(array(
            'width' => '100%',
            'height' => '600px',
            'theme' => 'default',
            'show_price' => 'true',
            'show_cart_button' => 'true',
            'show_camera_controls' => 'true',
            'show_save_config' => 'true',
            'enable_mobile' => 'true',
            'max_accessories' => '50',
            'default_pegboard' => '',
            'container_class' => '',
            'loading_text' => ''
        ), $atts, 'blasti_configurator');
        
        // Sanitize and validate attributes
        $atts = $this->sanitize_attributes($atts);
        
        // Check if user has permission to view configurator
        if (!$this->can_user_access_configurator()) {
            return $this->render_access_denied_message();
        }
        
        // Enqueue required scripts and styles for this shortcode instance
        $this->enqueue_shortcode_assets();
        
        // Start output buffering
        ob_start();
        
        // Include the configurator template
        $template_path = $this->get_template_path();
        if (file_exists($template_path)) {
            include $template_path;
        } else {
            echo $this->render_error_message(__('Configurator template not found.', 'blasti-configurator'));
        }
        
        // Return the buffered content
        return ob_get_clean();
    }
    
    /**
     * Sanitize shortcode attributes
     */
    private function sanitize_attributes($atts) {
        // Sanitize width and height
        $atts['width'] = sanitize_text_field($atts['width']);
        $atts['height'] = sanitize_text_field($atts['height']);
        
        // Ensure width and height have valid CSS units
        if (!preg_match('/^(\d+(%|px|em|rem|vw|vh)?|auto|inherit)$/', $atts['width'])) {
            $atts['width'] = '100%';
        }
        if (!preg_match('/^(\d+(%|px|em|rem|vw|vh)?|auto|inherit)$/', $atts['height'])) {
            $atts['height'] = '600px';
        }
        
        // Sanitize theme
        $atts['theme'] = sanitize_key($atts['theme']);
        $allowed_themes = array('default', 'dark', 'light', 'minimal');
        if (!in_array($atts['theme'], $allowed_themes)) {
            $atts['theme'] = 'default';
        }
        
        // Convert boolean strings to actual booleans for easier template usage
        $boolean_fields = array('show_price', 'show_cart_button', 'show_camera_controls', 'show_save_config', 'enable_mobile');
        foreach ($boolean_fields as $field) {
            $atts[$field] = filter_var($atts[$field], FILTER_VALIDATE_BOOLEAN);
        }
        
        // Sanitize numeric values
        $atts['max_accessories'] = absint($atts['max_accessories']);
        if ($atts['max_accessories'] < 1 || $atts['max_accessories'] > 100) {
            $atts['max_accessories'] = 50;
        }
        
        // Sanitize default pegboard ID
        $atts['default_pegboard'] = absint($atts['default_pegboard']);
        
        // Sanitize container class
        $atts['container_class'] = sanitize_html_class($atts['container_class']);
        
        // Sanitize loading text
        $atts['loading_text'] = sanitize_text_field($atts['loading_text']);
        if (empty($atts['loading_text'])) {
            $atts['loading_text'] = __('Loading 3D Configurator...', 'blasti-configurator');
        }
        
        return $atts;
    }
    
    /**
     * Check if current user can access the configurator
     */
    private function can_user_access_configurator() {
        // Allow access by default, but provide filter for customization
        $can_access = true;
        
        // Apply filter to allow custom access control
        return apply_filters('blasti_configurator_user_can_access', $can_access);
    }
    
    /**
     * Render access denied message
     */
    private function render_access_denied_message() {
        $message = apply_filters(
            'blasti_configurator_access_denied_message',
            __('You do not have permission to access the configurator.', 'blasti-configurator')
        );
        
        return '<div class="blasti-configurator-error">' . esc_html($message) . '</div>';
    }
    
    /**
     * Render error message
     */
    private function render_error_message($message) {
        return '<div class="blasti-configurator-error">' . esc_html($message) . '</div>';
    }
    
    /**
     * Enqueue assets specifically for shortcode instances
     */
    private function enqueue_shortcode_assets() {
        // Only enqueue if not already enqueued by the main class
        if (!wp_script_is('blasti-configurator', 'enqueued')) {
            // Get main instance to handle script enqueuing
            $main_instance = Blasti_Configurator_Main::get_instance();
            if (method_exists($main_instance, 'enqueue_scripts')) {
                $main_instance->enqueue_scripts();
            }
        }
    }
    
    /**
     * Get template path with theme override support
     */
    private function get_template_path() {
        // Check for theme override first
        $theme_template = get_template_directory() . '/blasti-configurator/configurator.php';
        if (file_exists($theme_template)) {
            return $theme_template;
        }
        
        // Check child theme override
        if (is_child_theme()) {
            $child_template = get_stylesheet_directory() . '/blasti-configurator/configurator.php';
            if (file_exists($child_template)) {
                return $child_template;
            }
        }
        
        // Use plugin template as fallback
        return BLASTI_CONFIGURATOR_PLUGIN_DIR . 'templates/configurator.php';
    }
    
    /**
     * Get shortcode usage examples for admin help
     */
    public static function get_shortcode_examples() {
        return array(
            'basic' => '[blasti_configurator]',
            'custom_size' => '[blasti_configurator width="800px" height="500px"]',
            'minimal' => '[blasti_configurator theme="minimal" show_camera_controls="false"]',
            'no_cart' => '[blasti_configurator show_cart_button="false" show_price="false"]',
            'with_default' => '[blasti_configurator default_pegboard="123"]',
            'mobile_disabled' => '[blasti_configurator enable_mobile="false"]'
        );
    }
}