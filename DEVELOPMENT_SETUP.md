# Blasti 3D Configurator - Windows Development Setup Guide

## Overview
This guide will help you set up a complete WordPress development environment on Windows for the Blasti 3D Configurator plugin.

## Required Software

### 1. Local WordPress Development Environment

#### Option A: XAMPP (Recommended for beginners)
- **Download**: https://www.apachefriends.org/download.html
- **What it includes**: Apache, MySQL, PHP, phpMyAdmin
- **Installation**:
  1. Download XAMPP for Windows
  2. Run installer as Administrator
  3. Select Apache, MySQL, PHP, phpMyAdmin components
  4. Install to `C:\xampp` (default)
  5. Start Apache and MySQL from XAMPP Control Panel

#### Option B: Local by Flywheel
- **Download**: https://localwp.com/
- **What it includes**: Complete WordPress environment with easy site management
- **Installation**:
  1. Download Local
  2. Install and create new WordPress site
  3. Choose preferred PHP version (7.4+ required)

#### Option C: Docker Desktop + WordPress
- **Download**: https://www.docker.com/products/docker-desktop
- **What it includes**: Containerized WordPress environment
- **Setup**: Use official WordPress Docker image

### 2. PHP (if not included in above)
- **Download**: https://windows.php.net/download/
- **Version**: PHP 7.4 or higher (8.0+ recommended)
- **Installation**:
  1. Download Thread Safe version
  2. Extract to `C:\php`
  3. Add `C:\php` to Windows PATH environment variable
  4. Copy `php.ini-development` to `php.ini`
  5. Enable required extensions in `php.ini`:
     ```ini
     extension=mysqli
     extension=pdo_mysql
     extension=mbstring
     extension=curl
     extension=gd
     extension=zip
     ```

### 3. Composer (PHP Package Manager)
- **Download**: https://getcomposer.org/download/
- **Installation**:
  1. Download and run Composer-Setup.exe
  2. Follow installer instructions
  3. Verify installation: `composer --version`

### 4. Node.js (for JavaScript development)
- **Download**: https://nodejs.org/
- **Version**: LTS version recommended
- **Installation**:
  1. Download Windows installer
  2. Run installer with default settings
  3. Verify installation: `node --version` and `npm --version`

### 5. Git (Version Control)
- **Download**: https://git-scm.com/download/win
- **Installation**:
  1. Download Git for Windows
  2. Install with recommended settings
  3. Configure: 
     ```bash
     git config --global user.name "Your Name"
     git config --global user.email "your.email@example.com"
     ```

## WordPress Setup

### 1. Download WordPress
- **Download**: https://wordpress.org/download/
- **Installation**:
  1. Extract to your web server directory (e.g., `C:\xampp\htdocs\wordpress`)
  2. Create database in phpMyAdmin (usually at http://localhost/phpmyadmin)
  3. Run WordPress installation at http://localhost/wordpress

### 2. Install WooCommerce
- **Method 1**: WordPress Admin Dashboard
  1. Go to Plugins > Add New
  2. Search for "WooCommerce"
  3. Install and activate

- **Method 2**: Manual Download
  1. Download from https://wordpress.org/plugins/woocommerce/
  2. Upload to `/wp-content/plugins/`
  3. Activate in WordPress admin

## Development Tools

### 1. Code Editor
#### Visual Studio Code (Recommended)
- **Download**: https://code.visualstudio.com/
- **Recommended Extensions**:
  - PHP Intelephense
  - WordPress Snippets
  - Prettier - Code formatter
  - GitLens
  - Auto Rename Tag
  - Bracket Pair Colorizer

#### Alternative: PhpStorm
- **Download**: https://www.jetbrains.com/phpstorm/
- **Features**: Advanced PHP IDE with WordPress support

### 2. Database Management
- **phpMyAdmin**: Included with XAMPP (http://localhost/phpmyadmin)
- **MySQL Workbench**: https://dev.mysql.com/downloads/workbench/
- **HeidiSQL**: https://www.heidisql.com/

## Plugin Development Setup

### 1. Plugin Directory Structure
```
wp-content/plugins/blasti-3d-configurator/
├── assets/
│   ├── css/
│   ├── js/
│   └── models/
├── includes/
├── templates/
├── languages/
└── blasti-configurator.php
```

### 2. Development Workflow
1. **Clone/Create Plugin**: Place in `wp-content/plugins/`
2. **Activate Plugin**: In WordPress admin
3. **Enable Debug Mode**: Add to `wp-config.php`:
   ```php
   define('WP_DEBUG', true);
   define('WP_DEBUG_LOG', true);
   define('WP_DEBUG_DISPLAY', true);
   ```

## Testing Environment

### 1. PHP Unit Testing
```bash
# Install PHPUnit via Composer
composer require --dev phpunit/phpunit

# Install WordPress Test Suite
bash bin/install-wp-tests.sh wordpress_test root '' localhost latest
```

### 2. JavaScript Testing
```bash
# Install Jest for JavaScript testing
npm install --save-dev jest

# Install testing utilities
npm install --save-dev @testing-library/dom
```

## Common Issues & Solutions

### Issue: "php is not recognized"
**Solution**: Add PHP to Windows PATH
1. Open System Properties > Environment Variables
2. Add PHP installation directory to PATH
3. Restart command prompt

### Issue: MySQL connection errors
**Solution**: 
1. Ensure MySQL service is running in XAMPP
2. Check database credentials in wp-config.php
3. Verify MySQL port (default: 3306)

### Issue: Permission errors
**Solution**:
1. Run command prompt as Administrator
2. Set proper file permissions on plugin directory
3. Ensure web server has write access to wp-content

### Issue: Plugin not loading
**Solution**:
1. Check PHP error logs in `wp-content/debug.log`
2. Verify plugin header information
3. Ensure all required files are present

## Debugging Tools

### 1. WordPress Debug Bar
- Install Debug Bar plugin
- Shows queries, PHP errors, and performance data

### 2. Query Monitor
- Advanced debugging plugin
- Shows database queries, hooks, and conditionals

### 3. Browser Developer Tools
- Chrome DevTools or Firefox Developer Tools
- Essential for JavaScript and CSS debugging

## Performance Testing

### 1. Local Performance
- Use browser DevTools Network tab
- Install P3 (Plugin Performance Profiler)

### 2. 3D Model Testing
- Test with various GLTF model sizes
- Monitor memory usage in browser
- Test on different devices/browsers

## Recommended Development Workflow

1. **Setup**: Install XAMPP + WordPress + WooCommerce
2. **Development**: Use VS Code with PHP extensions
3. **Version Control**: Git for code management
4. **Testing**: Enable WP_DEBUG and use browser tools
5. **Debugging**: Check error logs and use debugging plugins
6. **Performance**: Monitor with browser tools and WordPress plugins

## Quick Start Commands

```bash
# Check PHP version
php --version

# Check Composer
composer --version

# Check Node.js
node --version

# Start XAMPP services (if using XAMPP)
# Use XAMPP Control Panel GUI

# Navigate to WordPress directory
cd C:\xampp\htdocs\wordpress

# Check WordPress installation
# Visit http://localhost/wordpress in browser
```

## Next Steps

1. Install chosen development environment
2. Set up WordPress with WooCommerce
3. Clone/copy the Blasti 3D Configurator plugin
4. Enable WordPress debug mode
5. Test plugin activation and basic functionality
6. Begin development and testing

## Support Resources

- **WordPress Codex**: https://codex.wordpress.org/
- **WooCommerce Docs**: https://docs.woocommerce.com/
- **PHP Documentation**: https://www.php.net/docs.php
- **Three.js Documentation**: https://threejs.org/docs/
- **WordPress Plugin Handbook**: https://developer.wordpress.org/plugins/

---

**Note**: This setup guide assumes you're developing the Blasti 3D Configurator plugin locally. Adjust paths and configurations based on your specific setup preferences.