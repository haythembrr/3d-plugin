# Accessory Placement Issue - Root Cause Found

## Problem
Accessories cannot be placed on the pegboard. The preview shows but clicking does nothing.

## Root Cause
The placement event handlers reference functions that **don't exist**:

```javascript
// In enablePlacementMode():
this.config.placementMouseMoveHandler = function (event) {
    self.updatePlacementPreview(event);  // ❌ Function doesn't exist
};

this.config.placementClickHandler = function (event) {
    self.placeAccessoryAtClick(event);  // ❌ Function doesn't exist
};
```

## What's Happening
1. ✅ Accessory model loads successfully
2. ✅ Accessory is scaled correctly (0.01 scale applied)
3. ✅ Preview model is created and added to scene
4. ✅ Placement mode is enabled
5. ✅ Event listeners are attached
6. ❌ Mouse move does nothing (updatePlacementPreview doesn't exist)
7. ❌ Click does nothing (placeAccessoryAtClick doesn't exist)

## What Exists
- `orientAccessoryModel()` - This is being called repeatedly (seen in logs)
- Event handler setup in `enablePlacementMode()`
- Preview model creation

## What's Missing
1. **`updatePlacementPreview(event)`** - Should:
   - Cast ray from mouse to pegboard
   - Find intersection point
   - Snap to grid
   - Update preview model position
   - Call `orientAccessoryModel()`

2. **`placeAccessoryAtClick(event)`** - Should:
   - Cast ray from mouse to pegboard
   - Find intersection point
   - Snap to grid
   - Validate placement (no overlap, within bounds)
   - Clone model and add to scene
   - Add to `placedAccessories` array
   - Disable placement mode
   - Update UI

## Evidence from Logs
```
Accessory oriented with normal: We {x: 0, y: 2.220446049250313e-16, z: 1}
```

This repeats many times, suggesting `orientAccessoryModel()` is being called but the preview position isn't being updated because `updatePlacementPreview()` doesn't exist.

## Solution Needed
Implement the two missing functions:
1. `updatePlacementPreview(event)` - For mouse move
2. `placeAccessoryAtClick(event)` - For click placement

These functions need to:
- Use THREE.Raycaster to cast from mouse to pegboard
- Find intersection with pegboard mesh
- Snap to grid using existing `snapToGrid()` function
- Validate using existing `isValidPlacement()` function
- Update preview or place accessory accordingly
