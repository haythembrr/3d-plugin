# 3D Models Directory

This directory is for storing 3D model files used by the Blasti Configurator.

## Supported Formats
- GLB (recommended)
- GLTF

## File Organization
- Place pegboard models in a `pegboards/` subdirectory
- Place accessory models in an `accessories/` subdirectory
- Use descriptive filenames (e.g., `pegboard-white-60x40.glb`)

## Model Requirements
- Models should be optimized for web use (low poly count)
- Textures should be baked into the model when possible
- Models should be properly scaled (1 unit = 1 meter)
- Models should be centered at origin (0,0,0)

## Example Structure
```
assets/models/
├── pegboards/
│   ├── pegboard-white-60x40.glb
│   ├── pegboard-black-80x60.glb
│   └── pegboard-wood-100x80.glb
├── accessories/
│   ├── hook-single.glb
│   ├── hook-double.glb
│   ├── shelf-small.glb
│   └── bin-medium.glb
└── README.md
```

## Adding Models
1. Upload your GLB/GLTF files to this directory
2. Edit the corresponding WooCommerce product
3. Enable "Enable in Configurator" checkbox
4. Set the product type (Pegboard or Accessory)
5. Enter the full URL to the model file
6. Add dimensions and compatibility information
7. Save the product

The models will then be available in the 3D configurator.