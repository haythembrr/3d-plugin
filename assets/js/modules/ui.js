/**
 * Blasti 3D Configurator - UI Module
 * Handles user interface, events, and product display
 */

(function (window, $) {
    'use strict';

    const BlastiUI = {
        // Configuration
        config: {
            currentPegboard: null,
            placedAccessories: [],
            products: {
                pegboards: [],
                accessories: []
            },
            filters: {
                category: 'all',
                search: '',
                compatibleOnly: true
            },
            initialized: false
        },

        // Initialize UI components
        initialize: function () {
            if (this.config.initialized) {
                console.warn('⚠️ UI already initialized');
                return;
            }

            this.bindEvents();
            this.initializeFilters();
            this.initializeCameraControls();
            this.loadProducts();

            this.config.initialized = true;
            console.log('✅ UI initialized successfully');
        },

        // Bind event listeners
        bindEvents: function () {
            const self = this;

            // Pegboard selection
            $(document).on('click', '.pegboard-item', function (e) {
                e.preventDefault();
                const pegboardId = $(this).data('product-id');
                self.selectPegboard(pegboardId);
            });

            // Accessory selection
            $(document).on('click', '.accessory-item', function (e) {
                e.preventDefault();
                const accessoryId = $(this).data('product-id');
                self.selectAccessory(accessoryId);
            });

            // Filter controls
            $(document).on('click', '#toggle-filters-btn', function () {
                $('#accessory-filters').slideToggle();
            });

            $(document).on('input', '#accessory-search', function () {
                self.config.filters.search = $(this).val().toLowerCase();
                self.applyFilters();
            });

            $(document).on('click', '.filter-btn[data-category]', function () {
                $('.filter-btn[data-category]').removeClass('active');
                $(this).addClass('active');
                self.config.filters.category = $(this).data('category');
                self.applyFilters();
            });

            $(document).on('click', '.filter-btn[data-filter]', function () {
                $('.filter-btn[data-filter]').removeClass('active');
                $(this).addClass('active');
                self.config.filters.compatibleOnly = $(this).data('filter') === 'compatible';
                self.applyFilters();
            });

            // Configuration actions
            $(document).on('click', '.reset-config-btn', function () {
                self.resetConfiguration();
            });

            // Accessory management
            $(document).on('click', '.remove-accessory-btn', function () {
                const placementId = $(this).data('placement-id');
                self.removeAccessory(placementId);
            });

            // Accessory repositioning
            $(document).on('click', '.reposition-accessory-btn', function () {
                const placementId = $(this).data('placement-id');
                self.repositionAccessory(placementId);
            });

            // Placement mode events
            $(document).on('placementCompleted', function () {
                self.onPlacementCompleted();
            });

            $(document).on('placementCancelled', function () {
                self.onPlacementCancelled();
            });

            // Camera view controls
            $(document).on('click', '.camera-view-btn', function () {
                const viewName = $(this).data('view');
                self.setCameraView(viewName);
            });

            console.log('✅ Event listeners bound');
        },

        // Initialize filter system
        initializeFilters: function () {
            // Reset filters to default
            this.config.filters = {
                category: 'all',
                search: '',
                compatibleOnly: true
            };

            // Update UI to match
            $('#accessory-search').val('');
            $('.filter-btn[data-category="all"]').addClass('active').siblings().removeClass('active');
            $('.filter-btn[data-filter="compatible"]').addClass('active').siblings().removeClass('active');
        },

        // Load products from server with enhanced error handling
        loadProducts: function () {
            const self = this;

            console.log('🔄 Loading products...');
            this.showLoadingState(true);

            // Check if AJAX configuration is available
            if (typeof blastiConfigurator === 'undefined' || !blastiConfigurator.ajaxUrl) {
                console.error('❌ AJAX configuration not available');
                this.showError('Configuration error. Please refresh the page.');
                this.showLoadingState(false);
                return;
            }

            $.ajax({
                url: blastiConfigurator.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'blasti_get_products',
                    nonce: blastiConfigurator.nonce,
                    product_type: 'all',
                    include_out_of_stock: false
                },
                timeout: 30000, // 30 second timeout
                success: function (response) {
                    if (response.success && response.data && response.data.products) {
                        console.log('✅ Products loaded:', {
                            total: response.data.products.length,
                            pegboards: response.data.products.filter(p => p.type === 'pegboard').length,
                            accessories: response.data.products.filter(p => p.type === 'accessory').length
                        });
                        self.displayProducts(response.data);
                    } else {
                        console.error('❌ Invalid response format:', response);
                        self.showError('Failed to load products. Invalid server response.');
                    }
                },
                error: function (xhr, status, error) {
                    console.error('❌ AJAX error loading products:', {
                        status: status,
                        error: error,
                        responseText: xhr.responseText
                    });
                    
                    let errorMessage = 'Failed to load products. ';
                    if (status === 'timeout') {
                        errorMessage += 'Request timed out. Please try again.';
                    } else if (status === 'parsererror') {
                        errorMessage += 'Server response error. Please refresh the page.';
                    } else {
                        errorMessage += 'Please check your connection and try again.';
                    }
                    
                    self.showError(errorMessage);
                },
                complete: function () {
                    self.showLoadingState(false);
                }
            });
        },

        // Display products in the interface with validation
        displayProducts: function (data) {
            // Validate data structure
            if (!data || !data.products || !Array.isArray(data.products)) {
                console.error('❌ Invalid products data structure:', data);
                this.showError('Invalid product data received. Please refresh the page.');
                return;
            }

            // Separate products by type with validation
            this.config.products.pegboards = data.products.filter(p => {
                return p && p.type === 'pegboard' && p.id && p.name;
            });
            
            this.config.products.accessories = data.products.filter(p => {
                return p && p.type === 'accessory' && p.id && p.name;
            });

            console.log('📦 Products separated and validated:', {
                pegboards: this.config.products.pegboards.length,
                accessories: this.config.products.accessories.length,
                total: data.products.length,
                invalid: data.products.length - (this.config.products.pegboards.length + this.config.products.accessories.length)
            });

            // Check if we have any products
            if (this.config.products.pegboards.length === 0 && this.config.products.accessories.length === 0) {
                this.showError('No products are currently available. Please check back later.');
                return;
            }

            // Display pegboards
            this.displayPegboards();

            // Initialize category filters only if we have accessories
            if (this.config.products.accessories.length > 0) {
                this.initializeCategoryFilters();
            }

            // Display accessories
            this.displayAccessories();

            // Show success message
            this.showSuccess(`Loaded ${this.config.products.pegboards.length} pegboards and ${this.config.products.accessories.length} accessories`);
        },

        // Display pegboards
        displayPegboards: function () {
            const container = $('#pegboard-list');
            let html = '';

            if (this.config.products.pegboards.length === 0) {
                html = '<p class="no-products">No pegboards available.</p>';
            } else {
                this.config.products.pegboards.forEach(pegboard => {
                    html += this.createPegboardElement(pegboard);
                });
            }

            container.html(html);
        },

        // Create pegboard element
        createPegboardElement: function (pegboard) {
            const isSelected = this.config.currentPegboard && this.config.currentPegboard.id === pegboard.id;

            return `
                <div class="product-item pegboard-item ${isSelected ? 'selected' : ''}" 
                     data-product-id="${pegboard.id}">
                    <div class="product-image">
                        ${pegboard.image_url ?
                    `<img src="${pegboard.image_url}" alt="${pegboard.name}" loading="lazy">` :
                    '<div class="no-image">No Image</div>'
                }
                    </div>
                    <div class="product-info">
                        <h4 class="product-name">${pegboard.name}</h4>
                        <p class="product-price">${pegboard.formatted_price}</p>
                        ${pegboard.dimensions ?
                    `<p class="product-dimensions">
                                ${Math.round(pegboard.dimensions.width * 100)}cm × 
                                ${Math.round(pegboard.dimensions.height * 100)}cm
                            </p>` : ''
                }
                        ${!pegboard.in_stock ? '<p class="out-of-stock">Out of Stock</p>' : ''}
                    </div>
                </div>
            `;
        },

        // Initialize category filters with counts (Requirement 12.4)
        initializeCategoryFilters: function () {
            const categories = new Map();

            // Count accessories per category
            this.config.products.accessories.forEach(accessory => {
                if (accessory.categories && accessory.categories.length > 0) {
                    accessory.categories.forEach(cat => {
                        categories.set(cat, (categories.get(cat) || 0) + 1);
                    });
                } else {
                    categories.set('Other', (categories.get('Other') || 0) + 1);
                }
            });

            const container = $('#category-filters');
            let html = `<button class="filter-btn active" data-category="all" type="button">
                All (${this.config.products.accessories.length})
            </button>`;

            // Sort categories by name
            const sortedCategories = Array.from(categories.entries()).sort((a, b) => a[0].localeCompare(b[0]));

            sortedCategories.forEach(([category, count]) => {
                html += `<button class="filter-btn" data-category="${category}" type="button">
                    ${category} (${count})
                </button>`;
            });

            container.html(html);
            
            console.log('📂 Category filters initialized:', {
                totalCategories: categories.size,
                totalAccessories: this.config.products.accessories.length
            });
        },

        // Display accessories with filtering and categorization
        // Requirements: 3.1, 12.2, 12.4
        displayAccessories: function () {
            let accessories = [...this.config.products.accessories];

            // Apply filters
            accessories = this.applyAccessoryFilters(accessories);

            // Sort accessories - popular first (Requirement 12.2)
            accessories = this.sortAccessoriesByPopularity(accessories);

            const container = $('#accessory-list');
            let html = '';

            if (accessories.length === 0) {
                html = this.createEmptyAccessoryState();
            } else {
                // Group by category if showing all categories (Requirement 12.4)
                if (this.config.filters.category === 'all') {
                    html = this.createCategorizedAccessoryList(accessories);
                } else {
                    // Show flat list for specific category
                    accessories.forEach(accessory => {
                        html += this.createAccessoryElement(accessory);
                    });
                }
            }

            container.html(html);
            this.updateAccessoryCount(accessories.length);
        },

        // Apply accessory filters
        applyAccessoryFilters: function (accessories) {
            let filtered = [...accessories];

            // Apply compatibility filter
            if (this.config.filters.compatibleOnly && this.config.currentPegboard) {
                filtered = filtered.filter(accessory =>
                    this.isAccessoryCompatible(accessory, this.config.currentPegboard.id)
                );
            }

            // Apply category filter
            if (this.config.filters.category !== 'all') {
                filtered = filtered.filter(accessory =>
                    accessory.categories && accessory.categories.includes(this.config.filters.category)
                );
            }

            // Apply search filter
            if (this.config.filters.search) {
                filtered = filtered.filter(accessory =>
                    accessory.name.toLowerCase().includes(this.config.filters.search) ||
                    (accessory.description && accessory.description.toLowerCase().includes(this.config.filters.search))
                );
            }

            return filtered;
        },

        // Apply current filters
        applyFilters: function () {
            this.displayAccessories();
        },

        // Create accessory element with enhanced details
        // Requirements: 3.1, 12.2, 12.4
        createAccessoryElement: function (accessory) {
            const isCompatible = this.config.currentPegboard ? 
                this.isAccessoryCompatible(accessory, this.config.currentPegboard.id) : true;
            const isFeatured = accessory.featured || false;
            
            let badges = '';
            if (isCompatible && this.config.currentPegboard) {
                badges += '<span class="product-badge compatible">Compatible</span>';
            }
            if (isFeatured) {
                badges += '<span class="product-badge featured">Popular</span>';
            }
            if (!accessory.in_stock) {
                badges += '<span class="product-badge out-of-stock">Out of Stock</span>';
            } else if (accessory.stock_quantity && accessory.stock_quantity <= 5) {
                badges += '<span class="product-badge low-stock">Low Stock</span>';
            }

            return `
                <div class="product-item accessory-item ${isCompatible ? 'compatible' : ''} ${!accessory.in_stock ? 'out-of-stock' : ''}" 
                     data-product-id="${accessory.id}"
                     data-category="${accessory.categories && accessory.categories.length > 0 ? accessory.categories[0] : 'uncategorized'}"
                     data-compatible="${isCompatible}">
                    <div class="product-image">
                        ${accessory.image_url ?
                    `<img src="${accessory.image_url}" alt="${accessory.name}" loading="lazy">` :
                    '<div class="no-image">📦</div>'
                }
                    </div>
                    <div class="product-info">
                        <h4 class="product-name">${accessory.name}</h4>
                        <p class="product-price">${accessory.formatted_price}</p>
                        ${accessory.description ? 
                    `<p class="product-description">${accessory.description}</p>` : ''
                }
                        <div class="product-specs">
                            ${accessory.categories && accessory.categories.length > 0 ?
                        `<span class="spec-item">
                                    <span class="spec-label">Category:</span> ${accessory.categories[0]}
                                </span>` : ''
                    }
                            ${accessory.dimensions ?
                        `<span class="spec-item">
                                    <span class="spec-label">Size:</span> 
                                    ${Math.round(accessory.dimensions.width * 100)}×${Math.round(accessory.dimensions.height * 100)}cm
                                </span>` : ''
                    }
                            ${accessory.sku ?
                        `<span class="spec-item">
                                    <span class="spec-label">SKU:</span> ${accessory.sku}
                                </span>` : ''
                    }
                        </div>
                        ${badges ? `<div class="product-badges">${badges}</div>` : ''}
                    </div>
                </div>
            `;
        },

        // Check accessory compatibility
        isAccessoryCompatible: function (accessory, pegboardId) {
            if (!accessory.compatibility || accessory.compatibility.length === 0) {
                return true; // Assume compatible if no restrictions
            }
            return accessory.compatibility.includes(pegboardId);
        },

        // Sort accessories by popularity (Requirement 12.2)
        sortAccessoriesByPopularity: function (accessories) {
            return accessories.sort((a, b) => {
                // Featured/popular items first
                if (a.featured !== b.featured) {
                    return b.featured ? 1 : -1;
                }
                
                // Compatible items first when pegboard is selected
                if (this.config.currentPegboard) {
                    const aCompatible = this.isAccessoryCompatible(a, this.config.currentPegboard.id);
                    const bCompatible = this.isAccessoryCompatible(b, this.config.currentPegboard.id);
                    if (aCompatible !== bCompatible) {
                        return bCompatible ? 1 : -1;
                    }
                }
                
                // In stock items first
                if (a.in_stock !== b.in_stock) {
                    return b.in_stock ? 1 : -1;
                }
                
                // Sort by name as final tiebreaker
                return a.name.localeCompare(b.name);
            });
        },

        // Create categorized accessory list (Requirement 12.4)
        createCategorizedAccessoryList: function (accessories) {
            // Group accessories by category
            const categories = {};
            const uncategorized = [];
            
            accessories.forEach(accessory => {
                if (accessory.categories && accessory.categories.length > 0) {
                    const category = accessory.categories[0];
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(accessory);
                } else {
                    uncategorized.push(accessory);
                }
            });
            
            let html = '';
            
            // Sort categories alphabetically
            const sortedCategories = Object.keys(categories).sort();
            
            // Display each category
            sortedCategories.forEach(categoryName => {
                if (categories[categoryName].length > 0) {
                    html += `
                        <div class="accessory-category-header">
                            <h4>${categoryName}</h4>
                        </div>
                    `;
                    
                    categories[categoryName].forEach(accessory => {
                        html += this.createAccessoryElement(accessory);
                    });
                }
            });
            
            // Add uncategorized items at the end
            if (uncategorized.length > 0) {
                html += `
                    <div class="accessory-category-header">
                        <h4>Other Accessories</h4>
                    </div>
                `;
                
                uncategorized.forEach(accessory => {
                    html += this.createAccessoryElement(accessory);
                });
            }
            
            return html;
        },

        // Create empty state for accessories
        createEmptyAccessoryState: function () {
            let message = 'No accessories available.';
            let hint = '';
            
            if (this.config.filters.search) {
                message = 'No accessories match your search.';
                hint = 'Try different keywords or clear the search.';
            } else if (this.config.filters.category !== 'all') {
                message = `No accessories found in "${this.config.filters.category}" category.`;
                hint = 'Try selecting "All" categories or choose a different category.';
            } else if (this.config.filters.compatibleOnly && this.config.currentPegboard) {
                message = 'No compatible accessories found for this pegboard.';
                hint = 'Try showing all accessories or select a different pegboard.';
            } else if (!this.config.currentPegboard) {
                message = 'Select a pegboard to see compatible accessories.';
                hint = 'Choose a pegboard from the list above to get started.';
            }
            
            return `
                <div class="accessory-empty-state">
                    <div class="empty-icon">📦</div>
                    <div class="empty-message">${message}</div>
                    ${hint ? `<div class="empty-hint">${hint}</div>` : ''}
                </div>
            `;
        },

        // Update accessory count display
        updateAccessoryCount: function (count) {
            const countDisplay = $('.accessory-count');
            if (countDisplay.length) {
                countDisplay.text(`${count} accessories available`);
            }
        },

        // Select pegboard
        selectPegboard: function (pegboardId) {
            const pegboard = this.config.products.pegboards.find(p => p.id === pegboardId);
            if (!pegboard) {
                console.error('Pegboard not found:', pegboardId);
                return;
            }

            console.log('🎯 Selecting pegboard:', pegboard.name);

            // Cancel any active placement mode
            if ($('.blasti-configurator-container').hasClass('placement-mode')) {
                this.cancelAccessoryPlacement();
            }

            // Update UI
            $('.pegboard-item').removeClass('selected');
            $(`.pegboard-item[data-product-id="${pegboardId}"]`).addClass('selected');

            // Store current pegboard
            this.config.currentPegboard = pegboard;

            // Update current pegboard display
            this.updateCurrentPegboardDisplay();

            // Refresh accessory display to show compatibility
            this.refreshAccessoryCompatibility();

            // Refresh accessory filters
            this.applyFilters();

            // Notify other modules
            $(document).trigger('pegboardSelected', [pegboard]);
        },

        // Refresh accessory compatibility indicators when pegboard changes
        refreshAccessoryCompatibility: function () {
            if (!this.config.currentPegboard) {
                return;
            }

            // Update compatibility indicators for all displayed accessories
            $('.accessory-item').each((index, element) => {
                const $element = $(element);
                const accessoryId = parseInt($element.data('product-id'));
                const accessory = this.config.products.accessories.find(a => a.id === accessoryId);
                
                if (accessory) {
                    const isCompatible = this.isAccessoryCompatible(accessory, this.config.currentPegboard.id);
                    
                    // Update compatibility class
                    $element.toggleClass('compatible', isCompatible);
                    $element.attr('data-compatible', isCompatible);
                    
                    // Update or add compatibility badge
                    const existingBadge = $element.find('.product-badge.compatible');
                    if (isCompatible && existingBadge.length === 0) {
                        const badgesContainer = $element.find('.product-badges');
                        if (badgesContainer.length === 0) {
                            $element.find('.product-info').append('<div class="product-badges"></div>');
                        }
                        $element.find('.product-badges').prepend('<span class="product-badge compatible">Compatible</span>');
                    } else if (!isCompatible && existingBadge.length > 0) {
                        existingBadge.remove();
                    }
                }
            });

            console.log('🔄 Accessory compatibility refreshed for pegboard:', this.config.currentPegboard.name);
        },

        // Select accessory for placement (Requirement 3.1)
        selectAccessory: function (accessoryId) {
            if (!this.config.currentPegboard) {
                this.showError('Please select a pegboard first.');
                return;
            }

            const accessory = this.config.products.accessories.find(a => a.id === accessoryId);
            if (!accessory) {
                console.error('Accessory not found:', accessoryId);
                return;
            }

            // Check if accessory is in stock
            if (!accessory.in_stock) {
                this.showError('This accessory is currently out of stock.');
                return;
            }

            // Check compatibility
            if (!this.isAccessoryCompatible(accessory, this.config.currentPegboard.id)) {
                this.showError('This accessory is not compatible with the selected pegboard.');
                return;
            }

            console.log('🎯 Selecting accessory for placement:', accessory.name);

            // Highlight selected accessory (Requirement 3.1)
            this.highlightSelectedAccessory(accessoryId);

            // Add placement mode indicator to container
            $('.blasti-configurator-container').addClass('placement-mode');

            // Notify placement module
            $(document).trigger('accessorySelected', [accessory]);
        },

        // Highlight selected accessory for placement (Requirement 3.1)
        highlightSelectedAccessory: function (accessoryId) {
            // Remove previous highlights
            $('.accessory-item').removeClass('selected-for-placement');
            
            // Highlight the selected accessory
            $(`.accessory-item[data-product-id="${accessoryId}"]`).addClass('selected-for-placement');
            
            // Scroll to selected accessory if needed
            const selectedElement = $(`.accessory-item[data-product-id="${accessoryId}"]`);
            if (selectedElement.length) {
                const container = $('#accessory-list');
                const containerTop = container.scrollTop();
                const containerHeight = container.height();
                const elementTop = selectedElement.position().top;
                const elementHeight = selectedElement.outerHeight();
                
                // Check if element is visible
                if (elementTop < 0 || elementTop + elementHeight > containerHeight) {
                    container.animate({
                        scrollTop: containerTop + elementTop - (containerHeight / 2) + (elementHeight / 2)
                    }, 300);
                }
            }
        },

        // Show placement instructions (removed - no longer needed)
        showPlacementInstructions: function (accessory) {
            // Instructions panel removed as requested
            // Placement mode is now indicated by cursor and visual feedback only
        },

        // Cancel accessory placement
        cancelAccessoryPlacement: function () {
            // Remove highlights and modes
            $('.accessory-item').removeClass('selected-for-placement');
            $('.blasti-configurator-container').removeClass('placement-mode');
            
            // Notify other modules
            $(document).trigger('placementCancelled');
            
            console.log('🚫 Accessory placement cancelled');
        },

        // Handle placement completion
        onPlacementCompleted: function () {
            // Clean up placement UI
            $('.accessory-item').removeClass('selected-for-placement');
            $('.blasti-configurator-container').removeClass('placement-mode');
            
            console.log('✅ Accessory placement completed');
        },

        // Handle placement cancellation
        onPlacementCancelled: function () {
            // Clean up placement UI
            $('.accessory-item').removeClass('selected-for-placement');
            $('.blasti-configurator-container').removeClass('placement-mode');
            
            console.log('🚫 Accessory placement cancelled');
        },

        // Update current pegboard display
        updateCurrentPegboardDisplay: function () {
            const container = $('#current-pegboard');

            if (!this.config.currentPegboard) {
                container.html('<p>No pegboard selected</p>');
                return;
            }

            const pegboard = this.config.currentPegboard;
            const html = `
                <div class="current-pegboard-info">
                    <h4>${pegboard.name}</h4>
                    <p class="price">${pegboard.formatted_price}</p>
                    ${pegboard.dimensions ?
                    `<p class="dimensions">
                            ${Math.round(pegboard.dimensions.width * 100)}cm × 
                            ${Math.round(pegboard.dimensions.height * 100)}cm
                        </p>` : ''
                }
                </div>
            `;

            container.html(html);
        },

        // Update placed accessories display (Enhanced for Requirements 3.4, 3.5)
        updatePlacedAccessoriesDisplay: function () {
            const container = $('#placed-accessories');

            if (this.config.placedAccessories.length === 0) {
                container.html('<p class="no-accessories">No accessories placed</p>');
                return;
            }

            let html = '<div class="placed-accessories-list">';
            html += '<div class="placed-accessories-header">';
            html += `<h4>Placed Accessories (${this.config.placedAccessories.length})</h4>`;
            html += '</div>';
            
            this.config.placedAccessories.forEach((accessory, index) => {
                const product = this.findProductById(accessory.id);
                const formattedPrice = product ? product.formatted_price : '$0.00';
                const placedAt = accessory.placedAt ? new Date(accessory.placedAt).toLocaleTimeString() : '';
                
                html += `
                    <div class="placed-accessory-item" data-placement-id="${accessory.placementId}">
                        <div class="accessory-info">
                            <div class="accessory-main">
                                <span class="accessory-name">${accessory.name}</span>
                                <span class="accessory-price">${formattedPrice}</span>
                            </div>
                            ${placedAt ? `<div class="accessory-meta">Placed at ${placedAt}</div>` : ''}
                        </div>
                        <div class="accessory-actions">
                            <button class="reposition-accessory-btn" 
                                    data-placement-id="${accessory.placementId}" 
                                    type="button"
                                    title="Move this accessory">
                                📍 Move
                            </button>
                            <button class="remove-accessory-btn" 
                                    data-placement-id="${accessory.placementId}" 
                                    type="button"
                                    title="Remove this accessory">
                                🗑️ Remove
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            container.html(html);
        },

        // Find product by ID
        findProductById: function (productId) {
            // Search in both pegboards and accessories
            const allProducts = [...this.config.products.pegboards, ...this.config.products.accessories];
            return allProducts.find(product => product.id === parseInt(productId));
        },

        // Add accessory to placed list (Enhanced for Requirements 3.4, 3.5)
        addPlacedAccessory: function (accessoryData) {
            // Ensure we have the product information for pricing
            const product = this.findProductById(accessoryData.id);
            if (product) {
                accessoryData.formatted_price = product.formatted_price;
                accessoryData.price = product.price;
            }

            this.config.placedAccessories.push(accessoryData);
            this.updatePlacedAccessoriesDisplay();

            // Trigger price update
            $(document).trigger('configurationChanged');

            console.log('✅ Accessory added to UI list:', accessoryData.name);
        },

        // Sync placed accessories with main configurator
        syncPlacedAccessories: function (accessories) {
            this.config.placedAccessories = accessories || [];
            this.updatePlacedAccessoriesDisplay();
        },

        // Remove accessory from placed list
        removeAccessory: function (placementId) {
            const accessory = this.config.placedAccessories.find(a => a.placementId === placementId);
            if (!accessory) {
                console.warn('Accessory not found for removal:', placementId);
                return;
            }

            // Confirm removal
            if (confirm(`Are you sure you want to remove "${accessory.name}"?`)) {
                const index = this.config.placedAccessories.findIndex(a => a.placementId === placementId);
                if (index !== -1) {
                    this.config.placedAccessories.splice(index, 1);
                    this.updatePlacedAccessoriesDisplay();

                    // Notify placement module
                    $(document).trigger('accessoryRemoved', [placementId]);

                    // Trigger price update
                    $(document).trigger('configurationChanged');

                    this.showSuccess(`${accessory.name} removed successfully`);
                }
            }
        },

        // Reposition accessory (Requirement 3.5)
        repositionAccessory: function (placementId) {
            const accessory = this.config.placedAccessories.find(a => a.placementId === placementId);
            if (!accessory) {
                console.warn('Accessory not found for repositioning:', placementId);
                this.showError('Accessory not found');
                return;
            }

            console.log('🔄 Starting repositioning for:', accessory.name);

            // Highlight the accessory being repositioned
            this.highlightAccessoryForRepositioning(placementId);

            // Notify configurator to enable repositioning mode
            if (window.BlastiConfigurator && window.BlastiConfigurator.enableAccessoryRepositioning) {
                window.BlastiConfigurator.enableAccessoryRepositioning(placementId);
            } else {
                console.error('BlastiConfigurator not available for repositioning');
                this.showError('Repositioning functionality not available');
            }
        },

        // Highlight accessory for repositioning
        highlightAccessoryForRepositioning: function (placementId) {
            // Remove previous highlights
            $('.placed-accessory-item').removeClass('repositioning');
            
            // Highlight the selected accessory
            $(`.placed-accessory-item[data-placement-id="${placementId}"]`).addClass('repositioning');
            
            // Scroll to highlighted accessory if needed
            const selectedElement = $(`.placed-accessory-item[data-placement-id="${placementId}"]`);
            if (selectedElement.length) {
                const container = $('#placed-accessories');
                const containerTop = container.scrollTop();
                const containerHeight = container.height();
                const elementTop = selectedElement.position().top;
                const elementHeight = selectedElement.outerHeight();
                
                // Check if element is visible
                if (elementTop < 0 || elementTop + elementHeight > containerHeight) {
                    container.animate({
                        scrollTop: containerTop + elementTop - containerHeight / 2 + elementHeight / 2
                    }, 300);
                }
            }
        },

        // Reset entire configuration
        resetConfiguration: function () {
            if (confirm('Are you sure you want to reset your configuration?')) {
                // Clear selections
                this.config.currentPegboard = null;
                this.config.placedAccessories = [];

                // Update UI
                $('.pegboard-item').removeClass('selected');
                this.updateCurrentPegboardDisplay();
                this.updatePlacedAccessoriesDisplay();

                // Notify other modules
                $(document).trigger('configurationReset');

                console.log('🔄 Configuration reset');
            }
        },

        // Show loading state
        showLoadingState: function (isLoading) {
            if (isLoading) {
                $('.product-list').addClass('loading');
            } else {
                $('.product-list').removeClass('loading');
            }
        },

        // Show error message
        showError: function (message) {
            const container = $('.configurator-messages');
            const errorHtml = `
                <div class="error-message">
                    <span class="error-icon">⚠️</span>
                    <span class="error-text">${message}</span>
                    <button class="close-error" type="button">×</button>
                </div>
            `;

            container.html(errorHtml);

            // Auto-hide after 5 seconds
            setTimeout(() => {
                container.find('.error-message').fadeOut();
            }, 5000);

            // Manual close
            container.on('click', '.close-error', function () {
                $(this).parent().fadeOut();
            });
        },

        // Show success message
        showSuccess: function (message) {
            const container = $('.configurator-messages');
            const successHtml = `
                <div class="success-message">
                    <span class="success-icon">✅</span>
                    <span class="success-text">${message}</span>
                    <button class="close-success" type="button">×</button>
                </div>
            `;

            container.html(successHtml);

            // Auto-hide after 3 seconds
            setTimeout(() => {
                container.find('.success-message').fadeOut();
            }, 3000);

            // Manual close
            container.on('click', '.close-success', function () {
                $(this).parent().fadeOut();
            });
        },

        // Get current configuration
        getCurrentConfiguration: function () {
            return {
                pegboard: this.config.currentPegboard,
                accessories: this.config.placedAccessories
            };
        },

        // Initialize camera controls UI
        initializeCameraControls: function() {
            const cameraControlsHtml = `
                <div class="camera-controls-overlay" id="camera-controls-overlay">
                    <div class="camera-controls-header">
                        <span class="camera-controls-title">📷 Views</span>
                        <button class="camera-controls-toggle" id="camera-controls-toggle">−</button>
                    </div>
                    <div class="camera-view-buttons" id="camera-view-buttons">
                        <button class="camera-view-btn" data-view="front" title="Front View">⬜</button>
                        <button class="camera-view-btn" data-view="back" title="Back View">⬛</button>
                        <button class="camera-view-btn" data-view="right" title="Right Side">▶️</button>
                        <button class="camera-view-btn" data-view="left" title="Left Side">◀️</button>
                        <button class="camera-view-btn" data-view="top" title="Top View">🔝</button>
                        <button class="camera-view-btn active" data-view="isometric" title="Isometric View">📐</button>
                    </div>
                </div>
            `;

            // Add camera controls as overlay to the scene
            const sceneContainer = $('#configurator-scene');
            if (sceneContainer.length) {
                sceneContainer.append(cameraControlsHtml);
                
                // Ensure overlay is visible
                setTimeout(() => {
                    const overlay = $('#camera-controls-overlay');
                    if (overlay.length) {
                        overlay.css({
                            'display': 'block',
                            'visibility': 'visible',
                            'opacity': '1'
                        });
                        console.log('📷 Camera controls made visible');
                    }
                }, 100);
                
                // Bind toggle functionality
                $('#camera-controls-toggle').on('click', function() {
                    const buttons = $('#camera-view-buttons');
                    const toggle = $(this);
                    
                    if (buttons.is(':visible')) {
                        buttons.slideUp(200);
                        toggle.text('+');
                    } else {
                        buttons.slideDown(200);
                        toggle.text('−');
                    }
                });
                
                // Make camera controls draggable
                this.makeCameraControlsDraggable();
                
                console.log('📷 Camera controls overlay added');
            } else {
                console.warn('⚠️ Scene container not found for camera controls');
            }
        },

        // Set camera view
        setCameraView: function(viewName) {
            if (window.BlastiCore && window.BlastiCore.setCameraView) {
                window.BlastiCore.setCameraView(viewName);
                
                // Update active button
                $('.camera-view-btn').removeClass('active');
                $(`.camera-view-btn[data-view="${viewName}"]`).addClass('active');
                
                console.log('📷 Camera view changed to:', viewName);
            } else {
                console.warn('⚠️ BlastiCore not available for camera control');
            }
        },

        // Make camera controls draggable
        makeCameraControlsDraggable: function() {
            const overlay = $('#camera-controls-overlay');
            const header = $('.camera-controls-header');
            
            let isDragging = false;
            let startX, startY, startLeft, startTop;
            
            header.on('mousedown', function(e) {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                
                const rect = overlay[0].getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                
                overlay.css('transition', 'none');
                e.preventDefault();
            });
            
            $(document).on('mousemove', function(e) {
                if (!isDragging) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                const newLeft = startLeft + deltaX;
                const newTop = startTop + deltaY;
                
                // Keep within viewport bounds
                const maxLeft = window.innerWidth - overlay.outerWidth();
                const maxTop = window.innerHeight - overlay.outerHeight();
                
                const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
                const clampedTop = Math.max(0, Math.min(newTop, maxTop));
                
                overlay.css({
                    position: 'fixed',
                    left: clampedLeft + 'px',
                    top: clampedTop + 'px',
                    right: 'auto'
                });
            });
            
            $(document).on('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    overlay.css('transition', 'all 0.2s ease');
                }
            });
        },

        // Dispose UI resources
        dispose: function () {
            console.log('🧹 Disposing UI...');

            // Unbind events
            $(document).off('.blasti-ui');

            // Clear data
            this.config.currentPegboard = null;
            this.config.placedAccessories = [];
            this.config.products = { pegboards: [], accessories: [] };
            this.config.initialized = false;

            console.log('✅ UI disposed');
        }
    };

    // Expose to global scope
    window.BlastiUI = BlastiUI;

})(window, window.jQuery || window.$);