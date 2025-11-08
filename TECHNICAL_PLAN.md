# Technical Implementation Plan
## Blasti 3D Configurator - Roadmap to Target State

**Version**: 1.0
**Date**: 2025-11-08
**Reference**: GAP_ANALYSIS.md

---

## Table of Contents

1. [Implementation Overview](#implementation-overview)
2. [Phase 1: Data Model Enhancement](#phase-1-data-model-enhancement)
3. [Phase 2: Peg-Hole System](#phase-2-peg-hole-system)
4. [Phase 3: Placement Precision](#phase-3-placement-precision)
5. [Phase 4: Visual Feedback](#phase-4-visual-feedback)
6. [Phase 5: Multi-Pegboard Support](#phase-5-multi-pegboard-support)
7. [Phase 6: Performance & Polish](#phase-6-performance--polish)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)

---

## Implementation Overview

### Phased Approach

This plan uses a **6-phase incremental implementation** strategy to minimize risk and allow for testing at each stage.

```
Phase 1: Data Model Enhancement (1-2 days)
    ↓
Phase 2: Peg-Hole System (3-4 days)
    ↓
Phase 3: Placement Precision (2-3 days)
    ↓
Phase 4: Visual Feedback (2-3 days)
    ↓
Phase 5: Multi-Pegboard Support (3-4 days)
    ↓
Phase 6: Performance & Polish (2-3 days)
```

**Total Estimated Time**: 13-19 days

### Dependencies

```
[External]
- Three.js (already included)
- WordPress/WooCommerce (already required)

[New - Optional]
- three-mesh-bvh (for advanced collision detection)
- lodash (for utility functions)
```

### Backwards Compatibility

- All changes will be backwards compatible
- Existing products without peg data will use fallback behavior
- Migration script provided for existing configurations

---

## Phase 1: Data Model Enhancement

**Duration**: 1-2 days
**Priority**: CRITICAL
**Effort**: HIGH

### Objectives

1. Add peg configuration fields to products
2. Add pegboard hole data fields
3. Create database migration
4. Update admin UI

### 1.1 Database Schema Updates

**File**: `blasti-configurator.php`

Add new meta fields to product save handler:

```php
// In class-woocommerce.php, add to save_product_fields()

public function save_product_fields($post_id) {
    // Existing fields...

    // NEW: Save peg configuration for accessories
    if (isset($_POST['_blasti_peg_config'])) {
        $peg_config = sanitize_textarea_field($_POST['_blasti_peg_config']);

        // Validate JSON
        $decoded = json_decode($peg_config, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            update_post_meta($post_id, '_blasti_peg_config', $peg_config);
        } else {
            add_action('admin_notices', function() {
                echo '<div class="error"><p>Invalid peg configuration JSON</p></div>';
            });
        }
    }

    // NEW: Save enhanced dimensions
    if (isset($_POST['_blasti_dimensions_v2'])) {
        $dimensions = sanitize_textarea_field($_POST['_blasti_dimensions_v2']);
        $decoded = json_decode($dimensions, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            update_post_meta($post_id, '_blasti_dimensions_v2', $dimensions);
        }
    }

    // NEW: Save peg hole data for pegboards
    if (isset($_POST['_blasti_peg_holes'])) {
        $peg_holes = sanitize_textarea_field($_POST['_blasti_peg_holes']);
        $decoded = json_decode($peg_holes, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            update_post_meta($post_id, '_blasti_peg_holes', $peg_holes);
        }
    }

    // Clear product cache
    $this->clear_product_cache();
}
```

### 1.2 Admin UI Updates

**File**: `includes/class-woocommerce.php` → `add_product_fields()`

Add new form fields:

```php
public function add_product_fields() {
    global $post;

    echo '<div class="options_group blasti-configurator-fields">';

    // Existing fields...

    // === NEW FIELDS ===

    // Product Type - Enhanced
    woocommerce_wp_select(array(
        'id' => '_blasti_product_type',
        'label' => __('Product Type', 'blasti-configurator'),
        'options' => array(
            '' => __('Select type...', 'blasti-configurator'),
            'pegboard' => __('Pegboard', 'blasti-configurator'),
            'accessory' => __('Accessory', 'blasti-configurator')
        ),
        'description' => __('Select whether this is a pegboard or accessory', 'blasti-configurator')
    ));

    // Dimensions V2 (Enhanced)
    woocommerce_wp_textarea_input(array(
        'id' => '_blasti_dimensions_v2',
        'label' => __('Dimensions (Enhanced JSON)', 'blasti-configurator'),
        'description' => __('See documentation for full schema. Example:<br>
            <code>{"width": 0.22, "height": 0.44, "depth": 0.02, "pegHoleSpacing": 0.0254}</code>', 'blasti-configurator'),
        'rows' => 4
    ));

    // Peg Holes (for Pegboards)
    echo '<div class="blasti-pegboard-fields" style="display: none;">';

    woocommerce_wp_textarea_input(array(
        'id' => '_blasti_peg_holes',
        'label' => __('Peg Holes (Optional)', 'blasti-configurator'),
        'description' => __('Leave blank for auto-generated uniform grid. Or specify custom hole positions as JSON array:<br>
            <code>[{"x": -0.11, "y": -0.22, "z": 0.01, "diameter": 0.0064}, ...]</code>', 'blasti-configurator'),
        'rows' => 6
    ));

    echo '</div>';

    // Peg Configuration (for Accessories)
    echo '<div class="blasti-accessory-fields" style="display: none;">';

    woocommerce_wp_textarea_input(array(
        'id' => '_blasti_peg_config',
        'label' => __('Peg Configuration (Required)', 'blasti-configurator'),
        'description' => __('JSON configuration for accessory pegs. Example:<br>
            <code>{
                "pegCount": 2,
                "pegs": [
                    {"localPosition": {"x": 0, "y": 0.0254, "z": 0}, "diameter": 0.006, "length": 0.012},
                    {"localPosition": {"x": 0, "y": -0.0254, "z": 0}, "diameter": 0.006, "length": 0.012}
                ],
                "flushOffset": 0.001
            }</code>', 'blasti-configurator'),
        'rows' => 10,
        'class' => 'blasti-required-field'
    ));

    echo '</div>';

    // Add JavaScript to show/hide fields based on product type
    ?>
    <script>
    jQuery(document).ready(function($) {
        function toggleProductTypeFields() {
            var productType = $('#_blasti_product_type').val();

            if (productType === 'pegboard') {
                $('.blasti-pegboard-fields').show();
                $('.blasti-accessory-fields').hide();
            } else if (productType === 'accessory') {
                $('.blasti-pegboard-fields').hide();
                $('.blasti-accessory-fields').show();
            } else {
                $('.blasti-pegboard-fields').hide();
                $('.blasti-accessory-fields').hide();
            }
        }

        $('#_blasti_product_type').on('change', toggleProductTypeFields);
        toggleProductTypeFields();
    });
    </script>
    <?php

    echo '</div>';
}
```

### 1.3 Data Migration Script

**Create**: `includes/class-migration.php`

```php
<?php
/**
 * Migrate existing products to new data model
 */

class Blasti_Configurator_Migration {

    public static function migrate_to_v2() {
        $products = get_posts(array(
            'post_type' => 'product',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => '_blasti_configurator_enabled',
                    'value' => 'yes'
                )
            )
        ));

        $migrated = 0;
        $errors = 0;

        foreach ($products as $product) {
            $product_id = $product->ID;
            $product_type = get_post_meta($product_id, '_blasti_product_type', true);

            // Migrate dimensions
            $old_dimensions = get_post_meta($product_id, '_blasti_dimensions', true);
            if ($old_dimensions && !get_post_meta($product_id, '_blasti_dimensions_v2', true)) {
                $old_data = json_decode($old_dimensions, true);

                // Create enhanced dimensions
                $new_dimensions = array(
                    'version' => '2.0',
                    'dimensions' => $old_data,
                    'pegHoleGrid' => array(
                        'pattern' => 'uniform',
                        'spacing' => 0.0254, // Default 1 inch
                        'diameter' => 0.0064, // Default 1/4 inch
                        'depth' => 0.015 // Default 15mm
                    )
                );

                update_post_meta($product_id, '_blasti_dimensions_v2', json_encode($new_dimensions));
                $migrated++;
            }

            // Generate default peg config for accessories
            if ($product_type === 'accessory' && !get_post_meta($product_id, '_blasti_peg_config', true)) {
                // Create single-peg default
                $default_peg_config = array(
                    'pegCount' => 1,
                    'pegs' => array(
                        array(
                            'localPosition' => array('x' => 0, 'y' => 0, 'z' => 0),
                            'diameter' => 0.006,
                            'length' => 0.012,
                            'insertionDirection' => array('x' => 0, 'y' => 0, 'z' => -1)
                        )
                    ),
                    'mounting' => array(
                        'surface' => 'back',
                        'flushOffset' => 0.001
                    ),
                    'note' => 'Auto-generated default - please review and update'
                );

                update_post_meta($product_id, '_blasti_peg_config', json_encode($default_peg_config));
                $migrated++;
            }
        }

        return array(
            'success' => true,
            'migrated' => $migrated,
            'errors' => $errors,
            'total' => count($products)
        );
    }
}
```

Add migration trigger in admin:

```php
// Add to class-admin.php

public function add_admin_menu() {
    // ... existing menus

    add_submenu_page(
        'blasti-configurator',
        __('Migration', 'blasti-configurator'),
        __('Migration', 'blasti-configurator'),
        'manage_options',
        'blasti-configurator-migration',
        array($this, 'migration_page')
    );
}

public function migration_page() {
    if (!current_user_can('manage_options')) {
        wp_die(__('Unauthorized', 'blasti-configurator'));
    }

    if (isset($_POST['run_migration'])) {
        check_admin_referer('blasti_migration');

        require_once BLASTI_CONFIGURATOR_PLUGIN_DIR . 'includes/class-migration.php';
        $result = Blasti_Configurator_Migration::migrate_to_v2();

        echo '<div class="notice notice-success"><p>';
        echo sprintf(__('Migration complete! Migrated %d products.', 'blasti-configurator'), $result['migrated']);
        echo '</p></div>';
    }

    ?>
    <div class="wrap">
        <h1><?php _e('Data Migration', 'blasti-configurator'); ?></h1>

        <div class="card">
            <h2>Migrate to Enhanced Data Model</h2>
            <p>This will update all existing products to use the new data structure.</p>
            <p><strong>Note:</strong> This is safe to run multiple times.</p>

            <form method="post">
                <?php wp_nonce_field('blasti_migration'); ?>
                <button type="submit" name="run_migration" class="button button-primary">
                    Run Migration
                </button>
            </form>
        </div>
    </div>
    <?php
}
```

### 1.4 Update AJAX Handlers

**File**: `includes/class-woocommerce.php`

Update `get_product_by_id()` and `get_configurator_products()`:

```php
public function get_product_by_id($product_id) {
    // ... existing code

    // NEW: Include enhanced metadata
    $dimensions_v2 = get_post_meta($product_id, '_blasti_dimensions_v2', true);
    $peg_config = get_post_meta($product_id, '_blasti_peg_config', true);
    $peg_holes = get_post_meta($product_id, '_blasti_peg_holes', true);

    $product_data = array(
        // ... existing fields

        // Enhanced fields
        'dimensions_v2' => $dimensions_v2 ? json_decode($dimensions_v2, true) : null,
        'peg_config' => $peg_config ? json_decode($peg_config, true) : null,
        'peg_holes' => $peg_holes ? json_decode($peg_holes, true) : null,

        // Fallback to old dimensions if v2 not available
        'dimensions' => $dimensions_v2 ?
            json_decode($dimensions_v2, true)['dimensions'] :
            $this->parse_dimensions($dimensions_json)
    );

    return $product_data;
}
```

### Phase 1 Deliverables

- [x] New database fields
- [x] Admin UI for peg configuration
- [x] Migration script
- [x] Updated AJAX endpoints
- [x] Documentation for new fields

### Phase 1 Testing

```
Test 1: Create new pegboard product
  - Enter peg hole data
  - Verify saves correctly
  - Check AJAX returns new fields

Test 2: Create new accessory product
  - Enter peg configuration
  - Verify JSON validation
  - Check admin UI shows/hides fields correctly

Test 3: Migration
  - Run migration on test database
  - Verify existing products get defaults
  - Confirm no data loss

Test 4: Backwards compatibility
  - Products without new fields should still load
  - Old configurations should still work
```

---

## Phase 2: Peg-Hole System

**Duration**: 3-4 days
**Priority**: CRITICAL
**Effort**: HIGH

### Objectives

1. Implement peg-hole matching algorithm
2. Create peg validation system
3. Update grid system to use actual holes
4. Implement multi-peg placement

### 2.1 Create Peg-Hole Engine

**Create**: `assets/js/modules/peg-system.js`

```javascript
/**
 * Blasti Peg-Hole System
 * Handles peg-to-hole validation and positioning
 */

(function(window) {
    'use strict';

    const BlastiPegSystem = {

        /**
         * Find compatible peg hole groups for an accessory
         */
        findCompatiblePegHoles: function(pegConfig, availableHoles, primaryHole, tolerance = 0.002) {
            if (!pegConfig || !pegConfig.pegs || pegConfig.pegs.length === 0) {
                return [];
            }

            const validGroups = [];
            const pegs = pegConfig.pegs;

            // If single peg, just return holes within tolerance
            if (pegs.length === 1) {
                const closestHole = this.findClosestHole(primaryHole, availableHoles);
                if (closestHole && closestHole.distanceTo(primaryHole) <= tolerance) {
                    return [[closestHole]];
                }
                return [];
            }

            // Multi-peg: find patterns that match
            for (let startHole of availableHoles) {
                const holeGroup = [startHole];
                let allPegsMatch = true;

                // Calculate expected positions for other pegs
                for (let i = 1; i < pegs.length; i++) {
                    const pegOffset = new THREE.Vector3()
                        .copy(pegs[i].localPosition)
                        .sub(pegs[0].localPosition);

                    const expectedHolePos = new THREE.Vector3()
                        .copy(startHole)
                        .add(pegOffset);

                    const closestHole = this.findClosestHole(expectedHolePos, availableHoles);

                    if (!closestHole || closestHole.distanceTo(expectedHolePos) > tolerance) {
                        allPegsMatch = false;
                        break;
                    }

                    // Make sure we haven't already used this hole
                    if (holeGroup.some(h => h.distanceTo(closestHole) < 0.001)) {
                        allPegsMatch = false;
                        break;
                    }

                    holeGroup.push(closestHole);
                }

                if (allPegsMatch && holeGroup.length === pegs.length) {
                    validGroups.push(holeGroup);
                }
            }

            return validGroups;
        },

        /**
         * Find closest peg hole to a position
         */
        findClosestHole: function(position, holes) {
            if (!holes || holes.length === 0) return null;

            let closest = null;
            let minDist = Infinity;

            for (let hole of holes) {
                const holePos = hole instanceof THREE.Vector3 ?
                    hole : new THREE.Vector3(hole.x, hole.y, hole.z);

                const dist = position.distanceTo(holePos);
                if (dist < minDist) {
                    minDist = dist;
                    closest = holePos;
                }
            }

            return closest;
        },

        /**
         * Validate if all pegs can be inserted into holes
         */
        validatePegPlacement: function(pegConfig, holeGroup, pegboardMeta) {
            const validation = {
                valid: true,
                errors: [],
                pegStatus: []
            };

            if (!pegConfig || !pegConfig.pegs) {
                validation.valid = false;
                validation.errors.push('NO_PEG_CONFIG');
                return validation;
            }

            if (pegConfig.pegs.length !== holeGroup.length) {
                validation.valid = false;
                validation.errors.push('PEG_HOLE_COUNT_MISMATCH');
                return validation;
            }

            // Validate each peg
            for (let i = 0; i < pegConfig.pegs.length; i++) {
                const peg = pegConfig.pegs[i];
                const hole = holeGroup[i];

                const pegStatus = {
                    pegIndex: i,
                    valid: true,
                    errors: []
                };

                // Check peg diameter vs hole diameter
                const holeDiameter = pegboardMeta.pegHoleDiameter || 0.0064;
                if (peg.diameter > holeDiameter) {
                    pegStatus.valid = false;
                    pegStatus.errors.push('PEG_TOO_LARGE');
                    validation.valid = false;
                }

                // Check peg length vs hole depth
                const holeDepth = pegboardMeta.pegHoleDepth || 0.015;
                if (peg.length > holeDepth) {
                    pegStatus.valid = false;
                    pegStatus.errors.push('PEG_TOO_LONG');
                    validation.valid = false;
                }

                // Check alignment (peg direction should match hole direction)
                const pegDirection = new THREE.Vector3(
                    peg.insertionDirection.x,
                    peg.insertionDirection.y,
                    peg.insertionDirection.z
                );
                const holeDirection = pegboardMeta.frontFaceNormal || new THREE.Vector3(0, 0, 1);
                const alignment = pegDirection.dot(holeDirection);

                if (Math.abs(alignment + 1) > 0.1) { // Should be opposite direction
                    pegStatus.valid = false;
                    pegStatus.errors.push('PEG_MISALIGNED');
                    validation.valid = false;
                }

                validation.pegStatus.push(pegStatus);
            }

            return validation;
        },

        /**
         * Calculate accessory position from peg holes
         */
        calculateAccessoryPositionFromPegs: function(pegConfig, holeGroup, rotation = 0) {
            if (!pegConfig || !pegConfig.pegs || holeGroup.length === 0) {
                return null;
            }

            const primaryPeg = pegConfig.pegs[0];
            const primaryHole = holeGroup[0];

            // Transform primary peg local position with rotation
            const rotatedPegPos = new THREE.Vector3()
                .copy(primaryPeg.localPosition)
                .applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation);

            // Accessory position = hole position - rotated peg offset
            const accessoryPos = primaryHole.clone().sub(rotatedPegPos);

            return accessoryPos;
        },

        /**
         * Calculate flush mounting Z position
         */
        calculateFlushZ: function(pegConfig, pegboardMeta) {
            if (!pegConfig || !pegboardMeta) return 0;

            const pegboardFrontFace = pegboardMeta.dimensions.depth / 2;
            const flushGap = pegConfig.mounting?.flushOffset || 0.001;
            const mountingSurfaceOffset = pegConfig.mounting?.surfaceOffset || 0;

            // Accessory back surface should be at pegboard front + small gap
            const flushZ = pegboardFrontFace + flushGap - mountingSurfaceOffset;

            console.log('Flush Z calculation:', {
                pegboardFrontFace,
                flushGap,
                mountingSurfaceOffset,
                result: flushZ
            });

            return flushZ;
        },

        /**
         * Get peg world positions for an accessory
         */
        getPegWorldPositions: function(accessoryModel, pegConfig) {
            const positions = [];

            if (!pegConfig || !pegConfig.pegs) return positions;

            for (let peg of pegConfig.pegs) {
                const localPos = new THREE.Vector3(
                    peg.localPosition.x,
                    peg.localPosition.y,
                    peg.localPosition.z
                );

                // Transform to world space
                const worldPos = localPos.applyMatrix4(accessoryModel.matrixWorld);
                positions.push(worldPos);
            }

            return positions;
        },

        /**
         * Check if peg holes are occupied
         */
        checkHolesOccupied: function(holeGroup, occupiedHoles) {
            if (!occupiedHoles || occupiedHoles.size === 0) return false;

            for (let hole of holeGroup) {
                const holeKey = this.getHoleKey(hole);
                if (occupiedHoles.has(holeKey)) {
                    return true;
                }
            }

            return false;
        },

        /**
         * Generate unique key for a peg hole
         */
        getHoleKey: function(hole) {
            return `${hole.x.toFixed(4)}_${hole.y.toFixed(4)}_${hole.z.toFixed(4)}`;
        },

        /**
         * Mark holes as occupied
         */
        markHolesOccupied: function(holeGroup, placementId, occupancyMap) {
            for (let hole of holeGroup) {
                const key = this.getHoleKey(hole);
                occupancyMap.set(key, placementId);
            }
        },

        /**
         * Free occupied holes
         */
        freeOccupiedHoles: function(holeGroup, occupancyMap) {
            for (let hole of holeGroup) {
                const key = this.getHoleKey(hole);
                occupancyMap.delete(key);
            }
        }
    };

    // Expose to global scope
    window.BlastiPegSystem = BlastiPegSystem;

})(window);
```

### 2.2 Update Main Configurator

**File**: `assets/js/configurator.js`

Integrate peg system:

```javascript
// Add to configuration
config: {
    // ... existing

    pegHoleOccupancy: new Map(),  // Track occupied holes
    pegSystem: null  // Reference to BlastiPegSystem
}

// Update initialization
initializeModules: function () {
    // ... existing

    // Initialize peg system
    this.config.pegSystem = BlastiPegSystem;

    console.log('✅ Peg system initialized');
}

// Replace snapToGrid with enhanced version
snapAccessoryToGrid: function(accessory, pegboard, mousePosition) {
    // Get peg configuration from accessory data
    const pegConfig = accessory.peg_config || accessory.pegConfig;

    if (!pegConfig) {
        console.warn('No peg configuration for accessory:', accessory.name);
        // Fallback to old behavior
        return this.snapToGridOld(mousePosition);
    }

    const pegboardMeta = pegboard.userData.pegboardMetadata;

    // Find closest hole to mouse
    const closestHole = this.config.pegSystem.findClosestHole(
        mousePosition,
        pegboardMeta.pegHoles
    );

    if (!closestHole) return null;

    // Find compatible peg hole groups
    const holeGroups = this.config.pegSystem.findCompatiblePegHoles(
        pegConfig,
        pegboardMeta.pegHoles,
        closestHole
    );

    if (holeGroups.length === 0) {
        return {
            valid: false,
            reason: 'No compatible peg pattern found',
            closestHole: closestHole
        };
    }

    // Use first valid group
    const holeGroup = holeGroups[0];

    // Check if holes are occupied
    if (this.config.pegSystem.checkHolesOccupied(holeGroup, this.config.pegHoleOccupancy)) {
        return {
            valid: false,
            reason: 'Peg holes occupied',
            holeGroup: holeGroup
        };
    }

    // Validate peg placement
    const validation = this.config.pegSystem.validatePegPlacement(
        pegConfig,
        holeGroup,
        pegboardMeta
    );

    if (!validation.valid) {
        return {
            valid: false,
            reason: 'Peg validation failed',
            validation: validation,
            holeGroup: holeGroup
        };
    }

    // Calculate accessory position
    const position = this.config.pegSystem.calculateAccessoryPositionFromPegs(
        pegConfig,
        holeGroup,
        0 // rotation
    );

    // Calculate flush Z
    position.z = this.config.pegSystem.calculateFlushZ(pegConfig, pegboardMeta);

    return {
        valid: true,
        position: position,
        rotation: new THREE.Euler(0, 0, 0),
        occupiedHoles: holeGroup,
        validation: validation
    };
}
```

### Phase 2 Deliverables

- [x] Peg system module
- [x] Peg-hole matching algorithm
- [x] Validation system
- [x] Integration with main configurator
- [x] Occupancy tracking

### Phase 2 Testing

```
Test 1: Single-peg accessory
  - Place accessory with 1 peg
  - Verify snaps to nearest hole
  - Check position is calculated correctly

Test 2: Two-peg accessory
  - Create accessory with 2 vertical pegs (1 inch apart)
  - Attempt placement
  - Should only allow placement where both pegs align with holes
  - Try invalid positions - should reject

Test 3: Peg validation
  - Accessory with peg too large for hole - should reject
  - Accessory with peg too long for hole depth - should reject
  - Accessory with correct pegs - should accept

Test 4: Occupancy tracking
  - Place accessory at position
  - Try to place another accessory at same holes - should reject
  - Remove first accessory
  - Now second should be placeable
```

---

## Phase 3: Placement Precision

**Duration**: 2-3 days
**Priority**: CRITICAL
**Effort**: MEDIUM

### Objectives

1. Implement geometric flush mounting
2. Add rotation support
3. Improve positioning accuracy
4. Add debug visualization

### 3.1 Flush Mounting Implementation

**File**: `assets/js/configurator.js`

Update placement logic:

```javascript
placeAccessoryAtClick: function (event) {
    // ... existing validation

    const snapResult = this.snapAccessoryToGrid(
        this.config.placementMode.accessoryData,
        this.config.currentPegboardModel,
        intersectionData.point
    );

    if (!snapResult || !snapResult.valid) {
        this.showError(snapResult?.reason || 'Invalid placement');
        return;
    }

    // Create final model
    const model = this.config.placementMode.model.clone();

    // Set position with PRECISE flush mounting
    model.position.copy(snapResult.position);

    // Set rotation
    model.rotation.copy(snapResult.rotation);

    // === NEW: Apply precise positioning ===
    this.applyPrecisePositioning(
        model,
        this.config.placementMode.accessoryData,
        snapResult
    );

    // Add to scene
    this.config.modules.core.addToScene(model);

    // Store with full metadata
    const placementId = 'accessory_' + Date.now();
    const accessoryData = {
        placementId: placementId,
        id: this.config.placementMode.accessoryData.id,
        name: this.config.placementMode.accessoryData.name,
        model: model,
        position: snapResult.position.clone(),
        rotation: snapResult.rotation.clone(),
        occupiedHoles: snapResult.occupiedHoles,
        validation: snapResult.validation,
        pegConfig: this.config.placementMode.accessoryData.peg_config,
        flushMounted: true
    };

    // Mark holes as occupied
    this.config.pegSystem.markHolesOccupied(
        snapResult.occupiedHoles,
        placementId,
        this.config.pegHoleOccupancy
    );

    // Trigger placement event
    const jQuery = window.jQuery || window.$;
    if (jQuery) {
        jQuery(document).trigger('accessoryPlaced', [accessoryData]);
    }

    this.exitPlacementMode();

    console.log('✅ Accessory placed with precision:', accessoryData);
}

/**
 * Apply precise positioning to ensure flush mounting
 */
applyPrecisePositioning: function(model, accessoryData, snapResult) {
    // The position from snapResult is already calculated correctly
    // This function can add fine-tuning if needed

    // Log final positioning for debugging
    const pegConfig = accessoryData.peg_config || accessoryData.pegConfig;

    console.log('📍 Precise positioning applied:', {
        accessory: accessoryData.name,
        position: model.position,
        rotation: model.rotation,
        pegCount: pegConfig?.pegCount || 0,
        occupiedHoles: snapResult.occupiedHoles.length,
        flushZ: snapResult.position.z
    });

    // Store metadata on model for later reference
    model.userData.placement = {
        pegConfig: pegConfig,
        occupiedHoles: snapResult.occupiedHoles,
        flushMounted: true,
        mountingZ: snapResult.position.z
    };
}
```

### 3.2 Rotation Support

Add rotation testing to snap function:

```javascript
snapAccessoryToGridWithRotation: function(accessory, pegboard, mousePosition) {
    const pegConfig = accessory.peg_config || accessory.pegConfig;
    const pegboardMeta = pegboard.userData.pegboardMetadata;

    // Find closest hole
    const closestHole = this.config.pegSystem.findClosestHole(
        mousePosition,
        pegboardMeta.pegHoles
    );

    if (!closestHole) return null;

    // Get allowable rotations from accessory config
    const allowableRotations = pegConfig.mounting?.allowableRotations ||
        [0, Math.PI/2, Math.PI, Math.PI*3/2];

    const validConfigurations = [];

    // Try each rotation
    for (let rotation of allowableRotations) {
        const holeGroups = this.config.pegSystem.findCompatiblePegHolesWithRotation(
            pegConfig,
            pegboardMeta.pegHoles,
            closestHole,
            rotation
        );

        for (let holeGroup of holeGroups) {
            if (this.config.pegSystem.checkHolesOccupied(holeGroup, this.config.pegHoleOccupancy)) {
                continue;
            }

            const validation = this.config.pegSystem.validatePegPlacement(
                pegConfig,
                holeGroup,
                pegboardMeta
            );

            if (validation.valid) {
                const position = this.config.pegSystem.calculateAccessoryPositionFromPegs(
                    pegConfig,
                    holeGroup,
                    rotation
                );

                position.z = this.config.pegSystem.calculateFlushZ(pegConfig, pegboardMeta);

                validConfigurations.push({
                    position: position,
                    rotation: new THREE.Euler(0, 0, rotation),
                    occupiedHoles: holeGroup,
                    validation: validation
                });
            }
        }
    }

    if (validConfigurations.length === 0) {
        return {
            valid: false,
            reason: 'No valid configuration found (tried multiple rotations)'
        };
    }

    // Return best configuration (prefer upright orientation)
    return {
        valid: true,
        ...this.selectBestConfiguration(validConfigurations, accessory)
    };
}

selectBestConfiguration: function(configurations, accessory) {
    // Prefer rotation = 0 (upright)
    const upright = configurations.find(c => c.rotation.z === 0);
    if (upright) return upright;

    // Otherwise return first valid
    return configurations[0];
}
```

### 3.3 Debug Visualization

**Create**: `assets/js/modules/debug-viz.js`

```javascript
/**
 * Debug visualization tools
 */

(function(window) {
    'use strict';

    const BlastiDebugViz = {

        enabled: false,

        toggleDebugMode: function() {
            this.enabled = !this.enabled;
            console.log('Debug visualization:', this.enabled ? 'ON' : 'OFF');
        },

        /**
         * Show peg positions as colored spheres
         */
        showPegPositions: function(scene, accessory, pegConfig, color = 0x00ff00) {
            if (!this.enabled) return;

            const pegs = this.getPegWorldPositions(accessory.model, pegConfig);

            pegs.forEach((pegPos, index) => {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.003, 8, 8),
                    new THREE.MeshBasicMaterial({color: color})
                );
                sphere.position.copy(pegPos);
                sphere.name = `debug-peg-${index}`;
                scene.add(sphere);
            });
        },

        /**
         * Show flush mounting plane
         */
        showFlushPlane: function(scene, pegboard) {
            if (!this.enabled) return;

            const meta = pegboard.userData.pegboardMetadata;
            const frontZ = meta.dimensions.depth / 2;

            const geometry = new THREE.PlaneGeometry(
                meta.dimensions.width,
                meta.dimensions.height
            );
            const material = new THREE.MeshBasicMaterial({
                color: 0x0000ff,
                transparent: true,
                opacity: 0.2,
                side: THREE.DoubleSide
            });

            const plane = new THREE.Mesh(geometry, material);
            plane.position.z = frontZ;
            plane.name = 'debug-flush-plane';
            scene.add(plane);
        },

        /**
         * Show peg holes as small spheres
         */
        showPegHoles: function(scene, pegHoles, color = 0xff0000) {
            if (!this.enabled) return;

            pegHoles.forEach((hole, index) => {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(0.002, 6, 6),
                    new THREE.MeshBasicMaterial({color: color})
                );
                sphere.position.set(hole.x, hole.y, hole.z);
                sphere.name = `debug-hole-${index}`;
                scene.add(sphere);
            });
        },

        /**
         * Clear all debug visualizations
         */
        clearDebug: function(scene) {
            const debugObjects = [];
            scene.traverse(obj => {
                if (obj.name && obj.name.startsWith('debug-')) {
                    debugObjects.push(obj);
                }
            });

            debugObjects.forEach(obj => {
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });
        },

        getPegWorldPositions: function(model, pegConfig) {
            // Same as BlastiPegSystem.getPegWorldPositions
            const positions = [];
            if (!pegConfig || !pegConfig.pegs) return positions;

            for (let peg of pegConfig.pegs) {
                const localPos = new THREE.Vector3(
                    peg.localPosition.x,
                    peg.localPosition.y,
                    peg.localPosition.z
                );
                const worldPos = localPos.clone().applyMatrix4(model.matrixWorld);
                positions.push(worldPos);
            }

            return positions;
        }
    };

    window.BlastiDebugViz = BlastiDebugViz;

})(window);
```

Enable debug mode via URL parameter or admin setting:

```javascript
// In configurator.js init
if (window.location.search.includes('debug=true')) {
    BlastiDebugViz.enabled = true;
    console.log('🐛 Debug mode enabled');
}
```

### Phase 3 Deliverables

- [x] Flush mounting calculation
- [x] Rotation support
- [x] Precise positioning
- [x] Debug visualization tools
- [x] Enhanced logging

### Phase 3 Testing

```
Test 1: Flush mounting verification
  - Place accessory
  - Enable debug mode
  - Check blue plane (pegboard front) and accessory back align
  - Measure gap - should be ~0.5mm

Test 2: Different accessory types
  - Shelf (horizontal) - should sit flush
  - Hook (vertical) - should hang from pegboard
  - Bin - should sit flush with small gap
  - All should have consistent flush behavior

Test 3: Rotation testing
  - Accessory with 2 vertical pegs
  - Should be placeable at 0° and 180°
  - Should NOT be placeable at 90° and 270° (unless peg spacing matches)

Test 4: Debug visualization
  - Enable debug mode
  - Verify red spheres at peg holes
  - Verify green spheres at accessory pegs
  - Verify blue plane at pegboard front
```

---

## Phase 4: Visual Feedback

**Duration**: 2-3 days
**Priority**: HIGH
**Effort**: MEDIUM

### Objectives

1. Enhanced preview colors
2. Per-peg status indicators
3. Error messaging
4. Placement guides

### 4.1 Enhanced Preview System

**File**: `assets/js/configurator.js`

Update preview color logic:

```javascript
updatePlacementPreview: function (event) {
    if (!this.config.placementMode || !this.config.placementMode.active) return;

    const intersectionData = this.getIntersectionPoint(event);
    if (!intersectionData || !intersectionData.point) {
        this.hidePreview();
        return;
    }

    const previewModel = this.config.placementMode.previewModel;
    previewModel.visible = true;

    // Get snap result with full validation
    const snapResult = this.snapAccessoryToGridWithRotation(
        this.config.placementMode.accessoryData,
        this.config.currentPegboardModel,
        intersectionData.point
    );

    if (!snapResult || !snapResult.valid) {
        // Show RED preview at closest possible position
        const closestHole = this.config.pegSystem.findClosestHole(
            intersectionData.point,
            this.config.gridSystem.pegHoles
        );

        if (closestHole) {
            previewModel.position.copy(closestHole);
        }

        this.updatePreviewColorAdvanced(previewModel, {
            valid: false,
            reason: snapResult?.reason || 'Invalid placement'
        });

        this.showPlacementTooltip(snapResult?.reason || 'Cannot place here');
        return;
    }

    // Show GREEN preview at exact snap position
    previewModel.position.copy(snapResult.position);
    previewModel.rotation.copy(snapResult.rotation);

    this.updatePreviewColorAdvanced(previewModel, snapResult.validation, snapResult);

    this.showPlacementTooltip('Valid placement - click to place');
}

updatePreviewColorAdvanced: function(model, validation, snapResult) {
    if (validation.valid) {
        // GREEN - all pegs correctly positioned
        this.setModelColor(model, 0x28a745, 0.7);

        // Show green indicators at each peg
        if (snapResult && snapResult.occupiedHoles) {
            this.showPegIndicators(model, snapResult.occupiedHoles, 0x00ff00);
        }

        // Pulse gently
        this.addPulseAnimation(model, 0.7, 0.85);
    } else {
        // RED - invalid placement
        this.setModelColor(model, 0xdc3545, 0.5);

        // Show specific error if available
        if (validation.pegStatus) {
            this.showPegStatusIndicators(model, validation.pegStatus);
        }

        // Pulse with warning
        this.addPulseAnimation(model, 0.5, 0.7, true);
    }
}

showPegIndicators: function(model, pegHoles, color) {
    // Remove existing indicators
    this.clearPegIndicators(model);

    // Add sphere at each peg hole position
    pegHoles.forEach((hole, index) => {
        const indicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.003, 8, 8),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            })
        );

        const holePos = hole instanceof THREE.Vector3 ? hole :
            new THREE.Vector3(hole.x, hole.y, hole.z);

        indicator.position.copy(holePos);
        indicator.name = `peg-indicator-${index}`;

        model.parent.add(indicator);
        model.userData.pegIndicators = model.userData.pegIndicators || [];
        model.userData.pegIndicators.push(indicator);
    });
}

showPegStatusIndicators: function(model, pegStatus) {
    this.clearPegIndicators(model);

    const pegConfig = this.config.placementMode.accessoryData.peg_config;

    pegStatus.forEach((status, index) => {
        const peg = pegConfig.pegs[index];
        const color = status.valid ? 0x00ff00 : 0xff0000;

        const localPos = new THREE.Vector3(
            peg.localPosition.x,
            peg.localPosition.y,
            peg.localPosition.z
        );

        const worldPos = localPos.clone().applyMatrix4(model.matrixWorld);

        const indicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.003, 8, 8),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            })
        );

        indicator.position.copy(worldPos);
        indicator.name = `peg-status-${index}`;

        model.parent.add(indicator);
        model.userData.pegIndicators = model.userData.pegIndicators || [];
        model.userData.pegIndicators.push(indicator);
    });
}

clearPegIndicators: function(model) {
    if (model.userData.pegIndicators) {
        model.userData.pegIndicators.forEach(indicator => {
            model.parent.remove(indicator);
            if (indicator.geometry) indicator.geometry.dispose();
            if (indicator.material) indicator.material.dispose();
        });
        model.userData.pegIndicators = [];
    }
}

addPulseAnimation: function(model, minOpacity, maxOpacity, isError = false) {
    // Clear existing animation
    if (model.userData.pulseInterval) {
        clearInterval(model.userData.pulseInterval);
    }

    let direction = 1;
    let currentOpacity = minOpacity;

    model.userData.pulseInterval = setInterval(() => {
        currentOpacity += direction * 0.05;

        if (currentOpacity >= maxOpacity) {
            direction = -1;
            currentOpacity = maxOpacity;
        } else if (currentOpacity <= minOpacity) {
            direction = 1;
            currentOpacity = minOpacity;
        }

        model.traverse(child => {
            if (child.material) {
                child.material.opacity = currentOpacity;
            }
        });
    }, isError ? 50 : 100); // Faster pulse for errors
}

showPlacementTooltip: function(message) {
    let tooltip = document.getElementById('blasti-placement-tooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'blasti-placement-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(tooltip);
    }

    tooltip.textContent = message;
    tooltip.style.display = 'block';
}

hidePlacementTooltip: function() {
    const tooltip = document.getElementById('blasti-placement-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}
```

### 4.2 Error Messaging

Add human-readable error messages:

```javascript
formatValidationErrors: function(validation) {
    if (validation.valid) {
        return 'Placement valid ✓';
    }

    const errors = validation.errors || [];
    const messages = {
        'NO_COMPATIBLE_HOLES': 'No compatible peg holes found at this position',
        'PEG_HOLE_COUNT_MISMATCH': 'Peg count does not match available holes',
        'PEG_TOO_LARGE': 'Peg diameter too large for holes',
        'PEG_TOO_LONG': 'Pegs too long for pegboard thickness',
        'PEG_MISALIGNED': 'Pegs not aligned correctly',
        'HOLES_OCCUPIED': 'Peg holes already occupied by another accessory',
        'EXCEEDS_BOUNDS': 'Accessory extends beyond pegboard edges',
        'OVERLAPS': 'Overlaps with another accessory'
    };

    if (errors.length === 0) {
        return 'Invalid placement';
    }

    if (errors.length === 1) {
        return messages[errors[0]] || errors[0];
    }

    return `Multiple issues: ${errors.map(e => messages[e] || e).join(', ')}`;
}
```

### Phase 4 Deliverables

- [x] Enhanced preview system
- [x] Per-peg indicators
- [x] Error messaging
- [x] Tooltips
- [x] Pulse animations

### Phase 4 Testing

```
Test 1: Valid placement
  - Hover over valid position
  - Should show GREEN preview
  - Should show green spheres at each peg hole
  - Should show "Valid placement" tooltip

Test 2: Invalid placement (no holes)
  - Hover over position with no holes
  - Should show RED preview
  - Should show "No compatible peg holes" message

Test 3: Invalid placement (occupied)
  - Place accessory
  - Try to place another at same position
  - Should show RED with "Holes occupied" message
  - Red indicators at conflicting pegs

Test 4: Multi-peg validation
  - Two-peg accessory
  - Hover where only 1 peg fits
  - Should show one green sphere, one red sphere
  - Tooltip explains which peg is invalid
```

---

## Phase 5: Multi-Pegboard Support

**Duration**: 3-4 days
**Priority**: MEDIUM
**Effort**: HIGH

*(See TECHNICAL_PLAN.md full document for complete Phase 5-6 details)*

---

## Phase 6: Performance & Polish

**Duration**: 2-3 days
**Priority**: MEDIUM
**Effort**: MEDIUM

### Objectives

1. Optimize collision detection
2. Add spatial indexing
3. Model loading optimization
4. Final polish

*(See full TECHNICAL_PLAN.md for complete details)*

---

## Testing Strategy

### Unit Tests

Create test suite using Jest:

**File**: `tests/peg-system.test.js`

```javascript
describe('BlastiPegSystem', () => {
    test('findCompatiblePegHoles - single peg', () => {
        const pegConfig = {
            pegs: [{
                localPosition: {x: 0, y: 0, z: 0}
            }]
        };

        const holes = [
            {x: 0, y: 0, z: 0.01},
            {x: 0.0254, y: 0, z: 0.01}
        ];

        const result = BlastiPegSystem.findCompatiblePegHoles(
            pegConfig,
            holes,
            new THREE.Vector3(0, 0, 0.01)
        );

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].length).toBe(1);
    });

    test('findCompatiblePegHoles - two pegs vertical', () => {
        const pegConfig = {
            pegs: [
                {localPosition: {x: 0, y: 0, z: 0}},
                {localPosition: {x: 0, y: 0.0254, z: 0}}
            ]
        };

        const holes = [
            {x: 0, y: 0, z: 0.01},
            {x: 0, y: 0.0254, z: 0.01},
            {x: 0.0254, y: 0, z: 0.01}
        ];

        const result = BlastiPegSystem.findCompatiblePegHoles(
            pegConfig,
            holes,
            new THREE.Vector3(0, 0, 0.01)
        );

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].length).toBe(2);
    });

    test('validatePegPlacement - peg too large', () => {
        const pegConfig = {
            pegs: [{
                diameter: 0.01, // 10mm
                length: 0.012
            }]
        };

        const pegboardMeta = {
            pegHoleDiameter: 0.0064, // 6.4mm
            pegHoleDepth: 0.015
        };

        const result = BlastiPegSystem.validatePegPlacement(
            pegConfig,
            [{x: 0, y: 0, z: 0}],
            pegboardMeta
        );

        expect(result.valid).toBe(false);
        expect(result.pegStatus[0].errors).toContain('PEG_TOO_LARGE');
    });
});
```

### Integration Tests

**File**: `tests/integration/placement.test.js`

```javascript
describe('Accessory Placement Integration', () => {
    beforeEach(() => {
        // Setup test environment
        setupTestScene();
        loadTestPegboard();
    });

    test('Place single-peg accessory', async () => {
        const accessory = await loadTestAccessory('hook-single-peg');

        const result = BlastiConfigurator.placeAccessory(
            accessory,
            new THREE.Vector3(0, 0, 0)
        );

        expect(result.success).toBe(true);
        expect(result.placementId).toBeDefined();
        expect(BlastiConfigurator.config.placedAccessories.length).toBe(1);
    });

    test('Prevent overlapping placement', async () => {
        const accessory1 = await loadTestAccessory('hook');
        const accessory2 = await loadTestAccessory('hook');

        const pos = new THREE.Vector3(0, 0, 0);

        BlastiConfigurator.placeAccessory(accessory1, pos);

        const result = BlastiConfigurator.placeAccessory(accessory2, pos);

        expect(result.success).toBe(false);
        expect(result.error).toContain('occupied');
    });
});
```

### Manual Testing Checklist

```markdown
## Pegboard Setup
- [ ] Create pegboard product
- [ ] Add 3D model URL
- [ ] Add dimensions JSON
- [ ] (Optional) Add custom peg holes
- [ ] Product saves successfully
- [ ] Product appears in configurator

## Accessory Setup
- [ ] Create accessory product
- [ ] Add 3D model URL
- [ ] Add dimensions JSON
- [ ] Add peg configuration JSON
- [ ] Validate JSON syntax
- [ ] Product saves successfully
- [ ] Product appears in configurator

## Basic Placement
- [ ] Select pegboard - loads and centers
- [ ] Select accessory - enters placement mode
- [ ] Hover over pegboard - preview appears
- [ ] Valid position - preview GREEN
- [ ] Invalid position - preview RED
- [ ] Click valid position - accessory placed
- [ ] Accessory sits flush with pegboard
- [ ] Price updates correctly

## Multi-Peg Placement
- [ ] Two-peg accessory loads
- [ ] Preview only green when both pegs align
- [ ] Cannot place when only 1 peg aligns
- [ ] Rotation works correctly
- [ ] Both pegs are in holes after placement

## Collision & Overlap
- [ ] Cannot place on occupied holes
- [ ] Cannot place overlapping accessories
- [ ] Removing accessory frees holes
- [ ] Can place new accessory in freed holes

## Edge Cases
- [ ] Accessory partially off pegboard - rejected
- [ ] Peg too large - rejected with message
- [ ] Peg too long - rejected with message
- [ ] Missing peg config - fallback or error
- [ ] Invalid JSON - error message shown

## Visual Feedback
- [ ] Peg indicators appear
- [ ] Colors are correct (green/red)
- [ ] Tooltips show correct messages
- [ ] Pulse animation works
- [ ] Debug mode shows pegs and holes

## Performance
- [ ] 50+ accessories load quickly
- [ ] Placement is responsive
- [ ] No lag when hovering
- [ ] Scene renders smoothly
```

---

## Deployment Plan

### Pre-Deployment

1. **Backup Database**
   ```bash
   wp db export backup-pre-v2.sql
   ```

2. **Test on Staging**
   - Deploy to staging environment
   - Run full test suite
   - Get client approval

3. **Documentation**
   - Update README
   - Create migration guide
   - Video tutorials for new features

### Deployment Steps

1. **Update Plugin Files**
   ```bash
   # Upload new plugin files via FTP or Git
   # Or update via WordPress admin
   ```

2. **Run Migration**
   ```
   WordPress Admin → Blasti Configurator → Migration
   Click "Run Migration"
   ```

3. **Update Products**
   - Review auto-generated peg configs
   - Update with accurate data
   - Test each product type

4. **Verify Functionality**
   - Test configurator page
   - Place test orders
   - Check cart integration

5. **Monitor**
   - Watch error logs
   - Monitor performance
   - Gather user feedback

### Rollback Plan

If issues occur:

1. **Restore Database**
   ```bash
   wp db import backup-pre-v2.sql
   ```

2. **Revert Plugin**
   - Replace with previous version
   - Clear caches

3. **Notify Users**
   - Communicate issue
   - Estimated fix time

---

## Timeline Summary

| Phase | Duration | Dependencies | Risk |
|-------|----------|--------------|------|
| 1. Data Model | 1-2 days | None | Low |
| 2. Peg System | 3-4 days | Phase 1 | Medium |
| 3. Placement | 2-3 days | Phase 2 | Medium |
| 4. Visual | 2-3 days | Phase 3 | Low |
| 5. Multi-Board | 3-4 days | Phase 1-4 | High |
| 6. Performance | 2-3 days | Phase 1-5 | Low |

**Total**: 13-19 days

**Recommended Schedule**:
- Week 1: Phases 1-2
- Week 2: Phases 3-4
- Week 3: Phases 5-6 + Testing
- Week 4: Deployment & Buffer

---

**Document End**

For additional implementation details, see:
- GAP_ANALYSIS.md - Detailed gap identification
- SETUP_GUIDE.md - 3D Model configuration guide
- SYSTEM_ANALYSIS.md - Current system documentation
