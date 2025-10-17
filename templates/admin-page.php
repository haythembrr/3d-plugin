<?php
/**
 * Main admin page template
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Check user capabilities
if (!current_user_can('manage_options')) {
    wp_die(__('You do not have sufficient permissions to access this page.', 'blasti-configurator'));
}
?>

<div class="wrap">
    <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
    
    <div class="blasti-admin-header">
        <div class="blasti-admin-logo">
            <img src="<?php echo esc_url(BLASTI_CONFIGURATOR_PLUGIN_URL . 'assets/images/logo.png'); ?>" alt="Blasti Configurator" style="max-height: 60px;">
        </div>
        <div class="blasti-admin-version">
            <span class="version-label"><?php _e('Version:', 'blasti-configurator'); ?></span>
            <span class="version-number"><?php echo esc_html(BLASTI_CONFIGURATOR_VERSION); ?></span>
        </div>
    </div>
    
    <div class="blasti-admin-dashboard">
        
        <!-- Quick Stats -->
        <div class="blasti-stats-grid">
            <div class="blasti-stat-card">
                <div class="stat-icon">
                    <span class="dashicons dashicons-products"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html(Blasti_Configurator_Admin::get_instance()->get_pegboard_count()); ?></h3>
                    <p><?php _e('Pegboards', 'blasti-configurator'); ?></p>
                </div>
            </div>
            
            <div class="blasti-stat-card">
                <div class="stat-icon">
                    <span class="dashicons dashicons-admin-tools"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html(Blasti_Configurator_Admin::get_instance()->get_accessory_count()); ?></h3>
                    <p><?php _e('Accessories', 'blasti-configurator'); ?></p>
                </div>
            </div>
            
            <div class="blasti-stat-card">
                <div class="stat-icon">
                    <span class="dashicons dashicons-chart-line"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html(Blasti_Configurator_Admin::get_instance()->get_configuration_count()); ?></h3>
                    <p><?php _e('Configurations Created', 'blasti-configurator'); ?></p>
                </div>
            </div>
            
            <div class="blasti-stat-card">
                <div class="stat-icon">
                    <span class="dashicons dashicons-cart"></span>
                </div>
                <div class="stat-content">
                    <h3><?php echo esc_html(Blasti_Configurator_Admin::get_instance()->get_cart_additions_count()); ?></h3>
                    <p><?php _e('Cart Additions', 'blasti-configurator'); ?></p>
                </div>
            </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="blasti-quick-actions">
            <h2><?php _e('Quick Actions', 'blasti-configurator'); ?></h2>
            
            <div class="blasti-actions-grid">
                <a href="<?php echo esc_url(admin_url('admin.php?page=blasti-configurator-settings')); ?>" class="blasti-action-card">
                    <span class="dashicons dashicons-admin-settings"></span>
                    <h3><?php _e('Configure Settings', 'blasti-configurator'); ?></h3>
                    <p><?php _e('Adjust plugin settings and preferences', 'blasti-configurator'); ?></p>
                </a>
                
                <a href="<?php echo esc_url(admin_url('admin.php?page=blasti-configurator-models')); ?>" class="blasti-action-card">
                    <span class="dashicons dashicons-format-gallery"></span>
                    <h3><?php _e('Manage 3D Models', 'blasti-configurator'); ?></h3>
                    <p><?php _e('Upload and manage 3D models for products', 'blasti-configurator'); ?></p>
                </a>
                
                <a href="<?php echo esc_url(admin_url('edit.php?post_type=product')); ?>" class="blasti-action-card">
                    <span class="dashicons dashicons-products"></span>
                    <h3><?php _e('Manage Products', 'blasti-configurator'); ?></h3>
                    <p><?php _e('Add and edit pegboards and accessories', 'blasti-configurator'); ?></p>
                </a>
                
                <a href="<?php echo esc_url(get_permalink(get_option('blasti_configurator_configurator_page_id'))); ?>" class="blasti-action-card" target="_blank">
                    <span class="dashicons dashicons-visibility"></span>
                    <h3><?php _e('View Configurator', 'blasti-configurator'); ?></h3>
                    <p><?php _e('See the configurator in action', 'blasti-configurator'); ?></p>
                </a>
            </div>
        </div>
        
        <!-- System Status -->
        <div class="blasti-system-status">
            <h2><?php _e('System Status', 'blasti-configurator'); ?></h2>
            
            <table class="widefat">
                <thead>
                    <tr>
                        <th><?php _e('Component', 'blasti-configurator'); ?></th>
                        <th><?php _e('Status', 'blasti-configurator'); ?></th>
                        <th><?php _e('Details', 'blasti-configurator'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><?php _e('WooCommerce', 'blasti-configurator'); ?></td>
                        <td>
                            <?php if (class_exists('WooCommerce')): ?>
                                <span class="blasti-status-active"><?php _e('Active', 'blasti-configurator'); ?></span>
                            <?php else: ?>
                                <span class="blasti-status-inactive"><?php _e('Not Active', 'blasti-configurator'); ?></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if (class_exists('WooCommerce')): ?>
                                <?php echo sprintf(__('Version %s', 'blasti-configurator'), WC()->version); ?>
                            <?php else: ?>
                                <?php _e('WooCommerce is required for the configurator to function properly.', 'blasti-configurator'); ?>
                            <?php endif; ?>
                        </td>
                    </tr>
                    
                    <tr>
                        <td><?php _e('Configurator Page', 'blasti-configurator'); ?></td>
                        <td>
                            <?php 
                            $page_id = get_option('blasti_configurator_configurator_page_id');
                            $page = get_post($page_id);
                            ?>
                            <?php if ($page && $page->post_status === 'publish'): ?>
                                <span class="blasti-status-active"><?php _e('Published', 'blasti-configurator'); ?></span>
                            <?php else: ?>
                                <span class="blasti-status-inactive"><?php _e('Not Found', 'blasti-configurator'); ?></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($page && $page->post_status === 'publish'): ?>
                                <a href="<?php echo esc_url(get_permalink($page_id)); ?>" target="_blank">
                                    <?php _e('View Page', 'blasti-configurator'); ?>
                                </a>
                            <?php else: ?>
                                <?php _e('The configurator page may need to be recreated.', 'blasti-configurator'); ?>
                            <?php endif; ?>
                        </td>
                    </tr>
                    
                    <tr>
                        <td><?php _e('3D Models Directory', 'blasti-configurator'); ?></td>
                        <td>
                            <?php 
                            $models_dir = BLASTI_CONFIGURATOR_PLUGIN_DIR . 'assets/models/';
                            $writable = is_writable($models_dir);
                            ?>
                            <?php if ($writable): ?>
                                <span class="blasti-status-active"><?php _e('Writable', 'blasti-configurator'); ?></span>
                            <?php else: ?>
                                <span class="blasti-status-warning"><?php _e('Not Writable', 'blasti-configurator'); ?></span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if (!$writable): ?>
                                <?php _e('Directory permissions may need to be adjusted for model uploads.', 'blasti-configurator'); ?>
                            <?php else: ?>
                                <?php _e('Ready for model uploads', 'blasti-configurator'); ?>
                            <?php endif; ?>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- Recent Activity -->
        <div class="blasti-recent-activity">
            <h2><?php _e('Recent Activity', 'blasti-configurator'); ?></h2>
            
            <div class="blasti-activity-list">
                <?php $recent_activities = Blasti_Configurator_Admin::get_instance()->get_recent_activities(); ?>
                <?php if (!empty($recent_activities)): ?>
                    <?php foreach ($recent_activities as $activity): ?>
                        <div class="blasti-activity-item">
                            <span class="activity-icon dashicons <?php echo esc_attr($activity['icon']); ?>"></span>
                            <div class="activity-content">
                                <p><?php echo esc_html($activity['message']); ?></p>
                                <small><?php echo esc_html($activity['time']); ?></small>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <p class="no-activity"><?php _e('No recent activity to display.', 'blasti-configurator'); ?></p>
                <?php endif; ?>
            </div>
        </div>
        
    </div>
</div>

<style>
.blasti-admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 20px;
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
}

.blasti-admin-version {
    font-size: 14px;
    color: #666;
}

.blasti-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.blasti-stat-card {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
}

.stat-icon {
    font-size: 24px;
    color: #0073aa;
}

.stat-content h3 {
    margin: 0;
    font-size: 24px;
    font-weight: bold;
    color: #23282d;
}

.stat-content p {
    margin: 5px 0 0 0;
    color: #666;
    font-size: 14px;
}

.blasti-actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.blasti-action-card {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
}

.blasti-action-card:hover {
    border-color: #0073aa;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    color: inherit;
    text-decoration: none;
}

.blasti-action-card .dashicons {
    font-size: 32px;
    color: #0073aa;
    margin-bottom: 10px;
}

.blasti-action-card h3 {
    margin: 10px 0 5px 0;
    color: #23282d;
}

.blasti-action-card p {
    margin: 0;
    color: #666;
    font-size: 14px;
}

.blasti-system-status,
.blasti-recent-activity {
    background: #fff;
    border: 1px solid #ccd0d4;
    border-radius: 4px;
    padding: 20px;
    margin-bottom: 20px;
}

.blasti-status-active {
    color: #46b450;
    font-weight: bold;
}

.blasti-status-inactive {
    color: #dc3232;
    font-weight: bold;
}

.blasti-status-warning {
    color: #ffb900;
    font-weight: bold;
}

.blasti-activity-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f1;
}

.blasti-activity-item:last-child {
    border-bottom: none;
}

.activity-icon {
    color: #0073aa;
    margin-top: 2px;
}

.activity-content p {
    margin: 0 0 5px 0;
}

.activity-content small {
    color: #666;
}

.no-activity {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 20px;
}
</style>