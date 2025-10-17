<?php
/**
 * Configurator template
 * Handles display of the 3D configurator interface
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Build container classes
$container_classes = array('blasti-configurator');
$container_classes[] = 'theme-' . esc_attr($atts['theme']);

if (!empty($atts['container_class'])) {
    $container_classes[] = esc_attr($atts['container_class']);
}

if ($atts['enable_mobile'] && wp_is_mobile()) {
    $container_classes[] = 'mobile-enabled';
}

// Generate unique ID for this configurator instance
$configurator_id = 'blasti-configurator-' . uniqid();
?>

<div id="<?php echo esc_attr($configurator_id); ?>" 
     class="blasti-configurator-container <?php echo esc_attr(implode(' ', $container_classes)); ?>" 
     style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;"
     data-max-accessories="<?php echo esc_attr($atts['max_accessories']); ?>"
     data-default-pegboard="<?php echo esc_attr($atts['default_pegboard']); ?>"
     data-theme="<?php echo esc_attr($atts['theme']); ?>">
    
    <!-- Loading screen -->
    <div class="configurator-loading">
        <div class="loading-spinner"></div>
        <p><?php echo esc_html($atts['loading_text']); ?></p>
    </div>
    
    <!-- Main configurator interface -->
    <div id="configurator-interface" class="configurator-interface">
        
        <!-- 3D Scene container -->
        <div id="configurator-scene" class="configurator-scene">
            <!-- Three.js canvas will be inserted here -->
        </div>
        
        <!-- Control panels -->
        <div class="configurator-controls">
            
            <!-- Pegboard selection panel -->
            <div id="pegboard-panel" class="control-panel">
                <h3><?php _e('Select Pegboard', 'blasti-configurator'); ?></h3>
                <div id="pegboard-list" class="product-list">
                    <!-- Pegboard options will be loaded here -->
                </div>
            </div>
            
            <!-- Accessory selection panel -->
            <div id="accessory-panel" class="control-panel">
                <div class="control-panel-header">
                    <h3><?php _e('Add Accessories', 'blasti-configurator'); ?></h3>
                    <button class="toggle-filters-btn" id="toggle-filters-btn" type="button">
                        <?php _e('Filters', 'blasti-configurator'); ?>
                    </button>
                </div>
                
                <!-- Accessory filters -->
                <div id="accessory-filters" class="accessory-filters" style="display: none;">
                    <div class="filter-group">
                        <label class="filter-label"><?php _e('Search', 'blasti-configurator'); ?></label>
                        <input type="text" 
                               id="accessory-search" 
                               class="filter-search" 
                               placeholder="<?php esc_attr_e('Search accessories...', 'blasti-configurator'); ?>">
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label"><?php _e('Category', 'blasti-configurator'); ?></label>
                        <div class="filter-buttons" id="category-filters">
                            <button class="filter-btn active" data-category="all" type="button">
                                <?php _e('All', 'blasti-configurator'); ?>
                            </button>
                            <!-- Category buttons will be dynamically added here -->
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label"><?php _e('Compatibility', 'blasti-configurator'); ?></label>
                        <div class="filter-buttons">
                            <button class="filter-btn active" id="filter-compatible" data-filter="compatible" type="button">
                                <?php _e('Compatible Only', 'blasti-configurator'); ?>
                            </button>
                            <button class="filter-btn" id="filter-all" data-filter="all" type="button">
                                <?php _e('Show All', 'blasti-configurator'); ?>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="accessory-count"></div>
                
                <div id="accessory-list" class="product-list">
                    <!-- Accessory options will be loaded here -->
                </div>
            </div>
            
            <!-- Configuration summary panel -->
            <div id="summary-panel" class="control-panel">
                <h3><?php _e('Your Configuration', 'blasti-configurator'); ?></h3>
                
                <!-- Current pegboard -->
                <div id="current-pegboard" class="current-selection">
                    <p><?php _e('No pegboard selected', 'blasti-configurator'); ?></p>
                </div>
                
                <!-- Placed accessories -->
                <div id="placed-accessories" class="placed-items">
                    <!-- Placed accessories will be listed here -->
                </div>
                
                <!-- Price display -->
                <?php if ($atts['show_price']): ?>
                <div class="price-display">
                    <div class="price-label"><?php _e('Total:', 'blasti-configurator'); ?></div>
                    <div class="price-amount">$0.00</div>
                    <div class="price-breakdown">
                        <!-- Price breakdown will be populated by JavaScript -->
                    </div>
                </div>
                <?php endif; ?>
                
                <!-- Add to cart button -->
                <?php if ($atts['show_cart_button']): ?>
                <button class="add-to-cart-btn" disabled>
                    <?php _e('Add to Cart', 'blasti-configurator'); ?>
                </button>
                <?php endif; ?>
                
                <!-- Configuration actions -->
                <?php if ($atts['show_save_config']): ?>
                <div class="configuration-actions">
                    <button class="save-config-btn">
                        <?php _e('Save Configuration', 'blasti-configurator'); ?>
                    </button>
                    <button class="reset-config-btn">
                        <?php _e('Reset', 'blasti-configurator'); ?>
                    </button>
                </div>
                <?php endif; ?>
            </div>
            
        </div>
        
        <!-- Camera controls -->
        <?php if ($atts['show_camera_controls']): ?>
        <div class="camera-controls">
            <!-- Camera angle buttons will be added by JavaScript -->
        </div>
        <?php endif; ?>
        
    </div>
    
    <!-- Error messages -->
    <div class="configurator-messages">
        <!-- Error and success messages will be displayed here -->
    </div>
    
</div>

<script type="text/javascript">
// Initialize configurator when DOM is ready
jQuery(document).ready(function($) {
    console.log('Blasti Configurator: Template script loaded');
    console.log('jQuery available:', typeof $ !== 'undefined');
    console.log('THREE available:', typeof THREE !== 'undefined');
    console.log('THREE.OrbitControls available:', typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined');
    console.log('BlastiConfigurator available:', typeof BlastiConfigurator !== 'undefined');
    
    if (typeof BlastiConfigurator !== 'undefined') {
        console.log('Blasti Configurator: Initializing...');
        
        try {
            // CRITICAL: Show interface FIRST so container has dimensions
            // Use opacity transition instead of display:none to maintain layout
            const $interface = $('#<?php echo esc_js($configurator_id); ?> .configurator-interface');
            const $scene = $('#<?php echo esc_js($configurator_id); ?> #configurator-scene');
            
            console.log('🔍 Before showing interface:', {
                interfaceDisplay: $interface.css('display'),
                interfaceOpacity: $interface.css('opacity'),
                sceneWidth: $scene.width(),
                sceneHeight: $scene.height(),
                sceneOffsetWidth: $scene[0] ? $scene[0].offsetWidth : 'N/A',
                sceneOffsetHeight: $scene[0] ? $scene[0].offsetHeight : 'N/A'
            });
            
            $interface.addClass('loaded');
            console.log('Blasti Configurator: Interface shown (loaded class added)');
            
            console.log('🔍 After showing interface:', {
                interfaceDisplay: $interface.css('display'),
                interfaceOpacity: $interface.css('opacity'),
                sceneWidth: $scene.width(),
                sceneHeight: $scene.height(),
                sceneOffsetWidth: $scene[0] ? $scene[0].offsetWidth : 'N/A',
                sceneOffsetHeight: $scene[0] ? $scene[0].offsetHeight : 'N/A'
            });
            
            // Wait for browser to paint the interface, then initialize
            setTimeout(function() {
                console.log('🔍 Before init (after 50ms delay):', {
                    sceneWidth: $scene.width(),
                    sceneHeight: $scene.height(),
                    sceneOffsetWidth: $scene[0] ? $scene[0].offsetWidth : 'N/A',
                    sceneOffsetHeight: $scene[0] ? $scene[0].offsetHeight : 'N/A'
                });
                
                BlastiConfigurator.init();
                console.log('Blasti Configurator: Init called successfully');
                
                // Hide loading screen after initialization
                $('#<?php echo esc_js($configurator_id); ?> .configurator-loading').fadeOut();
            }, 50);
            
        } catch (error) {
            console.error('Blasti Configurator: Initialization error:', error);
            $('#<?php echo esc_js($configurator_id); ?> .configurator-loading').html(
                '<div class="error-message">Error: ' + error.message + '</div>'
            );
        }
        
    } else {
        console.error('Blasti Configurator: BlastiConfigurator object not found');
        console.log('Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('blasti')));
        
        // Show error message to user
        $('#<?php echo esc_js($configurator_id); ?> .configurator-loading').html(
            '<div class="error-message"><?php echo esc_js(__('Failed to load configurator. Please refresh the page.', 'blasti-configurator')); ?></div>'
        );
    }
});
</script>