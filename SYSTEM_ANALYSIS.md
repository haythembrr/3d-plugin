# Blasti 3D Configurator - System Analysis & Documentation

**Version:** 1.0.4
**Analysis Date:** 2025-11-08
**Repository:** haythembrr/3d-plugin

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [What This System Does](#what-this-system-does)
3. [Architecture Overview](#architecture-overview)
4. [Technology Stack](#technology-stack)
5. [File Structure](#file-structure)
6. [Core Components](#core-components)
7. [Configuration Guide](#configuration-guide)
8. [Workflow & User Journey](#workflow--user-journey)
9. [Database Schema](#database-schema)
10. [API Endpoints (AJAX)](#api-endpoints-ajax)
11. [Inconsistencies & Issues Found](#inconsistencies--issues-found)
12. [Security Analysis](#security-analysis)
13. [Performance Considerations](#performance-considerations)
14. [Installation & Setup](#installation--setup)
15. [Customization & Extension](#customization--extension)
16. [Dependencies](#dependencies)
17. [Browser Compatibility](#browser-compatibility)

---

## Executive Summary

**Blasti 3D Configurator** is a WordPress plugin that provides an interactive 3D product configurator for pegboards and accessories. It integrates with WooCommerce to enable customers to visually design custom pegboard configurations by selecting a base pegboard and placing compatible accessories on it, then adding the complete configuration to their cart.

### Key Features:
- ✅ Real-time 3D visualization using Three.js
- ✅ Drag-and-drop accessory placement with grid snapping
- ✅ Live price calculation
- ✅ WooCommerce cart integration
- ✅ Product compatibility system
- ✅ Mobile-responsive design
- ✅ Admin interface for product management
- ✅ Shortcode-based page integration

### Target Use Case:
E-commerce stores selling modular pegboard storage systems where customers need to visualize how accessories fit on pegboards before purchasing.

---

## What This System Does

### Primary Functionality

1. **3D Product Visualization**
   - Loads and displays 3D models (GLB/GLTF format) of pegboards and accessories
   - Provides interactive camera controls (orbit, zoom, pan)
   - Renders products with realistic lighting and shadows

2. **Interactive Configuration**
   - Users select a pegboard as the base
   - Users choose accessories from a categorized list
   - Accessories snap to pegboard hole positions (2.54cm spacing)
   - Visual feedback for valid/invalid placement positions
   - Collision detection prevents overlapping accessories
   - Ability to reposition or remove placed accessories

3. **E-commerce Integration**
   - Real-time price calculation as accessories are added
   - Price breakdown showing individual product costs
   - One-click "Add to Cart" for complete configuration
   - Full WooCommerce integration for checkout

4. **Product Management**
   - Admin interface to enable products in configurator
   - Custom product fields for 3D models, dimensions, compatibility
   - Product type classification (pegboard vs accessory)
   - Compatibility matrix between products

5. **Filtering & Search**
   - Category-based filtering
   - Search by product name
   - Compatibility filtering (show only compatible accessories)
   - Out-of-stock filtering

---

## Architecture Overview

### System Architecture Pattern
**Modular JavaScript Architecture with WordPress/WooCommerce Backend**

```
┌─────────────────────────────────────────────────────────┐
│                   WordPress Frontend                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Blasti Configurator Interface             │  │
│  │  ┌─────────────┐  ┌──────────────────────────┐  │  │
│  │  │ 3D Scene    │  │  Control Panels          │  │  │
│  │  │ (Three.js)  │  │  - Pegboard Selection    │  │  │
│  │  │             │  │  - Accessory Browser     │  │  │
│  │  │ BlastiCore  │  │  - Configuration Summary │  │  │
│  │  │ BlastiModels│  │  - Price Display         │  │  │
│  │  └─────────────┘  └──────────────────────────┘  │  │
│  │                                                   │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  JavaScript Modules (Orchestrator)        │  │  │
│  │  │  - BlastiConfigurator (Main)              │  │  │
│  │  │  - BlastiUI (Interface)                   │  │  │
│  │  │  - BlastiCart (WooCommerce)               │  │  │
│  │  │  - BlastiMemoryManager (Resource Mgmt)    │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │ AJAX (wp-ajax)
┌──────────────────────▼──────────────────────────────────┐
│              WordPress Backend (PHP)                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Blasti Plugin Core                        │  │
│  │  - Blasti_Configurator (Main)                     │  │
│  │  - Blasti_Configurator_Admin                      │  │
│  │  - Blasti_Configurator_Shortcode                  │  │
│  │  - Blasti_Configurator_WooCommerce                │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │         WooCommerce Integration                   │  │
│  │  - Product Meta Fields                            │  │
│  │  - Cart Operations                                │  │
│  │  - Price Calculations                             │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              WordPress Database                          │
│  - wp_posts (products)                                   │
│  - wp_postmeta (custom fields)                           │
│  - wp_blasti_product_models (3D model associations)      │
│  - wp_options (plugin settings)                          │
└──────────────────────────────────────────────────────────┘
```

### Design Patterns Used

1. **Singleton Pattern**: All major classes use singleton instances
2. **Module Pattern**: JavaScript code organized into separate modules
3. **Observer Pattern**: Event-driven communication between modules
4. **MVC-like Structure**: Separation of data, presentation, and logic
5. **Factory Pattern**: Dynamic creation of product UI elements

---

## Technology Stack

### Backend
- **WordPress**: 5.0+ (CMS framework)
- **PHP**: 7.4+ (Server-side language)
- **WooCommerce**: 5.0+ (E-commerce platform)
- **MySQL**: Database (via WordPress)

### Frontend
- **Three.js**: 3D rendering engine
- **OrbitControls**: Camera manipulation
- **GLTFLoader**: 3D model loading
- **jQuery**: DOM manipulation and AJAX
- **Vanilla JavaScript**: ES5/ES6 modules
- **CSS3**: Styling with Grid and Flexbox

### 3D Assets
- **GLB/GLTF**: 3D model format (GL Transmission Format)
- **PBR Materials**: Physically-based rendering materials

### Build & Development
- No build process (vanilla JS, no bundler)
- Direct file loading via WordPress enqueue system

---

## File Structure

```
blasti-configurator/
├── blasti-configurator.php          # Main plugin file (entry point)
│
├── includes/                         # PHP class files
│   ├── class-main.php               # Core plugin functionality
│   ├── class-admin.php              # Admin interface & settings
│   ├── class-shortcode.php          # Shortcode handler
│   └── class-woocommerce.php        # WooCommerce integration (1408 lines!)
│
├── assets/                           # Frontend assets
│   ├── js/
│   │   ├── configurator.js          # Main orchestrator (1468 lines)
│   │   ├── three.min.js             # Three.js library
│   │   ├── OrbitControls.js         # Camera controls
│   │   ├── GLTFLoader.js            # 3D model loader
│   │   ├── GLTFLoader-module.js     # Module version
│   │   ├── admin.js                 # Admin interface scripts
│   │   ├── shortcode-button.js      # TinyMCE editor button
│   │   └── modules/
│   │       ├── core.js              # 3D scene management
│   │       ├── models.js            # 3D model handling
│   │       ├── ui.js                # User interface
│   │       ├── cart.js              # Cart operations
│   │       └── memory-manager.js    # Resource management
│   │
│   ├── css/
│   │   ├── configurator.css         # Main styles
│   │   ├── configurator-mobile.css  # Mobile responsive styles
│   │   └── admin.css                # Admin interface styles
│   │
│   └── models/
│       └── README.md                # 3D model placement guide
│
├── templates/                        # PHP templates
│   ├── configurator.php             # Main configurator UI
│   ├── admin-page.php               # Admin dashboard
│   ├── admin-settings.php           # Settings page
│   └── admin-models.php             # Model management
│
├── languages/                        # Internationalization
│   └── blasti-configurator.pot      # Translation template
│
├── .vscode/                          # VS Code settings
├── .kiro/                            # Unknown config directory
└── README.md                         # Documentation
```

### File Size Analysis
- **Largest PHP File**: `class-woocommerce.php` (1,408 lines) - handles all cart/price logic
- **Largest JS File**: `configurator.js` (1,468 lines) - main orchestrator
- **Total PHP Code**: ~3,000+ lines
- **Total JavaScript Code**: ~5,000+ lines

---

## Core Components

### 1. PHP Backend Classes

#### `Blasti_Configurator` (Main Plugin Class)
**Location**: `blasti-configurator.php`

**Responsibilities**:
- Plugin initialization and lifecycle management
- Dependency checking (WooCommerce requirement)
- Database table creation
- Default options setup
- Auto-creates "Design Your Pegboard" page on activation
- Menu integration

**Key Methods**:
- `activate()`: Creates DB tables, default options, configurator page
- `deactivate()`: Cleanup on deactivation
- `create_configurator_page()`: Auto-generates configurator page
- `is_woocommerce_active()`: Dependency validation

**Database Table Created**:
```sql
wp_blasti_product_models (
    id MEDIUMINT(9) AUTO_INCREMENT,
    product_id BIGINT(20),
    model_url VARCHAR(255),
    model_type VARCHAR(50) DEFAULT 'pegboard',
    dimensions TEXT,
    compatibility TEXT,
    created_at DATETIME,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP
)
```

---

#### `Blasti_Configurator_Main`
**Location**: `includes/class-main.php`

**Responsibilities**:
- Asset enqueuing (scripts and styles)
- Theme integration
- Conditional loading (only on configurator pages)
- Settings registration
- Localization for JavaScript

**Key Features**:
- Detects configurator pages via shortcode or page ID
- Dependency chain for JS modules
- Mobile optimization toggles
- Theme CSS inheritance

**Script Enqueue Order**:
1. Three.js
2. OrbitControls
3. GLTFLoader
4. BlastiCore (3D scene)
5. BlastiModels (model management)
6. BlastiUI (interface)
7. BlastiCart (cart integration)
8. BlastiMemoryManager (resource cleanup)
9. BlastiConfigurator (orchestrator)

---

#### `Blasti_Configurator_Admin`
**Location**: `includes/class-admin.php`

**Responsibilities**:
- Admin menu pages
- Settings registration and sanitization
- Admin-only AJAX handlers
- Capability checks
- Statistics display

**Admin Pages**:
1. **Main Dashboard**: Overview and stats
2. **Settings**: Plugin configuration
3. **3D Models**: Model management interface

**Settings Managed**:
- `enable_mobile_optimization` (boolean)
- `enable_analytics` (boolean)
- `cache_3d_models` (boolean)
- `max_accessories_per_pegboard` (integer, 1-100)
- `theme_integration` (boolean)
- `default_theme`, `default_width`, `default_height`
- `model_quality`, `preload_models`
- `debug_mode`, `custom_css`
- `api_endpoint` (URL)

**Security Features**:
- Nonce verification on all AJAX requests
- `manage_options` capability checks
- Sanitization callbacks for all settings
- Escaped output in templates

---

#### `Blasti_Configurator_Shortcode`
**Location**: `includes/class-shortcode.php`

**Responsibilities**:
- Shortcode registration and rendering
- Attribute parsing and validation
- Template loading with theme override support
- TinyMCE editor button integration

**Shortcodes Registered**:
- `[blasti_configurator]`
- `[blasti_3d_configurator]` (alias)
- `[pegboard_configurator]` (alias)

**Shortcode Attributes**:
```php
[blasti_configurator
    width="100%"                    // CSS width
    height="600px"                  // CSS height
    theme="default"                 // default|dark|light|minimal
    show_price="true"               // Show price display
    show_cart_button="true"         // Show add to cart button
    show_camera_controls="true"     // Show camera view buttons
    show_save_config="true"         // Show save/reset buttons
    enable_mobile="true"            // Enable mobile optimization
    max_accessories="50"            // Max accessories allowed
    default_pegboard="123"          // Pre-select pegboard by ID
    container_class="custom-class"  // Additional CSS class
    loading_text="Loading..."       // Custom loading message
]
```

**Validation**:
- CSS units validated (px, %, em, rem, vw, vh)
- Theme validated against whitelist
- Boolean attributes properly converted
- Numeric limits enforced

**Template Override Support**:
1. Child theme: `/blasti-configurator/configurator.php`
2. Parent theme: `/blasti-configurator/configurator.php`
3. Plugin default: `/templates/configurator.php`

---

#### `Blasti_Configurator_WooCommerce` ⚡
**Location**: `includes/class-woocommerce.php` (1,408 lines - most complex file)

**Responsibilities**:
- Product data management
- AJAX endpoint handlers (11 endpoints!)
- Cart operations with validation
- Price calculations
- Product compatibility checks
- Query optimization with caching

**AJAX Endpoints Registered**:

1. **`blasti_add_to_cart`** (Requirements 6.1-6.5)
   - Adds complete configuration to WooCommerce cart
   - Validates all products before adding
   - Returns cart URL and total

2. **`blasti_get_products`**
   - Fetches all configurator-enabled products
   - Filters by type (pegboard/accessory/all)
   - Includes/excludes out-of-stock items
   - Returns optimized product data

3. **`blasti_get_product`**
   - Fetches single product details
   - Includes 3D model metadata

4. **`blasti_check_compatibility`**
   - Verifies accessory/pegboard compatibility
   - Returns boolean result

5. **`blasti_validate_product`**
   - Validates product has all required 3D data
   - Checks model URL, dimensions, type

6. **`blasti_validate_cart_config`**
   - Pre-validates configuration before cart add
   - Returns validation errors

7. **`blasti_get_cart_status`**
   - Returns current WooCommerce cart state
   - Cart count, total, URLs

8. **`blasti_calculate_price`** (Requirements 7.1, 7.2, 7.5)
   - Calculates total price for configuration
   - Returns detailed breakdown

9. **`blasti_get_product_prices`**
   - Batch fetch prices for multiple products
   - Includes sale prices, currency info

**Custom Product Meta Fields**:
```php
_blasti_configurator_enabled  // 'yes'/'no' - Enable in configurator
_blasti_product_type           // 'pegboard'/'accessory'
_blasti_model_url              // URL to GLB/GLTF file
_blasti_dimensions             // JSON: {"width":1.0, "height":1.0, "depth":0.1}
_blasti_compatibility          // CSV: "123,456,789" (product IDs)
```

**Performance Optimizations**:
- Transient caching (1 hour) for product queries
- Batch meta loading to prevent N+1 queries
- Batch category loading
- WP Cache API usage
- Cache invalidation on product save

**Cache Keys Used**:
- `blasti_products_all_with_oos`
- `blasti_products_all_no_oos`
- `blasti_products_pegboard_with_oos`
- `blasti_products_pegboard_no_oos`
- `blasti_products_accessory_with_oos`
- `blasti_products_accessory_no_oos`

**Validation Workflow**:
```
User clicks "Add to Cart"
    ↓
validate_cart_request()
    ├─ Check pegboard ID exists
    ├─ Validate pegboard product
    ├─ Check accessories array
    ├─ Validate each accessory
    └─ Check compatibility
        ↓
add_configuration_to_cart()
    ├─ Add pegboard to WC cart
    ├─ Add each accessory to WC cart
    ├─ Check max accessories limit
    └─ Calculate totals
        ↓
Return success with cart URL
```

---

### 2. JavaScript Frontend Modules

#### `BlastiConfigurator` (Main Orchestrator)
**Location**: `assets/js/configurator.js` (1,468 lines)

**Role**: Central coordinator for all modules

**Configuration State**:
```javascript
{
    initialized: false,
    modules: {
        core: BlastiCore,
        models: BlastiModels,
        ui: BlastiUI,
        cart: BlastiCart,
        memoryManager: BlastiMemoryManager
    },
    currentPegboard: null,
    currentPegboardModel: null,
    placedAccessories: [],
    gridSystem: {
        enabled: true,
        pegHoleSpacing: 0.0254,  // 2.54cm in meters
        width: 0.22,
        height: 0.44,
        depth: 0.02,
        frontFaceZ: 0.01,
        pegHoles: []
    },
    placementMode: null,
    repositionMode: null
}
```

**Key Responsibilities**:
- Module initialization sequencing
- Inter-module event binding
- Pegboard selection and positioning
- Grid system initialization
- Accessory placement workflow
- Collision detection
- Configuration reset

**Placement Workflow** (Requirements 3.2-3.5):
```
1. User selects accessory
    ↓
2. Load accessory 3D model
    ↓
3. Enter placement mode
    ├─ Create preview model (70% opacity)
    ├─ Bind mouse move handler
    └─ Bind click handler
    ↓
4. Mouse moves over pegboard
    ├─ Raycast to pegboard surface
    ├─ Snap to nearest peg hole
    ├─ Check validity (bounds, overlaps)
    └─ Update preview color (green/red)
    ↓
5. User clicks valid position
    ├─ Clone model
    ├─ Position at snapped location
    ├─ Add to scene
    ├─ Store in placedAccessories array
    ├─ Trigger 'accessoryPlaced' event
    └─ Exit placement mode
```

**Grid Snapping Algorithm**:
```javascript
1. Get mouse intersection with pegboard
2. Extract X,Y coordinates
3. Find closest peg hole within 1.5x spacing
4. If found, return hole position + frontFaceZ
5. If not found, return null (invalid)
```

**Collision Detection**:
- Bounding box overlap check with 2cm margin
- Excludes currently repositioned accessory
- Prevents accessories from touching

**Repositioning Workflow** (Requirement 3.5):
```
1. User clicks reposition button
    ↓
2. Hide original model
3. Create preview model (orange, 70% opacity)
4. Enable repositioning mode
    ├─ Show instructions overlay
    ├─ Bind mouse/click/ESC handlers
    └─ Track original position
    ↓
5. User clicks new position or ESC
    ├─ If valid position: update and show original
    ├─ If ESC: restore original position
    └─ Exit repositioning mode
```

---

#### `BlastiCore` (3D Scene Manager)
**Location**: `assets/js/modules/core.js`

**Responsibilities**:
- Three.js scene initialization
- Camera setup and controls
- Lighting configuration
- Render loop
- Resource disposal

**Scene Configuration**:
```javascript
{
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera (60° FOV),
    renderer: THREE.WebGLRenderer,
    controls: THREE.OrbitControls,
    container: HTMLElement,
    initialized: false
}
```

**Camera Settings**:
- **FOV**: 60 degrees
- **Initial Position**: (0.6, 0.5, 0.8) - close for pegboards
- **Near Plane**: 0.01m (1cm)
- **Far Plane**: 100m
- **Min Distance**: 0.2m (20cm)
- **Max Distance**: 3m

**Lighting Setup** (Optimized for pegboard front view):
1. **Ambient Light**: 0x404040, intensity 0.5
2. **Main Directional**: (0, 3, 8), intensity 1.0, shadows enabled
3. **Front-Right Light**: (3, 2, 6), intensity 0.6
4. **Fill Light**: (-2, 1, 4), intensity 0.4
5. **Hemisphere Light**: Sky 0x87CEEB, Ground 0x8B4513, intensity 0.3

**Renderer Settings**:
- Antialiasing enabled
- Shadow mapping: PCFSoftShadowMap
- Output encoding: sRGB
- Tone mapping: ACESFilmic
- Pixel ratio: Min(devicePixelRatio, 2)

**Camera Views Available**:
- `front`: Straight-on view
- `back`: Rear view
- `left`: Left side
- `right`: Right side
- `top`: Top-down view
- `isometric`: 45° angled view (default)

**Disposal Process**:
- Traverses scene and disposes all geometries
- Disposes all materials and textures
- Removes renderer DOM element
- Clears all references

---

#### `BlastiModels` (3D Model Manager)
**Location**: `assets/js/modules/models.js`

**Responsibilities**:
- GLTF/GLB model loading
- Model caching
- Dimension calculation
- Loading progress tracking

**Features**:
- Promise-based loading
- Automatic caching (if enabled)
- Model dimension extraction
- Loading state management

---

#### `BlastiUI` (User Interface)
**Location**: `assets/js/modules/ui.js`

**Responsibilities**:
- Product display (pegboards & accessories)
- Filter management (category, search, compatibility)
- Event binding for UI interactions
- Visual feedback (messages, loading states)
- Placed accessories list

**Filter System**:
```javascript
{
    category: 'all',           // Category filter
    search: '',                // Search query
    compatibleOnly: true       // Show only compatible
}
```

**Product Display**:
- Creates product cards with images
- Shows price, dimensions, stock status
- Highlights selected products
- Updates dynamically based on filters

---

#### `BlastiCart` (Cart Integration)
**Location**: `assets/js/modules/cart.js`

**Responsibilities**:
- Price calculation via AJAX
- Price display updates
- Add to cart workflow
- Configuration validation
- Cart button state management

**Price Breakdown Structure**:
```javascript
{
    pegboard: {
        id, name, price, formatted_price
    },
    accessories: [{
        id, name, price, formatted_price
    }],
    subtotal: 0,
    total: 0,
    currency_symbol: '$',
    formatted_total: '$0.00'
}
```

**Add to Cart Workflow**:
```
1. User clicks "Add to Cart"
    ↓
2. Get current configuration
3. Validate configuration
    ├─ Pegboard selected?
    ├─ All accessories valid?
    └─ No errors?
    ↓
4. Send AJAX to blasti_add_to_cart
    ↓
5. Server validates and adds to WC cart
    ↓
6. Return success + cart URL
    ↓
7. Show success message
8. Optional redirect to cart
```

---

#### `BlastiMemoryManager` (Resource Management)
**Location**: `assets/js/modules/memory-manager.js`

**Responsibilities**:
- Track loaded models
- Dispose unused resources
- Prevent memory leaks
- Garbage collection triggers

---

### 3. Templates

#### `configurator.php` (Main UI Template)
**Location**: `templates/configurator.php`

**Structure**:
```html
<div class="blasti-configurator-container">
    <!-- Loading Screen -->
    <div class="configurator-loading">...</div>

    <!-- Main Interface -->
    <div class="configurator-interface">
        <!-- 3D Scene -->
        <div id="configurator-scene"></div>

        <!-- Control Panels -->
        <div class="configurator-controls">
            <!-- Pegboard Selection -->
            <div id="pegboard-panel"></div>

            <!-- Accessory Browser -->
            <div id="accessory-panel">
                <!-- Filters -->
                <div id="accessory-filters">
                    <input id="accessory-search">
                    <div id="category-filters"></div>
                    <div>Compatible Only toggle</div>
                </div>
                <div id="accessory-list"></div>
            </div>

            <!-- Configuration Summary -->
            <div id="summary-panel">
                <div id="current-pegboard"></div>
                <div id="placed-accessories"></div>
                <div class="price-display"></div>
                <button class="add-to-cart-btn"></button>
                <div class="configuration-actions">
                    <button class="save-config-btn"></button>
                    <button class="reset-config-btn"></button>
                </div>
            </div>
        </div>

        <!-- Camera Controls -->
        <div class="camera-controls"></div>
    </div>

    <!-- Messages -->
    <div class="configurator-messages"></div>
</div>

<script>
// Initialization logic
jQuery(document).ready(function($) {
    BlastiConfigurator.init();
});
</script>
```

**Initialization Sequence**:
1. Show interface (add 'loaded' class for opacity transition)
2. Wait 50ms for browser paint
3. Call `BlastiConfigurator.init()`
4. Hide loading screen

---

## Configuration Guide

### Plugin Settings

**Location**: WordPress Admin → Blasti Configurator → Settings

**Available Options**:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| Enable Mobile Optimization | Boolean | true | Load mobile-specific CSS |
| Enable Analytics | Boolean | true | Track configuration events |
| Cache 3D Models | Boolean | true | Browser cache for models |
| Max Accessories Per Pegboard | Integer | 50 | Limit accessories (1-100) |
| Theme Integration | Boolean | true | Inherit theme styles |
| Default Theme | String | default | Color scheme |
| Default Width | String | 100% | Configurator width |
| Default Height | String | 600px | Configurator height |
| Model Quality | String | medium | 3D model detail level |
| Preload Models | Boolean | false | Load models on page load |
| Debug Mode | Boolean | false | Show debug helpers |
| Custom CSS | Textarea | - | Additional styles |
| API Endpoint | URL | - | External API URL |

---

### Product Configuration

**Location**: WordPress Admin → Products → Edit Product

**Custom Fields Added**:

1. **Enable in Configurator** (Checkbox)
   - Makes product available in configurator
   - Must be checked for product to appear

2. **Product Type** (Select)
   - Options: Pegboard, Accessory
   - Determines product role

3. **3D Model URL** (Text)
   - URL to GLB or GLTF file
   - Can be local (`/wp-content/uploads/models/pegboard.glb`) or remote
   - **Important**: Must be publicly accessible

4. **Dimensions (JSON)** (Text)
   - Format: `{"width": 0.22, "height": 0.44, "depth": 0.02}`
   - Units in meters
   - Required for grid system

5. **Compatible Products** (Textarea)
   - Comma-separated product IDs
   - Example: `123, 456, 789`
   - Blank = compatible with all

**Example Configuration**:
```
Product: Small Pegboard
├─ Enable in Configurator: ✓
├─ Product Type: Pegboard
├─ 3D Model URL: https://example.com/models/pegboard-small.glb
├─ Dimensions: {"width": 0.22, "height": 0.44, "depth": 0.02}
└─ Compatible Products: (blank - all accessories compatible)

Product: Tool Hook
├─ Enable in Configurator: ✓
├─ Product Type: Accessory
├─ 3D Model URL: https://example.com/models/hook-tool.glb
├─ Dimensions: {"width": 0.05, "height": 0.08, "depth": 0.03}
└─ Compatible Products: 123 (only compatible with product ID 123)
```

---

### Pegboard Hole Grid System

**Spacing Standard**: 2.54cm (1 inch) - standard pegboard hole spacing

**Grid Calculation**:
```javascript
pegHoleSpacing = 0.0254 meters (2.54cm)
cols = floor(pegboardWidth / pegHoleSpacing)
rows = floor(pegboardHeight / pegHoleSpacing)

For 22cm x 44cm pegboard:
cols = floor(0.22 / 0.0254) = 8 columns
rows = floor(0.44 / 0.0254) = 17 rows
Total peg holes = 8 × 17 = 136 positions
```

**Accessory Placement**:
- Accessories snap to nearest peg hole
- Maximum snap distance: 1.5 × pegHoleSpacing
- Positioned on front face (Z = depth/2 + 0.01m)

---

## Workflow & User Journey

### Customer Journey

```
1. Customer visits configurator page
   ↓
2. Page loads with empty 3D scene
   ↓
3. Customer browses pegboards panel
   └─ Views product images, prices, dimensions
   ↓
4. Customer clicks pegboard
   ├─ 3D model loads and displays
   ├─ Camera focuses on pegboard
   ├─ Price updates
   └─ Accessory panel becomes available
   ↓
5. Customer browses accessories
   ├─ Can filter by category
   ├─ Can search by name
   └─ Can toggle "Compatible Only"
   ↓
6. Customer clicks accessory
   ├─ Preview model appears (transparent green)
   ├─ Follows mouse over pegboard
   ├─ Snaps to peg holes
   ├─ Shows red if invalid position
   └─ Shows green if valid position
   ↓
7. Customer clicks valid position
   ├─ Accessory placed on pegboard
   ├─ Added to "Placed Accessories" list
   ├─ Price updates to include accessory
   └─ Can place more accessories
   ↓
8. Customer manages configuration
   ├─ Can reposition accessories (click reposition button)
   ├─ Can remove accessories (click X button)
   ├─ Can change camera view
   ├─ Can reset entire configuration
   └─ Sees live price updates
   ↓
9. Customer clicks "Add to Cart"
   ├─ Configuration validated
   ├─ All items added to WooCommerce cart
   ├─ Success message shown
   └─ Optional redirect to cart
   ↓
10. Customer proceeds to checkout
    └─ Standard WooCommerce checkout flow
```

### Admin Workflow

```
1. Admin installs plugin
   ↓
2. Plugin activation
   ├─ Creates database table
   ├─ Sets default options
   ├─ Creates "Design Your Pegboard" page
   └─ Adds to WordPress menu
   ↓
3. Admin uploads 3D models
   └─ Via Media Library or external hosting
   ↓
4. Admin creates/edits products
   ├─ Checks "Enable in Configurator"
   ├─ Selects product type
   ├─ Enters 3D model URL
   ├─ Enters dimensions JSON
   └─ Enters compatible product IDs
   ↓
5. Admin configures plugin settings
   ├─ Adjusts max accessories limit
   ├─ Enables/disables features
   └─ Customizes appearance
   ↓
6. Admin publishes products
   └─ Products appear in configurator
   ↓
7. Admin monitors usage (if analytics enabled)
   └─ Views dashboard stats
```

---

## Database Schema

### Custom Table: `wp_blasti_product_models`

**Purpose**: Store 3D model associations (currently unused - uses postmeta instead)

```sql
CREATE TABLE wp_blasti_product_models (
    id MEDIUMINT(9) NOT NULL AUTO_INCREMENT,
    product_id BIGINT(20) NOT NULL,
    model_url VARCHAR(255) NOT NULL,
    model_type VARCHAR(50) NOT NULL DEFAULT 'pegboard',
    dimensions TEXT,
    compatibility TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY product_id (product_id),
    KEY model_type (model_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**⚠️ Inconsistency**: Table created but never used! All data stored in `wp_postmeta` instead.

---

### Post Meta Fields

**Storage**: `wp_postmeta` table

| Meta Key | Type | Example | Description |
|----------|------|---------|-------------|
| `_blasti_configurator_enabled` | String | 'yes'/'no' | Product enabled flag |
| `_blasti_product_type` | String | 'pegboard' | Product classification |
| `_blasti_model_url` | String | 'https://...' | 3D model URL |
| `_blasti_dimensions` | JSON String | '{"width":0.22,...}' | Product dimensions |
| `_blasti_compatibility` | CSV String | '123,456,789' | Compatible product IDs |

---

### WordPress Options

**Storage**: `wp_options` table

| Option Name | Type | Default | Description |
|-------------|------|---------|-------------|
| `blasti_configurator_version` | String | '1.0.4' | Plugin version |
| `blasti_configurator_db_version` | String | '1.0' | Database schema version |
| `blasti_configurator_configurator_page_id` | Integer | 0 | Auto-created page ID |
| `blasti_configurator_enable_mobile_optimization` | Boolean | true | Mobile CSS |
| `blasti_configurator_enable_analytics` | Boolean | true | Analytics tracking |
| `blasti_configurator_cache_3d_models` | Boolean | true | Model caching |
| `blasti_configurator_max_accessories_per_pegboard` | Integer | 50 | Accessory limit |
| `blasti_configurator_theme_integration` | Boolean | true | Theme styles |
| `blasti_configurator_menu_position` | String | 'main' | Menu location |
| `blasti_configurator_page_template` | String | 'default' | Page template |
| `blasti_configurator_total_configurations` | Integer | 0 | Analytics counter |
| `blasti_configurator_total_cart_additions` | Integer | 0 | Analytics counter |
| `blasti_configurator_recent_activities` | Array | [] | Activity log (max 50) |

---

## API Endpoints (AJAX)

All endpoints use WordPress AJAX with nonce verification.

**Base URL**: `/wp-admin/admin-ajax.php`

### Public Endpoints (logged in or not)

#### 1. Get Products
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_get_products',
    nonce: 'xxx',
    product_type: 'all' | 'pegboard' | 'accessory',
    include_out_of_stock: false,
    pegboard_id: 123  // Optional, for compatible accessories
}

Response:
{
    success: true,
    data: {
        products: [{
            id: 123,
            name: 'Product Name',
            type: 'pegboard',
            price: 49.99,
            formatted_price: '$49.99',
            model_url: 'https://...',
            dimensions: {width: 0.22, height: 0.44, depth: 0.02},
            compatibility: [456, 789],
            categories: ['Hooks', 'Storage'],
            image_url: 'https://...',
            in_stock: true,
            stock_quantity: 10
        }],
        total_count: 15
    }
}
```

#### 2. Get Single Product
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_get_product',
    nonce: 'xxx',
    product_id: 123
}

Response: Same structure as single product above
```

#### 3. Check Compatibility
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_check_compatibility',
    nonce: 'xxx',
    accessory_id: 456,
    pegboard_id: 123
}

Response:
{
    success: true,
    data: {
        compatible: true,
        accessory_id: 456,
        pegboard_id: 123
    }
}
```

#### 4. Validate Product
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_validate_product',
    nonce: 'xxx',
    product_id: 123
}

Response:
{
    success: true,
    data: {
        valid: true,
        errors: [],
        product: {...}
    }
}
```

#### 5. Calculate Price
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_calculate_price',
    nonce: 'xxx',
    pegboard_id: 123,
    accessory_ids: [456, 789]
}

Response:
{
    success: true,
    data: {
        pegboard: {
            id: 123,
            name: 'Small Pegboard',
            price: 49.99,
            formatted_price: '$49.99'
        },
        accessories: [{...}, {...}],
        subtotal: 79.97,
        total: 79.97,
        formatted_total: '$79.97',
        currency_symbol: '$',
        currency_code: 'USD'
    }
}
```

#### 6. Get Product Prices
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_get_product_prices',
    nonce: 'xxx',
    product_ids: [123, 456, 789]
}

Response:
{
    success: true,
    data: {
        prices: {
            123: {
                id: 123,
                price: 49.99,
                formatted_price: '$49.99',
                regular_price: 59.99,
                sale_price: 49.99,
                is_on_sale: true
            },
            ...
        },
        currency_symbol: '$',
        currency_code: 'USD',
        decimals: 2
    }
}
```

#### 7. Validate Cart Configuration
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_validate_cart_config',
    nonce: 'xxx',
    pegboard_id: 123,
    accessories: [{id: 456, position: {...}}, ...]
}

Response:
{
    success: true,
    data: {
        valid: true,
        total_price: 79.97,
        formatted_total: '$79.97',
        product_details: {...},
        item_count: 3
    }
}
```

#### 8. Get Cart Status
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_get_cart_status',
    nonce: 'xxx'
}

Response:
{
    success: true,
    data: {
        cart_count: 5,
        cart_total: '$125.00',
        cart_subtotal: '$125.00',
        cart_url: 'https://...',
        checkout_url: 'https://...',
        is_empty: false
    }
}
```

#### 9. Add to Cart ⭐
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_add_to_cart',
    nonce: 'xxx',
    configuration: JSON.stringify({
        pegboard_id: 123,
        accessories: [
            {id: 456, position: {x: 0, y: 0, z: 0}},
            {id: 789, position: {x: 0.05, y: 0.05, z: 0}}
        ]
    })
}

Response:
{
    success: true,
    data: {
        message: 'Configuration added to cart successfully! 3 items added.',
        cart_url: 'https://.../cart',
        cart_items: ['cart_item_key_1', 'cart_item_key_2'],
        added_products: [{...}, {...}],
        total_price: 79.97,
        cart_total: '$79.97',
        cart_count: 3,
        redirect_delay: 1500
    }
}

Error Response:
{
    success: false,
    data: {
        message: 'Validation failed',
        code: 'VALIDATION_FAILED',
        validation_errors: {
            pegboard: 'Please select a pegboard',
            accessories: {
                0: 'Accessory not compatible'
            }
        }
    }
}
```

### Admin Endpoints (require `manage_options`)

#### 10. Save Settings
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_save_settings',
    nonce: 'admin_nonce',
    // Settings data
}
```

#### 11. Get Statistics
```javascript
POST /wp-admin/admin-ajax.php
{
    action: 'blasti_get_stats',
    nonce: 'admin_nonce'
}

Response:
{
    success: true,
    data: {
        pegboards: 5,
        accessories: 25,
        configurations: 120,
        cart_additions: 45
    }
}
```

---

## Inconsistencies & Issues Found

### 🔴 Critical Issues

1. **Unused Database Table**
   - **Issue**: `wp_blasti_product_models` table created but never used
   - **Impact**: Wastes database space, confusing for developers
   - **Location**: `blasti-configurator.php:200-227`
   - **Recommendation**: Either use the table or remove it

2. **Duplicate Code Comments**
   - **Issue**: Multiple comments stating "AJAX handlers removed - now handled directly by WooCommerce integration class"
   - **Impact**: Indicates incomplete refactoring
   - **Location**: `class-main.php:50, 370-372`
   - **Recommendation**: Clean up residual comments

3. **Hardcoded Session ID in Branch Name**
   - **Issue**: Branch `claude/master-branch-update-011CUvKnATXUhQ2uDv3X5Wvf` contains session ID
   - **Impact**: Not a standard git workflow
   - **Recommendation**: Use feature branch naming (e.g., `feature/configurator-v1`)

---

### ⚠️ Medium Issues

4. **No Master/Main Branch**
   - **Issue**: Git shows no master/main branch exists
   - **Impact**: Non-standard repository structure
   - **Location**: Git repository
   - **Recommendation**: Create proper main branch

5. **Inconsistent Error Handling**
   - **Issue**: Some AJAX handlers use `wp_die()`, others use `wp_send_json_error()`
   - **Impact**: Inconsistent error responses
   - **Example**: `class-woocommerce.php:141` vs `class-woocommerce.php:1000`
   - **Recommendation**: Standardize on `wp_send_json_error()`

6. **Missing .gitignore**
   - **Issue**: No `.gitignore` file in repository
   - **Impact**: May commit unnecessary files (node_modules, .DS_Store, etc.)
   - **Recommendation**: Add comprehensive `.gitignore`

7. **Unknown `.kiro/` Directory**
   - **Issue**: `.kiro/` directory with no documentation
   - **Impact**: Unknown purpose
   - **Recommendation**: Document purpose or remove

8. **Mixed Nonce Names**
   - **Issue**: Uses both `blasti_configurator_nonce` and `blasti_admin_nonce`
   - **Impact**: Confusing, but functional
   - **Recommendation**: Use consistent naming pattern

9. **No Build Process**
   - **Issue**: No minification, bundling, or transpilation
   - **Impact**: Larger file sizes, slower load times
   - **Recommendation**: Add webpack or similar

10. **Large File Sizes**
    - **Issue**: `configurator.js` is 1,468 lines, `class-woocommerce.php` is 1,408 lines
    - **Impact**: Harder to maintain
    - **Recommendation**: Further modularization

---

### 💡 Minor Issues / Improvements

11. **No TypeScript**
    - **Issue**: Pure JavaScript, no type safety
    - **Impact**: More runtime errors possible
    - **Recommendation**: Consider TypeScript for future versions

12. **No Unit Tests**
    - **Issue**: No test suite found
    - **Impact**: Harder to refactor safely
    - **Recommendation**: Add PHPUnit and Jest tests

13. **No CSS Preprocessor**
    - **Issue**: Vanilla CSS, some repetition
    - **Impact**: Harder to maintain styles
    - **Recommendation**: Consider SCSS/LESS

14. **Hardcoded Strings**
    - **Issue**: Some strings not translatable
    - **Impact**: Limits internationalization
    - **Example**: JavaScript console.log messages
    - **Recommendation**: Use i18n for all user-facing strings

15. **No Documentation for 3D Model Requirements**
    - **Issue**: No guide for 3D model specs (poly count, texture size, etc.)
    - **Impact**: Users may upload poorly optimized models
    - **Recommendation**: Add model requirements doc

16. **No Fallback for WebGL Failure**
    - **Issue**: If WebGL not supported, shows generic error
    - **Impact**: Poor user experience on old devices
    - **Recommendation**: Add graceful degradation or 2D fallback

17. **Memory Management**
    - **Issue**: `BlastiMemoryManager` exists but not fully utilized
    - **Impact**: Potential memory leaks with many models
    - **Recommendation**: Implement aggressive cleanup

18. **No Progressive Loading**
    - **Issue**: All accessories loaded at once
    - **Impact**: Slow initial load with many products
    - **Recommendation**: Implement lazy loading or pagination

19. **Missing Price Tax Calculation**
    - **Issue**: Prices shown are pre-tax
    - **Impact**: May confuse customers in tax-inclusive regions
    - **Recommendation**: Add tax calculation option

20. **No Configuration Save/Load**
    - **Issue**: "Save Configuration" button exists but not implemented
    - **Impact**: Users can't save/share configurations
    - **Recommendation**: Implement save to user account or shareable link

---

### 📝 Documentation Issues

21. **README Outdated**
    - **Issue**: README says "Three.js (to be added in later tasks)" but it's already added
    - **Location**: `README.md:68`
    - **Recommendation**: Update README

22. **No API Documentation**
    - **Issue**: AJAX endpoints not documented
    - **Impact**: Hard for other developers to extend
    - **Recommendation**: Add API docs (this document helps!)

23. **No Changelog**
    - **Issue**: No CHANGELOG.md file
    - **Impact**: Can't track version changes
    - **Recommendation**: Add CHANGELOG.md

---

### 🎨 UI/UX Issues

24. **No Loading Progress Indicator**
    - **Issue**: 3D models load without progress bar
    - **Impact**: Users don't know how long to wait
    - **Recommendation**: Show loading percentage

25. **No Undo/Redo**
    - **Issue**: Can't undo accessory placement
    - **Impact**: Users must manually remove and re-add
    - **Recommendation**: Implement undo stack

26. **Mobile Experience**
    - **Issue**: 3D controls may be difficult on mobile
    - **Impact**: Poor mobile UX
    - **Recommendation**: Test thoroughly on mobile, add touch gestures

27. **No Product Thumbnails in Summary**
    - **Issue**: Placed accessories list shows names only
    - **Impact**: Hard to identify accessories visually
    - **Recommendation**: Add small thumbnails

---

## Security Analysis

### ✅ Security Strengths

1. **Nonce Verification**: All AJAX endpoints verify nonces
2. **Capability Checks**: Admin functions check `manage_options`
3. **Input Sanitization**: All user inputs sanitized
4. **Output Escaping**: Template output properly escaped
5. **SQL Injection Protection**: Uses `$wpdb->prepare()` for queries
6. **XSS Prevention**: Uses `esc_html()`, `esc_attr()`, `esc_url()`
7. **Direct Access Prevention**: All files check `ABSPATH`

### ⚠️ Security Concerns

1. **No Rate Limiting**
   - **Issue**: AJAX endpoints not rate-limited
   - **Risk**: Could be abused for DoS
   - **Recommendation**: Add rate limiting

2. **3D Model URLs Not Validated**
   - **Issue**: Model URLs accepted without content validation
   - **Risk**: Could load malicious files
   - **Recommendation**: Validate file type server-side

3. **JSON Parsing Without Validation**
   - **Issue**: Dimensions JSON parsed without schema validation
   - **Risk**: Malformed JSON could cause errors
   - **Recommendation**: Add JSON schema validation

4. **No CSRF Protection on Admin Forms**
   - **Issue**: Admin settings forms should double-check nonces
   - **Risk**: Potential CSRF attacks
   - **Recommendation**: WordPress Settings API handles this, verify implementation

5. **Client-Side Price Calculation**
   - **Issue**: Prices calculated client-side before server validation
   - **Risk**: Could be manipulated (server validates before cart add)
   - **Note**: This is mitigated by server-side validation in `add_to_cart`

---

## Performance Considerations

### ✅ Performance Optimizations

1. **Transient Caching**: Products cached for 1 hour
2. **Batch Meta Loading**: Prevents N+1 queries
3. **Conditional Asset Loading**: Only loads on configurator pages
4. **WebGL Renderer Settings**: Optimized for performance
5. **Pixel Ratio Capping**: Limits to 2x for performance

### ⚠️ Performance Bottlenecks

1. **Large JavaScript Files**
   - **Issue**: 1.4MB+ unminified JS loaded
   - **Impact**: Slow page load
   - **Recommendation**: Minify, bundle, code-split

2. **No Model Optimization**
   - **Issue**: No guidance on model poly count
   - **Impact**: High-poly models cause lag
   - **Recommendation**: Document model limits (e.g., < 100k triangles)

3. **No Lazy Loading**
   - **Issue**: All product data loaded upfront
   - **Impact**: Slow with 100+ products
   - **Recommendation**: Paginate or lazy-load

4. **Three.js Not Tree-Shaken**
   - **Issue**: Full Three.js library loaded (~600KB)
   - **Impact**: Unnecessary code
   - **Recommendation**: Use ES6 modules and tree-shaking

5. **Cache Invalidation Strategy**
   - **Issue**: Clears all caches on any product save
   - **Impact**: Cache frequently invalidated
   - **Recommendation**: Targeted cache invalidation

---

## Installation & Setup

### Requirements

- **WordPress**: 5.0 or higher
- **PHP**: 7.4 or higher
- **WooCommerce**: 5.0 or higher
- **MySQL**: 5.6 or higher
- **Browser**: Modern browser with WebGL support
  - Chrome 56+
  - Firefox 52+
  - Safari 11+
  - Edge 79+

### Installation Steps

1. **Upload Plugin**
   ```bash
   # Via WordPress Admin
   Plugins → Add New → Upload Plugin → Choose ZIP → Install Now

   # Via FTP
   Upload to: /wp-content/plugins/blasti-configurator/
   ```

2. **Activate Plugin**
   ```
   WordPress Admin → Plugins → Activate "Blasti 3D Configurator"
   ```

3. **Verify WooCommerce**
   - Ensure WooCommerce is installed and active
   - Plugin will show error if WooCommerce missing

4. **Configure Settings** (Optional)
   ```
   WordPress Admin → Blasti Configurator → Settings
   Adjust as needed, defaults are sensible
   ```

5. **Prepare 3D Models**
   - Create or obtain GLB/GLTF models
   - Upload to Media Library or external CDN
   - Recommended: Use external CDN for large files

6. **Configure Products**
   ```
   Products → Add New (or Edit existing)
   ├─ Set WooCommerce price, title, description
   ├─ Check "Enable in Configurator"
   ├─ Select "Pegboard" or "Accessory"
   ├─ Enter 3D Model URL
   ├─ Enter Dimensions JSON
   └─ Enter Compatible Product IDs (if needed)
   ```

7. **Add Shortcode to Page**
   ```
   The plugin auto-creates a "Design Your Pegboard" page

   Or manually add to any page:
   [blasti_configurator]
   ```

8. **Test Configuration**
   - Visit configurator page
   - Select pegboard
   - Place accessories
   - Add to cart
   - Complete test purchase

---

### Sample Product Setup

**Pegboard Product**:
```
Product Name: Premium Pegboard 22x44cm
Regular Price: $49.99
Enable in Configurator: ✓
Product Type: Pegboard
3D Model URL: https://cdn.example.com/models/pegboard-22x44.glb
Dimensions: {"width": 0.22, "height": 0.44, "depth": 0.02}
Compatible Products: (leave blank for all)
```

**Accessory Product**:
```
Product Name: Double Tool Hook
Regular Price: $4.99
Enable in Configurator: ✓
Product Type: Accessory
3D Model URL: https://cdn.example.com/models/hook-double.glb
Dimensions: {"width": 0.05, "height": 0.08, "depth": 0.03}
Compatible Products: 123 (pegboard product ID)
```

---

## Customization & Extension

### Theming

**Override Template**:
```
1. Create directory in theme:
   /wp-content/themes/your-theme/blasti-configurator/

2. Copy template:
   Copy: /plugins/blasti-configurator/templates/configurator.php
   To: /themes/your-theme/blasti-configurator/configurator.php

3. Customize as needed
```

**Add Custom CSS**:
```
Method 1: Plugin Settings
Blasti Configurator → Settings → Custom CSS

Method 2: Theme Stylesheet
.blasti-configurator-container {
    /* Your styles */
}
```

**Hooks & Filters** (Available):
```php
// Filter configurator access
add_filter('blasti_configurator_user_can_access', function($can_access) {
    return current_user_can('customer'); // Require login
}, 10, 1);

// Filter cart redirect URL
add_filter('blasti_configurator_cart_redirect_url', function($url) {
    return home_url('/custom-cart'); // Custom cart page
}, 10, 1);

// Modify cart success response
add_filter('blasti_configurator_cart_success_response', function($response, $config) {
    $response['custom_data'] = 'value';
    return $response;
}, 10, 2);
```

---

### JavaScript Extensions

**Listen to Events**:
```javascript
// Pegboard selected
jQuery(document).on('pegboardSelected', function(event, pegboard) {
    console.log('Pegboard selected:', pegboard);
});

// Accessory placed
jQuery(document).on('accessoryPlaced', function(event, accessoryData) {
    console.log('Accessory placed:', accessoryData);
});

// Configuration changed
jQuery(document).on('configurationChanged', function() {
    console.log('Configuration updated');
});

// Configuration reset
jQuery(document).on('configurationReset', function() {
    console.log('Configuration cleared');
});
```

**Access Configurator State**:
```javascript
// Get current configuration
var config = BlastiConfigurator.getCurrentConfiguration();
console.log('Pegboard:', config.pegboard);
console.log('Accessories:', config.accessories);

// Access 3D scene
var scene = BlastiCore.config.scene;
var camera = BlastiCore.config.camera;
```

---

### Create Custom Shortcode Attributes

**Example**: Add custom background color
```php
// In functions.php
add_filter('shortcode_atts_blasti_configurator', function($atts) {
    $atts['bg_color'] = isset($atts['bg_color']) ? $atts['bg_color'] : '#f5f5f5';
    return $atts;
}, 10, 1);

// Usage
[blasti_configurator bg_color="#ffffff"]
```

---

## Dependencies

### PHP Dependencies
```
wordpress >= 5.0
woocommerce >= 5.0
php >= 7.4
mysql >= 5.6
```

### JavaScript Dependencies
```
three.js (r128 or similar, bundled)
jQuery (WordPress core)
OrbitControls (bundled)
GLTFLoader (bundled)
```

### External Services
```
None required (fully self-hosted)
Optional: External CDN for 3D models
```

---

## Browser Compatibility

### Supported Browsers

| Browser | Min Version | WebGL | Status |
|---------|-------------|-------|--------|
| Chrome | 56+ | ✅ | Fully Supported |
| Firefox | 52+ | ✅ | Fully Supported |
| Safari | 11+ | ✅ | Supported |
| Edge | 79+ | ✅ | Fully Supported |
| Opera | 43+ | ✅ | Supported |
| Mobile Safari | 11+ | ✅ | Supported |
| Chrome Mobile | 56+ | ✅ | Supported |

### Unsupported
- Internet Explorer (all versions)
- Opera Mini
- UC Browser (old versions)
- Browsers without WebGL

### Feature Detection
```javascript
if (typeof THREE === 'undefined') {
    // Fallback: Show error message
    container.innerHTML = 'WebGL not supported';
}
```

---

## Conclusion

**Blasti 3D Configurator** is a well-structured WordPress plugin that successfully integrates 3D visualization with WooCommerce. The codebase demonstrates:

### Strengths
✅ Clean modular architecture
✅ Comprehensive AJAX API
✅ Good security practices
✅ Thoughtful user experience
✅ Extensive validation
✅ Performance optimizations (caching, batch loading)
✅ Mobile-responsive design

### Areas for Improvement
⚠️ Remove unused database table
⚠️ Add build process for asset optimization
⚠️ Implement unit tests
⚠️ Add comprehensive documentation
⚠️ Implement missing features (save configuration, undo/redo)
⚠️ Optimize large JavaScript files
⚠️ Add progress indicators

### Recommended Next Steps
1. Fix critical issues (unused table, duplicate code)
2. Add build tooling (webpack, minification)
3. Write unit tests (PHPUnit, Jest)
4. Complete unimplemented features
5. Add comprehensive user documentation
6. Performance testing with large product catalogs
7. Mobile UX improvements

---

**Document Version**: 1.0
**Created**: 2025-11-08
**Author**: AI Analysis
**Plugin Version Analyzed**: 1.0.4
