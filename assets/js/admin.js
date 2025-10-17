/**
 * Blasti 3D Configurator Admin JavaScript
 * Admin interface functionality
 */

(function($) {
    'use strict';

    // Admin object
    window.BlastiConfiguratorAdmin = {
        
        // Initialize admin functionality
        init: function() {
            console.log('Initializing Blasti Configurator Admin...');
            
            this.bindEvents();
            this.initializeComponents();
        },
        
        // Bind event listeners
        bindEvents: function() {
            const self = this;
            
            // Settings form submission
            $(document).on('submit', '.blasti-settings-form', function(e) {
                e.preventDefault();
                self.saveSettings($(this));
            });
            
            // Model upload handling
            $(document).on('change', '.model-upload-input', function() {
                self.handleModelUpload(this);
            });
            
            // Product management actions
            $(document).on('click', '.edit-product-btn', function() {
                const productId = $(this).data('product-id');
                self.editProduct(productId);
            });
            
            $(document).on('click', '.delete-product-btn', function() {
                const productId = $(this).data('product-id');
                self.deleteProduct(productId);
            });
            
            // Drag and drop for model upload
            $(document).on('dragover', '.model-upload-area', function(e) {
                e.preventDefault();
                $(this).addClass('dragover');
            });
            
            $(document).on('dragleave', '.model-upload-area', function(e) {
                e.preventDefault();
                $(this).removeClass('dragover');
            });
            
            $(document).on('drop', '.model-upload-area', function(e) {
                e.preventDefault();
                $(this).removeClass('dragover');
                
                const files = e.originalEvent.dataTransfer.files;
                if (files.length > 0) {
                    self.handleModelUpload(files[0]);
                }
            });
        },
        
        // Initialize admin components
        initializeComponents: function() {
            // Initialize tooltips if available
            if (typeof $.fn.tooltip === 'function') {
                $('[data-toggle="tooltip"]').tooltip();
            }
            
            // Initialize color pickers if available
            if (typeof $.fn.wpColorPicker === 'function') {
                $('.color-picker').wpColorPicker();
            }
        },
        
        // Save plugin settings
        saveSettings: function(form) {
            const self = this;
            const formData = form.serialize();
            
            // Show loading state
            const submitButton = form.find('input[type="submit"]');
            const originalText = submitButton.val();
            submitButton.val('Saving...').prop('disabled', true);
            
            $.ajax({
                url: blastiConfiguratorAdmin.ajaxUrl,
                type: 'POST',
                data: formData + '&action=blasti_save_settings&nonce=' + blastiConfiguratorAdmin.nonce,
                success: function(response) {
                    if (response.success) {
                        self.showNotice('Settings saved successfully!', 'success');
                    } else {
                        self.showNotice('Failed to save settings: ' + response.data, 'error');
                    }
                    submitButton.val(originalText).prop('disabled', false);
                },
                error: function() {
                    self.showNotice('Error saving settings. Please try again.', 'error');
                    submitButton.val(originalText).prop('disabled', false);
                }
            });
        },
        
        // Handle 3D model file upload
        handleModelUpload: function(input) {
            const self = this;
            let file;
            
            if (input instanceof File) {
                file = input;
            } else if (input.files && input.files[0]) {
                file = input.files[0];
            } else {
                return;
            }
            
            // Validate file type
            const allowedTypes = ['model/gltf-binary', 'model/gltf+json'];
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            if (!['glb', 'gltf'].includes(fileExtension)) {
                self.showNotice('Please select a valid 3D model file (.glb or .gltf)', 'error');
                return;
            }
            
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                self.showNotice('File size must be less than 10MB', 'error');
                return;
            }
            
            // Create form data
            const formData = new FormData();
            formData.append('model_file', file);
            formData.append('action', 'blasti_upload_model');
            formData.append('nonce', blastiConfiguratorAdmin.nonce);
            
            // Show upload progress
            const uploadArea = $('.model-upload-area');
            const originalContent = uploadArea.html();
            uploadArea.html('<div class="upload-progress"><div class="spinner"></div><p>Uploading model...</p></div>');
            
            $.ajax({
                url: blastiConfiguratorAdmin.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.success) {
                        self.showNotice('Model uploaded successfully!', 'success');
                        // Refresh the page or update the UI
                        location.reload();
                    } else {
                        self.showNotice('Upload failed: ' + response.data, 'error');
                        uploadArea.html(originalContent);
                    }
                },
                error: function() {
                    self.showNotice('Upload error. Please try again.', 'error');
                    uploadArea.html(originalContent);
                }
            });
        },
        
        // Edit product
        editProduct: function(productId) {
            console.log('Editing product:', productId);
            // This will be implemented in task 9.1 (admin management interface)
            this.showNotice('Product editing will be implemented in task 9.1', 'warning');
        },
        
        // Delete product
        deleteProduct: function(productId) {
            if (!confirm('Are you sure you want to delete this product?')) {
                return;
            }
            
            console.log('Deleting product:', productId);
            // This will be implemented in task 9.1 (admin management interface)
            this.showNotice('Product deletion will be implemented in task 9.1', 'warning');
        },
        
        // Show admin notice
        showNotice: function(message, type) {
            type = type || 'info';
            
            const notice = $('<div class="blasti-notice notice-' + type + '">' + message + '</div>');
            
            // Remove existing notices
            $('.blasti-notice').remove();
            
            // Add new notice
            $('.blasti-admin-container').prepend(notice);
            
            // Auto-remove after 5 seconds
            setTimeout(function() {
                notice.fadeOut(function() {
                    notice.remove();
                });
            }, 5000);
        },
        
        // Refresh statistics
        refreshStats: function() {
            const self = this;
            
            $.ajax({
                url: blastiConfiguratorAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'blasti_get_stats',
                    nonce: blastiConfiguratorAdmin.nonce
                },
                success: function(response) {
                    if (response.success) {
                        self.updateStatsDisplay(response.data);
                    }
                },
                error: function() {
                    console.error('Failed to refresh statistics');
                }
            });
        },
        
        // Update statistics display
        updateStatsDisplay: function(stats) {
            // Update stat cards
            $('.stat-card').each(function() {
                const statType = $(this).data('stat-type');
                if (stats[statType] !== undefined) {
                    $(this).find('.stat-number').text(stats[statType]);
                }
            });
        }
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        BlastiConfiguratorAdmin.init();
    });
    
})(jQuery);