# Gap Analysis Document
## Blasti 3D Configurator - Current vs Target Implementation

**Document Version**: 1.0
**Date**: 2025-11-08
**Project**: Blasti 3D Configurator
**Current Version**: 1.0.4

---

## Executive Summary

This document identifies critical gaps between the current implementation of the Blasti 3D Configurator and the target behavior required for a production-ready 3D pegboard configuration system. The analysis reveals **23 critical gaps** across three main areas: 3D Board Handling, Accessory Management, and Placement Precision.

### Overall Assessment

| Category | Status | Critical Gaps | Priority |
|----------|--------|---------------|----------|
| 3D Board Handling | 🔴 **Incomplete** | 6 | **HIGH** |
| Accessory Management | 🔴 **Critical Issues** | 10 | **CRITICAL** |
| Placement Precision | 🔴 **Not Implemented** | 7 | **CRITICAL** |

**Key Finding**: The current implementation uses a simplified 2D grid approach without actual 3D peg-to-hole validation. Accessories are positioned arbitrarily rather than geometrically calculated based on peg insertion depth.

---

## Table of Contents

1. [3D Board Handling Analysis](#1-3d-board-handling-analysis)
2. [Accessory Management Analysis](#2-accessory-management-analysis)
3. [Placement Precision Analysis](#3-placement-precision-analysis)
4. [Data Model Gaps](#4-data-model-gaps)
5. [Visual Feedback Gaps](#5-visual-feedback-gaps)
6. [Performance & Scalability Gaps](#6-performance--scalability-gaps)
7. [Priority Matrix](#7-priority-matrix)
8. [Impact Assessment](#8-impact-assessment)

---

## 1. 3D Board Handling Analysis

### 1.1 Pegboard Sizing & Centering

#### Current Implementation
```javascript
// Location: configurator.js:236-304
positionPegboardModel: function (model, dimensions) {
    // Centers model at origin
    const beforeBox = new THREE.Box3().setFromObject(model);
    const beforeCenter = beforeBox.getCenter(new THREE.Vector3());
    model.position.sub(beforeCenter);

    // Simple rotation check
    const isFlat = beforeSize.y < Math.max(beforeSize.x, beforeSize.z) * 0.5;
    if (isFlat) {
        model.rotation.x = Math.PI / 2;
    }

    model.position.set(0, 0, 0);
}
```

**Problems**:
- ❌ No validation of actual model dimensions vs expected dimensions
- ❌ No normalization of model scale
- ❌ Rotation is guessed, not calculated from metadata
- ❌ Always centers at world origin (0,0,0)
- ❌ No bounds checking

#### Target Implementation

```javascript
positionPegboardModel: function (model, metadata) {
    // 1. Validate model dimensions match metadata
    const actualSize = this.getModelBoundingBox(model);
    const expectedSize = metadata.dimensions;

    if (!this.dimensionsMatch(actualSize, expectedSize, tolerance=0.01)) {
        console.warn('Model dimensions mismatch', {actual, expected});
        // Scale to match
        const scale = this.calculateRequiredScale(actualSize, expectedSize);
        model.scale.multiplyScalar(scale);
    }

    // 2. Apply correct orientation from metadata
    if (metadata.initialRotation) {
        model.rotation.setFromVector3(metadata.initialRotation);
    }

    // 3. Center the pegboard properly
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // 4. Position at designated location (support multi-board)
    const pegboardIndex = this.pegboards.length;
    const position = this.calculatePegboardPosition(pegboardIndex, metadata);
    model.position.add(position);

    // 5. Store pegboard metadata
    model.userData.pegboardMetadata = {
        dimensions: metadata.dimensions,
        pegHoleGrid: metadata.pegHoleGrid,
        pegHoleDiameter: metadata.pegHoleDiameter || 0.0064, // 6.4mm standard
        frontFaceNormal: metadata.frontFaceNormal || new THREE.Vector3(0, 0, 1),
        pegboards: this.extractPegHolePositions(model, metadata)
    };
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Dimension Validation | ❌ None | ✅ Validate & scale | **CRITICAL** |
| Orientation | ❌ Guessed | ✅ From metadata | **HIGH** |
| Positioning | ❌ Always (0,0,0) | ✅ Calculated | **HIGH** |
| Multi-board Support | ❌ No | ✅ Yes | **HIGH** |
| Metadata Storage | ⚠️ Partial | ✅ Complete | **MEDIUM** |

---

### 1.2 Pegboard Parsing & Metadata

#### Current Implementation

**Product Meta Fields** (`class-woocommerce.php:889-934`):
```php
// Dimensions stored as JSON string
'_blasti_dimensions' => '{"width": 0.22, "height": 0.44, "depth": 0.02}'
```

**JavaScript Parsing** (`configurator.js:305-359`):
```javascript
initializeGridSystem: function (dimensions) {
    const pegHoleSpacing = 0.0254; // Hardcoded 2.54cm
    const width = dimensions.width || 1.0;
    const height = dimensions.height || 1.0;

    // Calculate peg holes in a uniform grid
    const cols = Math.floor(width / pegHoleSpacing);
    const rows = Math.floor(height / pegHoleSpacing);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = (col * pegHoleSpacing) - (width / 2) + (pegHoleSpacing / 2);
            const y = (row * pegHoleSpacing) - (height / 2) + (pegHoleSpacing / 2);
            pegHoles.push({ x, y, z: frontFaceZ });
        }
    }
}
```

**Problems**:
- ❌ Assumes uniform grid (real pegboards may have irregular patterns)
- ❌ No actual hole detection from 3D model
- ❌ Missing peg hole diameter
- ❌ No hole depth information
- ❌ No validation that calculated holes exist in model
- ❌ Hardcoded spacing (different pegboard standards exist)

#### Target Implementation

**Enhanced Product Meta**:
```php
'_blasti_dimensions' => JSON with:
{
    "width": 0.22,
    "height": 0.44,
    "depth": 0.02,
    "pegHoleSpacing": 0.0254,    // Can vary by product
    "pegHoleDiameter": 0.0064,   // 6.4mm standard
    "pegHoleDepth": 0.015,       // 15mm
    "pegHolePattern": "uniform", // or "custom"
    "initialRotation": {"x": 0, "y": 0, "z": 0},
    "frontFaceNormal": {"x": 0, "y": 0, "z": 1}
}

'_blasti_peg_holes' => JSON array of actual hole positions (optional):
[
    {"x": -0.11, "y": -0.22, "z": 0.01, "diameter": 0.0064},
    {"x": -0.0846, "y": -0.22, "z": 0.01, "diameter": 0.0064},
    ...
]
```

**Enhanced Parsing**:
```javascript
parsePegboardMetadata: function(product) {
    const metadata = JSON.parse(product.dimensions);

    // Option 1: Use custom hole positions if provided
    if (product.peg_holes && product.peg_holes.length > 0) {
        return {
            pegHoles: product.peg_holes,
            pattern: 'custom'
        };
    }

    // Option 2: Generate uniform grid with validation
    const grid = this.generateUniformGrid(metadata);

    // Option 3: Detect holes from 3D model geometry
    if (metadata.autoDetectHoles) {
        const detectedHoles = this.detectPegHolesFromGeometry(model, metadata);
        if (detectedHoles.length > 0) {
            return {pegHoles: detectedHoles, pattern: 'detected'};
        }
    }

    return {pegHoles: grid, pattern: 'uniform'};
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Peg Hole Data | ❌ Generated only | ✅ Actual positions | **CRITICAL** |
| Hole Diameter | ❌ None | ✅ Stored | **HIGH** |
| Hole Depth | ❌ None | ✅ Stored | **CRITICAL** |
| Pattern Support | ❌ Uniform only | ✅ Custom patterns | **MEDIUM** |
| Auto-detection | ❌ No | ✅ Optional | **LOW** |
| Validation | ❌ None | ✅ Against model | **HIGH** |

---

### 1.3 Multi-Pegboard Scene Management

#### Current Implementation

**Single Pegboard Only** (`configurator.js:188-233`):
```javascript
selectPegboard: function (pegboard) {
    // Clear existing pegboard (only one allowed)
    if (this.config.currentPegboardModel) {
        this.config.modules.core.removeFromScene(this.config.currentPegboardModel);
        this.config.currentPegboardModel = null;
    }

    // Load new pegboard
    this.config.currentPegboard = pegboard;
    // ... load and position at (0,0,0)
}
```

**Problems**:
- ❌ Only one pegboard can exist in scene
- ❌ Selecting new pegboard removes previous one
- ❌ No pegboard array/collection
- ❌ No spatial arrangement logic
- ❌ Accessories lost when changing pegboard

#### Target Implementation

```javascript
// Support multiple pegboards
config: {
    pegboards: [],  // Array of pegboard instances
    pegboardModels: new Map(),  // Map of pegboard ID to 3D model
    spatialArrangement: 'horizontal', // or 'vertical', 'grid'
    pegboardSpacing: 0.1  // 10cm between boards
}

addPegboard: function(pegboard) {
    // Don't remove existing pegboards
    const pegboardId = 'pegboard_' + Date.now();

    // Load model
    this.loadPegboardModel(pegboard.model_url).then(model => {
        // Position based on existing pegboards
        const position = this.calculateNextPegboardPosition();

        // Setup pegboard
        this.positionPegboardModel(model, pegboard.dimensions);
        model.position.copy(position);
        model.userData.pegboardId = pegboardId;

        // Add to scene and tracking
        this.config.modules.core.addToScene(model);
        this.config.pegboards.push({
            id: pegboardId,
            data: pegboard,
            model: model,
            position: position,
            accessories: []  // Track accessories per pegboard
        });

        // Update scene camera to show all pegboards
        this.adjustCameraToShowAllPegboards();
    });
}

calculateNextPegboardPosition: function() {
    const count = this.config.pegboards.length;

    switch(this.config.spatialArrangement) {
        case 'horizontal':
            // Arrange left to right
            const totalWidth = this.config.pegboards.reduce((sum, pb) =>
                sum + pb.data.dimensions.width + this.config.pegboardSpacing, 0);
            return new THREE.Vector3(totalWidth, 0, 0);

        case 'vertical':
            // Stack top to bottom
            const totalHeight = this.config.pegboards.reduce((sum, pb) =>
                sum + pb.data.dimensions.height + this.config.pegboardSpacing, 0);
            return new THREE.Vector3(0, -totalHeight, 0);

        case 'grid':
            // Arrange in grid pattern
            const cols = Math.ceil(Math.sqrt(count + 1));
            const row = Math.floor(count / cols);
            const col = count % cols;
            return new THREE.Vector3(
                col * (0.3 + this.config.pegboardSpacing),
                -row * (0.5 + this.config.pegboardSpacing),
                0
            );
    }
}

removePegboard: function(pegboardId) {
    const index = this.config.pegboards.findIndex(pb => pb.id === pegboardId);
    if (index === -1) return;

    const pegboard = this.config.pegboards[index];

    // Remove all accessories from this pegboard
    pegboard.accessories.forEach(acc => {
        this.removeAccessory(acc.placementId);
    });

    // Remove pegboard model from scene
    this.config.modules.core.removeFromScene(pegboard.model);

    // Remove from array
    this.config.pegboards.splice(index, 1);

    // Rearrange remaining pegboards
    this.rearrangePegboards();
}
```

**Gap Summary**:

| Feature | Current | Target | Gap |
|---------|---------|--------|-----|
| Multiple Pegboards | ❌ No | ✅ Yes | **CRITICAL** |
| Spatial Arrangement | ❌ N/A | ✅ Configurable | **HIGH** |
| Per-Pegboard Accessories | ❌ No | ✅ Yes | **HIGH** |
| Scene Adaptation | ❌ No | ✅ Auto-adjust camera | **MEDIUM** |
| Pegboard Management | ❌ Replace only | ✅ Add/remove | **HIGH** |

---

## 2. Accessory Management Analysis

### 2.1 Accessory Configuration & Alignment

#### Current Implementation

**Accessory Metadata** (`class-woocommerce.php`):
```php
'_blasti_dimensions' => '{"width": 0.05, "height": 0.08, "depth": 0.03}'
// No peg information!
```

**Positioning Logic** (`configurator.js:1204-1247`):
```javascript
applyAccessoryPositioning: function (model, accessoryData) {
    // Default orientation
    model.rotation.set(0, 0, 0);

    // Hardcoded offsets based on type guessing
    const accessoryType = this.getAccessoryType(accessoryData);

    switch (accessoryType) {
        case 'hook':
            // No adjustment
            break;
        case 'shelf':
            model.position.z += 0.005; // 5mm forward (arbitrary)
            break;
        case 'bin':
            model.position.z += 0.01; // 1cm forward (arbitrary)
            break;
    }
}
```

**Problems**:
- ❌ No peg position data in accessory model
- ❌ No peg count/configuration
- ❌ Arbitrary Z offsets, not calculated
- ❌ Type guessing from name/category (unreliable)
- ❌ No rotation calculation
- ❌ No validation that accessory actually fits

#### Target Implementation

**Enhanced Accessory Metadata**:
```php
'_blasti_dimensions' => JSON:
{
    "width": 0.05,
    "height": 0.08,
    "depth": 0.03,
    "boundingBox": {
        "min": {"x": -0.025, "y": -0.04, "z": 0},
        "max": {"x": 0.025, "y": 0.04, "z": 0.03}
    }
}

'_blasti_peg_config' => JSON:
{
    "pegCount": 2,
    "pegs": [
        {
            "localPosition": {"x": 0, "y": 0.02, "z": 0},  // Relative to accessory origin
            "diameter": 0.006,     // 6mm
            "length": 0.012,       // 12mm insertion depth
            "direction": {"x": 0, "y": 0, "z": -1}  // Insertion direction
        },
        {
            "localPosition": {"x": 0, "y": -0.02, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "direction": {"x": 0, "y": 0, "z": -1}
        }
    ],
    "mountingSurface": "back",  // Which face mounts to pegboard
    "flushOffset": 0.001  // Small gap for visual clarity (1mm)
}
```

**Geometric Positioning**:
```javascript
positionAccessoryOnPegboard: function(accessory, pegboard, selectedHole) {
    const pegConfig = accessory.pegConfig;
    const pegboardMeta = pegboard.userData.pegboardMetadata;

    // 1. Find compatible peg holes for this accessory
    const compatibleHoleGroups = this.findCompatiblePegHoles(
        pegConfig.pegs,
        pegboardMeta.pegHoles,
        selectedHole  // User clicked this hole
    );

    if (compatibleHoleGroups.length === 0) {
        return {valid: false, reason: 'No compatible peg pattern'};
    }

    // 2. Use the first valid hole group
    const holeGroup = compatibleHoleGroups[0];

    // 3. Calculate accessory position
    // Position is calculated so that pegs align with holes
    const primaryPeg = pegConfig.pegs[0];
    const primaryHole = holeGroup[0];

    // Transform from peg local position to world position
    const accessoryPosition = new THREE.Vector3()
        .copy(primaryHole)
        .sub(primaryPeg.localPosition);

    // 4. Calculate rotation
    // Align accessory's peg direction with pegboard normal
    const rotation = this.calculateAccessoryRotation(
        pegConfig.pegs[0].direction,
        pegboardMeta.frontFaceNormal
    );

    // 5. Calculate flush mounting offset
    // Move accessory forward so it sits flush against pegboard
    const pegLength = pegConfig.pegs[0].length;
    const pegboardDepth = pegboardMeta.dimensions.depth;
    const flushOffset = pegConfig.flushOffset || 0.001;

    // Accessory should be at: pegboard front face + flush gap - peg insertion
    const frontFaceZ = pegboardDepth / 2;
    const mountingZ = frontFaceZ + flushOffset;

    accessoryPosition.z = mountingZ;

    return {
        valid: true,
        position: accessoryPosition,
        rotation: rotation,
        occupiedHoles: holeGroup,
        pegDepthInsertion: pegLength
    };
}

findCompatiblePegHoles: function(pegs, availableHoles, selectedHole) {
    // Find groups of holes that match the peg pattern
    const tolerance = 0.002; // 2mm tolerance
    const validGroups = [];

    // For each peg, calculate expected hole position relative to selected hole
    for (let startHole of availableHoles) {
        const holeGroup = [startHole];
        let allPegsMatch = true;

        for (let i = 1; i < pegs.length; i++) {
            const pegOffset = new THREE.Vector3()
                .copy(pegs[i].localPosition)
                .sub(pegs[0].localPosition);

            const expectedHolePos = new THREE.Vector3()
                .copy(startHole)
                .add(pegOffset);

            // Find closest hole to expected position
            const closestHole = this.findClosestHole(expectedHolePos, availableHoles);

            if (!closestHole || closestHole.distanceTo(expectedHolePos) > tolerance) {
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
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Peg Metadata | ❌ None | ✅ Complete config | **CRITICAL** |
| Position Calculation | ❌ Arbitrary offsets | ✅ Geometric | **CRITICAL** |
| Peg-Hole Matching | ❌ None | ✅ Pattern matching | **CRITICAL** |
| Rotation Calculation | ❌ Hardcoded | ✅ Calculated | **HIGH** |
| Multi-Peg Support | ❌ No | ✅ Yes | **HIGH** |
| Flush Mounting | ❌ No | ✅ Yes | **CRITICAL** |

---

### 2.2 Visual Validation (Green ✅ / Red ❌)

#### Current Implementation

**Preview Color Logic** (`configurator.js:1325-1370`):
```javascript
updatePreviewColor: function (model, isValid) {
    const color = isValid ? 0x28a745 : 0xdc3545; // Green or red
    const opacity = isValid ? 0.7 : 0.5;

    model.traverse(child => {
        if (child.material) {
            child.material.color.setHex(color);
            child.material.opacity = opacity;
        }
    });
}

// Validation is based on:
isValidGridPosition: function (position, dimensions) {
    // 1. Check bounds
    if (outsidePegboardBounds) return false;

    // 2. Check on peg hole
    if (!this.isPositionOnPegHole(position)) return false;

    // 3. Check overlaps
    if (this.checkAccessoryOverlap(position, dimensions)) return false;

    return true;
}
```

**Problems**:
- ❌ Only validates center position, not all pegs
- ❌ No per-peg validation feedback
- ❌ Overlap check is basic bounding box, not peg-aware
- ❌ No indication of which validation failed
- ❌ Assumes single peg at center

#### Target Implementation

```javascript
validateAccessoryPlacement: function(accessory, pegboard, position) {
    const validation = {
        valid: true,
        errors: [],
        warnings: [],
        pegStatus: []
    };

    const pegConfig = accessory.pegConfig;
    const pegboardMeta = pegboard.userData.pegboardMetadata;

    // 1. Find peg hole matches
    const holeMatches = this.findCompatiblePegHoles(
        pegConfig.pegs,
        pegboardMeta.pegHoles,
        position
    );

    if (holeMatches.length === 0) {
        validation.valid = false;
        validation.errors.push('NO_COMPATIBLE_HOLES');
    }

    // 2. Validate each peg individually
    for (let i = 0; i < pegConfig.pegs.length; i++) {
        const peg = pegConfig.pegs[i];
        const pegWorldPos = this.transformPegToWorld(peg, accessory, position);

        const pegValidation = {
            pegIndex: i,
            inHole: false,
            holePosition: null,
            clearance: 0
        };

        // Check if peg aligns with a hole
        const closestHole = this.findClosestHole(pegWorldPos, pegboardMeta.pegHoles);
        if (closestHole) {
            const distance = pegWorldPos.distanceTo(closestHole);
            const tolerance = 0.002; // 2mm

            if (distance <= tolerance) {
                pegValidation.inHole = true;
                pegValidation.holePosition = closestHole;
                pegValidation.clearance = tolerance - distance;
            }
        }

        if (!pegValidation.inHole) {
            validation.valid = false;
            validation.errors.push(`PEG_${i}_NOT_IN_HOLE`);
        }

        validation.pegStatus.push(pegValidation);
    }

    // 3. Check for overlaps with other accessories
    const overlappingAccessories = this.checkAccessoryOverlapAdvanced(
        accessory,
        position,
        pegboard.accessories
    );

    if (overlappingAccessories.length > 0) {
        validation.valid = false;
        validation.errors.push('OVERLAPS_WITH_ACCESSORIES');
        validation.overlapping = overlappingAccessories;
    }

    // 4. Check if pegs would be too deep
    for (let peg of pegConfig.pegs) {
        if (peg.length > pegboardMeta.pegHoleDepth) {
            validation.valid = false;
            validation.errors.push('PEG_TOO_DEEP');
        }
    }

    // 5. Check if accessory fits within pegboard bounds
    const accessoryBounds = this.calculateAccessoryBounds(accessory, position);
    const pegboardBounds = this.getPegboardBounds(pegboard);

    if (!this.boundsContained(accessoryBounds, pegboardBounds)) {
        validation.valid = false;
        validation.errors.push('EXCEEDS_PEGBOARD_BOUNDS');
    }

    return validation;
}

// Enhanced visual feedback
updatePreviewColorAdvanced: function(model, validation) {
    if (validation.valid) {
        // All pegs correctly inserted - GREEN
        this.setModelColor(model, 0x28a745, 0.7); // Green

        // Optional: Show green indicators at each peg
        this.showPegIndicators(model, validation.pegStatus, 0x28a745);
    } else {
        // Some validation failed - RED
        this.setModelColor(model, 0xdc3545, 0.5); // Red

        // Show which pegs are incorrectly positioned
        this.showPegIndicators(model, validation.pegStatus, 0xdc3545);

        // Show error message
        const errorMessage = this.formatValidationErrors(validation.errors);
        this.showTooltip(errorMessage);
    }
}

showPegIndicators: function(model, pegStatus, color) {
    // Remove existing indicators
    this.clearPegIndicators(model);

    // Add visual indicators at each peg position
    pegStatus.forEach((status, index) => {
        const pegPos = this.getPegWorldPosition(model, index);

        const indicatorColor = status.inHole ? 0x28a745 : 0xdc3545;
        const indicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.003, 8, 8),
            new THREE.MeshBasicMaterial({
                color: indicatorColor,
                transparent: true,
                opacity: 0.8
            })
        );

        indicator.position.copy(pegPos);
        indicator.name = 'peg-indicator-' + index;
        model.add(indicator);
    });
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Validation Granularity | ❌ Single point | ✅ Per-peg | **CRITICAL** |
| Visual Feedback | ⚠️ Basic | ✅ Detailed | **HIGH** |
| Error Reporting | ❌ None | ✅ Specific errors | **HIGH** |
| Peg Indicators | ❌ No | ✅ Visual markers | **MEDIUM** |
| Overlap Detection | ⚠️ Basic | ✅ Advanced | **HIGH** |

---

### 2.3 Collision & Overlap Detection

#### Current Implementation

**Simple Bounding Box Overlap** (`configurator.js:1119-1173`):
```javascript
checkAccessoryOverlap: function (position, dimensions, excludePlacementId = null) {
    const margin = 0.02; // 2cm margin
    const newWidth = (dimensions.width || 0.05) + margin;
    const newHeight = (dimensions.height || 0.05) + margin;

    const newBox = {
        minX: position.x - newWidth / 2,
        maxX: position.x + newWidth / 2,
        minY: position.y - newHeight / 2,
        maxY: position.y + newHeight / 2
    };

    for (let accessory of this.config.placedAccessories) {
        // 2D rectangle overlap check only
        const hasOverlap = !(
            newBox.maxX < existingBox.minX ||
            newBox.minX > existingBox.maxX ||
            newBox.maxY < existingBox.minY ||
            newBox.minY > existingBox.maxY
        );

        if (hasOverlap) return true;
    }

    return false;
}
```

**Problems**:
- ❌ 2D overlap only (ignores Z depth)
- ❌ Uses center position + dimensions, not actual model bounds
- ❌ Doesn't account for rotation
- ❌ Fixed margin for all accessory types
- ❌ Doesn't check peg-level conflicts

#### Target Implementation

```javascript
checkAccessoryOverlapAdvanced: function(newAccessory, position, rotation, existingAccessories) {
    const overlapping = [];

    // Get accurate 3D bounds of new accessory
    const newBounds = this.calculateAccurate3DBounds(
        newAccessory,
        position,
        rotation
    );

    for (let existing of existingAccessories) {
        // Method 1: Accurate 3D bounding box intersection
        const existingBounds = existing.model.userData.bounds3D;

        if (this.bounds3DIntersect(newBounds, existingBounds)) {
            // Potential overlap detected

            // Method 2: More accurate mesh-level collision
            const meshCollision = this.checkMeshCollision(
                newAccessory.model,
                existing.model,
                position,
                rotation
            );

            if (meshCollision) {
                overlapping.push({
                    accessory: existing,
                    type: 'mesh_collision',
                    penetrationDepth: meshCollision.depth
                });
                continue;
            }
        }

        // Method 3: Peg-level conflict check
        // Check if any peg holes would be blocked
        const newPegHoles = this.getOccupiedPegHoles(newAccessory, position);
        const existingPegHoles = existing.occupiedHoles;

        const holeConflict = this.checkPegHoleConflict(newPegHoles, existingPegHoles);
        if (holeConflict) {
            overlapping.push({
                accessory: existing,
                type: 'peg_hole_conflict',
                conflictingHoles: holeConflict
            });
        }
    }

    return overlapping;
}

calculateAccurate3DBounds: function(accessory, position, rotation) {
    // Clone the accessory model temporarily
    const tempModel = accessory.model.clone();
    tempModel.position.copy(position);
    tempModel.rotation.copy(rotation);

    // Get actual bounding box
    const box = new THREE.Box3().setFromObject(tempModel);

    // Clean up
    tempModel.geometry.dispose();
    tempModel.material.dispose();

    return {
        min: box.min,
        max: box.max,
        center: box.getCenter(new THREE.Vector3()),
        size: box.getSize(new THREE.Vector3())
    };
}

checkMeshCollision: function(mesh1, mesh2, pos1, rot1) {
    // Use raycasting or OBB (Oriented Bounding Box) intersection
    // This is computationally expensive, use as fallback

    // Simplified: Use multiple raycasts from mesh1 to detect mesh2
    const raycaster = new THREE.Raycaster();
    const directions = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1)
    ];

    for (let dir of directions) {
        raycaster.set(pos1, dir);
        const intersects = raycaster.intersectObject(mesh2, true);
        if (intersects.length > 0 && intersects[0].distance < 0.05) {
            return {
                collision: true,
                depth: 0.05 - intersects[0].distance
            };
        }
    }

    return null;
}

checkPegHoleConflict: function(newHoles, existingHoles) {
    const conflicts = [];

    for (let newHole of newHoles) {
        for (let existing of existingHoles) {
            const distance = newHole.distanceTo(existing);
            if (distance < 0.003) { // 3mm tolerance
                conflicts.push({
                    newHole: newHole,
                    existingHole: existing,
                    distance: distance
                });
            }
        }
    }

    return conflicts.length > 0 ? conflicts : null;
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Dimension | ❌ 2D only | ✅ Full 3D | **CRITICAL** |
| Accuracy | ⚠️ Approximate | ✅ Mesh-level | **HIGH** |
| Rotation Support | ❌ No | ✅ Yes | **HIGH** |
| Peg Conflicts | ❌ No | ✅ Yes | **CRITICAL** |
| Performance | ✅ Fast | ⚠️ Slower but accurate | **MEDIUM** |

---

## 3. Placement Precision Analysis

### 3.1 Flush Mounting

#### Current Implementation

**Z-Position Calculation** (`configurator.js:305-359`):
```javascript
// In initializeGridSystem()
const frontFaceZ = depth / 2 + 0.01; // Pegboard front + 1cm offset

// Accessories positioned at this Z
pegHoles.push({ x, y, z: frontFaceZ });

// Plus arbitrary offsets by type
switch (accessoryType) {
    case 'shelf':
        model.position.z += 0.005; // +5mm
        break;
    case 'bin':
        model.position.z += 0.01; // +10mm
        break;
}
```

**Visual Result**:
- Accessories "float" in front of pegboard
- No actual connection between pegs and holes
- Gaps are inconsistent and arbitrary

**Problems**:
- ❌ No concept of peg insertion depth
- ❌ Accessories don't sit flush
- ❌ Arbitrary hardcoded offsets
- ❌ No consideration of accessory thickness
- ❌ Ignores actual 3D model geometry

#### Target Implementation

```javascript
calculateFlushMountingPosition: function(accessory, pegboard, pegHoleGroup) {
    const pegConfig = accessory.pegConfig;
    const pegboardMeta = pegboard.userData.pegboardMetadata;

    // 1. Get pegboard front face position
    const pegboardFrontFace = pegboardMeta.dimensions.depth / 2;

    // 2. Get peg insertion depth (how far pegs go into holes)
    const pegInsertionDepth = Math.min(
        pegConfig.pegs[0].length,           // Peg length
        pegboardMeta.pegHoleDepth           // Hole depth
    );

    // 3. Get accessory mounting surface offset
    // This is the distance from accessory origin to its back face
    const mountingSurfaceOffset = accessory.pegConfig.mountingSurfaceOffset || 0;

    // 4. Calculate flush position
    // Accessory back surface should touch pegboard front surface
    const flushGap = pegConfig.flushOffset || 0.0005; // 0.5mm air gap for visual clarity

    const accessoryZ = pegboardFrontFace + flushGap - mountingSurfaceOffset;

    console.log('Flush mounting calculation:', {
        pegboardFrontFace,
        pegInsertionDepth,
        mountingSurfaceOffset,
        flushGap,
        finalZ: accessoryZ
    });

    return accessoryZ;
}

// Example values:
// Pegboard depth = 20mm, front face at Z=10mm
// Peg length = 15mm
// Peg hole depth = 18mm
// Accessory mounting surface = 2mm from origin
// Flush gap = 0.5mm
//
// Result: Z = 10mm + 0.5mm - 2mm = 8.5mm
// This positions the accessory so its back (at -2mm from origin)
// sits 0.5mm in front of the pegboard face (at 10mm)
```

**Visual Verification**:
```javascript
// Add debug visualization
showFlushMountingGuide: function(accessory, pegboard) {
    // Show pegboard front face plane
    const pegboardFace = this.createPlaneHelper(
        pegboard.position,
        pegboard.userData.pegboardMetadata.frontFaceNormal,
        pegboard.userData.pegboardMetadata.dimensions.width,
        pegboard.userData.pegboardMetadata.dimensions.height,
        0x0000ff, // Blue
        0.3
    );
    this.scene.add(pegboardFace);

    // Show accessory back face plane
    const accessoryBack = this.createPlaneHelper(
        accessory.position,
        new THREE.Vector3(0, 0, -1),
        accessory.dimensions.width,
        accessory.dimensions.height,
        0xff0000, // Red
        0.3
    );
    this.scene.add(accessoryBack);

    // Show gap distance
    const gap = this.calculateGapDistance(pegboardFace, accessoryBack);
    console.log('Gap between surfaces:', gap, 'mm');
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Mounting Calculation | ❌ Arbitrary offsets | ✅ Geometric | **CRITICAL** |
| Peg Insertion | ❌ Not considered | ✅ Calculated | **CRITICAL** |
| Surface Alignment | ❌ No | ✅ Flush contact | **CRITICAL** |
| Visual Accuracy | ❌ Floating | ✅ Realistic | **HIGH** |
| Debug Tools | ❌ None | ✅ Visualization | **MEDIUM** |

---

### 3.2 Geometric Precision

#### Current Implementation

**Grid Snapping** (`configurator.js:1002-1049`):
```javascript
snapToGrid: function (position) {
    const pegHoles = this.config.gridSystem.pegHoles;
    let closestHole = null;
    let minDistance = Infinity;
    const maxSnapDistance = this.config.gridSystem.pegHoleSpacing * 1.5;

    // Find closest hole by X,Y only
    pegHoles.forEach(hole => {
        const distance = Math.sqrt(
            Math.pow(position.x - hole.x, 2) +
            Math.pow(position.y - hole.y, 2)
        );

        if (distance < minDistance && distance <= maxSnapDistance) {
            minDistance = distance;
            closestHole = hole;
        }
    });

    // Return hole position (or null)
    return closestHole ? new THREE.Vector3(
        closestHole.x,
        closestHole.y,
        this.config.gridSystem.frontFaceZ
    ) : null;
}
```

**Problems**:
- ❌ Only snaps center point
- ❌ Doesn't validate all pegs fit
- ❌ No rotation snapping
- ❌ Ignores accessory orientation
- ❌ Single peg assumption

#### Target Implementation

```javascript
snapAccessoryToPegboard: function(accessory, pegboard, mousePosition) {
    const pegConfig = accessory.pegConfig;
    const pegboardMeta = pegboard.userData.pegboardMetadata;

    // 1. Find the closest peg hole to mouse position
    const closestHole = this.findClosestPegHole(
        mousePosition,
        pegboardMeta.pegHoles
    );

    if (!closestHole) return null;

    // 2. Find all valid configurations where primary peg is at this hole
    const validConfigs = [];

    // Try different rotations (0°, 90°, 180°, 270°)
    const rotations = [0, Math.PI/2, Math.PI, Math.PI*3/2];

    for (let rotation of rotations) {
        // Calculate where other pegs would be with this rotation
        const pegPositions = this.calculateRotatedPegPositions(
            pegConfig.pegs,
            closestHole,
            rotation
        );

        // Check if all peg positions have valid holes
        const allPegsValid = pegPositions.every(pegPos => {
            const nearestHole = this.findClosestPegHole(pegPos, pegboardMeta.pegHoles);
            return nearestHole && nearestHole.distanceTo(pegPos) < 0.002; // 2mm tolerance
        });

        if (allPegsValid) {
            validConfigs.push({
                rotation: rotation,
                pegHoles: pegPositions,
                primaryHole: closestHole
            });
        }
    }

    if (validConfigs.length === 0) {
        return {
            valid: false,
            reason: 'No valid peg configuration found',
            closestHole: closestHole
        };
    }

    // 3. Use the first valid configuration (or prefer certain rotations)
    const bestConfig = this.selectBestConfiguration(validConfigs, accessory);

    // 4. Calculate precise accessory position
    const accessoryPosition = this.calculateAccessoryPositionFromPegs(
        accessory,
        bestConfig.pegHoles,
        bestConfig.rotation
    );

    // 5. Calculate flush Z position
    const flushZ = this.calculateFlushMountingPosition(
        accessory,
        pegboard,
        bestConfig.pegHoles
    );

    accessoryPosition.z = flushZ;

    return {
        valid: true,
        position: accessoryPosition,
        rotation: new THREE.Euler(0, 0, bestConfig.rotation),
        occupiedHoles: bestConfig.pegHoles,
        config: bestConfig
    };
}

calculateRotatedPegPositions: function(pegs, primaryHolePos, rotation) {
    const positions = [];

    // Primary peg is at the primary hole
    positions.push(primaryHolePos.clone());

    // Calculate other peg positions with rotation
    for (let i = 1; i < pegs.length; i++) {
        const peg = pegs[i];
        const offset = new THREE.Vector3()
            .copy(peg.localPosition)
            .sub(pegs[0].localPosition);

        // Apply rotation around Z-axis
        const rotatedOffset = offset.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation);

        const pegPos = primaryHolePos.clone().add(rotatedOffset);
        positions.push(pegPos);
    }

    return positions;
}

calculateAccessoryPositionFromPegs: function(accessory, pegHolePositions, rotation) {
    // The accessory position is calculated so that when placed,
    // its pegs align with the given hole positions

    const pegConfig = accessory.pegConfig;
    const primaryPeg = pegConfig.pegs[0];

    // Transform primary peg local position with rotation
    const rotatedPegPos = primaryPeg.localPosition.clone()
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation);

    // Accessory position = hole position - rotated peg offset
    const accessoryPos = pegHolePositions[0].clone().sub(rotatedPegPos);

    return accessoryPos;
}

selectBestConfiguration: function(configs, accessory) {
    // Prefer certain rotations based on accessory type
    // For example, shelves should be horizontal

    if (accessory.preferredRotation !== undefined) {
        const preferred = configs.find(c =>
            Math.abs(c.rotation - accessory.preferredRotation) < 0.1
        );
        if (preferred) return preferred;
    }

    // Default: return first valid config
    return configs[0];
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Multi-Peg Support | ❌ No | ✅ Yes | **CRITICAL** |
| Rotation Support | ❌ No | ✅ 4 orientations | **HIGH** |
| Precision | ⚠️ Center only | ✅ All pegs | **CRITICAL** |
| Validation | ⚠️ Basic | ✅ Comprehensive | **HIGH** |
| Configuration Selection | ❌ N/A | ✅ Smart selection | **MEDIUM** |

---

## 4. Data Model Gaps

### 4.1 Product Metadata Structure

#### Current State

**Pegboard Data**:
```json
{
    "width": 0.22,
    "height": 0.44,
    "depth": 0.02
}
```

**Accessory Data**:
```json
{
    "width": 0.05,
    "height": 0.08,
    "depth": 0.03
}
```

#### Target State

**Pegboard Data**:
```json
{
    "version": "1.0",
    "dimensions": {
        "width": 0.22,
        "height": 0.44,
        "depth": 0.02,
        "unit": "meters"
    },
    "pegHoleGrid": {
        "pattern": "uniform",
        "spacing": 0.0254,
        "diameter": 0.0064,
        "depth": 0.015,
        "rows": 17,
        "cols": 8
    },
    "customPegHoles": [
        // Optional: explicit hole positions if not uniform
        {"x": -0.11, "y": -0.22, "z": 0.01, "diameter": 0.0064}
    ],
    "geometry": {
        "frontFaceNormal": {"x": 0, "y": 0, "z": 1},
        "initialRotation": {"x": 0, "y": 0, "z": 0},
        "centerOffset": {"x": 0, "y": 0, "z": 0}
    },
    "material": {
        "type": "metal",
        "color": "#808080",
        "finish": "powder-coat"
    },
    "mounting": {
        "wallMounted": true,
        "standAlone": false
    }
}
```

**Accessory Data**:
```json
{
    "version": "1.0",
    "dimensions": {
        "width": 0.05,
        "height": 0.08,
        "depth": 0.03,
        "unit": "meters",
        "boundingBox": {
            "min": {"x": -0.025, "y": -0.04, "z": 0},
            "max": {"x": 0.025, "y": 0.04, "z": 0.03}
        }
    },
    "pegConfiguration": {
        "pegCount": 2,
        "pattern": "vertical",
        "spacing": 0.0508,
        "pegs": [
            {
                "id": "peg_0",
                "localPosition": {"x": 0, "y": 0.0254, "z": 0},
                "diameter": 0.006,
                "length": 0.012,
                "insertionDirection": {"x": 0, "y": 0, "z": -1},
                "type": "cylindrical"
            },
            {
                "id": "peg_1",
                "localPosition": {"x": 0, "y": -0.0254, "z": 0},
                "diameter": 0.006,
                "length": 0.012,
                "insertionDirection": {"x": 0, "y": 0, "z": -1},
                "type": "cylindrical"
            }
        ]
    },
    "mounting": {
        "surface": "back",
        "surfaceOffset": 0.002,
        "flushGap": 0.0005,
        "requiresAllPegs": true,
        "allowableRotations": [0, 90, 180, 270]
    },
    "weight": {
        "value": 0.15,
        "unit": "kg",
        "maxLoad": 2.0
    },
    "category": "hook",
    "subcategory": "tool-hook",
    "material": {
        "type": "steel",
        "coating": "chrome"
    }
}
```

**Gap Summary**:

| Field | Current | Target | Priority |
|-------|---------|--------|----------|
| Peg Hole Data | ❌ None | ✅ Complete | **CRITICAL** |
| Peg Config | ❌ None | ✅ Complete | **CRITICAL** |
| Bounding Box | ❌ Calculated | ✅ Stored | **HIGH** |
| Rotation Data | ❌ None | ✅ Stored | **HIGH** |
| Material Info | ❌ None | ✅ Optional | **LOW** |
| Weight/Load | ❌ None | ✅ Optional | **LOW** |
| Version | ❌ No | ✅ Yes | **MEDIUM** |

---

### 4.2 Runtime State Management

#### Current State

```javascript
config: {
    currentPegboard: {id, name, price, ...},  // Single pegboard
    currentPegboardModel: THREE.Object3D,
    placedAccessories: [
        {
            placementId: 'acc_123',
            id: 456,
            name: 'Hook',
            model: THREE.Object3D,
            position: Vector3,
            dimensions: {width, height, depth}
        }
    ],
    gridSystem: {
        enabled: true,
        pegHoleSpacing: 0.0254,
        width: 0.22,
        height: 0.44,
        pegHoles: [{x, y, z}]
    }
}
```

**Problems**:
- ❌ No peg occupancy tracking
- ❌ No pegboard-accessory relationships
- ❌ No rotation stored
- ❌ No validation state stored
- ❌ No multi-pegboard support

#### Target State

```javascript
config: {
    pegboards: [
        {
            id: 'pegboard_001',
            productId: 123,
            model: THREE.Object3D,
            position: Vector3,
            rotation: Euler,
            metadata: {
                dimensions: {...},
                pegHoles: [...],
                frontFaceNormal: Vector3
            },
            accessories: [
                // References to accessories on this pegboard
                {placementId: 'acc_001', pegHoles: [hole1, hole2]}
            ],
            occupiedHoles: new Set(['hole_0_0', 'hole_0_1', ...]),
            bounds: BoundingBox
        }
    ],
    accessories: [
        {
            placementId: 'acc_001',
            productId: 456,
            model: THREE.Object3D,
            position: Vector3,
            rotation: Euler,
            parentPegboardId: 'pegboard_001',
            occupiedPegHoles: [
                {holeId: 'hole_2_3', holePosition: Vector3},
                {holeId: 'hole_2_4', holePosition: Vector3}
            ],
            pegConfiguration: {...},
            validationState: {
                valid: true,
                errors: [],
                pegStatus: [
                    {pegIndex: 0, inHole: true, ...},
                    {pegIndex: 1, inHole: true, ...}
                ]
            },
            bounds3D: BoundingBox,
            flushMounted: true,
            mountingDepth: 0.012
        }
    ],
    pegHoleOccupancy: {
        'pegboard_001': {
            'hole_2_3': 'acc_001',
            'hole_2_4': 'acc_001',
            'hole_5_7': 'acc_002'
        }
    },
    spatialIndex: {
        // For fast collision detection
        grid: SpatialHashGrid
    }
}
```

**Gap Summary**:

| Aspect | Current | Target | Gap |
|--------|---------|--------|-----|
| Peg Tracking | ❌ None | ✅ Complete | **CRITICAL** |
| Validation State | ❌ Not stored | ✅ Persistent | **HIGH** |
| Relationships | ❌ None | ✅ Bidirectional | **HIGH** |
| Spatial Indexing | ❌ No | ✅ Yes | **MEDIUM** |
| Multi-Pegboard | ❌ No | ✅ Yes | **CRITICAL** |

---

## 5. Visual Feedback Gaps

### 5.1 Preview System

#### Current Implementation
- ⚠️ Single color preview (green/red)
- ⚠️ No per-peg indicators
- ❌ No hole highlighting
- ❌ No snap guides
- ❌ No distance indicators

#### Target Implementation
- ✅ Color-coded per-peg validation
- ✅ Highlight target peg holes
- ✅ Show snap guides/lines
- ✅ Distance to nearest hole indicator
- ✅ Rotation preview
- ✅ Collision warning visualization

**Gap**: Complete preview system redesign needed

---

### 5.2 Placement Assistance

#### Current Implementation
- ❌ No visual guides
- ❌ No measurement tools
- ❌ No alignment helpers

#### Target Implementation
- ✅ Grid overlay (toggleable)
- ✅ Measurement ruler tool
- ✅ Alignment lines (snap to other accessories)
- ✅ Peg hole highlights on hover
- ✅ "Ghost" preview at cursor
- ✅ Mini-map for large pegboards

**Gap**: No placement assistance tools exist

---

## 6. Performance & Scalability Gaps

### 6.1 Model Loading

#### Current Issues
- ❌ No model size validation
- ❌ No polygon count limits
- ❌ No texture compression
- ❌ No LOD (Level of Detail)
- ❌ Loads all accessories upfront

#### Target
- ✅ Validate model before load (< 100k triangles)
- ✅ Compress textures to < 1MB
- ✅ LOD for complex models
- ✅ Lazy-load accessories on demand
- ✅ Progress indicators

---

### 6.2 Collision Detection

#### Current Issues
- ⚠️ O(n) collision check per placement
- ❌ No spatial indexing
- ❌ Checks all accessories every time

#### Target
- ✅ Spatial hash grid for O(1) lookups
- ✅ Only check nearby accessories
- ✅ Early-exit optimizations
- ✅ Cached bounding boxes

---

## 7. Priority Matrix

### Critical Priority (Must Fix for MVP)

| ID | Gap | Area | Effort | Impact |
|----|-----|------|--------|--------|
| G1 | No peg metadata | Data Model | **HIGH** | **CRITICAL** |
| G2 | No peg-hole validation | Accessory Mgmt | **HIGH** | **CRITICAL** |
| G3 | No flush mounting | Placement | **MEDIUM** | **CRITICAL** |
| G4 | Arbitrary Z offsets | Placement | **LOW** | **CRITICAL** |
| G5 | Single peg assumption | Accessory Mgmt | **MEDIUM** | **CRITICAL** |
| G6 | 2D collision only | Accessory Mgmt | **MEDIUM** | **HIGH** |
| G7 | No multi-peg snapping | Placement | **HIGH** | **CRITICAL** |

### High Priority (Should Fix Soon)

| ID | Gap | Area | Effort | Impact |
|----|-----|------|--------|--------|
| G8 | No rotation support | Placement | **MEDIUM** | **HIGH** |
| G9 | No dimension validation | Board Handling | **LOW** | **HIGH** |
| G10 | Per-peg visual feedback | Visual | **MEDIUM** | **HIGH** |
| G11 | No hole occupancy tracking | Data Model | **LOW** | **HIGH** |
| G12 | Basic overlap detection | Collision | **MEDIUM** | **HIGH** |

### Medium Priority (Nice to Have)

| ID | Gap | Area | Effort | Impact |
|----|-----|------|--------|--------|
| G13 | No multi-pegboard | Board Handling | **HIGH** | **MEDIUM** |
| G14 | No placement guides | Visual | **MEDIUM** | **MEDIUM** |
| G15 | No spatial indexing | Performance | **MEDIUM** | **MEDIUM** |
| G16 | No LOD system | Performance | **HIGH** | **LOW** |

---

## 8. Impact Assessment

### User Experience Impact

**Current System**:
- 🔴 Accessories appear to "float" in front of pegboard
- 🔴 No way to tell if accessory is properly mounted
- 🔴 Placement feels arbitrary and imprecise
- 🔴 Can place accessories incorrectly
- 🟡 Basic functionality works but feels "off"

**With Fixes**:
- 🟢 Accessories sit flush and realistic
- 🟢 Clear visual feedback (green = good, red = invalid)
- 🟢 Precise, predictable placement
- 🟢 Impossible to place incorrectly
- 🟢 Professional, polished feel

### Technical Debt

**Current**:
- High maintenance cost due to hardcoded values
- Difficult to add new accessory types
- Scaling issues with many accessories
- No clear extension points

**With Fixes**:
- Data-driven system
- Easy to add new products
- Performs well with 50+ accessories
- Clear API for extensions

---

## Summary

This gap analysis has identified **23 critical gaps** across the 3D configurator system. The most critical issues are:

1. **No peg-to-hole validation system** - Accessories don't actually "know" about pegs
2. **Arbitrary positioning** - Z-offsets are hardcoded, not calculated
3. **Missing metadata** - No peg configuration data in product setup
4. **2D collision only** - Doesn't account for 3D space properly
5. **No flush mounting** - Accessories float instead of sitting flush
6. **Single-peg assumption** - System assumes one peg per accessory
7. **No multi-pegboard support** - Can only have one pegboard at a time

**Next Steps**: See `TECHNICAL_PLAN.md` for detailed implementation roadmap.

---

**Document End**
