# 3D Model Setup Guide
## Blasti Configurator - Complete Configuration Reference

**Version**: 2.0
**Date**: 2025-11-08
**For**: Plugin Version 1.0.4+

---

## Table of Contents

1. [Overview](#overview)
2. [3D Model Requirements](#3d-model-requirements)
3. [Pegboard Configuration](#pegboard-configuration)
4. [Accessory Configuration](#accessory-configuration)
5. [Model Preparation Workflow](#model-preparation-workflow)
6. [Testing & Validation](#testing--validation)
7. [Common Issues & Solutions](#common-issues--solutions)
8. [Example Configurations](#example-configurations)
9. [Blender Workflow](#blender-workflow)

---

## Overview

This guide provides step-by-step instructions for preparing and configuring 3D models for use in the Blasti Configurator. Proper configuration ensures:

- ✅ Accessories snap precisely to peg holes
- ✅ Flush mounting with realistic positioning
- ✅ Accurate collision detection
- ✅ Optimal performance

### Prerequisites

- Basic understanding of 3D modeling
- Access to 3D modeling software (Blender recommended)
- WordPress admin access
- 3D models in GLB or GLTF format

---

## 3D Model Requirements

### File Format

**Supported**: GLB (preferred) or GLTF

**Why GLB?**
- Single file (easier to manage)
- Embedded textures
- Smaller file size
- Better browser support

### Technical Specifications

| Specification | Pegboard | Accessory |
|---------------|----------|-----------|
| **Polygon Count** | < 50,000 triangles | < 20,000 triangles |
| **Texture Size** | Max 2048×2048 px | Max 1024×1024 px |
| **File Size** | < 5MB | < 2MB |
| **Materials** | PBR preferred | PBR preferred |
| **Animations** | None | None |
| **Pivot Point** | Center bottom | Back center |

### Units & Scale

**All measurements must be in METERS**

Standard conversions:
- 1 inch = 0.0254 meters
- 1 cm = 0.01 meters
- 1 mm = 0.001 meters

Example: 22cm pegboard width = 0.22 meters

### Coordinate System

**Important**: Three.js uses a specific coordinate system

```
Y ↑ (Up)
│
│
└────→ X (Right)
  ╱
 ╱
Z (Forward, toward camera)
```

**Pegboard Orientation**:
- Front face: +Z direction
- Width: X-axis
- Height: Y-axis
- Depth: Z-axis

**Accessory Orientation**:
- Mounting face (back): -Z direction
- Pegs point: -Z direction (into pegboard)

---

## Pegboard Configuration

### Step 1: Model Preparation

#### Dimensions

Measure your physical pegboard:
- Width (cm)
- Height (cm)
- Depth/Thickness (cm)

Convert to meters for configuration.

Example physical pegboard:
- Width: 22 cm → 0.22 m
- Height: 44 cm → 0.44 m
- Depth: 2 cm → 0.02 m

#### Peg Hole Specifications

Standard pegboard hole spacing: **1 inch (25.4mm)**

Measure:
- Hole diameter: typically 1/4 inch (6.4mm)
- Hole depth: typically 15mm
- Spacing: 25.4mm (1 inch)

#### Orientation

Ensure your 3D model is oriented correctly:

1. **Front face faces +Z** (toward camera)
2. **Centered at origin** (0, 0, 0)
3. **Standing upright** (not lying flat)

**Blender Check**:
```
- Select pegboard
- Press N → Transform
- Location: X=0, Y=0, Z=0
- Rotation: X=0°, Y=0°, Z=0°
- Front should face you in front view (Numpad 1)
```

### Step 2: Export from Blender

1. Select pegboard model
2. File → Export → glTF 2.0 (.glb)
3. Settings:
   - Format: **GLB**
   - Include: **Selected Objects**
   - Transform: **+Y Up**
   - Geometry: **Apply Modifiers**
   - Materials: **Export**
   - Compression: **Enable** (if available)
4. Export to: `/wp-content/uploads/models/pegboard-22x44.glb`

### Step 3: WordPress Product Setup

#### Create/Edit Product

1. Go to: **Products → Add New** (or edit existing)
2. Fill in standard WooCommerce fields:
   - Product Name
   - Price
   - Description
   - Product Image

#### Configure Blasti Settings

Scroll to "Blasti Configurator" section:

**1. Enable in Configurator**: ✓ (checked)

**2. Product Type**: Select "**Pegboard**"

**3. 3D Model URL**:
```
https://yoursite.com/wp-content/uploads/models/pegboard-22x44.glb
```

**4. Dimensions (Enhanced JSON)**:

```json
{
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
    "geometry": {
        "frontFaceNormal": {"x": 0, "y": 0, "z": 1},
        "initialRotation": {"x": 0, "y": 0, "z": 0}
    }
}
```

**Field Explanations**:

| Field | Description | Example |
|-------|-------------|---------|
| `width` | Pegboard width in meters | 0.22 (22cm) |
| `height` | Pegboard height in meters | 0.44 (44cm) |
| `depth` | Pegboard thickness in meters | 0.02 (2cm) |
| `pattern` | "uniform" or "custom" | "uniform" |
| `spacing` | Distance between holes in meters | 0.0254 (1 inch) |
| `diameter` | Hole diameter in meters | 0.0064 (6.4mm) |
| `depth` (hole) | How deep holes are in meters | 0.015 (15mm) |
| `rows` | Number of hole rows | 17 |
| `cols` | Number of hole columns | 8 |
| `frontFaceNormal` | Direction of front face | {x:0, y:0, z:1} |

**Calculating Rows & Cols**:
```
rows = floor(height / spacing)
rows = floor(0.44 / 0.0254) = 17

cols = floor(width / spacing)
cols = floor(0.22 / 0.0254) = 8

Total holes = 17 × 8 = 136
```

**5. Peg Holes (Optional)**:

Leave blank for uniform grid, OR specify custom positions:

```json
[
    {"x": -0.11, "y": -0.22, "z": 0.01, "diameter": 0.0064},
    {"x": -0.0846, "y": -0.22, "z": 0.01, "diameter": 0.0064},
    ...
]
```

**When to use custom holes**:
- Irregular hole patterns
- Missing holes
- Different hole sizes

**6. Compatible Products**: Leave blank (all accessories compatible)

**7. Save Product**

### Step 4: Verification

1. Visit configurator page
2. Select your pegboard
3. It should:
   - Load and display correctly
   - Be centered in view
   - Face forward
   - Show correct size

**If pegboard is rotated wrong**:
- Update `initialRotation` in JSON
- Common fix for flat pegboards: `{"x": 1.5708, "y": 0, "z": 0}` (90° rotation)

---

## Accessory Configuration

### Step 1: Model Preparation

#### Determine Peg Configuration

Measure your physical accessory:
- Number of pegs
- Peg diameter
- Peg length (insertion depth)
- Distance between pegs

Example: Tool hook with 2 vertical pegs
- Peg count: 2
- Peg diameter: 6mm
- Peg length: 12mm
- Vertical spacing: 1 inch (25.4mm)

#### Identify Mounting Surface

The mounting surface is the part that touches the pegboard.

**In Blender**:
1. Select accessory
2. Identify which face mounts to pegboard
3. Note the distance from origin to this face

#### Orient Model Correctly

**Critical**: Pegs must point in **-Z direction** (backward)

```
    Accessory Front
         ↓
    [=========]  ← Accessory body
         |
        Peg ↓ (-Z direction)
```

**Blender Setup**:
1. Rotate accessory so:
   - Front faces +Z
   - Back (mounting surface) faces -Z
   - Pegs point -Z
2. Position so:
   - Mounting surface is near Z=0
   - Centered on X=0
   - Centered on Y (or positioned as desired)

Example hook orientation:
```
Front view (looking at -Z):
    _____
   |     |  Hook front
   |  o  |  (facing you)
   |_____|
      ||    Peg
      ||    (going away from you, -Z)
```

### Step 2: Measure Peg Positions

In Blender, measure peg positions relative to accessory origin:

**Example: Two-peg hook**

Peg 1 (top):
- Local Position: X=0, Y=0.0254 (1 inch up), Z=0
- At back surface of accessory

Peg 2 (bottom):
- Local Position: X=0, Y=-0.0254 (1 inch down), Z=0

**Important**: These are LOCAL positions (relative to accessory origin)

### Step 3: Export from Blender

1. Select accessory
2. File → Export → glTF 2.0 (.glb)
3. Settings: Same as pegboard
4. Export to: `/wp-content/uploads/models/hook-tool-double.glb`

### Step 4: WordPress Product Setup

#### Create Product

1. Products → Add New
2. Standard WooCommerce fields
3. Product Image

#### Configure Blasti Settings

**1. Enable in Configurator**: ✓

**2. Product Type**: "**Accessory**"

**3. 3D Model URL**:
```
https://yoursite.com/wp-content/uploads/models/hook-tool-double.glb
```

**4. Dimensions (Enhanced JSON)**:

```json
{
    "dimensions": {
        "width": 0.05,
        "height": 0.08,
        "depth": 0.03,
        "unit": "meters"
    },
    "boundingBox": {
        "min": {"x": -0.025, "y": -0.04, "z": 0},
        "max": {"x": 0.025, "y": 0.04, "z": 0.03}
    }
}
```

**5. Peg Configuration (REQUIRED)**:

```json
{
    "pegCount": 2,
    "pegs": [
        {
            "id": "peg_top",
            "localPosition": {"x": 0, "y": 0.0254, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1},
            "type": "cylindrical"
        },
        {
            "id": "peg_bottom",
            "localPosition": {"x": 0, "y": -0.0254, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1},
            "type": "cylindrical"
        }
    ],
    "mounting": {
        "surface": "back",
        "surfaceOffset": 0.002,
        "flushOffset": 0.001,
        "requiresAllPegs": true,
        "allowableRotations": [0, 180]
    }
}
```

**Field Explanations**:

| Field | Description | Example |
|-------|-------------|---------|
| **pegCount** | Number of pegs | 2 |
| **pegs[].id** | Unique peg identifier | "peg_top" |
| **pegs[].localPosition** | Position relative to accessory origin (meters) | {x:0, y:0.0254, z:0} |
| **pegs[].diameter** | Peg diameter (meters) | 0.006 (6mm) |
| **pegs[].length** | Peg insertion length (meters) | 0.012 (12mm) |
| **pegs[].insertionDirection** | Direction peg inserts | {x:0, y:0, z:-1} |
| **mounting.surface** | Which face mounts | "back" |
| **mounting.surfaceOffset** | Distance from origin to back face (meters) | 0.002 (2mm) |
| **mounting.flushOffset** | Air gap for visual clarity (meters) | 0.001 (1mm) |
| **mounting.requiresAllPegs** | Must all pegs be in holes? | true |
| **mounting.allowableRotations** | Valid rotations in degrees | [0, 180] |

**How to measure surfaceOffset**:
1. In Blender, note accessory origin (typically at center)
2. Measure distance from origin to back surface
3. If back surface is 2mm behind origin, surfaceOffset = 0.002

**Insertion Direction**:
- For pegs pointing backward (into pegboard): `{x:0, y:0, z:-1}`
- Always -Z for standard pegboard mounting

**Allowable Rotations**:
- Degrees from 0
- [0] = upright only
- [0, 180] = upright or upside-down
- [0, 90, 180, 270] = any 90° rotation

**6. Compatible Products**:

Enter pegboard product IDs (comma-separated):
```
123, 456, 789
```

Or leave blank for "compatible with all pegboards"

**7. Save Product**

### Step 5: Verification

1. Visit configurator
2. Select pegboard
3. Select your accessory
4. Hover over pegboard
5. Verify:
   - Preview appears
   - Snaps to peg holes correctly
   - Shows GREEN when both pegs align
   - Shows RED when only one or no pegs align
6. Click to place
7. Check:
   - Accessory sits flush with pegboard
   - No floating or penetration
   - Looks realistic

---

## Model Preparation Workflow

### Blender Workflow (Recommended)

#### 1. Import/Create Model

- File → Import (if from another format)
- Or create from scratch

#### 2. Set Units to Metric

- Scene Properties → Units
- Unit System: **Metric**
- Length: **Meters**

#### 3. Scale to Real-World Size

- Select model
- Press 'S' to scale
- Check dimensions in sidebar (N → Dimensions)
- Should match real-world size in meters

Example: 22cm pegboard
- Dimension X: 0.22m ✓
- Dimension Y: 0.44m ✓

#### 4. Center and Orient

For **Pegboards**:
```
1. Object → Set Origin → Geometry to Origin
2. Object → Transform → Location: X=0, Y=0, Z=0
3. Rotate so front faces +Z (Numpad 1 for front view)
4. Alt+R to reset rotation if needed
```

For **Accessories**:
```
1. Position mounting surface at or near Z=0
2. Center on X and Y
3. Rotate so pegs point -Z
4. Verify in front view (Numpad 1)
```

#### 5. Apply Transformations

```
Object → Apply → All Transforms
```

This bakes rotation and scale into the mesh.

#### 6. Optimize Geometry

- Use **Decimate Modifier** to reduce polygons if > 50k
- Remove hidden faces
- Merge duplicate vertices (M → By Distance)

#### 7. Materials (Optional but Recommended)

For best results, use PBR materials:
- Base Color
- Metallic
- Roughness
- Normal Map (optional)

Keep texture sizes reasonable:
- Pegboard: max 2048×2048
- Accessory: max 1024×1024

#### 8. Export

- Select model
- File → Export → glTF 2.0
- Format: GLB (Binary)
- Include: Selected Objects
- +Y Up: ✓
- Apply Modifiers: ✓
- Export

### Measuring Peg Positions in Blender

1. **Add Empty at Each Peg Position**:
   ```
   Shift+A → Empty → Plain Axes
   ```

2. **Position Empty at Peg Tip** (where peg enters pegboard)

3. **Note Coordinates**:
   ```
   Press N → Transform → Location
   Example: X=0, Y=0.0254, Z=0
   ```

4. **Record in JSON**:
   ```json
   "localPosition": {"x": 0, "y": 0.0254, "z": 0}
   ```

5. **Repeat for Each Peg**

6. **Delete Empties Before Export**

### Alternative: Use Add-On

Create a Blender add-on to automatically export peg positions:

```python
# Export empties as JSON
import bpy
import json

empties = [obj for obj in bpy.context.selected_objects if obj.type == 'EMPTY']

pegs = []
for i, empty in enumerate(empties):
    loc = empty.location
    pegs.append({
        "id": f"peg_{i}",
        "localPosition": {"x": round(loc.x, 4), "y": round(loc.y, 4), "z": round(loc.z, 4)},
        "diameter": 0.006,
        "length": 0.012,
        "insertionDirection": {"x": 0, "y": 0, "z": -1}
    })

print(json.dumps({"pegCount": len(pegs), "pegs": pegs}, indent=4))
```

---

## Testing & Validation

### Pegboard Testing

#### Visual Test
1. Load configurator page
2. Pegboard should:
   - Be centered
   - Face forward
   - Be correctly sized
   - Not be rotated incorrectly

#### Hole Grid Test
Enable debug mode: `?debug=true`
- Red spheres should appear at peg holes
- Grid should be evenly spaced
- Holes should cover entire pegboard

### Accessory Testing

#### Single Placement
1. Select accessory
2. Hover over pegboard
3. **Preview should**:
   - Appear at cursor
   - Snap to peg holes
   - Turn GREEN when all pegs align
   - Turn RED when pegs don't align

4. Click to place
5. **Placed accessory should**:
   - Sit flush (not floating)
   - Not penetrate pegboard
   - Look realistic
   - Be removable

#### Multi-Placement
1. Place first accessory
2. Place second next to it
3. Try to place third overlapping
4. **Should**:
   - Prevent overlap
   - Show RED preview
   - Display error message

#### Rotation Test (if allowed)
1. Accessory with allowableRotations: [0, 90, 180, 270]
2. Place at different orientations
3. Should snap to nearest rotation
4. Should always sit flush

---

## Common Issues & Solutions

### Issue: Pegboard appears rotated/sideways

**Cause**: Model exported with wrong orientation

**Solution**:
```json
// In dimensions JSON, add:
"geometry": {
    "initialRotation": {"x": 1.5708, "y": 0, "z": 0}
}
```

Values:
- 90° = 1.5708 radians
- 180° = 3.1416 radians

### Issue: Pegboard is too large/small

**Cause**: Model not scaled correctly in Blender

**Solution**:
1. Re-open in Blender
2. Check Dimensions (N → Dimensions)
3. Scale to correct size (in meters)
4. Object → Apply → Scale
5. Re-export

### Issue: Accessory floats in front of pegboard

**Cause**: Incorrect `surfaceOffset` or `flushOffset`

**Solution**:
1. Measure actual distance from origin to back face
2. Update `surfaceOffset` value
3. Reduce `flushOffset` to 0.0005 or 0

### Issue: Accessory never shows GREEN preview

**Cause**: Peg positions don't match hole spacing

**Solution**:
1. Check peg spacing matches pegboard hole spacing (usually 0.0254m)
2. Verify `localPosition` coordinates
3. Check `pegHoleSpacing` in pegboard config

### Issue: Only first peg shows green, others red

**Cause**: Peg spacing in accessory doesn't match pegboard holes

**Example Problem**:
```
Accessory pegs: 30mm apart
Pegboard holes: 25.4mm apart (1 inch)
```

**Solution**: Update peg positions to match hole grid:
```json
"pegs": [
    {"localPosition": {"x": 0, "y": 0, "z": 0}},
    {"localPosition": {"x": 0, "y": 0.0254, "z": 0}}  // Changed to 25.4mm
]
```

### Issue: Model doesn't load

**Possible Causes**:
1. File path incorrect
2. File too large (> 10MB)
3. CORS issue (if external URL)
4. Invalid GLB file

**Solutions**:
1. Verify URL is accessible (paste in browser)
2. Reduce file size (lower poly count, compress textures)
3. Host on same domain or configure CORS
4. Validate GLB with https://gltf-viewer.donmccurdy.com/

### Issue: Peg configuration JSON not saving

**Cause**: Invalid JSON syntax

**Solution**:
1. Validate JSON: https://jsonlint.com/
2. Common mistakes:
   - Missing commas
   - Trailing commas
   - Unquoted keys
   - Single quotes instead of double quotes

**Valid**:
```json
{
    "pegCount": 2,
    "pegs": [...]
}
```

**Invalid**:
```json
{
    pegCount: 2,     // ❌ Keys must be quoted
    'pegs': [...],   // ❌ Single quotes not allowed
}                    // ❌ Trailing comma
```

---

## Example Configurations

### Example 1: Small Pegboard (22cm × 44cm)

**Dimensions JSON**:
```json
{
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
    "geometry": {
        "frontFaceNormal": {"x": 0, "y": 0, "z": 1},
        "initialRotation": {"x": 0, "y": 0, "z": 0}
    }
}
```

---

### Example 2: Single-Peg Hook

**Dimensions JSON**:
```json
{
    "dimensions": {
        "width": 0.05,
        "height": 0.06,
        "depth": 0.025,
        "unit": "meters"
    }
}
```

**Peg Configuration JSON**:
```json
{
    "pegCount": 1,
    "pegs": [
        {
            "id": "peg_single",
            "localPosition": {"x": 0, "y": 0, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1},
            "type": "cylindrical"
        }
    ],
    "mounting": {
        "surface": "back",
        "surfaceOffset": 0.001,
        "flushOffset": 0.001,
        "requiresAllPegs": true,
        "allowableRotations": [0]
    }
}
```

---

### Example 3: Shelf with Two Pegs (Horizontal)

**Dimensions JSON**:
```json
{
    "dimensions": {
        "width": 0.15,
        "height": 0.08,
        "depth": 0.12,
        "unit": "meters"
    }
}
```

**Peg Configuration JSON**:
```json
{
    "pegCount": 2,
    "pegs": [
        {
            "id": "peg_left",
            "localPosition": {"x": -0.0508, "y": 0, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1},
            "type": "cylindrical"
        },
        {
            "id": "peg_right",
            "localPosition": {"x": 0.0508, "y": 0, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1},
            "type": "cylindrical"
        }
    ],
    "mounting": {
        "surface": "back",
        "surfaceOffset": 0.003,
        "flushOffset": 0.001,
        "requiresAllPegs": true,
        "allowableRotations": [0]
    },
    "weight": {
        "value": 0.5,
        "unit": "kg",
        "maxLoad": 10.0
    }
}
```

Note: Pegs are 2 inches apart (0.0508m = 2 × 0.0254m)

---

### Example 4: Tool Bin (Four Pegs)

**Peg Configuration JSON**:
```json
{
    "pegCount": 4,
    "pegs": [
        {
            "id": "peg_top_left",
            "localPosition": {"x": -0.0254, "y": 0.0508, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1}
        },
        {
            "id": "peg_top_right",
            "localPosition": {"x": 0.0254, "y": 0.0508, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1}
        },
        {
            "id": "peg_bottom_left",
            "localPosition": {"x": -0.0254, "y": -0.0508, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1}
        },
        {
            "id": "peg_bottom_right",
            "localPosition": {"x": 0.0254, "y": -0.0508, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1}
        }
    ],
    "mounting": {
        "surface": "back",
        "surfaceOffset": 0.005,
        "flushOffset": 0.001,
        "requiresAllPegs": true,
        "allowableRotations": [0]
    }
}
```

Note: 2×2 peg grid, 1 inch apart horizontally and 2 inches vertically

---

## Quick Reference

### JSON Template Generator

Use this template and fill in your values:

**Pegboard**:
```json
{
    "dimensions": {
        "width": [WIDTH_IN_METERS],
        "height": [HEIGHT_IN_METERS],
        "depth": [DEPTH_IN_METERS],
        "unit": "meters"
    },
    "pegHoleGrid": {
        "pattern": "uniform",
        "spacing": 0.0254,
        "diameter": 0.0064,
        "depth": 0.015,
        "rows": [FLOOR(HEIGHT/0.0254)],
        "cols": [FLOOR(WIDTH/0.0254)]
    },
    "geometry": {
        "frontFaceNormal": {"x": 0, "y": 0, "z": 1},
        "initialRotation": {"x": 0, "y": 0, "z": 0}
    }
}
```

**Accessory (Single Peg)**:
```json
{
    "pegCount": 1,
    "pegs": [
        {
            "id": "peg_0",
            "localPosition": {"x": 0, "y": 0, "z": 0},
            "diameter": 0.006,
            "length": 0.012,
            "insertionDirection": {"x": 0, "y": 0, "z": -1}
        }
    ],
    "mounting": {
        "surface": "back",
        "surfaceOffset": [MEASURE_IN_BLENDER],
        "flushOffset": 0.001,
        "requiresAllPegs": true,
        "allowableRotations": [0]
    }
}
```

---

## Blender Peg Measurement Script

Save as `.py` and run in Blender Script Editor:

```python
import bpy
import json

# Get selected empties (place these at peg positions)
empties = [obj for obj in bpy.context.selected_objects if obj.type == 'EMPTY']

if not empties:
    print("No empties selected! Add empties at peg positions and select them.")
else:
    pegs = []
    for i, empty in enumerate(empties):
        loc = empty.location
        pegs.append({
            "id": f"peg_{i}",
            "localPosition": {
                "x": round(loc.x, 4),
                "y": round(loc.y, 4),
                "z": round(loc.z, 4)
            },
            "diameter": 0.006,  # Edit as needed
            "length": 0.012,    # Edit as needed
            "insertionDirection": {"x": 0, "y": 0, "z": -1}
        })

    config = {
        "pegCount": len(pegs),
        "pegs": pegs,
        "mounting": {
            "surface": "back",
            "surfaceOffset": 0.002,  # Edit as needed
            "flushOffset": 0.001,
            "requiresAllPegs": True,
            "allowableRotations": [0]
        }
    }

    print("\n=== COPY THIS JSON ===\n")
    print(json.dumps(config, indent=4))
    print("\n======================\n")
```

**Usage**:
1. Place Empty objects at each peg position
2. Select all empties
3. Run script
4. Copy output JSON
5. Paste into WordPress "Peg Configuration" field

---

## Support & Resources

### Documentation
- [Gap Analysis](GAP_ANALYSIS.md) - Detailed issues and improvements
- [Technical Plan](TECHNICAL_PLAN.md) - Implementation roadmap
- [System Analysis](SYSTEM_ANALYSIS.md) - Full system documentation

### Tools
- **Blender**: https://www.blender.org/
- **glTF Viewer**: https://gltf-viewer.donmccurdy.com/
- **JSON Validator**: https://jsonlint.com/

### Getting Help
- Check console for errors (F12 in browser)
- Enable debug mode: `?debug=true`
- Review error messages in placement tooltip

---

**Document End**

For questions or issues, refer to the main documentation or create a support ticket.
