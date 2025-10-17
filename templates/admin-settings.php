<?php
/**
 * Admin settings page template
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Check user capabilities
if (!current_user_can('manage_options')) {
    wp_die(__('You do not have sufficient permissions to access this page.', 'blasti-configurator'));
}

// Handle form submission
if (isset($_POST['submit']) && wp_verify_nonce($_POST['_wpnonce'], 'blasti_configurator_settings')) {
    // Settings are automatically saved by WordPress Settings API
    echo '<div class="notice notice-success is-dismissible"><p>' . __('Settings saved successfully!', 'blasti-configurator') . '</p></div>';
}
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="blasti-settings-container">
        
        <!-- Settings Navigation -->
        <div class="blasti-settings-nav">
            <ul class="blasti-nav-tabs">
                <li class="nav-tab-active">
                    <a href="#general" class="nav-tab nav-tab-active"><?php _e('General', 'blasti-configurator'); ?></a>
                </li>
                <li>
                    <a href="#display" class="nav-tab"><?php _e('Display', 'blasti-configurator'); ?></a>
                </li>
                <li>
                    <a href="#performance" class="nav-tab"><?php _e('Performance', 'blasti-configurator'); ?></a>
                </li>
                <li>
                    <a href="#advanced" class="nav-tab"><?php _e('Advanced', 'blasti-configurator'); ?></a>
                </li>
            </ul>
        </div>
        
        <form method="post" action="options.php">
            <?php settings_fields('blasti_configurator_settings'); ?>
            
            <!-- General Settings Tab -->
            <div id="general" class="blasti-tab-content active">
                <div class="blasti-settings-section">
                    <h2><?php _e('General Settings', 'blasti-configurator'); ?></h2>
                    <p class="description"><?php _e('Configure basic plugin settings and behavior.', 'blasti-configurator'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_enable_mobile_optimization">
                                    <?php _e('Mobile Optimization', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="checkbox" 
                                       id="blasti_configurator_enable_mobile_optimization" 
                                       name="blasti_configurator_enable_mobile_optimization" 
                                       value="1" 
                                       <?php checked(1, get_option('blasti_configurator_enable_mobile_optimization', true)); ?> />
                                <label for="blasti_configurator_enable_mobile_optimization">
                                    <?php _e('Enable mobile-specific optimizations and touch controls', 'blasti-configurator'); ?>
                                </label>
                                <p class="description">
                                    <?php _e('Improves performance and usability on mobile devices by adjusting rendering quality and enabling touch gestures.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_enable_analytics">
                                    <?php _e('Analytics Tracking', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="checkbox" 
                                       id="blasti_configurator_enable_analytics" 
                                       name="blasti_configurator_enable_analytics" 
                                       value="1" 
                                       <?php checked(1, get_option('blasti_configurator_enable_analytics', true)); ?> />
                                <label for="blasti_configurator_enable_analytics">
                                    <?php _e('Track configurator usage and popular products', 'blasti-configurator'); ?>
                                </label>
                                <p class="description">
                                    <?php _e('Collects anonymous usage data to help improve the configurator experience.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_max_accessories_per_pegboard">
                                    <?php _e('Max Accessories per Pegboard', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="number" 
                                       id="blasti_configurator_max_accessories_per_pegboard" 
                                       name="blasti_configurator_max_accessories_per_pegboard" 
                                       value="<?php echo esc_attr(get_option('blasti_configurator_max_accessories_per_pegboard', 50)); ?>" 
                                       min="1" 
                                       max="100" 
                                       class="small-text" />
                                <p class="description">
                                    <?php _e('Maximum number of accessories that can be placed on a single pegboard (1-100).', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- Display Settings Tab -->
            <div id="display" class="blasti-tab-content">
                <div class="blasti-settings-section">
                    <h2><?php _e('Display Settings', 'blasti-configurator'); ?></h2>
                    <p class="description"><?php _e('Customize the appearance and theme integration of the configurator.', 'blasti-configurator'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_theme_integration">
                                    <?php _e('Theme Integration', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="checkbox" 
                                       id="blasti_configurator_theme_integration" 
                                       name="blasti_configurator_theme_integration" 
                                       value="1" 
                                       <?php checked(1, get_option('blasti_configurator_theme_integration', true)); ?> />
                                <label for="blasti_configurator_theme_integration">
                                    <?php _e('Inherit styling from active WordPress theme', 'blasti-configurator'); ?>
                                </label>
                                <p class="description">
                                    <?php _e('Makes the configurator match your theme\'s colors, fonts, and styling.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_default_theme">
                                    <?php _e('Default Theme', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <select id="blasti_configurator_default_theme" name="blasti_configurator_default_theme">
                                    <option value="default" <?php selected('default', get_option('blasti_configurator_default_theme', 'default')); ?>>
                                        <?php _e('Default', 'blasti-configurator'); ?>
                                    </option>
                                    <option value="dark" <?php selected('dark', get_option('blasti_configurator_default_theme', 'default')); ?>>
                                        <?php _e('Dark', 'blasti-configurator'); ?>
                                    </option>
                                    <option value="light" <?php selected('light', get_option('blasti_configurator_default_theme', 'default')); ?>>
                                        <?php _e('Light', 'blasti-configurator'); ?>
                                    </option>
                                    <option value="minimal" <?php selected('minimal', get_option('blasti_configurator_default_theme', 'default')); ?>>
                                        <?php _e('Minimal', 'blasti-configurator'); ?>
                                    </option>
                                </select>
                                <p class="description">
                                    <?php _e('Default theme to use when no theme is specified in the shortcode.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_default_width">
                                    <?php _e('Default Width', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="text" 
                                       id="blasti_configurator_default_width" 
                                       name="blasti_configurator_default_width" 
                                       value="<?php echo esc_attr(get_option('blasti_configurator_default_width', '100%')); ?>" 
                                       class="regular-text" />
                                <p class="description">
                                    <?php _e('Default width for the configurator (e.g., 100%, 800px, 50vw).', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_default_height">
                                    <?php _e('Default Height', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="text" 
                                       id="blasti_configurator_default_height" 
                                       name="blasti_configurator_default_height" 
                                       value="<?php echo esc_attr(get_option('blasti_configurator_default_height', '600px')); ?>" 
                                       class="regular-text" />
                                <p class="description">
                                    <?php _e('Default height for the configurator (e.g., 600px, 50vh, 400px).', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- Performance Settings Tab -->
            <div id="performance" class="blasti-tab-content">
                <div class="blasti-settings-section">
                    <h2><?php _e('Performance Settings', 'blasti-configurator'); ?></h2>
                    <p class="description"><?php _e('Optimize performance and loading times for the 3D configurator.', 'blasti-configurator'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_cache_3d_models">
                                    <?php _e('Cache 3D Models', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="checkbox" 
                                       id="blasti_configurator_cache_3d_models" 
                                       name="blasti_configurator_cache_3d_models" 
                                       value="1" 
                                       <?php checked(1, get_option('blasti_configurator_cache_3d_models', true)); ?> />
                                <label for="blasti_configurator_cache_3d_models">
                                    <?php _e('Enable browser caching for 3D models', 'blasti-configurator'); ?>
                                </label>
                                <p class="description">
                                    <?php _e('Improves loading times by caching 3D models in the browser.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_model_quality">
                                    <?php _e('Model Quality', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <select id="blasti_configurator_model_quality" name="blasti_configurator_model_quality">
                                    <option value="high" <?php selected('high', get_option('blasti_configurator_model_quality', 'medium')); ?>>
                                        <?php _e('High (Best Quality)', 'blasti-configurator'); ?>
                                    </option>
                                    <option value="medium" <?php selected('medium', get_option('blasti_configurator_model_quality', 'medium')); ?>>
                                        <?php _e('Medium (Balanced)', 'blasti-configurator'); ?>
                                    </option>
                                    <option value="low" <?php selected('low', get_option('blasti_configurator_model_quality', 'medium')); ?>>
                                        <?php _e('Low (Faster Loading)', 'blasti-configurator'); ?>
                                    </option>
                                    <option value="auto" <?php selected('auto', get_option('blasti_configurator_model_quality', 'medium')); ?>>
                                        <?php _e('Auto (Device-based)', 'blasti-configurator'); ?>
                                    </option>
                                </select>
                                <p class="description">
                                    <?php _e('Adjust model quality based on performance needs. Auto mode detects device capabilities.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_preload_models">
                                    <?php _e('Preload Models', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="checkbox" 
                                       id="blasti_configurator_preload_models" 
                                       name="blasti_configurator_preload_models" 
                                       value="1" 
                                       <?php checked(1, get_option('blasti_configurator_preload_models', false)); ?> />
                                <label for="blasti_configurator_preload_models">
                                    <?php _e('Preload popular 3D models in the background', 'blasti-configurator'); ?>
                                </label>
                                <p class="description">
                                    <?php _e('May increase initial page load time but improves configurator responsiveness.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- Advanced Settings Tab -->
            <div id="advanced" class="blasti-tab-content">
                <div class="blasti-settings-section">
                    <h2><?php _e('Advanced Settings', 'blasti-configurator'); ?></h2>
                    <p class="description"><?php _e('Advanced configuration options for developers and power users.', 'blasti-configurator'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_debug_mode">
                                    <?php _e('Debug Mode', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="checkbox" 
                                       id="blasti_configurator_debug_mode" 
                                       name="blasti_configurator_debug_mode" 
                                       value="1" 
                                       <?php checked(1, get_option('blasti_configurator_debug_mode', false)); ?> />
                                <label for="blasti_configurator_debug_mode">
                                    <?php _e('Enable debug mode and console logging', 'blasti-configurator'); ?>
                                </label>
                                <p class="description">
                                    <?php _e('Shows detailed error messages and logs in browser console. Only enable for troubleshooting.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_custom_css">
                                    <?php _e('Custom CSS', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <textarea id="blasti_configurator_custom_css" 
                                          name="blasti_configurator_custom_css" 
                                          rows="10" 
                                          cols="50" 
                                          class="large-text code"><?php echo esc_textarea(get_option('blasti_configurator_custom_css', '')); ?></textarea>
                                <p class="description">
                                    <?php _e('Add custom CSS to style the configurator. This CSS will be loaded on pages containing the configurator.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="blasti_configurator_api_endpoint">
                                    <?php _e('Custom API Endpoint', 'blasti-configurator'); ?>
                                </label>
                            </th>
                            <td>
                                <input type="url" 
                                       id="blasti_configurator_api_endpoint" 
                                       name="blasti_configurator_api_endpoint" 
                                       value="<?php echo esc_attr(get_option('blasti_configurator_api_endpoint', '')); ?>" 
                                       class="regular-text" 
                                       placeholder="https://api.example.com/configurator" />
                                <p class="description">
                                    <?php _e('Optional custom API endpoint for external product data. Leave empty to use WooCommerce data.', 'blasti-configurator'); ?>
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <?php submit_button(); ?>
        </form>
        
        <!-- Shortcode Reference -->
        <div class="blasti-shortcode-reference">
            <h2><?php _e('Shortcode Reference', 'blasti-configurator'); ?></h2>
            <p><?php _e('Use these shortcodes to display the configurator on any page or post:', 'blasti-configurator'); ?></p>
            
            <div class="blasti-shortcode-examples">
                <div class="shortcode-example">
                    <h4><?php _e('Basic Usage', 'blasti-configurator'); ?></h4>
                    <code>[blasti_configurator]</code>
                    <p><?php _e('Displays the configurator with default settings.', 'blasti-configurator'); ?></p>
                </div>
                
                <div class="shortcode-example">
                    <h4><?php _e('Custom Size', 'blasti-configurator'); ?></h4>
                    <code>[blasti_configurator width="800px" height="500px"]</code>
                    <p><?php _e('Sets custom width and height for the configurator.', 'blasti-configurator'); ?></p>
                </div>
                
                <div class="shortcode-example">
                    <h4><?php _e('Theme and Options', 'blasti-configurator'); ?></h4>
                    <code>[blasti_configurator theme="dark" show_price="false" show_cart_button="false"]</code>
                    <p><?php _e('Uses dark theme and hides price display and cart button.', 'blasti-configurator'); ?></p>
                </div>
                
                <div class="shortcode-example">
                    <h4><?php _e('All Options', 'blasti-configurator'); ?></h4>
                    <code>[blasti_configurator width="100%" height="600px" theme="default" show_price="true" show_cart_button="true" show_camera_controls="true" enable_mobile="true" max_accessories="50"]</code>
                    <p><?php _e('Shows all available shortcode attributes with their default values.', 'blasti-configurator'); ?></p>
                </div>
            </div>
        </div>
        
    </div>
</div>

<script>
jQuery(document).ready(function($) {
    // Tab switching functionality
    $('.nav-tab').on('click', function(e) {
        e.preventDefault();
        
        // Remove active class from all tabs and content
        $('.nav-tab').removeClass('nav-tab-active');
        $('.blasti-tab-content').removeClass('active');
        
        // Add active class to clicked tab
        $(this).addClass('nav-tab-active');
        
        // Show corresponding content
        var target = $(this).attr('href');
        $(target).addClass('active');
    });
});
</script>

<style>
.blasti-settings-container {
    max-width: 1200px;
}

.blasti-nav-tabs {
    border-bottom: 1px solid #ccd0d4;
    margin: 0 0 20px 0;
    padding: 0;
}

.blasti-nav-tabs li {
    display: inline-block;
    margin: 0;
}

.blasti-tab-content {
    display: none;
}

.blasti-tab-content.active {
    display: block;
}

.blasti-settings-section {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    margin-bottom: 20px;
}

.blasti-shortcode-reference {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    margin-top: 30px;
}

.blasti-shortcode-examples {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.shortcode-example {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 15px;
}

.shortcode-example h4 {
    margin: 0 0 10px 0;
    color: #23282d;
}

.shortcode-example code {
    display: block;
    background: #23282d;
    color: #f8f9fa;
    padding: 10px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    margin: 10px 0;
    word-break: break-all;
}

.shortcode-example p {
    margin: 10px 0 0 0;
    font-size: 14px;
    color: #666;
}
</style>