# Blasti 3D Configurator

A WordPress plugin that provides a 3D configurator for pegboards, integrating with WooCommerce to allow customers to design and purchase custom pegboard configurations.

## Features

- 3D visualization of pegboards and accessories
- Interactive placement of accessories on pegboards
- Real-time price calculation
- WooCommerce cart integration
- Mobile-friendly responsive design
- WordPress admin interface for managing 3D models
- Shortcode support for easy page integration

## Requirements

- WordPress 5.0 or higher
- WooCommerce 5.0 or higher
- PHP 7.4 or higher

## Installation

1. Upload the plugin files to `/wp-content/plugins/blasti-configurator/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure your WooCommerce products with 3D models
4. Add the `[blasti_configurator]` shortcode to any page

## Usage

### Setting up Products

1. Edit a WooCommerce product
2. In the Product Data section, check "Enable in Configurator"
3. Select the product type (Pegboard or Accessory)
4. Enter the URL to your GLB/GLTF 3D model file
5. Add dimensions in JSON format: `{"width": 1.0, "height": 1.0, "depth": 0.1}`
6. For accessories, list compatible pegboard product IDs
7. Save the product

### Displaying the Configurator

Add the shortcode to any page or post:

```
[blasti_configurator]
```

#### Shortcode Parameters

- `width` - Configurator width (default: 100%)
- `height` - Configurator height (default: 600px)
- `theme` - Color theme (default: default)
- `show_price` - Show price display (default: true)
- `show_cart_button` - Show add to cart button (default: true)

#### Example

```
[blasti_configurator width="800px" height="500px" show_price="true"]
```

## Development

This plugin is built with:

- PHP for WordPress/WooCommerce integration
- JavaScript for frontend functionality
- Three.js for 3D rendering (to be added in later tasks)
- CSS for styling

## File Structure

```
blasti-configurator/
├── blasti-configurator.php     # Main plugin file
├── includes/                   # Core PHP classes
├── assets/                     # JavaScript, CSS, and 3D models
├── templates/                  # PHP templates
├── languages/                  # Translation files
└── README.md                   # This file
```

## License

GPL v2 or later

## Support

For support and documentation, visit the plugin admin page in your WordPress dashboard.