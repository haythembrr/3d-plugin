# 3D Model Setup Guide for Blasti Configurator

## Overview
This guide explains how to properly prepare and orient your 3D models (pegboards and accessories) so they display correctly in the Blasti Configurator.

### Key Concept: No Scaling - Use Real-World Size

The configurator displays models at their **natural size from the 3D file** - no scaling is applied!

- Models are shown at exactly the size they were modeled
- A 30cm pegboard in Blender displays as 30cm in the configurator
- A 10cm accessory in Blender displays as 10cm in the configurator

**Critical:** All models MUST be created at real-world scale in your 3D software (using meters or centimeters as units). This ensures correct relative sizing between pegboards and accessories.

---

## Coordinate System

The configurator uses the standard Three.js coordinate system:

```
        Y (Up)
        |
        |
        |_______ X (Right)
       /
      /
     Z (Forward, toward camera)
```

- **X-axis (Red)**: Left (-) to Right (+)
- **Y-axis (Green)**: Down (-) to Up (+)
- **Z-axis (Blue)**: Back (-) to Front (+)

---

## Pegboard Models

### Required Orientation

Pegboards should be **standing upright** (vertical) in your 3D modeling software:

```
Correct Orientation:
    Y
    |  (Height - tallest dimension)
    |
    |_____X (Width)
   /
  Z (Depth/Thickness - smallest dimension)
```

### Specifications

1. **Position**: Model should be centered at origin (0, 0, 0) in your 3D software
2. **Orientation**: 
   - **Height (Y-axis)**: The tall dimension (e.g., 42cm)
   - **Width (X-axis)**: The wide dimension (e.g., 30cm)
   - **Depth (Z-axis)**: The thickness (e.g., 5cm)
3. **Facing**: Front of pegboard should face **positive Z direction** (toward camera)
4. **Units**: Model in centimeters or meters (configurator will scale automatically)

### Auto-Correction

The configurator includes **automatic rotation** for flat models:
- If your model is lying flat (Y dimension < 50% of largest dimension)
- It will automatically rotate 90° to stand upright
- However, it's better to export models in the correct orientation

### Example Dimensions

For a standard IKEA Skådis pegboard:
- **Width (X)**: 30cm
- **Height (Y)**: 42cm  
- **Depth (Z)**: 5cm

In your 3D software, the model should look like this when viewed from the front:

```
     Height (Y)
        ↑
        |  ┌─────────┐
        |  │         │
        |  │ Pegboard│
        |  │         │
        |  │         │
        |  └─────────┘
        |
        └──────────→ Width (X)
```

---

## Accessory Models

### Required Orientation

Accessories should be oriented to **attach to a vertical pegboard**:

```
Correct Orientation:
    Y
    |  (Height)
    |
    |_____X (Width)
   /
  Z (Depth - extends forward from pegboard)
```

### Specifications

1. **Position**: 
   - **CRITICAL**: Model center should be at origin (0, 0, 0)
   - The **back surface** (attachment side) should be at **Z = 0** or negative Z
   - Model extends in **positive Z direction** (away from pegboard)
   - Centered on X-axis

2. **Orientation**:
   - **Height (Y-axis)**: Vertical dimension
   - **Width (X-axis)**: Horizontal dimension  
   - **Depth (Z-axis)**: How far it sticks out from pegboard (positive Z)

3. **Attachment Points**:
   - Peg holes/hooks should be at or behind Z = 0
   - Pegs should align with pegboard grid (2.54cm spacing)
   - Bottom of attachment should be at Y = 0 or slightly above

4. **Facing**: Front of accessory faces **positive Z direction**

5. **Important**: The configurator automatically positions accessories so their back touches the pegboard. Model your accessory with the attachment side at Z = 0 or behind.

### Example: Bin/Container

```
Side View (looking from X-axis):
    Y
    |     ┌─────┐
    |     │     │  ← Container
    |     │     │
    |     └─────┘
    |      ││        ← Pegs (at Z=0)
    |──────┴┴────────→ Z
    |    Pegboard
```

Front View (looking from Z-axis):
```
    Y
    |   ┌───────┐
    |   │       │
    |   │  Bin  │
    |   │       │
    |   └───────┘
    |     │ │      ← Peg spacing (2.54cm)
    └─────┴─┴────→ X
```

---

## Export Settings

### File Format
- **Required**: GLB or GLTF format
- **Recommended**: GLB (single file, smaller size)

### Blender Export Settings

1. **File → Export → glTF 2.0 (.glb/.gltf)**

2. **Include Settings**:
   - ✅ Selected Objects (or Visible Objects)
   - ✅ Apply Modifiers
   - ✅ UVs
   - ✅ Normals
   - ✅ Materials

3. **Transform Settings**:
   - ✅ +Y Up (Three.js standard)
   - Format: GLB
   - Compression: None (or Draco if file is large)

4. **Geometry Settings**:
   - ✅ Apply Modifiers
   - ✅ Tangents (if using normal maps)

### Other 3D Software

**SketchUp**:
- Use a GLB exporter plugin
- Ensure model is oriented with Z-axis up, then rotate in exporter settings

**3ds Max**:
- Use Babylon.js exporter or glTF exporter
- Set coordinate system to Y-up

**Maya**:
- Use glTF exporter
- Set up-axis to Y

---

## Testing Your Models

### Quick Visual Check

After uploading your model to WordPress:

1. **Load the configurator**
2. **Select your pegboard/accessory**
3. **Check orientation**:
   - Pegboard should stand upright
   - Accessories should face forward
   - Nothing should be sideways or upside down

### Using Axes Helper

The configurator shows RGB axes at the origin:
- **Red line** = X-axis (width)
- **Green line** = Y-axis (height)
- **Blue line** = Z-axis (depth)

Your model should align with these axes.

### Common Issues

**Problem**: Pegboard is lying flat
- **Cause**: Model exported with wrong up-axis
- **Solution**: Rotate model 90° in your 3D software before export, or let auto-rotation handle it

**Problem**: Accessory faces wrong direction
- **Cause**: Model rotated incorrectly
- **Solution**: Rotate model in 3D software so front faces +Z direction

**Problem**: Accessory doesn't align with pegboard
- **Cause**: Attachment point not at Z=0
- **Solution**: Move model so pegs/hooks are at Z=0 plane

**Problem**: Model is too large/small
- **Cause**: Wrong units or scale
- **Solution**: Check model dimensions in your 3D software (should be in cm or m)

---

## Dimension Guidelines

### Pegboards

Typical sizes (in meters):
- Small: 0.36m × 0.56m (36cm × 56cm)
- Medium: 0.56m × 0.56m (56cm × 56cm)
- Large: 0.76m × 0.56m (76cm × 56cm)

Thickness: 0.005m - 0.05m (5mm - 5cm)

### Accessories

Keep accessories proportional to pegboards:
- Small bins: 0.10m - 0.15m wide
- Medium bins: 0.15m - 0.25m wide
- Large bins: 0.25m - 0.40m wide

Depth (how far they stick out): 0.05m - 0.30m

---

## WordPress Product Setup

After preparing your 3D model:

1. **Upload GLB file** to WordPress Media Library
2. **Edit Product** (Pegboard or Accessory)
3. **Set 3D Model URL** to the uploaded GLB file
4. **Set Dimensions** (OPTIONAL) in product meta as JSON:
   ```json
   {"width": 0.30, "height": 0.42, "depth": 0.05}
   ```

### How Dimensions Work

**The configurator uses your model's natural size** - no scaling is applied!

- Models are displayed at their actual size from the 3D file
- If you model a pegboard at 30cm x 42cm, it displays at 30cm x 42cm
- If you model an accessory at 10cm x 15cm, it displays at 10cm x 15cm

**The dimensions metadata in WordPress is NOT used for scaling** - it's only for reference/documentation.

### Critical Requirement

**You MUST model at real-world scale:**
- Use **meters** or **centimeters** as your unit in your 3D software
- A 30cm wide pegboard should be 0.3 units (if using meters) or 30 units (if using cm)
- Export with correct unit conversion

**Example:**
- Blender: Set scene units to Metric, model at actual size
- SketchUp: Model in centimeters or meters
- 3ds Max: Set system units to meters

This ensures all models are at the correct relative scale to each other.

---

## Best Practices

### Modeling

1. **Keep geometry clean**: Remove unnecessary vertices, faces
2. **Use proper scale**: Model at real-world size (cm or m)
3. **Center your model**: Origin should be at logical center/bottom
4. **Optimize polygon count**: Keep under 50k triangles for performance
5. **Use proper materials**: PBR materials work best (Metallic/Roughness)

### Textures

1. **Reasonable size**: 1024×1024 or 2048×2048 max
2. **Compressed formats**: Use JPG for color maps, PNG for alpha
3. **Embed in GLB**: Include textures in the GLB file

### Testing

1. **Test in configurator**: Always test after upload
2. **Check all angles**: Use camera angle buttons to view from all sides
3. **Test placement**: For accessories, test attaching to pegboard
4. **Check scale**: Verify size looks correct relative to other items

---

## Troubleshooting

### Model doesn't appear
- Check file uploaded correctly
- Verify GLB format (not OBJ, FBX, etc.)
- Check browser console for errors

### Model is wrong size
- Verify dimensions in product settings
- Check model units in 3D software
- Ensure model is at real-world scale

### Model is rotated wrong
- Check export settings (Y-up axis)
- Rotate in 3D software before export
- Auto-rotation should fix flat pegboards

### Model is too dark
- Add proper materials in 3D software
- Check that normals are correct (not inverted)
- Ensure model has UV mapping for textures

### Model loads slowly
- Reduce polygon count
- Compress textures
- Use Draco compression in GLB export

---

## Example Workflow (Blender)

1. **Model your pegboard/accessory**
2. **Position at origin** (0, 0, 0)
3. **Orient correctly**:
   - Pegboard: Standing upright, front facing +Y in Blender
   - Accessory: Attachment at origin, extends in +Y
4. **Apply all transforms** (Ctrl+A → All Transforms)
5. **Check scale**: Should be real-world size
6. **Apply materials**: Use Principled BSDF
7. **Export**:
   - File → Export → glTF 2.0
   - Format: GLB
   - Transform: +Y Up
   - Include: Selected Objects, Materials, UVs
8. **Upload to WordPress**
9. **Test in configurator**

---

## Support

If your models still don't display correctly after following this guide:

1. Check browser console for errors
2. Verify GLB file opens in online viewers (e.g., gltf-viewer.donmccurdy.com)
3. Confirm dimensions are set correctly in WordPress
4. Check that auto-rotation is working (look for rotation logs in console)

The configurator includes automatic fixes for common issues, but proper model preparation ensures the best results.
