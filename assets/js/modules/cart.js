/**
 * Blasti 3D Configurator - Cart Module
 * Handles WooCommerce cart integration and price calculations
 */

(function(window, $) {
    'use strict';

    const BlastiCart = {
        // Configuration
        config: {
            priceBreakdown: {
                pegboard: null,
                accessories: [],
                subtotal: 0,
                total: 0,
                currency_symbol: '$',
                formatted_total: '$0.00'
            },
            productPrices: {},
            isCalculating: false,
            initialized: false
        },

        // Initialize cart functionality
        initialize: function() {
            if (this.config.initialized) {
                console.warn('⚠️ Cart already initialized');
                return;
            }

            this.bindEvents();
            this.initializePriceDisplay();
            
            this.config.initialized = true;
            console.log('✅ Cart initialized successfully');
        },

        // Bind cart-related events
        bindEvents: function() {
            const self = this;

            // Add to cart button
            $(document).on('click', '.add-to-cart-btn', function(e) {
                e.preventDefault();
                if (!$(this).prop('disabled')) {
                    self.addToCart();
                }
            });

            // Configuration change events
            $(document).on('pegboardSelected accessoryPlaced accessoryRemoved configurationChanged', function() {
                self.updatePrice();
                self.updateAddToCartButton();
            });

            // Configuration reset
            $(document).on('configurationReset', function() {
                self.resetPrice();
                self.updateAddToCartButton();
            });

            console.log('✅ Cart events bound');
        },

        // Initialize price display
        initializePriceDisplay: function() {
            this.resetPrice();
            this.updatePriceDisplay();
            this.updateAddToCartButton();
        },

        // Update total price calculation
        updatePrice: function() {
            if (this.config.isCalculating) {
                console.log('⏳ Price calculation already in progress');
                return;
            }

            const configuration = this.getCurrentConfiguration();
            if (!configuration.pegboard) {
                this.resetPrice();
                return;
            }

            this.config.isCalculating = true;
            console.log('💰 Calculating price for configuration...');

            const pegboardId = configuration.pegboard.id;
            const accessoryIds = configuration.accessories.map(a => a.id);

            $.ajax({
                url: blastiConfigurator.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'blasti_calculate_price',
                    nonce: blastiConfigurator.nonce,
                    pegboard_id: pegboardId,
                    accessory_ids: accessoryIds
                },
                success: (response) => {
                    if (response.success) {
                        console.log('✅ Price calculated:', response.data);
                        this.config.priceBreakdown = response.data;
                        this.updatePriceDisplay();
                    } else {
                        console.error('❌ Price calculation failed:', response.data);
                        this.showPriceError();
                    }
                },
                error: (xhr, status, error) => {
                    console.error('❌ AJAX error calculating price:', error);
                    this.showPriceError();
                },
                complete: () => {
                    this.config.isCalculating = false;
                }
            });
        },

        // Reset price to zero
        resetPrice: function() {
            this.config.priceBreakdown = {
                pegboard: null,
                accessories: [],
                subtotal: 0,
                total: 0,
                currency_symbol: '$',
                formatted_total: '$0.00'
            };
            this.updatePriceDisplay();
        },

        // Update price display in UI
        updatePriceDisplay: function() {
            const breakdown = this.config.priceBreakdown;
            
            // Update main price
            $('.price-amount').text(breakdown.formatted_total);

            // Update price breakdown
            let breakdownHtml = '';
            
            if (breakdown.pegboard) {
                breakdownHtml += `
                    <div class="price-item">
                        <span class="item-name">${breakdown.pegboard.name}</span>
                        <span class="item-price">${breakdown.pegboard.formatted_price}</span>
                    </div>
                `;
            }

            if (breakdown.accessories && breakdown.accessories.length > 0) {
                breakdown.accessories.forEach(accessory => {
                    breakdownHtml += `
                        <div class="price-item">
                            <span class="item-name">${accessory.name}</span>
                            <span class="item-price">${accessory.formatted_price}</span>
                        </div>
                    `;
                });
            }

            if (breakdownHtml) {
                breakdownHtml += `
                    <div class="price-total">
                        <span class="total-label">Total:</span>
                        <span class="total-amount">${breakdown.formatted_total}</span>
                    </div>
                `;
            }

            $('.price-breakdown').html(breakdownHtml);
        },

        // Show price calculation error
        showPriceError: function() {
            $('.price-amount').text('Error');
            $('.price-breakdown').html('<div class="price-error">Unable to calculate price</div>');
        },

        // Update add to cart button state
        updateAddToCartButton: function() {
            const button = $('.add-to-cart-btn');
            const configuration = this.getCurrentConfiguration();

            if (!configuration.pegboard) {
                button.prop('disabled', true).text('Select Pegboard');
                return;
            }

            if (configuration.accessories.length === 0) {
                button.prop('disabled', false).text('Add Pegboard to Cart');
                return;
            }

            const itemCount = 1 + configuration.accessories.length;
            button.prop('disabled', false).text(`Add ${itemCount} Items to Cart`);
        },

        // Add configuration to WooCommerce cart
        addToCart: function() {
            const configuration = this.getCurrentConfiguration();
            
            if (!configuration.pegboard) {
                this.showError('Please select a pegboard first.');
                return;
            }

            console.log('🛒 Adding configuration to cart...');
            
            // Disable button during request
            const button = $('.add-to-cart-btn');
            const originalText = button.text();
            button.prop('disabled', true).text('Adding to Cart...');

            // Prepare configuration data
            const cartData = {
                action: 'blasti_add_to_cart',
                nonce: blastiConfigurator.nonce,
                pegboard_id: configuration.pegboard.id,
                accessories: configuration.accessories.map(accessory => ({
                    id: accessory.id,
                    position: accessory.position || null
                }))
            };

            $.ajax({
                url: blastiConfigurator.ajaxUrl,
                type: 'POST',
                data: cartData,
                success: (response) => {
                    if (response.success) {
                        console.log('✅ Added to cart successfully:', response.data);
                        this.handleCartSuccess(response.data);
                    } else {
                        console.error('❌ Failed to add to cart:', response.data);
                        this.handleCartError(response.data.message || 'Failed to add items to cart');
                    }
                },
                error: (xhr, status, error) => {
                    console.error('❌ AJAX error adding to cart:', error);
                    this.handleCartError('Network error. Please try again.');
                },
                complete: () => {
                    // Re-enable button
                    button.prop('disabled', false).text(originalText);
                }
            });
        },

        // Handle successful cart addition
        handleCartSuccess: function(data) {
            // Show success message
            this.showSuccess(data.message || 'Items added to cart successfully!');

            // Update cart display if available
            this.updateCartDisplay(data);

            // Optional: Redirect to cart after delay
            if (data.cart_url && data.redirect_delay) {
                setTimeout(() => {
                    if (confirm('Items added to cart! Would you like to view your cart?')) {
                        window.location.href = data.cart_url;
                    }
                }, data.redirect_delay);
            }

            // Trigger cart update event
            $(document).trigger('cartUpdated', [data]);
        },

        // Handle cart addition error
        handleCartError: function(message) {
            this.showError(message);
        },

        // Update cart display in header/widget
        updateCartDisplay: function(cartData) {
            if (!cartData) return;

            // Update cart count in header
            $('.cart-count, .woocommerce-cart-count').text(cartData.cart_count || 0);

            // Update cart total in header
            $('.cart-total').text(cartData.cart_total || '$0.00');

            // Trigger WooCommerce cart update events
            $(document.body).trigger('wc_fragment_refresh');
            $(document.body).trigger('added_to_cart', [cartData]);
        },

        // Validate configuration before adding to cart
        validateConfiguration: function() {
            const configuration = this.getCurrentConfiguration();

            return new Promise((resolve, reject) => {
                if (!configuration.pegboard) {
                    reject('Please select a pegboard first.');
                    return;
                }

                // Validate with server
                $.ajax({
                    url: blastiConfigurator.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'blasti_validate_cart_config',
                        nonce: blastiConfigurator.nonce,
                        pegboard_id: configuration.pegboard.id,
                        accessories: configuration.accessories.map(a => ({
                            id: a.id,
                            position: a.position || null
                        }))
                    },
                    success: (response) => {
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(response.data.message || 'Configuration validation failed');
                        }
                    },
                    error: (xhr, status, error) => {
                        reject('Validation error: ' + error);
                    }
                });
            });
        },

        // Get current configuration from UI
        getCurrentConfiguration: function() {
            if (window.BlastiUI && window.BlastiUI.getCurrentConfiguration) {
                return window.BlastiUI.getCurrentConfiguration();
            }

            // Fallback - try to get from global configurator
            if (window.BlastiConfigurator && window.BlastiConfigurator.getCurrentConfiguration) {
                return window.BlastiConfigurator.getCurrentConfiguration();
            }

            return { pegboard: null, accessories: [] };
        },

        // Get cart status from WooCommerce
        getCartStatus: function() {
            return new Promise((resolve, reject) => {
                $.ajax({
                    url: blastiConfigurator.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'blasti_get_cart_status',
                        nonce: blastiConfigurator.nonce
                    },
                    success: (response) => {
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(response.data.message || 'Failed to get cart status');
                        }
                    },
                    error: (xhr, status, error) => {
                        reject('Cart status error: ' + error);
                    }
                });
            });
        },

        // Preload product prices for faster calculations
        preloadPrices: function(productIds) {
            if (!productIds || productIds.length === 0) return;

            $.ajax({
                url: blastiConfigurator.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'blasti_get_product_prices',
                    nonce: blastiConfigurator.nonce,
                    product_ids: productIds
                },
                success: (response) => {
                    if (response.success) {
                        console.log('💰 Product prices preloaded:', response.data.prices);
                        this.config.productPrices = { ...this.config.productPrices, ...response.data.prices };
                    }
                },
                error: (xhr, status, error) => {
                    console.warn('⚠️ Failed to preload prices:', error);
                }
            });
        },

        // Show error message
        showError: function(message) {
            if (window.BlastiUI && window.BlastiUI.showError) {
                window.BlastiUI.showError(message);
            } else {
                alert('Error: ' + message);
            }
        },

        // Show success message
        showSuccess: function(message) {
            if (window.BlastiUI && window.BlastiUI.showSuccess) {
                window.BlastiUI.showSuccess(message);
            } else {
                alert('Success: ' + message);
            }
        },

        // Get price breakdown for display
        getPriceBreakdown: function() {
            return this.config.priceBreakdown;
        },

        // Clear cached prices
        clearPriceCache: function() {
            this.config.productPrices = {};
            console.log('🧹 Price cache cleared');
        },

        // Dispose cart resources
        dispose: function() {
            console.log('🧹 Disposing cart...');
            
            // Unbind events
            $(document).off('.blasti-cart');
            
            // Clear data
            this.resetPrice();
            this.clearPriceCache();
            this.config.initialized = false;
            
            console.log('✅ Cart disposed');
        }
    };

    // Expose to global scope
    window.BlastiCart = BlastiCart;

})(window, window.jQuery || window.$);