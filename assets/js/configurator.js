/**
 * Blasti 3D Configurator JavaScript - Main Orchestrator
 * Coordinates all configurator modules and provides unified API
 */

(function ($) {
    'use strict';

    // Main configurator orchestrator
    window.BlastiConfigurator = {
        // Configuration
        config: {
            initialized: false,
            modules: {
                core: null,
                models: null,
                ui: null,
                cart: null,
                memoryManager: null
            },
            currentPegboard: null,
            currentPegboardModel: null,
            placedAccessories: [],
            gridSystem: null,
            placementMode: null
        },

        // Initialize the configurator
        init: function () {
            console.log('🚀 Initializing Blasti 3D Configurator...');

            // Check if we're on the configurator page
            const jQuery = window.jQuery || window.$;
            if (!jQuery || !jQuery('.blasti-configurator-container').length) {
                console.log('ℹ️ Not on configurator page or jQuery not available, skipping initialization');
                return;
            }

            // Prevent double initialization
            if (this.config.initialized) {
                console.warn('⚠️ Configurator already initialized, skipping duplicate init');
                return;
            }

            // Check module dependencies
            if (!this.checkDependencies()) {
                console.error('❌ Missing required dependencies');
                return;
            }

            try {
                // Initialize modules in order
                this.initializeModules();

                // Bind inter-module events
                this.bindModuleEvents();

                // Mark as initialized
                this.config.initialized = true;

                console.log('✅ Configurator initialized successfully');

                // Trigger initialization complete event
                const jQuery = window.jQuery || window.$;
                if (jQuery) {
                    jQuery(document).trigger('configuratorInitialized');
                }

            } catch (error) {
                console.error('❌ Failed to initialize configurator:', error);
                this.showError('Failed to initialize configurator: ' + error.message);
            }
        },

        // Check for required dependencies
        checkDependencies: function () {
            const required = ['BlastiCore', 'BlastiModels', 'BlastiUI', 'BlastiCart', 'BlastiMemoryManager'];
            const missing = [];

            required.forEach(dep => {
                if (typeof window[dep] === 'undefined') {
                    missing.push(dep);
                }
            });

            if (missing.length > 0) {
                console.error('❌ Missing required modules:', missing);
                return false;
            }

            // Check Three.js
            if (typeof THREE === 'undefined') {
                console.error('❌ Three.js not loaded');
                return false;
            }

            return true;
        },

        // Initialize all modules
        initializeModules: function () {
            console.log('🔧 Initializing modules...');

            // Initialize memory manager first
            this.config.modules.memoryManager = BlastiMemoryManager;

            // Initialize 3D core
            if (!BlastiCore.initializeScene('configurator-scene')) {
                throw new Error('Failed to initialize 3D scene');
            }
            this.config.modules.core = BlastiCore;

            // Initialize model manager
            if (!BlastiModels.initialize()) {
                throw new Error('Failed to initialize model manager');
            }
            this.config.modules.models = BlastiModels;

            // Initialize UI
            BlastiUI.initialize();
            this.config.modules.ui = BlastiUI;

            // Initialize cart
            BlastiCart.initialize();
            this.config.modules.cart = BlastiCart;

            console.log('✅ All modules initialized');
        },

        // Bind events between modules
        bindModuleEvents: function () {
            const self = this;

            // Use jQuery from global scope
            const jQuery = window.jQuery || window.$;
            if (!jQuery) {
                console.error('❌ jQuery not available for event binding');
                return;
            }

            // Pegboard selection
            jQuery(document).on('pegboardSelected', function (event, pegboard) {
                self.selectPegboard(pegboard);
            });

            // Accessory selection for placement
            jQuery(document).on('accessorySelected', function (event, accessory) {
                self.enableAccessoryPlacement(accessory);
            });

            // Accessory placement
            jQuery(document).on('accessoryPlaced', function (event, accessoryData) {
                self.config.placedAccessories.push(accessoryData);
                
                // Sync with UI module
                if (self.config.modules.ui) {
                    if (self.config.modules.ui.addPlacedAccessory) {
                        self.config.modules.ui.addPlacedAccessory(accessoryData);
                    }
                    // Also sync the full list to ensure consistency
                    if (self.config.modules.ui.syncPlacedAccessories) {
                        self.config.modules.ui.syncPlacedAccessories(self.config.placedAccessories);
                    }
                }
                
                // Notify UI that placement is completed
                jQuery(document).trigger('placementCompleted');
            });

            // Accessory removal
            jQuery(document).on('accessoryRemoved', function (event, placementId) {
                self.removeAccessory(placementId);
            });

            // Accessory repositioning
            jQuery(document).on('accessoryRepositioning', function (event, placementId) {
                self.enableAccessoryRepositioning(placementId);
            });

            // Configuration reset
            jQuery(document).on('configurationReset', function () {
                self.resetConfiguration();
            });

            console.log('✅ Module events bound');
        },

        // Select pegboard and load 3D model
        selectPegboard: function (pegboard) {
            console.log('🎯 Selecting pegboard:', pegboard.name);

            this.config.currentPegboard = pegboard;

            // Clear existing pegboard model
            if (this.config.currentPegboardModel) {
                this.config.modules.core.removeFromScene(this.config.currentPegboardModel);
                this.config.currentPegboardModel = null;
            }

            // Load pegboard 3D model
            if (pegboard.model_url) {
                this.config.modules.models.loadModel(pegboard.model_url, pegboard.id)
                    .then(gltf => {
                        console.log('✅ Pegboard model loaded');

                        const model = gltf.scene;
                        this.config.currentPegboardModel = model;

                        // Position and scale model
                        this.positionPegboardModel(model, pegboard.dimensions);

                        // Add to scene
                        this.config.modules.core.addToScene(model);

                        // Initialize grid system
                        this.initializeGridSystem(pegboard.dimensions);

                        // Focus camera on pegboard with proper framing
                        this.config.modules.core.focusOnObject(model);

                        // Set default to isometric view for better 3D perspective
                        setTimeout(() => {
                            this.config.modules.core.setCameraView('isometric');
                        }, 500);

                        console.log('🎯 Pegboard setup complete');
                    })
                    .catch(error => {
                        console.error('❌ Failed to load pegboard model:', error);
                        this.showError('Failed to load pegboard model');
                    });
            }
        },

        // Position and scale pegboard model
        positionPegboardModel: function (model, dimensions) {
            if (!model) return;

            // Get model size before positioning
            const beforeBox = new THREE.Box3().setFromObject(model);
            const beforeSize = beforeBox.getSize(new THREE.Vector3());
            const beforeCenter = beforeBox.getCenter(new THREE.Vector3());

            console.log('🔍 Pegboard before positioning:', {
                size: beforeSize,
                center: beforeCenter,
                expectedDimensions: dimensions
            });

            // Center the model
            model.position.sub(beforeCenter);

            // Check if pegboard is lying flat (needs rotation)
            const isFlat = beforeSize.y < Math.max(beforeSize.x, beforeSize.z) * 0.5;

            if (isFlat) {
                console.log('🔄 Pegboard is flat, rotating to stand upright');
                // Rotate 90 degrees around X-axis to make it stand up
                model.rotation.x = Math.PI / 2;
            }

            // Position at origin
            model.position.set(0, 0, 0);

            // Verify final positioning and get actual dimensions
            const afterBox = new THREE.Box3().setFromObject(model);
            const afterSize = afterBox.getSize(new THREE.Vector3());
            const afterCenter = afterBox.getCenter(new THREE.Vector3());

            // Update dimensions with actual model size if not provided
            if (dimensions) {
                dimensions.actualWidth = afterSize.x;
                dimensions.actualHeight = afterSize.y;
                dimensions.actualDepth = afterSize.z;
                
                // Use actual depth for grid system if not specified
                if (!dimensions.depth) {
                    dimensions.depth = afterSize.z;
                }
            }

            console.log('📐 Pegboard after positioning:', {
                size: afterSize,
                center: afterCenter,
                position: model.position,
                scale: model.scale,
                updatedDimensions: dimensions
            });

            // Check if size matches expected dimensions
            if (dimensions) {
                const expectedWidth = dimensions.width || 0.22; // Default 22cm
                const actualWidth = afterSize.x;
                const ratio = actualWidth / expectedWidth;

                console.log('📊 Size comparison:', {
                    expected: expectedWidth + 'm',
                    actual: actualWidth + 'm',
                    depth: afterSize.z + 'm',
                    ratio: ratio,
                    issue: ratio > 10 ? 'MODEL TOO LARGE' : ratio < 0.1 ? 'MODEL TOO SMALL' : 'OK'
                });
            }
        },

        // Initialize grid system for accessory placement
        initializeGridSystem: function (dimensions) {
            if (!dimensions) {
                console.warn('⚠️ No dimensions provided for grid system');
                return;
            }

            const pegHoleSpacing = 0.0254; // 2.54cm in meters
            const width = dimensions.width || 1.0;
            const height = dimensions.height || 1.0;
            const depth = dimensions.depth || 0.02; // Default 2cm depth

            // Calculate the front face Z position (where accessories should hang)
            // Accessories should be positioned on the front face of the pegboard
            const frontFaceZ = depth / 2 + 0.01; // Slightly in front of the pegboard surface

            // Calculate peg hole positions on the front face
            const pegHoles = [];
            const cols = Math.floor(width / pegHoleSpacing);
            const rows = Math.floor(height / pegHoleSpacing);

            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const x = (col * pegHoleSpacing) - (width / 2) + (pegHoleSpacing / 2);
                    const y = (row * pegHoleSpacing) - (height / 2) + (pegHoleSpacing / 2);

                    // Position accessories on the front face of the pegboard
                    pegHoles.push({ x, y, z: frontFaceZ });
                }
            }

            // Store grid configuration
            this.config.gridSystem = {
                enabled: true,
                pegHoleSpacing: pegHoleSpacing,
                width: width,
                height: height,
                depth: depth,
                frontFaceZ: frontFaceZ,
                pegHoles: pegHoles
            };

            // Create visual grid helper (optional, for debugging)
            if (window.location.search.includes('debug=true')) {
                this.createGridHelper();
            }

            console.log('🔲 Grid system initialized:', {
                pegHoles: pegHoles.length,
                spacing: pegHoleSpacing,
                dimensions: { width, height, depth },
                frontFaceZ: frontFaceZ
            });
        },

        // Enable accessory placement mode
        enableAccessoryPlacement: function (accessory) {
            console.log('🎯 Enabling placement mode for:', accessory.name);

            if (!this.config.currentPegboard) {
                this.showError('Please select a pegboard first');
                return;
            }

            // Load accessory model
            this.config.modules.models.loadModel(accessory.model_url, accessory.id)
                .then(gltf => {
                    console.log('✅ Accessory model loaded for placement');

                    this.config.placementMode = {
                        active: true,
                        accessoryData: accessory,
                        model: gltf.scene,
                        previewModel: null
                    };

                    // Enable placement UI
                    this.enablePlacementMode();
                })
                .catch(error => {
                    console.error('❌ Failed to load accessory model:', error);
                    this.showError('Failed to load accessory model');
                });
        },

        // Enable placement mode UI and interactions
        enablePlacementMode: function () {
            const self = this;

            // Create preview model
            const previewModel = this.config.placementMode.model.clone();
            previewModel.traverse(child => {
                if (child.material) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.7;
                }
            });

            this.config.placementMode.previewModel = previewModel;
            this.config.modules.core.addToScene(previewModel);

            // Bind mouse events
            const canvas = this.config.modules.core.config.renderer.domElement;

            canvas.addEventListener('mousemove', function (event) {
                self.updatePlacementPreview(event);
            });

            canvas.addEventListener('click', function (event) {
                self.placeAccessoryAtClick(event);
            });

            // Update cursor
            canvas.style.cursor = 'crosshair';

            console.log('✅ Placement mode enabled');
        },

        // Enhanced placement preview with better visual feedback (Requirements 3.2, 3.3)
        updatePlacementPreview: function (event) {
            if (!this.config.placementMode || !this.config.placementMode.active) return;

            const intersectionData = this.getIntersectionPoint(event);
            if (!intersectionData || !intersectionData.point) {
                // Hide preview when not over pegboard
                if (this.config.placementMode.previewModel) {
                    this.config.placementMode.previewModel.visible = false;
                }
                this.updateSceneValidityState(null);
                return;
            }

            // Show preview model
            const previewModel = this.config.placementMode.previewModel;
            previewModel.visible = true;

            // Snap to grid (this will automatically use the front face Z position)
            const snappedPosition = this.snapToGrid(intersectionData.point);
            
            // If no valid snap position found, hide preview and show invalid state
            if (!snappedPosition) {
                previewModel.visible = false;
                this.updateSceneValidityState(false);
                return;
            }

            previewModel.position.copy(snappedPosition);
            
            // Apply the same positioning logic as final placement
            this.applyAccessoryPositioning(previewModel, this.config.placementMode.accessoryData);

            // Check if position is valid
            const dimensions = this.config.modules.models.getModelDimensions(this.config.placementMode.model);
            const isValid = this.isValidGridPosition(snappedPosition, dimensions);

            // Update preview color with enhanced visual feedback
            this.updatePreviewColor(previewModel, isValid);
            
            // Update scene validity state
            this.updateSceneValidityState(isValid);
            
            // Update cursor based on validity
            const canvas = this.config.modules.core.config.renderer.domElement;
            canvas.style.cursor = isValid ? 'crosshair' : 'not-allowed';
        },

        // Enhanced click-to-place functionality with better validation (Requirements 3.2, 3.3, 3.4)
        placeAccessoryAtClick: function (event) {
            console.log('🖱️ Click detected for accessory placement');

            if (!this.config.placementMode || !this.config.placementMode.active) return;

            const intersectionData = this.getIntersectionPoint(event);
            if (!intersectionData || !intersectionData.point) {
                console.log('❌ No intersection with pegboard');
                this.showError('Please click on the pegboard surface');
                return;
            }

            // Snap to grid with enhanced validation
            const snappedPosition = this.snapToGrid(intersectionData.point);
            
            // Check if snapping was successful
            if (!snappedPosition) {
                console.log('❌ No valid peg hole found near click position');
                this.showError('Please click closer to a peg hole');
                return;
            }

            // Get actual dimensions from model
            const dimensions = this.config.modules.models.getModelDimensions(this.config.placementMode.model);

            // Enhanced validation with specific error messages
            if (!this.isValidGridPosition(snappedPosition, dimensions)) {
                // Provide specific error message based on validation failure
                const errorMessage = this.getPlacementErrorMessage(snappedPosition, dimensions);
                this.showError(errorMessage);
                return;
            }

            // Create final model
            const model = this.config.placementMode.model.clone();
            
            // Position accessory on the front face of the pegboard
            model.position.copy(snappedPosition);
            
            // Apply accessory-specific positioning and orientation
            this.applyAccessoryPositioning(model, this.config.placementMode.accessoryData);
            
            console.log('🔧 Accessory positioned:', {
                name: this.config.placementMode.accessoryData.name,
                position: snappedPosition,
                frontFaceZ: this.config.gridSystem.frontFaceZ,
                finalPosition: model.position,
                rotation: model.rotation,
                dimensions: dimensions
            });

            // Add to scene
            this.config.modules.core.addToScene(model);

            // Create accessory data with enhanced information
            const placementId = 'accessory_' + Date.now();
            const accessoryData = {
                placementId: placementId,
                id: this.config.placementMode.accessoryData.id,
                name: this.config.placementMode.accessoryData.name,
                model: model,
                position: snappedPosition,
                dimensions: dimensions,
                placedAt: new Date().toISOString()
            };

            // Trigger placement event
            const jQuery = window.jQuery || window.$;
            if (jQuery) {
                jQuery(document).trigger('accessoryPlaced', [accessoryData]);
            }

            // Exit placement mode
            this.exitPlacementMode();

            console.log('✅ Accessory placed successfully');
            this.showSuccess(`${this.config.placementMode.accessoryData.name} placed successfully`);
        },

        // Enhanced exit placement mode with proper cleanup
        exitPlacementMode: function () {
            if (!this.config.placementMode) return;

            // Clean up preview model and animations
            if (this.config.placementMode.previewModel) {
                // Clear any pulse animations
                if (this.config.placementMode.previewModel.userData.pulseAnimation) {
                    clearInterval(this.config.placementMode.previewModel.userData.pulseAnimation);
                }
                
                // Remove from scene
                this.config.modules.core.removeFromScene(this.config.placementMode.previewModel);
            }

            // Reset cursor
            const canvas = this.config.modules.core.config.renderer.domElement;
            canvas.style.cursor = 'default';

            // Remove event listeners
            canvas.removeEventListener('mousemove', this.updatePlacementPreview);
            canvas.removeEventListener('click', this.placeAccessoryAtClick);

            // Clear placement mode
            this.config.placementMode = null;

            console.log('🚪 Exited placement mode');
        },

        // Remove accessory (Enhanced for Requirements 3.4, 3.5)
        removeAccessory: function (placementId) {
            const index = this.config.placedAccessories.findIndex(a => a.placementId === placementId);
            if (index !== -1) {
                const accessory = this.config.placedAccessories[index];

                // Remove from scene
                if (accessory.model) {
                    this.config.modules.core.removeFromScene(accessory.model);
                    
                    // Dispose of model resources
                    this.disposeAccessoryModel(accessory.model);
                }

                // Remove from array
                this.config.placedAccessories.splice(index, 1);

                // Update UI
                if (this.config.modules.ui && this.config.modules.ui.updatePlacedAccessoriesDisplay) {
                    this.config.modules.ui.updatePlacedAccessoriesDisplay();
                }

                // Trigger configuration change event for price updates
                const jQuery = window.jQuery || window.$;
                if (jQuery) {
                    jQuery(document).trigger('configurationChanged');
                }

                console.log('🗑️ Accessory removed:', accessory.name);
                this.showSuccess(`${accessory.name} removed successfully`);
            }
        },

        // Enable accessory repositioning mode (Requirement 3.5)
        enableAccessoryRepositioning: function (placementId) {
            console.log('🔄 Enabling repositioning mode for:', placementId);

            const accessory = this.config.placedAccessories.find(a => a.placementId === placementId);
            if (!accessory) {
                console.error('❌ Accessory not found for repositioning:', placementId);
                return;
            }

            // Exit any existing placement mode
            this.exitPlacementMode();

            // Set up repositioning mode
            this.config.repositionMode = {
                active: true,
                placementId: placementId,
                accessoryData: accessory,
                originalPosition: accessory.position.clone(),
                previewModel: null
            };

            // Create preview model for repositioning
            const previewModel = accessory.model.clone();
            previewModel.traverse(child => {
                if (child.material) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.7;
                    child.material.color.setHex(0xffa500); // Orange color for repositioning
                }
            });

            this.config.repositionMode.previewModel = previewModel;
            this.config.modules.core.addToScene(previewModel);

            // Hide original model during repositioning
            accessory.model.visible = false;

            // Enable repositioning UI and interactions
            this.enableRepositioningMode();

            console.log('✅ Repositioning mode enabled for:', accessory.name);
        },

        // Enable repositioning mode UI and interactions
        enableRepositioningMode: function () {
            const self = this;

            // Bind mouse events for repositioning
            const canvas = this.config.modules.core.config.renderer.domElement;

            const mouseMoveHandler = function (event) {
                self.updateRepositionPreview(event);
            };

            const clickHandler = function (event) {
                self.repositionAccessoryAtClick(event);
            };

            const keyHandler = function (event) {
                if (event.key === 'Escape') {
                    self.cancelRepositioning();
                }
            };

            // Store handlers for cleanup
            this.config.repositionMode.mouseMoveHandler = mouseMoveHandler;
            this.config.repositionMode.clickHandler = clickHandler;
            this.config.repositionMode.keyHandler = keyHandler;

            canvas.addEventListener('mousemove', mouseMoveHandler);
            canvas.addEventListener('click', clickHandler);
            document.addEventListener('keydown', keyHandler);

            // Update cursor
            canvas.style.cursor = 'move';

            // Show repositioning instructions
            this.showRepositioningInstructions();

            console.log('✅ Repositioning mode UI enabled');
        },

        // Update repositioning preview
        updateRepositionPreview: function (event) {
            if (!this.config.repositionMode || !this.config.repositionMode.active) return;

            const intersectionData = this.getIntersectionPoint(event);
            if (!intersectionData || !intersectionData.point) {
                // Hide preview when not over pegboard
                if (this.config.repositionMode.previewModel) {
                    this.config.repositionMode.previewModel.visible = false;
                }
                this.updateSceneValidityState(null);
                return;
            }

            // Show preview model
            const previewModel = this.config.repositionMode.previewModel;
            previewModel.visible = true;

            // Snap to grid
            const snappedPosition = this.snapToGrid(intersectionData.point);
            
            if (!snappedPosition) {
                previewModel.visible = false;
                this.updateSceneValidityState(false);
                return;
            }

            previewModel.position.copy(snappedPosition);
            
            // Apply accessory positioning
            this.applyAccessoryPositioning(previewModel, this.config.repositionMode.accessoryData);

            // Check if position is valid (excluding current accessory from collision check)
            const dimensions = this.config.modules.models.getModelDimensions(this.config.repositionMode.accessoryData.model);
            const isValid = this.isValidRepositionPosition(snappedPosition, dimensions, this.config.repositionMode.placementId);

            // Update preview color
            this.updateRepositionPreviewColor(previewModel, isValid);
            
            // Update scene validity state
            this.updateSceneValidityState(isValid);
            
            // Update cursor based on validity
            const canvas = this.config.modules.core.config.renderer.domElement;
            canvas.style.cursor = isValid ? 'move' : 'not-allowed';
        },

        // Check if repositioning position is valid
        isValidRepositionPosition: function (position, dimensions, excludePlacementId) {
            if (!this.config.gridSystem || !position) {
                return false;
            }

            const grid = this.config.gridSystem;
            const halfWidth = grid.width / 2;
            const halfHeight = grid.height / 2;

            // Check bounds
            const accessoryWidth = dimensions.width || 0.05;
            const accessoryHeight = dimensions.height || 0.05;

            const bounds = {
                minX: position.x - accessoryWidth / 2,
                maxX: position.x + accessoryWidth / 2,
                minY: position.y - accessoryHeight / 2,
                maxY: position.y + accessoryHeight / 2
            };

            if (bounds.minX < -halfWidth || bounds.maxX > halfWidth ||
                bounds.minY < -halfHeight || bounds.maxY > halfHeight) {
                return false;
            }

            // Verify position is on a valid peg hole
            if (!this.isPositionOnPegHole(position)) {
                return false;
            }

            // Check for overlaps with other accessories (excluding the one being repositioned)
            const hasOverlap = this.checkAccessoryOverlap(position, dimensions, excludePlacementId);
            if (hasOverlap) {
                return false;
            }

            return true;
        },

        // Reposition accessory at click location
        repositionAccessoryAtClick: function (event) {
            console.log('🖱️ Click detected for accessory repositioning');

            if (!this.config.repositionMode || !this.config.repositionMode.active) return;

            const intersectionData = this.getIntersectionPoint(event);
            if (!intersectionData || !intersectionData.point) {
                console.log('❌ No intersection with pegboard');
                this.showError('Please click on the pegboard surface');
                return;
            }

            // Snap to grid
            const snappedPosition = this.snapToGrid(intersectionData.point);
            
            if (!snappedPosition) {
                console.log('❌ No valid peg hole found near click position');
                this.showError('Please click closer to a peg hole');
                return;
            }

            // Get dimensions
            const dimensions = this.config.modules.models.getModelDimensions(this.config.repositionMode.accessoryData.model);

            // Validate position
            if (!this.isValidRepositionPosition(snappedPosition, dimensions, this.config.repositionMode.placementId)) {
                const errorMessage = this.getPlacementErrorMessage(snappedPosition, dimensions);
                this.showError(errorMessage);
                return;
            }

            // Update accessory position
            const accessory = this.config.repositionMode.accessoryData;
            accessory.position.copy(snappedPosition);
            accessory.model.position.copy(snappedPosition);
            
            // Apply positioning
            this.applyAccessoryPositioning(accessory.model, accessory);

            // Show original model
            accessory.model.visible = true;

            console.log('✅ Accessory repositioned successfully:', {
                name: accessory.name,
                newPosition: snappedPosition
            });

            // Exit repositioning mode
            this.exitRepositioningMode();

            this.showSuccess(`${accessory.name} repositioned successfully`);
        },

        // Cancel repositioning
        cancelRepositioning: function () {
            if (!this.config.repositionMode) return;

            console.log('🚫 Cancelling accessory repositioning');

            // Show original model
            const accessory = this.config.repositionMode.accessoryData;
            if (accessory && accessory.model) {
                accessory.model.visible = true;
            }

            // Exit repositioning mode
            this.exitRepositioningMode();

            this.showSuccess('Repositioning cancelled');
        },

        // Exit repositioning mode
        exitRepositioningMode: function () {
            if (!this.config.repositionMode) return;

            // Clean up preview model
            if (this.config.repositionMode.previewModel) {
                this.config.modules.core.removeFromScene(this.config.repositionMode.previewModel);
                this.disposeAccessoryModel(this.config.repositionMode.previewModel);
            }

            // Remove event listeners
            const canvas = this.config.modules.core.config.renderer.domElement;
            if (this.config.repositionMode.mouseMoveHandler) {
                canvas.removeEventListener('mousemove', this.config.repositionMode.mouseMoveHandler);
            }
            if (this.config.repositionMode.clickHandler) {
                canvas.removeEventListener('click', this.config.repositionMode.clickHandler);
            }
            if (this.config.repositionMode.keyHandler) {
                document.removeEventListener('keydown', this.config.repositionMode.keyHandler);
            }

            // Reset cursor
            canvas.style.cursor = 'default';

            // Hide instructions
            this.hideRepositioningInstructions();

            // Clear repositioning mode
            this.config.repositionMode = null;

            console.log('🚪 Exited repositioning mode');
        },

        // Show repositioning instructions
        showRepositioningInstructions: function () {
            const accessoryName = this.config.repositionMode.accessoryData.name;
            const instructionsHtml = `
                <div class="repositioning-instructions" id="repositioning-instructions">
                    <div class="instruction-content">
                        <span class="instruction-icon">🔄</span>
                        <span class="instruction-text">Click on the pegboard to move "${accessoryName}" or press Escape to cancel</span>
                        <button class="cancel-repositioning-btn" type="button">Cancel</button>
                    </div>
                </div>
            `;
            
            // Remove existing instructions
            $('#repositioning-instructions').remove();
            
            // Add new instructions
            $('.configurator-scene').append(instructionsHtml);
            
            // Bind cancel button
            $('.cancel-repositioning-btn').on('click', () => {
                this.cancelRepositioning();
            });
        },

        // Hide repositioning instructions
        hideRepositioningInstructions: function () {
            $('#repositioning-instructions').remove();
        },

        // Update repositioning preview color
        updateRepositionPreviewColor: function (model, isValid) {
            const color = isValid ? 0xffa500 : 0xdc3545; // Orange for valid, red for invalid
            const opacity = isValid ? 0.7 : 0.5;

            model.traverse(child => {
                if (child.material) {
                    child.material.color.setHex(color);
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                    
                    if (child.material.emissive) {
                        child.material.emissive.setHex(isValid ? 0x4d2600 : 0x4d0a0a);
                        child.material.emissiveIntensity = 0.2;
                    }
                }
            });
        },

        // Dispose accessory model resources
        disposeAccessoryModel: function (model) {
            if (!model) return;

            model.traverse(child => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            if (material.normalMap) material.normalMap.dispose();
                            if (material.roughnessMap) material.roughnessMap.dispose();
                            if (material.metalnessMap) material.metalnessMap.dispose();
                            material.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        if (child.material.normalMap) child.material.normalMap.dispose();
                        if (child.material.roughnessMap) child.material.roughnessMap.dispose();
                        if (child.material.metalnessMap) child.material.metalnessMap.dispose();
                        child.material.dispose();
                    }
                }
            });
        },

        // Reset entire configuration (Enhanced for Requirements 3.4, 3.5)
        resetConfiguration: function () {
            // Exit any active modes first
            this.exitPlacementMode();
            this.exitRepositioningMode();

            // Clear pegboard
            if (this.config.currentPegboardModel) {
                this.config.modules.core.removeFromScene(this.config.currentPegboardModel);
                this.config.currentPegboardModel = null;
            }
            this.config.currentPegboard = null;

            // Clear accessories with proper disposal
            this.config.placedAccessories.forEach(accessory => {
                if (accessory.model) {
                    this.config.modules.core.removeFromScene(accessory.model);
                    this.disposeAccessoryModel(accessory.model);
                }
            });
            this.config.placedAccessories = [];

            // Clear grid system
            this.config.gridSystem = null;

            // Sync with UI module
            if (this.config.modules.ui && this.config.modules.ui.syncPlacedAccessories) {
                this.config.modules.ui.syncPlacedAccessories([]);
            }

            console.log('🔄 Configuration reset complete');
        },

        // Snap position to nearest peg hole on the front face (Enhanced for Requirements 3.2, 3.3)
        snapToGrid: function (position) {
            if (!this.config.gridSystem || !this.config.gridSystem.enabled) {
                return position.clone();
            }

            const pegHoles = this.config.gridSystem.pegHoles;
            let closestHole = null;
            let minDistance = Infinity;
            const maxSnapDistance = this.config.gridSystem.pegHoleSpacing * 1.5; // Maximum snap distance

            // Find the closest peg hole based on X and Y coordinates only
            pegHoles.forEach(hole => {
                const distance = Math.sqrt(
                    Math.pow(position.x - hole.x, 2) +
                    Math.pow(position.y - hole.y, 2)
                );

                // Only snap if within reasonable distance to prevent snapping to far holes
                if (distance < minDistance && distance <= maxSnapDistance) {
                    minDistance = distance;
                    closestHole = hole;
                }
            });

            if (closestHole) {
                // Always use the front face Z position for accessories
                const snappedPosition = new THREE.Vector3(
                    closestHole.x, 
                    closestHole.y, 
                    this.config.gridSystem.frontFaceZ
                );
                
                console.log('📍 Snapped to grid:', {
                    original: { x: position.x, y: position.y, z: position.z },
                    snapped: { x: snappedPosition.x, y: snappedPosition.y, z: snappedPosition.z },
                    frontFaceZ: this.config.gridSystem.frontFaceZ,
                    snapDistance: minDistance,
                    maxSnapDistance: maxSnapDistance
                });
                
                return snappedPosition;
            }

            // If no valid snap point found, return null to indicate invalid placement
            console.log('⚠️ No valid snap point found for position:', position);
            return null;
        },

        // Check if position is valid for placement (Enhanced for Requirements 3.2, 3.3, 3.4)
        isValidGridPosition: function (position, dimensions) {
            if (!this.config.gridSystem || !position) {
                console.log('❌ Invalid grid system or position');
                return false;
            }

            const grid = this.config.gridSystem;
            const halfWidth = grid.width / 2;
            const halfHeight = grid.height / 2;

            // Enhanced bounds checking with better error reporting
            const accessoryWidth = dimensions.width || 0.05;
            const accessoryHeight = dimensions.height || 0.05;

            const bounds = {
                minX: position.x - accessoryWidth / 2,
                maxX: position.x + accessoryWidth / 2,
                minY: position.y - accessoryHeight / 2,
                maxY: position.y + accessoryHeight / 2
            };

            // Check if accessory fits within pegboard bounds
            if (bounds.minX < -halfWidth || bounds.maxX > halfWidth ||
                bounds.minY < -halfHeight || bounds.maxY > halfHeight) {
                console.log('❌ Accessory exceeds pegboard bounds:', {
                    bounds: bounds,
                    pegboardLimits: { width: grid.width, height: grid.height }
                });
                return false;
            }

            // Verify position is on a valid peg hole
            if (!this.isPositionOnPegHole(position)) {
                console.log('❌ Position is not on a valid peg hole');
                return false;
            }

            // Check for overlaps with existing accessories
            const hasOverlap = this.checkAccessoryOverlap(position, dimensions);
            if (hasOverlap) {
                console.log('❌ Position overlaps with existing accessory');
                return false;
            }

            console.log('✅ Position is valid for placement');
            return true;
        },

        // Check if position is on a valid peg hole (Requirement 3.3)
        isPositionOnPegHole: function (position) {
            if (!this.config.gridSystem || !this.config.gridSystem.pegHoles) {
                return false;
            }

            const tolerance = 0.001; // 1mm tolerance for floating point precision
            
            // Check if position matches any peg hole exactly (within tolerance)
            return this.config.gridSystem.pegHoles.some(hole => {
                const distance = Math.sqrt(
                    Math.pow(position.x - hole.x, 2) +
                    Math.pow(position.y - hole.y, 2) +
                    Math.pow(position.z - hole.z, 2)
                );
                return distance <= tolerance;
            });
        },

        // Enhanced collision detection to prevent overlaps (Requirement 3.4)
        checkAccessoryOverlap: function (position, dimensions, excludePlacementId = null) {
            if (!this.config.placedAccessories || this.config.placedAccessories.length === 0) {
                return false;
            }

            const margin = 0.02; // 2cm margin between accessories
            const newWidth = (dimensions.width || 0.05) + margin;
            const newHeight = (dimensions.height || 0.05) + margin;

            const newBox = {
                minX: position.x - newWidth / 2,
                maxX: position.x + newWidth / 2,
                minY: position.y - newHeight / 2,
                maxY: position.y + newHeight / 2
            };

            for (let accessory of this.config.placedAccessories) {
                // Skip if this is the same accessory being repositioned
                if (excludePlacementId && accessory.placementId === excludePlacementId) {
                    continue;
                }

                const existingDimensions = accessory.dimensions;
                const existingWidth = (existingDimensions.width || 0.05) + margin;
                const existingHeight = (existingDimensions.height || 0.05) + margin;

                const existingBox = {
                    minX: accessory.position.x - existingWidth / 2,
                    maxX: accessory.position.x + existingWidth / 2,
                    minY: accessory.position.y - existingHeight / 2,
                    maxY: accessory.position.y + existingHeight / 2
                };

                // Enhanced overlap detection with detailed logging
                const hasOverlap = !(newBox.maxX < existingBox.minX || newBox.minX > existingBox.maxX ||
                    newBox.maxY < existingBox.minY || newBox.minY > existingBox.maxY);

                if (hasOverlap) {
                    console.log('🚫 Collision detected:', {
                        newAccessory: { position: position, dimensions: dimensions },
                        existingAccessory: { 
                            name: accessory.name, 
                            position: accessory.position, 
                            dimensions: existingDimensions 
                        },
                        newBox: newBox,
                        existingBox: existingBox
                    });
                    return true;
                }
            }

            return false;
        },

        // Get intersection point with pegboard
        getIntersectionPoint: function (event) {
            if (!this.config.modules.core.config.camera || !this.config.modules.core.config.renderer) return null;

            const canvas = this.config.modules.core.config.renderer.domElement;
            const rect = canvas.getBoundingClientRect();

            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.config.modules.core.config.camera);

            if (this.config.currentPegboardModel) {
                const intersects = raycaster.intersectObject(this.config.currentPegboardModel, true);
                if (intersects.length > 0) {
                    return {
                        point: intersects[0].point,
                        face: intersects[0].face,
                        object: intersects[0].object,
                        normal: intersects[0].face.normal
                    };
                }
            }

            return null;
        },

        // Apply accessory-specific positioning and orientation
        applyAccessoryPositioning: function (model, accessoryData) {
            // Default orientation - facing outward from pegboard
            model.rotation.set(0, 0, 0);
            
            // Get accessory type from categories or name for specific positioning
            const accessoryType = this.getAccessoryType(accessoryData);
            
            switch (accessoryType) {
                case 'hook':
                    // Hooks typically hang straight down
                    // No additional rotation needed
                    break;
                    
                case 'shelf':
                    // Shelves should be level and extend outward
                    // May need slight forward offset
                    model.position.z += 0.005; // 5mm forward
                    break;
                    
                case 'bin':
                case 'container':
                    // Bins and containers should be level
                    // May need slight forward offset for clearance
                    model.position.z += 0.01; // 1cm forward
                    break;
                    
                case 'tool-holder':
                    // Tool holders may need specific orientation
                    // Depends on the specific tool holder design
                    break;
                    
                default:
                    // Default positioning for unknown accessories
                    break;
            }
            
            console.log('🎯 Applied positioning for accessory type:', {
                name: accessoryData.name,
                type: accessoryType,
                position: model.position,
                rotation: model.rotation
            });
        },

        // Determine accessory type from data
        getAccessoryType: function (accessoryData) {
            // Check categories first
            if (accessoryData.categories && accessoryData.categories.length > 0) {
                const category = accessoryData.categories[0].toLowerCase();
                
                if (category.includes('hook')) return 'hook';
                if (category.includes('shelf') || category.includes('shelve')) return 'shelf';
                if (category.includes('bin') || category.includes('container')) return 'bin';
                if (category.includes('tool')) return 'tool-holder';
            }
            
            // Check name as fallback
            const name = accessoryData.name.toLowerCase();
            if (name.includes('hook')) return 'hook';
            if (name.includes('shelf')) return 'shelf';
            if (name.includes('bin') || name.includes('container')) return 'bin';
            if (name.includes('tool')) return 'tool-holder';
            
            return 'generic';
        },

        // Get specific error message for placement validation failure (Requirement 3.4)
        getPlacementErrorMessage: function (position, dimensions) {
            if (!this.config.gridSystem) {
                return 'Grid system not initialized';
            }

            // Check bounds first
            const grid = this.config.gridSystem;
            const halfWidth = grid.width / 2;
            const halfHeight = grid.height / 2;
            const accessoryWidth = dimensions.width || 0.05;
            const accessoryHeight = dimensions.height || 0.05;

            const bounds = {
                minX: position.x - accessoryWidth / 2,
                maxX: position.x + accessoryWidth / 2,
                minY: position.y - accessoryHeight / 2,
                maxY: position.y + accessoryHeight / 2
            };

            if (bounds.minX < -halfWidth || bounds.maxX > halfWidth ||
                bounds.minY < -halfHeight || bounds.maxY > halfHeight) {
                return 'Accessory extends beyond pegboard boundaries';
            }

            // Check if on peg hole
            if (!this.isPositionOnPegHole(position)) {
                return 'Accessory must be placed on a peg hole';
            }

            // Check for overlaps
            if (this.checkAccessoryOverlap(position, dimensions)) {
                return 'Position is occupied by another accessory';
            }

            return 'Invalid placement position';
        },

        // Update scene validity state for visual feedback (Requirement 3.2)
        updateSceneValidityState: function (isValid) {
            const sceneElement = document.querySelector('.configurator-scene');
            if (!sceneElement) return;

            // Remove existing validity classes
            sceneElement.classList.remove('invalid-position', 'valid-position');
            
            // Add appropriate class based on validity
            if (isValid === true) {
                sceneElement.classList.add('valid-position');
            } else if (isValid === false) {
                sceneElement.classList.add('invalid-position');
            }
        },

        // Enhanced preview color system with better visual feedback (Requirement 3.2)
        updatePreviewColor: function (model, isValid) {
            const color = isValid ? 0x28a745 : 0xdc3545; // Bootstrap success/danger colors
            const opacity = isValid ? 0.7 : 0.5;

            model.traverse(child => {
                if (child.material) {
                    // Clone material to avoid affecting original
                    if (!child.material.isPreviewMaterial) {
                        child.material = child.material.clone();
                        child.material.isPreviewMaterial = true;
                        child.material.originalColor = child.material.color.getHex();
                    }
                    
                    // Apply preview styling
                    child.material.color.setHex(color);
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                    
                    // Add subtle emissive glow for better visibility
                    if (child.material.emissive) {
                        child.material.emissive.setHex(isValid ? 0x0a4d1a : 0x4d0a0a);
                        child.material.emissiveIntensity = 0.2;
                    }
                }
            });

            // Add pulsing animation for invalid positions
            if (!isValid && model.userData.pulseAnimation) {
                clearInterval(model.userData.pulseAnimation);
            }
            
            if (!isValid) {
                let pulseDirection = 1;
                model.userData.pulseAnimation = setInterval(() => {
                    model.traverse(child => {
                        if (child.material && child.material.isPreviewMaterial) {
                            child.material.opacity += pulseDirection * 0.1;
                            if (child.material.opacity >= 0.8 || child.material.opacity <= 0.3) {
                                pulseDirection *= -1;
                            }
                        }
                    });
                }, 100);
            }
        },

        // Create visual grid helper for debugging
        createGridHelper: function () {
            if (!this.config.gridSystem || !this.config.modules.core) return;

            // Remove existing grid helper
            if (this.config.gridHelper) {
                this.config.modules.core.removeFromScene(this.config.gridHelper);
            }

            const geometry = new THREE.BufferGeometry();
            const positions = [];
            const colors = [];

            // Create small spheres at each peg hole position
            this.config.gridSystem.pegHoles.forEach(hole => {
                // Create a small sphere geometry for each peg hole
                const sphereGeometry = new THREE.SphereGeometry(0.002, 8, 6);
                const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                
                sphere.position.set(hole.x, hole.y, hole.z);
                this.config.modules.core.addToScene(sphere);
            });

            console.log('🔍 Grid helper created for debugging');
        },

        // Get current configuration
        getCurrentConfiguration: function () {
            return {
                pegboard: this.config.currentPegboard,
                accessories: this.config.placedAccessories
            };
        },

        // Show error message
        showError: function (message) {
            if (this.config.modules.ui && this.config.modules.ui.showError) {
                this.config.modules.ui.showError(message);
            } else {
                console.error('Error:', message);
                alert('Error: ' + message);
            }
        },

        // Show success message
        showSuccess: function (message) {
            if (this.config.modules.ui && this.config.modules.ui.showSuccess) {
                this.config.modules.ui.showSuccess(message);
            } else {
                console.log('Success:', message);
            }
        },

        // Dispose all resources
        dispose: function () {
            console.log('🧹 Disposing configurator...');

            // Exit placement mode
            this.exitPlacementMode();

            // Dispose modules
            if (this.config.modules.core) {
                this.config.modules.core.dispose();
            }
            if (this.config.modules.models) {
                this.config.modules.models.dispose();
            }
            if (this.config.modules.ui) {
                this.config.modules.ui.dispose();
            }
            if (this.config.modules.cart) {
                this.config.modules.cart.dispose();
            }
            if (this.config.modules.memoryManager) {
                this.config.modules.memoryManager.disposeAll();
            }

            // Clear configuration
            this.config.initialized = false;
            this.config.currentPegboard = null;
            this.config.currentPegboardModel = null;
            this.config.placedAccessories = [];
            this.config.gridSystem = null;

            console.log('✅ Configurator disposed');
        }
    };

    // Auto-cleanup on page unload
    window.addEventListener('beforeunload', function () {
        if (BlastiConfigurator.config.initialized) {
            BlastiConfigurator.dispose();
        }
    });

})(jQuery);