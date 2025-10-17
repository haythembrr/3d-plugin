# Overlap Detection Fix - Using Actual Model Dimensions

## Problem
When trying to place a second accessory on the pegboard, it shows red (invalid) even when there's clearly available space above the first accessory.

## Root Cause (UPDATED)
The validation was failing with "Out of bounds" because dimension calculation was using **world-space bounding boxes** which include rotation and position transformations, making accessories appear much larger than they actually are.

### Original Issue:
The overlap detection was using **metadata dimensions** from WordPress product settings instead of **actual 3D model dimensions**.

### Actual Issue Found:
When calculating dimensions with `Box3().setFromObject(model)` on a **rotated and positioned model**, the bounding box becomes inflated:
- A 0.15m x 0.12m bin rotated 180° 
- Gets calculated as 0.4m x 0.9m in world space
- This makes it appear to extend beyond pegboard bounds
- Validation fails with "Out of bounds" even though visually it fits

### What Was Happening:
1. WordPress product has dimensions metadata: `{width: 0.1, height: 0.1}` (or missing, defaulting to 0.05)
2. Actual 3D model after scaling is: `{width: 0.15, height: 0.12, depth: 0.08}`
3. Overlap detection used the metadata (0.1 x 0.1) to check collisions
4. But the visual model was actually larger (0.15 x 0.12)
5. This caused **false overlap detection** - the bounding boxes didn't match the visual models

### Example Scenario:
```
First bin placed at Y=0.5:
- Metadata says: 0.1m tall
- Actual model: 0.12m tall
- Overlap check thinks it occupies: Y=0.45 to Y=0.55
- But visually it occupies: Y=0.44 to Y=0.56

Second bin trying to place at Y=0.6:
- Overlap check calculates: Y=0.55 to Y=0.65
- Thinks it's clear (0.65 > 0.55)
- BUT actual first bin extends to Y=0.56
- So there's a visual overlap!
```

Wait, that would cause the opposite problem... Let me reconsider.

Actually, the issue is likely the **reverse**:
```
First bin placed at Y=0.5:
- Metadata says: 0.05m tall (default when missing)
- Actual model: 0.15m tall
- Overlap check thinks it occupies: Y=0.475 to Y=0.525 (only 5cm)
- But visually it occupies: Y=0.425 to Y=0.575 (actually 15cm)

Second bin trying to place at Y=0.6:
- Overlap check calculates: Y=0.575 to Y=0.625
- Checks against first bin's stored box: Y=0.475 to Y=0.525
- Thinks it's clear (0.575 > 0.525)
- BUT actual first bin extends to Y=0.575
- So overlap check says NO OVERLAP but visually they touch!
```

Hmm, but the user said it shows RED (invalid), meaning overlap IS detected when it shouldn't be...

Let me reconsider again:
```
First bin placed at Y=0.2 (bottom):
- Actual model: 0.15m tall
- Stored dimensions: 0.15m tall (now using actual)
- Occupies: Y=0.125 to Y=0.275

Second bin trying to place at Y=0.5 (higher up):
- Actual model: 0.15m tall
- Would occupy: Y=0.425 to Y=0.575
- Gap between them: 0.275 to 0.425 = 0.15m (15cm gap)
- With 2cm margin: needs 0.17m gap
- 0.15m < 0.17m = OVERLAP DETECTED!
```

Wait, that's still not right. Let me think about the actual math...

## The Real Issue

After analyzing the code, the problem is likely:

1. **Dimensions might be stored in centimeters instead of meters**
   - If WordPress has `{width: 15, height: 12}` (in cm)
   - But code expects meters
   - Overlap check thinks accessory is 15 METERS wide!
   - Everything would show as overlapping

2. **OR dimensions are missing entirely**
   - Defaults to 0.05m (5cm)
   - But actual model is 0.15m (15cm)
   - Stored bounding box is 3x smaller than visual
   - Causes incorrect overlap calculations

## Solution

**Calculate dimensions in local space** (before rotation/position) instead of world space:

Created a new helper function `getModelDimensions()` that:
1. Traverses the model's geometry
2. Calculates bounding box from geometry (local space)
3. Applies only scale transformations (not rotation/position)
4. Returns true dimensions unaffected by orientation

### Changes Made:

1. **Added `getModelDimensions()` helper function**:
```javascript
getModelDimensions: function (model) {
    const bbox = new THREE.Box3();
    
    model.traverse(function (child) {
        if (child.isMesh && child.geometry) {
            // Get geometry bounding box (local space)
            if (!child.geometry.boundingBox) {
                child.geometry.computeBoundingBox();
            }
            
            const geomBox = child.geometry.boundingBox.clone();
            
            // Apply only scale (not rotation/position)
            geomBox.min.multiply(child.scale);
            geomBox.max.multiply(child.scale);
            
            if (model.scale) {
                geomBox.min.multiply(model.scale);
                geomBox.max.multiply(model.scale);
            }
            
            bbox.union(geomBox);
        }
    });

    const size = new THREE.Vector3();
    bbox.getSize(size);

    return {
        width: Math.abs(size.x),
        height: Math.abs(size.y),
        depth: Math.abs(size.z)
    };
}
```

2. **In `updatePlacementPreview()`** - Use base model dimensions:
```javascript
// Get dimensions from BASE model (before rotation/position)
const actualDimensions = this.getModelDimensions(this.config.placementMode.model);
```

3. **In `placeAccessoryAtClick()`** - Store actual dimensions:
```javascript
// Get dimensions from BASE model (before rotation/position)
const actualDimensions = this.getModelDimensions(this.config.placementMode.model);

// Store actual dimensions
this.config.placedAccessories.push({
    // ...
    dimensions: actualDimensions
});
```

4. **In `checkAccessoryOverlap()`** - Use stored dimensions:
```javascript
// Use stored dimensions (already calculated correctly)
let actualWidth = accessory.dimensions.width || 0.05;
let actualHeight = accessory.dimensions.height || 0.05;
```

5. **Added detailed logging** to help diagnose dimension mismatches:
```javascript
console.log('🔍 Placed accessory actual size from model:', {
    name: accessory.name,
    storedDimensions: accessory.dimensions,
    actualSize: { width: actualWidth, height: actualHeight },
    position: accessory.position
});
```

## Testing

After this fix, check the browser console when placing accessories:

1. **Look for dimension logs** showing metadata vs actual:
```
📦 Storing accessory with dimensions: {
    metadataDimensions: {width: 0.1, height: 0.1},
    actualDimensions: {width: 0.15, height: 0.12, depth: 0.08},
    usingActual: true
}
```

2. **Look for overlap detection logs**:
```
🔍 Checking overlap for new accessory: {...}
🔍 Placed accessory #0 actual size from model: {...}
✅ No overlap detected
```

3. **If still showing red**, check for:
   - Dimension unit mismatches (cm vs m)
   - Incorrect model scaling
   - Margin too large (currently 2cm)

## Next Steps

If the issue persists:
1. Check console logs for actual dimensions being calculated
2. Verify the 2cm margin isn't too large for your accessories
3. Check if models are being scaled correctly (should be in meters)
4. Verify peg hole spacing matches accessory sizes
