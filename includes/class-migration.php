<?php
/**
 * Data Migration for Phase 1: Enhanced Data Model
 * Migrates existing products from v1 schema to v2 enhanced schema
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Blasti_Configurator_Migration {

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
        // Private constructor for singleton
    }

    /**
     * Run migration to v2 enhanced schema
     *
     * @return array Migration results with success/failure counts
     */
    public function migrate_to_v2() {
        $results = array(
            'success' => 0,
            'failed' => 0,
            'skipped' => 0,
            'errors' => array(),
            'migrated_products' => array()
        );

        // Get all products with configurator enabled
        $args = array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => '_blasti_configurator_enabled',
                    'value' => 'yes',
                    'compare' => '='
                )
            ),
            'fields' => 'ids'
        );

        $product_ids = get_posts($args);

        if (empty($product_ids)) {
            $results['message'] = __('No products found to migrate.', 'blasti-configurator');
            return $results;
        }

        foreach ($product_ids as $product_id) {
            $migration_result = $this->migrate_product($product_id);

            if ($migration_result['status'] === 'success') {
                $results['success']++;
                $results['migrated_products'][] = array(
                    'id' => $product_id,
                    'name' => get_the_title($product_id),
                    'type' => $migration_result['type']
                );
            } elseif ($migration_result['status'] === 'skipped') {
                $results['skipped']++;
            } else {
                $results['failed']++;
                $results['errors'][] = array(
                    'product_id' => $product_id,
                    'product_name' => get_the_title($product_id),
                    'error' => $migration_result['error']
                );
            }
        }

        // Clear product cache after migration
        if ($results['success'] > 0) {
            $woocommerce = Blasti_Configurator_WooCommerce::get_instance();
            $woocommerce->clear_product_cache();
        }

        $results['message'] = sprintf(
            __('Migration complete: %d succeeded, %d failed, %d skipped', 'blasti-configurator'),
            $results['success'],
            $results['failed'],
            $results['skipped']
        );

        return $results;
    }

    /**
     * Migrate a single product
     *
     * @param int $product_id Product ID
     * @return array Migration result for this product
     */
    private function migrate_product($product_id) {
        $product_type = get_post_meta($product_id, '_blasti_product_type', true);

        // Skip if already migrated
        $existing_v2 = get_post_meta($product_id, '_blasti_dimensions_v2', true);
        if (!empty($existing_v2)) {
            return array(
                'status' => 'skipped',
                'reason' => 'Already migrated'
            );
        }

        // Skip if product type not set
        if (empty($product_type)) {
            return array(
                'status' => 'failed',
                'error' => __('Product type not set', 'blasti-configurator')
            );
        }

        if ($product_type === 'pegboard') {
            return $this->migrate_pegboard($product_id);
        } elseif ($product_type === 'accessory') {
            return $this->migrate_accessory($product_id);
        } else {
            return array(
                'status' => 'failed',
                'error' => sprintf(__('Unknown product type: %s', 'blasti-configurator'), $product_type)
            );
        }
    }

    /**
     * Migrate a pegboard product to v2 schema
     *
     * @param int $product_id Pegboard product ID
     * @return array Migration result
     */
    private function migrate_pegboard($product_id) {
        try {
            // Get existing dimensions
            $dimensions_json = get_post_meta($product_id, '_blasti_dimensions', true);
            $dimensions = !empty($dimensions_json) ? json_decode($dimensions_json, true) : null;

            if (!$dimensions || !isset($dimensions['width']) || !isset($dimensions['height'])) {
                return array(
                    'status' => 'failed',
                    'error' => __('Missing or invalid dimensions', 'blasti-configurator')
                );
            }

            // Create enhanced dimensions v2 with standard peg hole grid
            $dimensions_v2 = array(
                'version' => '2.0',
                'dimensions' => array(
                    'width' => floatval($dimensions['width']),
                    'height' => floatval($dimensions['height']),
                    'depth' => isset($dimensions['depth']) ? floatval($dimensions['depth']) : 0.02
                ),
                'pegHoleGrid' => array(
                    'pattern' => 'uniform',
                    'spacing' => 0.0254, // Standard 1-inch spacing
                    'diameter' => 0.0064, // 1/4 inch = 6.4mm
                    'depth' => 0.015, // 15mm insertion depth
                    'rows' => $this->calculate_grid_rows($dimensions['height'], 0.0254),
                    'cols' => $this->calculate_grid_cols($dimensions['width'], 0.0254)
                ),
                'geometry' => array(
                    'frontFaceNormal' => array('x' => 0, 'y' => 0, 'z' => 1),
                    'initialRotation' => array('x' => 0, 'y' => 0, 'z' => 0)
                )
            );

            // Generate peg holes array based on grid
            $peg_holes = $this->generate_peg_holes(
                $dimensions_v2['pegHoleGrid']['cols'],
                $dimensions_v2['pegHoleGrid']['rows'],
                $dimensions_v2['pegHoleGrid']['spacing'],
                $dimensions_v2['dimensions']['width'],
                $dimensions_v2['dimensions']['height']
            );

            // Save enhanced dimensions
            update_post_meta($product_id, '_blasti_dimensions_v2', json_encode($dimensions_v2));

            // Save peg holes
            update_post_meta($product_id, '_blasti_peg_holes', json_encode($peg_holes));

            return array(
                'status' => 'success',
                'type' => 'pegboard',
                'enhanced_dimensions' => $dimensions_v2,
                'peg_holes_count' => count($peg_holes)
            );

        } catch (Exception $e) {
            return array(
                'status' => 'failed',
                'error' => $e->getMessage()
            );
        }
    }

    /**
     * Migrate an accessory product to v2 schema
     *
     * @param int $product_id Accessory product ID
     * @return array Migration result
     */
    private function migrate_accessory($product_id) {
        try {
            // Create default single-peg configuration for accessories
            // Users will need to update this manually for multi-peg accessories
            $peg_config = array(
                'pegCount' => 1,
                'pegs' => array(
                    array(
                        'id' => 'peg_0',
                        'localPosition' => array('x' => 0, 'y' => 0, 'z' => 0),
                        'diameter' => 0.006, // 6mm standard
                        'length' => 0.012, // 12mm standard insertion
                        'insertionDirection' => array('x' => 0, 'y' => 0, 'z' => -1)
                    )
                ),
                'mounting' => array(
                    'surface' => 'back',
                    'surfaceOffset' => 0.002, // 2mm default offset
                    'flushOffset' => 0.001, // 1mm flush tolerance
                    'requiresAllPegs' => true,
                    'allowableRotations' => array(0) // No rotation by default
                )
            );

            // Save peg configuration
            update_post_meta($product_id, '_blasti_peg_config', json_encode($peg_config));

            return array(
                'status' => 'success',
                'type' => 'accessory',
                'peg_config' => $peg_config,
                'note' => __('Default single-peg config created. Update manually for multi-peg accessories.', 'blasti-configurator')
            );

        } catch (Exception $e) {
            return array(
                'status' => 'failed',
                'error' => $e->getMessage()
            );
        }
    }

    /**
     * Calculate number of rows based on height and spacing
     *
     * @param float $height Board height in meters
     * @param float $spacing Peg hole spacing in meters
     * @return int Number of rows
     */
    private function calculate_grid_rows($height, $spacing) {
        return max(1, floor($height / $spacing));
    }

    /**
     * Calculate number of columns based on width and spacing
     *
     * @param float $width Board width in meters
     * @param float $spacing Peg hole spacing in meters
     * @return int Number of columns
     */
    private function calculate_grid_cols($width, $spacing) {
        return max(1, floor($width / $spacing));
    }

    /**
     * Generate peg holes array for a uniform grid
     *
     * @param int $cols Number of columns
     * @param int $rows Number of rows
     * @param float $spacing Spacing between holes
     * @param float $board_width Total board width
     * @param float $board_height Total board height
     * @return array Array of peg hole positions
     */
    private function generate_peg_holes($cols, $rows, $spacing, $board_width, $board_height) {
        $holes = array();

        // Calculate starting offset to center the grid
        $grid_width = ($cols - 1) * $spacing;
        $grid_height = ($rows - 1) * $spacing;
        $start_x = -$grid_width / 2;
        $start_y = -$grid_height / 2;

        for ($row = 0; $row < $rows; $row++) {
            for ($col = 0; $col < $cols; $col++) {
                $holes[] = array(
                    'x' => round($start_x + ($col * $spacing), 6),
                    'y' => round($start_y + ($row * $spacing), 6),
                    'z' => 0 // Front face of pegboard
                );
            }
        }

        return $holes;
    }

    /**
     * Rollback migration (remove v2 fields)
     *
     * @param int $product_id Product ID to rollback
     * @return bool Success status
     */
    public function rollback_product($product_id) {
        delete_post_meta($product_id, '_blasti_dimensions_v2');
        delete_post_meta($product_id, '_blasti_peg_config');
        delete_post_meta($product_id, '_blasti_peg_holes');

        return true;
    }

    /**
     * Rollback all migrations
     *
     * @return array Rollback results
     */
    public function rollback_all() {
        $results = array(
            'success' => 0,
            'failed' => 0
        );

        // Get all products with v2 data
        $args = array(
            'post_type' => 'product',
            'post_status' => 'any',
            'posts_per_page' => -1,
            'meta_query' => array(
                'relation' => 'OR',
                array(
                    'key' => '_blasti_dimensions_v2',
                    'compare' => 'EXISTS'
                ),
                array(
                    'key' => '_blasti_peg_config',
                    'compare' => 'EXISTS'
                ),
                array(
                    'key' => '_blasti_peg_holes',
                    'compare' => 'EXISTS'
                )
            ),
            'fields' => 'ids'
        );

        $product_ids = get_posts($args);

        foreach ($product_ids as $product_id) {
            if ($this->rollback_product($product_id)) {
                $results['success']++;
            } else {
                $results['failed']++;
            }
        }

        // Clear cache
        if ($results['success'] > 0) {
            $woocommerce = Blasti_Configurator_WooCommerce::get_instance();
            $woocommerce->clear_product_cache();
        }

        $results['message'] = sprintf(
            __('Rollback complete: %d products reverted', 'blasti-configurator'),
            $results['success']
        );

        return $results;
    }

    /**
     * Get migration status
     *
     * @return array Migration status information
     */
    public function get_migration_status() {
        // Count total configurator products
        $total_products = count(get_posts(array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => '_blasti_configurator_enabled',
                    'value' => 'yes',
                    'compare' => '='
                )
            ),
            'fields' => 'ids'
        )));

        // Count migrated products
        $migrated_products = count(get_posts(array(
            'post_type' => 'product',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'meta_query' => array(
                'relation' => 'AND',
                array(
                    'key' => '_blasti_configurator_enabled',
                    'value' => 'yes',
                    'compare' => '='
                ),
                array(
                    'relation' => 'OR',
                    array(
                        'key' => '_blasti_dimensions_v2',
                        'compare' => 'EXISTS'
                    ),
                    array(
                        'key' => '_blasti_peg_config',
                        'compare' => 'EXISTS'
                    )
                )
            ),
            'fields' => 'ids'
        )));

        return array(
            'total_products' => $total_products,
            'migrated_products' => $migrated_products,
            'pending_migration' => $total_products - $migrated_products,
            'migration_complete' => ($total_products > 0 && $migrated_products === $total_products)
        );
    }
}
