# Product Configuration Guide
## Automatic 3D Pegboard System - Complete Setup Instructions

**Version**: 3.0 (Phase 1-3 Implementation)
**Date**: 2025-11-09
**System**: Blasti 3D Configurator with Enhanced Data Model

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [How Automatic Adaptation Works](#how-automatic-adaptation-works)
3. [Pegboard Configuration](#pegboard-configuration)
4. [Accessory Configuration](#accessory-configuration)
5. [3D Model Requirements](#3d-model-requirements)
6. [Complete Setup Examples](#complete-setup-examples)
7. [Testing with Debug Mode](#testing-with-debug-mode)
8. [Troubleshooting](#troubleshooting)
9. [Quick Reference](#quick-reference)

---

## System Overview

### What You Configure

Configure your products **once** with enhanced metadata:

**Pegboards:**
- ✏️ Physical dimensions (width, height, depth)
- ✏️ Exact peg hole positions (x, y, z coordinates)
- ✏️ Hole grid specifications (spacing, diameter, depth)
- ✏️ 3D model URL

**Accessories:**
- ✏️ Physical dimensions and bounding box
- ✏️ Peg positions and specifications
- ✏️ Mounting configuration (offsets, rotations)
- ✏️ Load bearing capacity
- ✏️ 3D model URL

### What The System Does Automatically

The system handles **everything** during placement:

- ✅ **Pattern Matching**: Finds compatible peg hole groups for multi-peg accessories
- ✅ **Rotation Testing**: Tests all allowable rotations (0°, 90°, 180°, 270°)
- ✅ **Geometric Validation**: Ensures peg diameters, lengths, and spacing match
- ✅ **Flush Mounting**: Calculates precise Z-position for realistic mounting
- ✅ **Collision Detection**: Prevents overlapping accessories
- ✅ **Occupancy Tracking**: Tracks which holes are used
- ✅ **Best Configuration Selection**: Chooses optimal rotation and position

### Key Benefits

1. **No Manual Coding**: Just configure product metadata
2. **Works with Any Pegboard**: System adapts to any hole pattern
3. **Works with Any Accessory**: 1-peg, 2-peg, 4-peg, custom patterns
4. **Realistic Mounting**: Geometric calculations ensure flush, realistic placement
5. **Visual Debugging**: Built-in visualization shows exactly what's happening

---

## How Automatic Adaptation Works

### The Complete Workflow

When a user clicks to place an accessory:

#### **Step 1: Find Closest Hole**
```javascript
// User clicks at position (0.05, 0.10, 0.01)
// System finds nearest peg hole
closestHole = {x: 0.0508, y: 0.1016, z: 0}  // 2 inches right, 4 inches up
```

#### **Step 2: Read Accessory Configuration**
```javascript
// System automatically reads from product metadata
pegConfig = {
  pegCount: 2,
  pegs: [
    {position: {x: -0.0381, y: 0, z: 0}},  // Left peg (1.5 inches left)
    {position: {x: 0.0381, y: 0, z: 0}}     // Right peg (1.5 inches right)
  ],
  mounting: {
    allowableRotations: [0, 90, 180, 270],  // Try all 4 orientations
    insertionDepth: 0.0095,                  // Pegs insert 9.5mm
    surfaceOffset: 0.003                     // 3mm gap for visual clarity
  }
}
```

#### **Step 3: Calculate Pattern Geometry**
```javascript
// System calculates what pattern to look for
pegSpacing = distance(peg[0], peg[1]) = 0.0762m  // 3 inches apart
orientation = "horizontal"
requiredPattern = "two holes, 3 inches apart, horizontally aligned"
```

#### **Step 4: Test Each Rotation**
```javascript
// For rotation = 0° (upright):
requiredHoles = [
  {x: closestHole.x - 0.0381, y: closestHole.y, z: 0},  // Left
  {x: closestHole.x + 0.0381, y: closestHole.y, z: 0}   // Right
]
compatibleHoles = findMatchingHoles(requiredHoles, pegboard.pegHoles, tolerance=3mm)

// For rotation = 90° (rotated):
requiredHoles = [
  {x: closestHole.x, y: closestHole.y - 0.0381, z: 0},  // Bottom
  {x: closestHole.x, y: closestHole.y + 0.0381, z: 0}   // Top
]
compatibleHoles = findMatchingHoles(requiredHoles, pegboard.pegHoles, tolerance=3mm)

// Continues for 180° and 270°...
```

#### **Step 5: Validate Each Configuration**
```javascript
for each validConfiguration:
  // Check 1: Peg diameter fits hole
  if (peg.diameter > hole.diameter) → INVALID

  // Check 2: Peg length doesn't exceed hole depth
  if (peg.length > hole.depth) → INVALID

  // Check 3: Holes not occupied
  if (isOccupied(holes, occupancyMap)) → INVALID

  // Check 4: No collision with other accessories
  if (hasCollision(position, placedAccessories)) → INVALID

  // All passed → VALID configuration
```

#### **Step 6: Select Best Configuration**
```javascript
// Scoring system
for each validConfig:
  score = 0

  // Prefer upright orientation (0°) - weight: 10
  score += 10 × (1 - abs(rotation) / 180)

  // Prefer closer to click point - weight: 5
  score += 5 × max(0, 1 - distanceToClick)

bestConfig = configWithHighestScore

// Example:
// 0° rotation, 0.01m from click → score = 15.0 ✓ SELECTED
// 90° rotation, 0.01m from click → score = 10.0
// 0° rotation, 0.5m from click → score = 7.5
```

#### **Step 7: Calculate Flush Z Position**
```javascript
// Geometric flush mounting calculation
frontFaceZ = pegboard.geometry.frontFaceZ        // 0.00635 (front surface)
insertionDepth = accessory.mounting.insertionDepth // 0.0095 (peg goes in)
surfaceOffset = accessory.mounting.surfaceOffset   // 0.003 (visual gap)

flushZ = frontFaceZ + surfaceOffset - insertionDepth
flushZ = 0.00635 + 0.003 - 0.0095
flushZ = -0.00015m  // Slightly behind front face (realistic!)
```

#### **Step 8: Apply Positioning**
```javascript
// System automatically applies:
accessory.position = {x: 0.0508, y: 0.1016, z: -0.00015}
accessory.rotation = {x: 0, y: 0, z: 0}  // Best configuration selected
accessory.updateMatrix()

// Marks holes as occupied
occupancyMap.set(hole1, "accessory_12345")
occupancyMap.set(hole2, "accessory_12345")

// Stores metadata
accessory.userData.placementMetadata = {
  snapMethod: 'precise-peg-system',
  occupiedHoles: [hole1, hole2],
  rotationDegrees: 0,
  flushMounted: true,
  timestamp: Date.now()
}
```

### What This Means for You

**You just need to**:
1. Measure your physical pegboard holes
2. Measure your physical accessory pegs
3. Configure the product metadata (JSON)
4. Upload the 3D models

**The system handles**:
- Finding compatible hole patterns
- Testing multiple rotations
- Validating geometric fit
- Calculating flush mounting
- Preventing collisions
- Tracking occupancy

---

## Pegboard Configuration

### Required Fields

Three custom meta fields in WooCommerce:

| Field Name | Type | Required | Purpose |
|------------|------|----------|---------|
| `dimensions_v2` | JSON | Yes | Enhanced dimensions with geometry |
| `peg_holes` | JSON Array | Yes | Exact hole coordinates |
| `model_url` | Text | Yes | URL to GLB file |

### Field 1: dimensions_v2 (JSON)

Complete dimensional and geometric data.

**Template:**
```json
{
  "version": 2,
  "dimensions": {
    "width": 0.2286,
    "height": 0.4572,
    "depth": 0.0127
  },
  "pegHoleGrid": {
    "pattern": "uniform",
    "spacing": 0.0254,
    "rows": 18,
    "cols": 9,
    "diameter": 0.00635,
    "depth": 0.0095
  },
  "geometry": {
    "frontFaceZ": 0.00635,
    "backFaceZ": -0.00635,
    "centerZ": 0,
    "material": "mdf",
    "thickness": 0.0127
  }
}
```

**Field Details:**

| Path | Type | Description | Example | Units |
|------|------|-------------|---------|-------|
| `version` | int | Data model version | `2` | - |
| `dimensions.width` | float | Pegboard width | `0.2286` | meters |
| `dimensions.height` | float | Pegboard height | `0.4572` | meters |
| `dimensions.depth` | float | Pegboard thickness | `0.0127` | meters |
| `pegHoleGrid.pattern` | string | Grid type | `"uniform"` | - |
| `pegHoleGrid.spacing` | float | Hole-to-hole distance | `0.0254` | meters |
| `pegHoleGrid.rows` | int | Number of rows | `18` | count |
| `pegHoleGrid.cols` | int | Number of columns | `9` | count |
| `pegHoleGrid.diameter` | float | Hole diameter | `0.00635` | meters |
| `pegHoleGrid.depth` | float | Hole depth | `0.0095` | meters |
| `geometry.frontFaceZ` | float | Front surface Z | `0.00635` | meters |
| `geometry.backFaceZ` | float | Back surface Z | `-0.00635` | meters |
| `geometry.centerZ` | float | Center Z | `0` | meters |
| `geometry.material` | string | Material type | `"mdf"` | - |
| `geometry.thickness` | float | Board thickness | `0.0127` | meters |

**How to Calculate:**

```javascript
// Standard 1-inch hole spacing pegboard

// 1. Measure physical pegboard
width_cm = 22.86      // 9 inches
height_cm = 45.72     // 18 inches
thickness_cm = 1.27   // 0.5 inches

// 2. Convert to meters
width_m = 22.86 / 100 = 0.2286
height_m = 45.72 / 100 = 0.4572
thickness_m = 1.27 / 100 = 0.0127

// 3. Calculate rows and cols
spacing = 0.0254  // 1 inch = 25.4mm
rows = floor(height_m / spacing) = floor(0.4572 / 0.0254) = 18
cols = floor(width_m / spacing) = floor(0.2286 / 0.0254) = 9

// 4. Standard hole dimensions
hole_diameter = 0.00635  // 1/4 inch = 6.35mm
hole_depth = 0.0095      // 3/8 inch = 9.5mm

// 5. Geometry (for centered pegboard)
frontFaceZ = thickness_m / 2 = 0.0127 / 2 = 0.00635
backFaceZ = -frontFaceZ = -0.00635
centerZ = 0
```

### Field 2: peg_holes (JSON Array)

Array of **exact 3D coordinates** for every peg hole.

**Why This Matters**: The system uses these exact positions for pattern matching. Even with a uniform grid, providing actual hole coordinates ensures perfect alignment.

**Format:**
```json
[
  {"x": -0.1016, "y": -0.2159, "z": 0},
  {"x": -0.0762, "y": -0.2159, "z": 0},
  {"x": -0.0508, "y": -0.2159, "z": 0},
  ...
]
```

**Generation Script** (JavaScript):
```javascript
/**
 * Generate pegboard hole positions for uniform grid
 */
function generatePegHoles(rows, cols, spacing) {
  const holes = [];

  // Calculate grid dimensions
  const gridWidth = (cols - 1) * spacing;
  const gridHeight = (rows - 1) * spacing;

  // Start from center (0, 0)
  const startX = -gridWidth / 2;
  const startY = -gridHeight / 2;

  // Generate holes
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      holes.push({
        x: parseFloat((startX + (col * spacing)).toFixed(6)),
        y: parseFloat((startY + (row * spacing)).toFixed(6)),
        z: 0  // Front face
      });
    }
  }

  return holes;
}

// Example: 18 rows × 9 cols, 1-inch spacing
const holes = generatePegHoles(18, 9, 0.0254);
console.log(JSON.stringify(holes, null, 2));

// Output: Array of 162 hole positions
```

**Python Script** (for backend generation):
```python
import json

def generate_peg_holes(rows, cols, spacing):
    """Generate pegboard hole positions for uniform grid"""
    holes = []

    grid_width = (cols - 1) * spacing
    grid_height = (rows - 1) * spacing

    start_x = -grid_width / 2
    start_y = -grid_height / 2

    for row in range(rows):
        for col in range(cols):
            holes.append({
                'x': round(start_x + (col * spacing), 6),
                'y': round(start_y + (row * spacing), 6),
                'z': 0
            })

    return holes

# Example: 18 rows × 9 cols, 1-inch spacing
holes = generate_peg_holes(18, 9, 0.0254)
print(json.dumps(holes, indent=2))
```

**For Custom Patterns:**

If your pegboard has missing holes or irregular patterns, manually list only the existing holes:

```json
[
  {"x": -0.1016, "y": -0.2159, "z": 0},
  {"x": -0.0762, "y": -0.2159, "z": 0},
  // Skip missing hole at (-0.0508, -0.2159)
  {"x": -0.0254, "y": -0.2159, "z": 0},
  ...
]
```

### Field 3: model_url (Text)

Full URL to your GLB file.

```
https://yoursite.com/wp-content/uploads/models/pegboard-9x18.glb
```

**Requirements:**
- Format: GLB (preferred) or GLTF
- Size: < 5MB
- Accessible via HTTP(S)
- Same domain or CORS-enabled

---

## Accessory Configuration

### Required Fields

Three custom meta fields in WooCommerce:

| Field Name | Type | Required | Purpose |
|------------|------|----------|---------|
| `dimensions_v2` | JSON | Yes | Physical dimensions and bounding box |
| `peg_config` | JSON | Yes | Complete peg configuration |
| `model_url` | Text | Yes | URL to GLB file |

### Field 1: dimensions_v2 (JSON)

Physical dimensions and bounding box for collision detection.

**Template:**
```json
{
  "version": 2,
  "dimensions": {
    "width": 0.0762,
    "height": 0.0508,
    "depth": 0.0381
  },
  "boundingBox": {
    "min": {"x": -0.0381, "y": -0.0254, "z": 0},
    "max": {"x": 0.0381, "y": 0.0254, "z": 0.0381}
  },
  "weight": 0.45
}
```

**Field Details:**

| Path | Type | Description | Units |
|------|------|-------------|-------|
| `version` | int | Data model version | - |
| `dimensions.width` | float | Overall width | meters |
| `dimensions.height` | float | Overall height | meters |
| `dimensions.depth` | float | Overall depth (front to back) | meters |
| `boundingBox.min` | object | Minimum corner {x, y, z} | meters |
| `boundingBox.max` | object | Maximum corner {x, y, z} | meters |
| `weight` | float | Product weight | kilograms |

**How to Measure:**

In Blender:
1. Select accessory
2. Press `N` → View → Statistics
3. Note Dimensions: X, Y, Z (in meters)
4. For bounding box: Object → Quick Effects → Display Bounds
5. Read min/max coordinates

### Field 2: peg_config (JSON)

**This is the MOST IMPORTANT field** - it defines how the accessory mounts to the pegboard.

#### Single-Peg Configuration

For simple hooks, hangers:

```json
{
  "version": 2,
  "pegCount": 1,
  "pegs": [
    {
      "id": "peg-1",
      "position": {"x": 0, "y": 0, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    }
  ],
  "mounting": {
    "method": "peg-insert",
    "insertionDepth": 0.0095,
    "surfaceOffset": 0.003,
    "contactArea": 0.0005,
    "allowableRotations": [0]
  },
  "loadBearing": {
    "maxWeight": 2.27,
    "recommendedWeight": 1.36,
    "distribution": "uniform"
  }
}
```

#### Two-Peg Configuration (Horizontal)

For shelves, bins (pegs side-by-side):

```json
{
  "version": 2,
  "pegCount": 2,
  "pegs": [
    {
      "id": "peg-left",
      "position": {"x": -0.0381, "y": 0, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    },
    {
      "id": "peg-right",
      "position": {"x": 0.0381, "y": 0, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    }
  ],
  "mounting": {
    "method": "peg-insert",
    "insertionDepth": 0.0095,
    "surfaceOffset": 0.003,
    "contactArea": 0.001,
    "allowableRotations": [0, 90, 180, 270]
  },
  "loadBearing": {
    "maxWeight": 4.54,
    "recommendedWeight": 2.72,
    "distribution": "even-split"
  }
}
```

**Note**: Pegs are 3 inches apart (0.0381m × 2 = 0.0762m = 3 inches)

#### Four-Peg Configuration (Rectangular)

For baskets, heavy bins:

```json
{
  "version": 2,
  "pegCount": 4,
  "pegs": [
    {
      "id": "peg-top-left",
      "position": {"x": -0.0381, "y": 0.0508, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    },
    {
      "id": "peg-top-right",
      "position": {"x": 0.0381, "y": 0.0508, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    },
    {
      "id": "peg-bottom-left",
      "position": {"x": -0.0381, "y": -0.0508, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    },
    {
      "id": "peg-bottom-right",
      "position": {"x": 0.0381, "y": -0.0508, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    }
  ],
  "mounting": {
    "method": "peg-insert",
    "insertionDepth": 0.0095,
    "surfaceOffset": 0.003,
    "contactArea": 0.002,
    "allowableRotations": [0, 90, 180, 270]
  },
  "loadBearing": {
    "maxWeight": 9.08,
    "recommendedWeight": 5.44,
    "distribution": "even-split"
  }
}
```

**Note**: 3 inches horizontal spacing, 4 inches vertical spacing

### peg_config Field Reference

| Path | Type | Description | Example | Units |
|------|------|-------------|---------|-------|
| `version` | int | Peg config version | `2` | - |
| `pegCount` | int | Number of pegs | `2` | count |
| **Peg Specification** |
| `pegs[].id` | string | Unique identifier | `"peg-left"` | - |
| `pegs[].position` | object | Local position {x, y, z} | `{x: -0.0381, y: 0, z: 0}` | meters |
| `pegs[].diameter` | float | Peg diameter | `0.00635` | meters |
| `pegs[].length` | float | Peg insertion length | `0.0095` | meters |
| `pegs[].type` | string | Peg shape | `"cylindrical"` | - |
| **Mounting Configuration** |
| `mounting.method` | string | Mounting method | `"peg-insert"` | - |
| `mounting.insertionDepth` | float | How deep peg goes in | `0.0095` | meters |
| `mounting.surfaceOffset` | float | Distance to back face | `0.003` | meters |
| `mounting.contactArea` | float | Contact surface area | `0.001` | m² |
| `mounting.allowableRotations` | array | Valid rotation angles | `[0, 90, 180, 270]` | degrees |
| **Load Bearing** |
| `loadBearing.maxWeight` | float | Maximum load | `4.54` | kg |
| `loadBearing.recommendedWeight` | float | Recommended load | `2.72` | kg |
| `loadBearing.distribution` | string | Load type | `"even-split"` | - |

### Critical: Peg Positions

**Peg positions are in LOCAL coordinates** relative to the accessory's origin.

**Coordinate System for Accessories:**
```
         Y ↑ (Up)
         |
         |
Origin: [0,0,0] ──→ X (Right)
        /
       /
      Z (Forward, away from pegboard)

Pegs point in -Z direction (backward, into pegboard)
```

**How to Measure:**

1. **In Blender:**
   - Set accessory origin at center
   - Add Empty objects at each peg position
   - Read coordinates from Transform panel (N key)
   - Positions are relative to accessory origin

2. **Example - Hook with 2 Vertical Pegs:**
   ```
   Accessory height: 0.0508m (2 inches)
   Peg spacing: 0.0254m (1 inch)

   Top peg: 0.5 inches above center = 0.0127m up
   Bottom peg: 0.5 inches below center = -0.0127m down

   Peg 1 (top): {x: 0, y: 0.0127, z: 0}
   Peg 2 (bottom): {x: 0, y: -0.0127, z: 0}
   ```

3. **Example - Shelf with 2 Horizontal Pegs:**
   ```
   Shelf width: 0.1524m (6 inches)
   Peg spacing: 0.0762m (3 inches)

   Left peg: 1.5 inches left of center = -0.0381m
   Right peg: 1.5 inches right of center = +0.0381m

   Peg 1 (left): {x: -0.0381, y: 0, z: 0}
   Peg 2 (right): {x: 0.0381, y: 0, z: 0}
   ```

**Common Spacings:**

| Inches Apart | Meters | Common Use |
|--------------|--------|------------|
| 1" | 0.0254 | Adjacent holes, small accessories |
| 2" | 0.0508 | Small shelves, hooks |
| 3" | 0.0762 | Medium shelves |
| 4" | 0.1016 | Large shelves, bins |
| 6" | 0.1524 | Extra-large items |

**Always use multiples of 0.0254m (1 inch) to match standard pegboard hole spacing!**

### allowableRotations Explained

This array defines which orientations the system should try:

| Value | Meaning | Use Case |
|-------|---------|----------|
| `[0]` | Upright only | Hooks, items with specific orientation |
| `[0, 180]` | Upright or upside-down | Symmetric items |
| `[0, 90]` | Upright or rotated 90° | Shelves that can go horizontal/vertical |
| `[0, 90, 180, 270]` | All 4 orientations | Fully symmetric items |

**How It Works:**
- System tests EACH rotation in the array
- Finds compatible hole patterns for each
- Scores each valid configuration
- **Prefers rotation=0°** (upright) when multiple options work
- User sees best configuration automatically selected

### Field 3: model_url (Text)

URL to your GLB file.

```
https://yoursite.com/wp-content/uploads/models/shelf-6inch.glb
```

---

## 3D Model Requirements

### Coordinate System (CRITICAL!)

**Pegboards:**
```
Origin: Center of pegboard (0, 0, 0)
Front face: Positive Z direction (+Z)
Width: X-axis
Height: Y-axis
Depth: Z-axis

Front surface Z = +depth/2
Back surface Z = -depth/2
```

**Accessories:**
```
Origin: Center at mounting surface (0, 0, 0)
Pegs point: Negative Z direction (-Z, into pegboard)
Mounting surface: Z = 0
Body extends: Positive Z (+Z, away from pegboard)
```

### GLB Export Settings

**Blender:**
```
File → Export → glTF 2.0 (.glb)

Format: glTF Binary (.glb)
Include: Selected Objects
Transform: +Y Up
Geometry:
  ✓ Apply Modifiers
  ✓ UVs
  ✓ Normals
Materials: Export
Compression: Enable (if available)
```

### Optimization Guidelines

| Aspect | Pegboard | Accessory |
|--------|----------|-----------|
| Polygons | < 10,000 | < 5,000 |
| Texture Size | 2048×2048 max | 1024×1024 max |
| File Size | < 5MB | < 2MB |
| Materials | PBR recommended | PBR recommended |

---

## Complete Setup Examples

### Example 1: Standard Pegboard (9" × 18")

**Physical Measurements:**
- Width: 9 inches = 0.2286m
- Height: 18 inches = 0.4572m
- Thickness: 0.5 inches = 0.0127m
- Hole spacing: 1 inch = 0.0254m
- Holes: 9 cols × 18 rows = 162 holes

**dimensions_v2:**
```json
{
  "version": 2,
  "dimensions": {
    "width": 0.2286,
    "height": 0.4572,
    "depth": 0.0127
  },
  "pegHoleGrid": {
    "pattern": "uniform",
    "spacing": 0.0254,
    "rows": 18,
    "cols": 9,
    "diameter": 0.00635,
    "depth": 0.0095
  },
  "geometry": {
    "frontFaceZ": 0.00635,
    "backFaceZ": -0.00635,
    "centerZ": 0,
    "material": "mdf",
    "thickness": 0.0127
  }
}
```

**peg_holes:**
```json
[
  {"x": -0.1016, "y": -0.2159, "z": 0},
  {"x": -0.0762, "y": -0.2159, "z": 0},
  {"x": -0.0508, "y": -0.2159, "z": 0},
  ...
  // 162 total holes
]
```

*Use the generation script above to create all 162 holes*

**model_url:**
```
https://yoursite.com/wp-content/uploads/models/pegboard-9x18.glb
```

---

### Example 2: Simple Wall Hook (1 Peg)

**Physical Measurements:**
- Width: 2 inches = 0.0508m
- Height: 2.5 inches = 0.0635m
- Depth: 1 inch = 0.0254m
- Peg: 0.25" diameter × 0.375" long
- Mounting: Back surface, center

**dimensions_v2:**
```json
{
  "version": 2,
  "dimensions": {
    "width": 0.0508,
    "height": 0.0635,
    "depth": 0.0254
  },
  "boundingBox": {
    "min": {"x": -0.0254, "y": -0.03175, "z": 0},
    "max": {"x": 0.0254, "y": 0.03175, "z": 0.0254}
  },
  "weight": 0.15
}
```

**peg_config:**
```json
{
  "version": 2,
  "pegCount": 1,
  "pegs": [
    {
      "id": "main-peg",
      "position": {"x": 0, "y": 0, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    }
  ],
  "mounting": {
    "method": "peg-insert",
    "insertionDepth": 0.0095,
    "surfaceOffset": 0.002,
    "contactArea": 0.0003,
    "allowableRotations": [0]
  },
  "loadBearing": {
    "maxWeight": 2.27,
    "recommendedWeight": 1.36,
    "distribution": "uniform"
  }
}
```

**model_url:**
```
https://yoursite.com/wp-content/uploads/models/hook-simple.glb
```

**Result:** Hook places on any hole, always upright, perfectly flush.

---

### Example 3: 6" Shelf (2 Pegs, Allows Rotation)

**Physical Measurements:**
- Width: 6 inches = 0.1524m
- Height: 3 inches = 0.0762m
- Depth: 5 inches = 0.127m
- Pegs: 2, spaced 3 inches apart horizontally
- Can be placed horizontal or vertical

**dimensions_v2:**
```json
{
  "version": 2,
  "dimensions": {
    "width": 0.1524,
    "height": 0.0762,
    "depth": 0.127
  },
  "boundingBox": {
    "min": {"x": -0.0762, "y": -0.0381, "z": 0},
    "max": {"x": 0.0762, "y": 0.0381, "z": 0.127}
  },
  "weight": 0.6
}
```

**peg_config:**
```json
{
  "version": 2,
  "pegCount": 2,
  "pegs": [
    {
      "id": "peg-left",
      "position": {"x": -0.0381, "y": 0, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    },
    {
      "id": "peg-right",
      "position": {"x": 0.0381, "y": 0, "z": 0},
      "diameter": 0.00635,
      "length": 0.0095,
      "type": "cylindrical"
    }
  ],
  "mounting": {
    "method": "peg-insert",
    "insertionDepth": 0.0095,
    "surfaceOffset": 0.003,
    "contactArea": 0.001,
    "allowableRotations": [0, 90]
  },
  "loadBearing": {
    "maxWeight": 4.54,
    "recommendedWeight": 2.72,
    "distribution": "even-split"
  }
}
```

**model_url:**
```
https://yoursite.com/wp-content/uploads/models/shelf-6inch.glb
```

**Result:**
- System tests both horizontal (0°) and vertical (90°) orientations
- Finds compatible 2-hole patterns for each
- Prefers horizontal (0°) but allows vertical if needed
- Always sits flush and realistic

---

## Testing with Debug Mode

### Enable Debug Visualization

Add `?debug=true` to your configurator URL:

```
https://yoursite.com/configurator/?debug=true
```

Or:

```
https://yoursite.com/configurator/?debug=1
```

### Visual Indicators

| Color | Indicator | Meaning |
|-------|-----------|---------|
| 🔴 Red Spheres | Peg holes | All available holes on pegboard |
| 🟢 Green Spheres | Accessory pegs | Where accessory pegs are positioned |
| 🔵 Blue Plane | Flush surface | Front face of pegboard |
| 🟡 Yellow Spheres | Occupied holes | Holes already used by accessories |
| 🟣 Magenta Spheres | Pattern test | Holes being tested (advanced) |

### Console Logging

Open browser console (F12) to see detailed logs:

**When Pegboard Loads:**
```
✅ Using enhanced dimensions v2 for pegboard
✅ Loaded 162 actual peg holes from Phase 1 data
🔴 Debug: Showing 162 peg holes
🔵 Debug: Showing flush plane at Z = 0.0064m
🎯 Pegboard setup complete with Phase 2 enhancements
```

**When Accessory Placed:**
```
🔄 Testing 4 rotation angles for Small Shelf
✅ Found 12 valid configurations with rotation
🎯 Selected best configuration: rotation=0°, score=14.95
🟢 Debug: Showing 2 accessory pegs
🟡 Debug: Showing 2 occupied holes
✅ Accessory placed successfully with Phase 2 enhancements
```

**Grouped Validation Logs:**
```
📊 Snap Result
  ✓ Valid: true
  ✓ Rotation: 0°
  ✓ Position: (0.0508, 0.1016, -0.00015)
  ✓ Occupied Holes: 2
  ✓ Peg Count: 2
  ✓ Flush Z: -0.00015m
```

### Test Checklist

- [ ] Load pegboard → See red spheres at holes
- [ ] Red spheres evenly spaced at 1-inch intervals
- [ ] Blue plane appears at front face
- [ ] Select accessory → Preview appears
- [ ] Hover pegboard → Preview snaps to holes
- [ ] Green spheres appear at peg positions when valid
- [ ] Click to place → Accessory sits flush
- [ ] Yellow spheres appear at occupied holes
- [ ] Try placing another accessory → Can't overlap
- [ ] Remove accessory → Yellow spheres disappear

---

## Troubleshooting

### Problem: Accessory Won't Snap

**Symptoms:** Preview stays red, never turns green

**Possible Causes:**

1. **Peg spacing doesn't match hole spacing**
   ```
   Problem: Pegs 0.030m apart, holes 0.0254m apart
   Solution: Change peg positions to multiples of 0.0254m
   ```

2. **No compatible hole pattern found**
   ```
   Problem: Looking for 4 holes in rectangle, not enough holes
   Solution: Reduce pegCount or change peg positions
   ```

3. **Missing peg_config**
   ```
   Problem: peg_config field empty or invalid JSON
   Solution: Add valid peg_config with all required fields
   ```

**How to Fix:**

1. Enable debug mode (`?debug=true`)
2. Check console for errors
3. Verify peg positions are multiples of 0.0254m
4. Validate JSON syntax at jsonlint.com

### Problem: Accessory Floats or Penetrates

**Symptoms:** Accessory doesn't sit flush on pegboard

**Possible Causes:**

1. **Incorrect surfaceOffset**
   ```
   Problem: surfaceOffset = 0.01m (too large)
   Solution: Measure in Blender, usually 0.001-0.003m
   ```

2. **Wrong insertionDepth**
   ```
   Problem: insertionDepth > actual peg length
   Solution: Match insertionDepth to physical peg length
   ```

3. **3D model origin wrong**
   ```
   Problem: Model origin not at mounting surface
   Solution: Re-export model with origin at Z=0
   ```

**How to Fix:**

1. Enable debug mode
2. Check if green peg spheres align with red hole spheres
3. Check blue flush plane position
4. Adjust `surfaceOffset` in peg_config:
   - Too far out → Reduce surfaceOffset
   - Penetrating → Increase surfaceOffset
5. Typical values: 0.001 to 0.005m (1-5mm)

### Problem: Wrong Rotation Selected

**Symptoms:** System chooses 90° when you want 0°

**Explanation:** This is actually **working correctly**!

The system prefers upright (0°) but selects the best configuration based on:
1. Available holes
2. Proximity to click
3. Rotation score

**If 90° is selected:**
- There's no valid 0° configuration at that location
- OR the 90° configuration scores higher due to proximity

**How to Control:**

1. **Force only upright:**
   ```json
   "allowableRotations": [0]
   ```

2. **Prefer horizontal for shelf:**
   ```json
   "allowableRotations": [0, 90]
   // System tries 0° first, only uses 90° if 0° invalid
   ```

3. **Allow all orientations:**
   ```json
   "allowableRotations": [0, 90, 180, 270]
   // System picks best, preferring 0°
   ```

### Problem: Console Shows Validation Errors

**Error:** `"Peg diameter too large for hole"`

```json
// Check:
peg.diameter = 0.00635  // Accessory peg
hole.diameter = 0.00635  // Pegboard hole
// Should be: peg.diameter ≤ hole.diameter
```

**Error:** `"Peg length exceeds hole depth"`

```json
// Check:
peg.length = 0.0095      // Accessory peg length
hole.depth = 0.0095       // Pegboard hole depth
// Should be: peg.length ≤ hole.depth
```

**Error:** `"No compatible peg pattern found"`

```
// Check peg spacing matches hole spacing:
Peg positions: {x: 0, y: 0}, {x: 0.0381, y: 0}  // 1.5 inches
Hole spacing: 0.0254m  // 1 inch
// 1.5 inches is NOT a multiple of 1 inch!
// Fix: Use {x: 0, y: 0}, {x: 0.0254, y: 0}  // 1 inch
```

---

## Quick Reference

### Standard Measurements

**Hole Spacing:**
- 1 inch = 0.0254 m (most common)
- 25mm = 0.025 m (metric)

**Common Peg Dimensions:**
- Diameter: 0.25" = 0.00635 m
- Length: 0.375" = 0.0095 m

**Typical Peg Spacings:**
| Inches | Meters | Holes Apart |
|--------|--------|-------------|
| 1" | 0.0254 | 1 |
| 2" | 0.0508 | 2 |
| 3" | 0.0762 | 3 |
| 4" | 0.1016 | 4 |
| 6" | 0.1524 | 6 |

### Conversion Formulas

```javascript
// Inches to meters
meters = inches × 0.0254

// Centimeters to meters
meters = cm / 100

// Pounds to kilograms
kg = lbs × 0.453592

// Degrees to radians
radians = degrees × (Math.PI / 180)
```

### JSON Templates

**Minimal Pegboard:**
```json
{
  "dimensions_v2": {
    "version": 2,
    "dimensions": {"width": 0.22, "height": 0.44, "depth": 0.02},
    "pegHoleGrid": {
      "pattern": "uniform",
      "spacing": 0.0254,
      "rows": 17,
      "cols": 8,
      "diameter": 0.00635,
      "depth": 0.0095
    },
    "geometry": {
      "frontFaceZ": 0.01,
      "backFaceZ": -0.01,
      "centerZ": 0
    }
  },
  "peg_holes": [...],  // Generate with script
  "model_url": "https://..."
}
```

**Minimal Accessory (1 peg):**
```json
{
  "dimensions_v2": {
    "version": 2,
    "dimensions": {"width": 0.05, "height": 0.06, "depth": 0.02}
  },
  "peg_config": {
    "version": 2,
    "pegCount": 1,
    "pegs": [
      {
        "id": "peg-1",
        "position": {"x": 0, "y": 0, "z": 0},
        "diameter": 0.00635,
        "length": 0.0095,
        "type": "cylindrical"
      }
    ],
    "mounting": {
      "method": "peg-insert",
      "insertionDepth": 0.0095,
      "surfaceOffset": 0.002,
      "contactArea": 0.0003,
      "allowableRotations": [0]
    }
  },
  "model_url": "https://..."
}
```

---

## Summary

### You Configure (Once):

1. ✏️ Pegboard dimensions and hole positions → `dimensions_v2`, `peg_holes`
2. ✏️ Accessory dimensions and peg positions → `dimensions_v2`, `peg_config`
3. ✏️ Upload 3D models → `model_url`

### System Handles (Automatically):

1. ✅ Pattern matching for any peg configuration
2. ✅ Rotation testing and selection
3. ✅ Geometric validation (diameter, length, spacing)
4. ✅ Flush mounting calculations
5. ✅ Collision detection
6. ✅ Occupancy tracking
7. ✅ Best configuration selection

### Result:

Perfect, realistic, automatic 3D pegboard accessory placement that adapts to any pegboard and any accessory configuration!

---

**For Additional Help:**
- See existing SETUP_GUIDE.md for Blender workflows
- See TECHNICAL_PLAN.md for implementation details
- Enable debug mode for visual feedback
- Check browser console for detailed logs

*End of Configuration Guide - Phase 3 Implementation*
