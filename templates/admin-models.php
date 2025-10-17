<?php
/**
 * Admin 3D models page template
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get products with configurator enabled
$products = get_posts(array(
    'post_type' => 'product',
    'meta_key' => '_blasti_configurator_enabled',
    'meta_value' => 'yes',
    'posts_per_page' => -1,
    'post_status' => 'any'
));
?>

<div class="wrap">
    <h1><?php _e('3D Models Management', 'blasti-configurator'); ?></h1>
    
    <div class="postbox">
        <h2 class="hndle"><?php _e('Products with 3D Models', 'blasti-configurator'); ?></h2>
        <div class="inside">
            
            <?php if (empty($products)): ?>
                <p><?php _e('No products are currently enabled for the configurator.', 'blasti-configurator'); ?></p>
                <p>
                    <a href="<?php echo admin_url('edit.php?post_type=product'); ?>" class="button">
                        <?php _e('Manage Products', 'blasti-configurator'); ?>
                    </a>
                </p>
            <?php else: ?>
                
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php _e('Product', 'blasti-configurator'); ?></th>
                            <th><?php _e('Type', 'blasti-configurator'); ?></th>
                            <th><?php _e('3D Model', 'blasti-configurator'); ?></th>
                            <th><?php _e('Dimensions', 'blasti-configurator'); ?></th>
                            <th><?php _e('Actions', 'blasti-configurator'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($products as $product_post): ?>
                            <?php
                            $product = wc_get_product($product_post->ID);
                            $product_type = get_post_meta($product->get_id(), '_blasti_product_type', true);
                            $model_url = get_post_meta($product->get_id(), '_blasti_model_url', true);
                            $dimensions = get_post_meta($product->get_id(), '_blasti_dimensions', true);
                            ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($product->get_name()); ?></strong><br>
                                    <small>ID: <?php echo $product->get_id(); ?></small>
                                </td>
                                <td>
                                    <span class="product-type-badge product-type-<?php echo esc_attr($product_type); ?>">
                                        <?php echo esc_html(ucfirst($product_type)); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php if ($model_url): ?>
                                        <a href="<?php echo esc_url($model_url); ?>" target="_blank">
                                            <?php _e('View Model', 'blasti-configurator'); ?>
                                        </a>
                                    <?php else: ?>
                                        <span style="color: #999;"><?php _e('No model', 'blasti-configurator'); ?></span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($dimensions): ?>
                                        <code><?php echo esc_html($dimensions); ?></code>
                                    <?php else: ?>
                                        <span style="color: #999;"><?php _e('Not set', 'blasti-configurator'); ?></span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <a href="<?php echo admin_url('post.php?post=' . $product->get_id() . '&action=edit'); ?>" class="button button-small">
                                        <?php _e('Edit', 'blasti-configurator'); ?>
                                    </a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                
            <?php endif; ?>
            
        </div>
    </div>
    
    <div class="postbox">
        <h2 class="hndle"><?php _e('How to Add 3D Models', 'blasti-configurator'); ?></h2>
        <div class="inside">
            <ol>
                <li><?php _e('Edit a WooCommerce product', 'blasti-configurator'); ?></li>
                <li><?php _e('In the Product Data section, check "Enable in Configurator"', 'blasti-configurator'); ?></li>
                <li><?php _e('Select the product type (Pegboard or Accessory)', 'blasti-configurator'); ?></li>
                <li><?php _e('Enter the URL to your GLB/GLTF 3D model file', 'blasti-configurator'); ?></li>
                <li><?php _e('Add dimensions in JSON format: {"width": 1.0, "height": 1.0, "depth": 0.1}', 'blasti-configurator'); ?></li>
                <li><?php _e('For accessories, list compatible pegboard product IDs', 'blasti-configurator'); ?></li>
                <li><?php _e('Save the product', 'blasti-configurator'); ?></li>
            </ol>
            
            <p>
                <a href="<?php echo admin_url('edit.php?post_type=product'); ?>" class="button button-primary">
                    <?php _e('Manage Products', 'blasti-configurator'); ?>
                </a>
            </p>
        </div>
    </div>
</div>

<style>
.product-type-badge {
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
}
.product-type-pegboard {
    background: #e7f3ff;
    color: #0073aa;
}
.product-type-accessory {
    background: #f0f6fc;
    color: #2c3e50;
}
</style>