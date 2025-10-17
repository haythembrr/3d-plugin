/**
 * Blasti 3D Configurator JavaScript
 * Main frontend functionality for the configurator
 */

(function ($) {
    'use strict';

    // Main configurator object
    window.BlastiConfigurator = {

        // Configuration
        config: {
            container: null,
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            currentPegboard: null,
            currentPegboardModel: null, // Reference to loaded pegboard 3D model
            placedAccessories: [],
            totalPrice: 0,
            showDebugHelpers: true, // Enable debug helpers to visualize models
            priceBreakdown: {
                pegboard: null,
                accessories: [],
                subtotal: 0,
                total: 0,
                currency_symbol: '$',
                formatted_total: '$0.00'
            },
            productPrices: {}, // Cache for product prices
            modelCache: {}, // Cache for loaded 3D models (Requirements: 2.3, 9.2)
            loadingModels: {}, // Track models currently being loaded
            modelLoader: null, // GLTFLoader instance
            initialized: false // Prevent double initialization
        },

        // Initialize the configurator
        init: function () {
            console.log('Initializing Blasti 3D Configurator...');
            const self = this;

            // Check if we're on the configurator page
            if (!$('.blasti-configurator-container').length) {
                return;
            }

            // Prevent double initialization
            if (this.config.initialized) {
                console.warn('⚠️ Configurator already initialized, skipping duplicate init');
                return;
            }

            // Initialize components immediately - container should be visible now
            self.initializeScene();
            self.initializeModelLoader(); // Requirements: 2.3, 9.2
            self.initializeCameraControls();
            self.initializePriceDisplay();
            self.bindEvents();
            self.loadProducts();

            // Mark as initialized
            this.config.initialized = true;

            console.log('Configurator initialized successfully');
        },

        // Initialize 3D scene
        // Requirements: 2.1, 2.2, 2.4
        initializeScene: function () {
            const container = document.getElementById('configurator-scene');
            if (!container) {
                console.error('Configurator scene container not found');
                return;
            }

            this.config.container = container;

            // Log container state
            console.log('Container found:', {
                id: container.id,
                clientWidth: container.clientWidth,
                clientHeight: container.clientHeight,
                offsetWidth: container.offsetWidth,
                offsetHeight: container.offsetHeight,
                display: window.getComputedStyle(container).display,
                visibility: window.getComputedStyle(container).visibility
            });

            // Check if Three.js is loaded
            if (typeof THREE === 'undefined') {
                console.error('Three.js library not loaded');
                container.innerHTML = '<div class="configurator-error"><p>Failed to load 3D engine. Please refresh the page.</p></div>';
                return;
            }

            try {
                // Create scene
                this.config.scene = new THREE.Scene();
                this.config.scene.background = new THREE.Color(0xcccccc); // Light gray background

                // Create camera with optimized settings
                const width = container.clientWidth;
                const height = container.clientHeight;
                this.config.camera = new THREE.PerspectiveCamera(
                    50,                          // Field of view (reduced for less distortion)
                    width / height,              // Aspect ratio
                    0.01,                        // Near clipping plane (closer for small objects)
                    1000                         // Far clipping plane
                );
                // Position camera to view objects that may be 0.05m to 2.5m in size
                // Default view at 4.5m distance to see full pegboard
                this.config.camera.position.set(2, 1.5, 4.5);
                this.config.camera.lookAt(0, 1.1, 0);
                this.config.camera.updateProjectionMatrix();

                console.log('📷 Camera created:', {
                    fov: this.config.camera.fov,
                    aspect: this.config.camera.aspect,
                    near: this.config.camera.near,
                    far: this.config.camera.far,
                    position: this.config.camera.position,
                    rotation: this.config.camera.rotation,
                    matrixWorldNeedsUpdate: this.config.camera.matrixWorldNeedsUpdate
                });

                // Calculate distance from camera to origin
                const distanceToOrigin = Math.sqrt(
                    Math.pow(this.config.camera.position.x, 2) +
                    Math.pow(this.config.camera.position.y, 2) +
                    Math.pow(this.config.camera.position.z, 2)
                );
                console.log('📷 Camera distance to origin:', distanceToOrigin,
                    '(should be between near=' + this.config.camera.near + ' and far=' + this.config.camera.far + ')');

                // Create renderer
                this.config.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true
                });
                this.config.renderer.setSize(width, height);
                this.config.renderer.setPixelRatio(window.devicePixelRatio);
                this.config.renderer.shadowMap.enabled = true;
                this.config.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

                console.log('🎨 Renderer created:', {
                    width: width,
                    height: height,
                    pixelRatio: window.devicePixelRatio,
                    domElementWidth: this.config.renderer.domElement.width,
                    domElementHeight: this.config.renderer.domElement.height
                });

                // Check if container already has a canvas
                const existingCanvas = container.querySelector('canvas');
                if (existingCanvas) {
                    console.error('❌ Container already has a canvas! Removing old canvas.');
                    container.removeChild(existingCanvas);
                }

                // Add renderer to container
                container.appendChild(this.config.renderer.domElement);
                console.log('🎨 Canvas appended to container');

                // Verify only one canvas exists
                const canvasCount = container.querySelectorAll('canvas').length;
                console.log('🎨 Canvas count in container:', canvasCount);

                // Log canvas and container dimensions
                console.log('📐 Canvas dimensions:', {
                    canvasWidth: this.config.renderer.domElement.width,
                    canvasHeight: this.config.renderer.domElement.height,
                    containerWidth: container.clientWidth,
                    containerHeight: container.clientHeight,
                    containerOffsetWidth: container.offsetWidth,
                    containerOffsetHeight: container.offsetHeight
                });

                // Check if canvas is visible
                const canvasStyle = window.getComputedStyle(this.config.renderer.domElement);
                console.log('👁️ Canvas computed style:', {
                    display: canvasStyle.display,
                    visibility: canvasStyle.visibility,
                    opacity: canvasStyle.opacity,
                    width: canvasStyle.width,
                    height: canvasStyle.height,
                    zIndex: canvasStyle.zIndex,
                    position: canvasStyle.position
                });

                // Check WebGL context
                const gl = this.config.renderer.getContext();
                console.log('🔧 WebGL context:', {
                    contextValid: gl !== null,
                    drawingBufferWidth: gl ? gl.drawingBufferWidth : 'N/A',
                    drawingBufferHeight: gl ? gl.drawingBufferHeight : 'N/A',
                    isContextLost: gl ? gl.isContextLost() : 'N/A'
                });

                // Set up lighting
                this.setupLighting();

                // Set up camera controls with optimized settings
                if (typeof THREE.OrbitControls !== 'undefined') {
                    this.config.controls = new THREE.OrbitControls(
                        this.config.camera,
                        this.config.renderer.domElement
                    );
                    this.config.controls.enableDamping = true;
                    this.config.controls.dampingFactor = 0.08;
                    // For objects up to 2.5m: allow zoom from 1m to 10m
                    this.config.controls.minDistance = 1.0;
                    this.config.controls.maxDistance = 10.0;
                    this.config.controls.maxPolarAngle = Math.PI / 1.8; // Prevent going too low
                    this.config.controls.minPolarAngle = Math.PI / 6;   // Prevent going too high
                    this.config.controls.enablePan = true;
                    this.config.controls.panSpeed = 0.5;
                    this.config.controls.rotateSpeed = 0.8;
                    this.config.controls.zoomSpeed = 1.0;
                    // Target the center of the pegboard
                    this.config.controls.target.set(0, 1.1, 0);
                } else {
                    console.warn('OrbitControls not loaded, camera controls will be limited');
                }

                // Handle window resize
                this.setupResizeHandler();

                // Start render loop
                this.startRenderLoop();

                // Final verification checks
                console.log('✅ 3D scene initialized successfully');
                console.log('🔍 Final verification:', {
                    canvasInDOM: document.body.contains(this.config.renderer.domElement),
                    canvasParent: this.config.renderer.domElement.parentElement ? this.config.renderer.domElement.parentElement.id : 'NO PARENT',
                    canvasOffsetParent: this.config.renderer.domElement.offsetParent ? 'visible' : 'HIDDEN',
                    containerHasCanvas: container.contains(this.config.renderer.domElement),
                    sceneChildrenCount: this.config.scene.children.length
                });

            } catch (error) {
                console.error('Error initializing 3D scene:', error);
                container.innerHTML = '<div class="configurator-error"><p>Failed to initialize 3D scene. Please refresh the page.</p></div>';
            }
        },

        // Set up scene lighting
        // Requirements: 2.3
        setupLighting: function () {
            if (!this.config.scene) return;

            console.log('💡 Setting up lighting...');

            // Ambient light for overall illumination
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            this.config.scene.add(ambientLight);
            console.log('💡 Added ambient light (intensity: 0.6)');

            // Main directional light (sun-like)
            const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
            mainLight.position.set(5, 10, 7);
            mainLight.castShadow = true;

            // Configure shadow properties
            mainLight.shadow.mapSize.width = 2048;
            mainLight.shadow.mapSize.height = 2048;
            mainLight.shadow.camera.near = 0.5;
            mainLight.shadow.camera.far = 50;
            mainLight.shadow.camera.left = -10;
            mainLight.shadow.camera.right = 10;
            mainLight.shadow.camera.top = 10;
            mainLight.shadow.camera.bottom = -10;

            this.config.scene.add(mainLight);
            console.log('💡 Added main directional light at (5, 10, 7), intensity: 0.8');

            // Fill light from opposite side
            const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
            fillLight.position.set(-5, 5, -5);
            this.config.scene.add(fillLight);
            console.log('💡 Added fill light at (-5, 5, -5), intensity: 0.3');

            // Add a ground plane to receive shadows
            const groundGeometry = new THREE.PlaneGeometry(20, 20);
            const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.position.y = -0.5;
            ground.receiveShadow = true;
            this.config.scene.add(ground);
            console.log('💡 Added ground plane for shadows');

            console.log('💡 Lighting setup complete. Total scene children:', this.config.scene.children.length);
        },

        // Set up window resize handler
        // Requirements: 2.4
        setupResizeHandler: function () {
            const self = this;

            window.addEventListener('resize', function () {
                if (!self.config.container || !self.config.camera || !self.config.renderer) {
                    return;
                }

                const width = self.config.container.clientWidth;
                const height = self.config.container.clientHeight;

                // Update camera aspect ratio
                self.config.camera.aspect = width / height;
                self.config.camera.updateProjectionMatrix();

                // Update renderer size
                self.config.renderer.setSize(width, height);
            });
        },

        // Start the render loop
        // Requirements: 2.1, 2.4
        startRenderLoop: function () {
            const self = this;
            let frameCount = 0;
            let firstFrameLogged = false;

            function animate() {
                requestAnimationFrame(animate);

                // Update controls if available
                if (self.config.controls) {
                    self.config.controls.update();
                }

                // Render the scene
                if (self.config.renderer && self.config.scene && self.config.camera) {
                    self.config.renderer.render(self.config.scene, self.config.camera);

                    // Log first frame with detailed info
                    if (!firstFrameLogged) {
                        console.log('🎬 FIRST FRAME RENDERED:', {
                            sceneChildren: self.config.scene.children.length,
                            cameraPosition: self.config.camera.position,
                            cameraRotation: self.config.camera.rotation,
                            cameraTarget: self.config.controls ? self.config.controls.target : 'N/A',
                            canvasWidth: self.config.renderer.domElement.width,
                            canvasHeight: self.config.renderer.domElement.height,
                            canvasVisible: self.config.renderer.domElement.offsetParent !== null,
                            sceneBackground: self.config.scene.background
                        });

                        // Log all scene children
                        console.log('🎬 Scene children details:');
                        self.config.scene.children.forEach(function (child, index) {
                            console.log('  Child ' + index + ':', {
                                type: child.type,
                                name: child.name,
                                visible: child.visible,
                                position: child.position,
                                scale: child.scale,
                                layers: child.layers.mask
                            });
                        });

                        firstFrameLogged = true;
                    }

                    // Log every 60 frames (roughly once per second at 60fps)
                    frameCount++;
                    if (frameCount === 3600) {
                        console.log('🔄 Rendering... Scene children:', self.config.scene.children.length,
                            'Camera pos:', self.config.camera.position,
                            'Canvas visible:', self.config.renderer.domElement.offsetParent !== null);
                        frameCount = 0;
                    }
                }
            }

            console.log('🎬 Starting render loop...');
            animate();
        },

        // Initialize 3D model loader with caching
        // Requirements: 2.3 (display pegboard model), 9.2 (accept GLB files)
        initializeModelLoader: function () {
            const self = this;

            if (typeof THREE === 'undefined') {
                console.error('THREE.js not available');
                return false;
            }

            // Check if GLTFLoader is available (it might be a global or attached to THREE)
            const GLTFLoaderClass = THREE.GLTFLoader || window.GLTFLoader;

            if (typeof GLTFLoaderClass === 'undefined') {
                console.warn('GLTFLoader not available yet. Will retry when needed.');
                console.log('Available THREE properties:', Object.keys(THREE).filter(k => k.includes('Loader')));

                // Set a flag to retry later
                this.config.modelLoaderRetryNeeded = true;
                return false;
            }

            // Create loading manager for progress tracking
            const manager = new THREE.LoadingManager();

            manager.onStart = function (url, itemsLoaded, itemsTotal) {
                console.log('Started loading: ' + url);
            };

            manager.onLoad = function () {
                console.log('All models loaded');
            };

            manager.onProgress = function (url, itemsLoaded, itemsTotal) {
                const progress = (itemsLoaded / itemsTotal * 100).toFixed(0);
                console.log('Loading progress: ' + progress + '%');
            };

            manager.onError = function (url) {
                console.error('Error loading: ' + url);
            };

            // Initialize GLTFLoader
            this.config.modelLoader = new GLTFLoaderClass(manager);
            this.config.modelLoaderRetryNeeded = false;

            console.log('Model loader initialized with caching support');
            return true;
        },

        // Retry initializing model loader if it failed initially
        // Requirements: 2.3, 9.2
        retryInitializeModelLoader: function () {
            if (!this.config.modelLoader && this.config.modelLoaderRetryNeeded) {
                console.log('Retrying model loader initialization...');
                return this.initializeModelLoader();
            }
            return !!this.config.modelLoader;
        },

        // Load 3D model with caching and error handling
        // Requirements: 2.3, 9.2
        loadModel: function (modelUrl, productId) {
            const self = this;

            return new Promise(function (resolve, reject) {
                // Validate inputs
                if (!modelUrl) {
                    reject(new Error('Model URL is required'));
                    return;
                }

                // Try to initialize model loader if not already done
                if (!self.config.modelLoader) {
                    console.log('Model loader not initialized, attempting to initialize now...');
                    const initialized = self.retryInitializeModelLoader();

                    if (!initialized) {
                        reject(new Error('Model loader could not be initialized. GLTFLoader may not be loaded yet.'));
                        return;
                    }
                }

                // Check cache first (optimization)
                const cacheKey = productId || modelUrl;
                if (self.config.modelCache[cacheKey]) {
                    console.log('Loading model from cache:', cacheKey);
                    // Clone the cached model to avoid modifying the original
                    const cachedModel = self.config.modelCache[cacheKey];
                    const clonedModel = cachedModel.clone();
                    resolve(clonedModel);
                    return;
                }

                // Check if model is currently being loaded
                if (self.config.loadingModels[cacheKey]) {
                    console.log('Model already loading, waiting...:', cacheKey);
                    // Wait for the existing load to complete
                    self.config.loadingModels[cacheKey].then(resolve).catch(reject);
                    return;
                }

                // Show loading state
                self.showLoadingState(true);

                // Create promise for this load operation
                const loadPromise = new Promise(function (resolveLoad, rejectLoad) {
                    // Load the model
                    self.config.modelLoader.load(
                        modelUrl,
                        // onLoad callback
                        function (gltf) {
                            console.log('Model loaded successfully:', modelUrl);

                            const model = gltf.scene;

                            // Optimize model
                            self.optimizeModel(model);

                            // Cache the model
                            self.config.modelCache[cacheKey] = model;

                            // Remove from loading tracker
                            delete self.config.loadingModels[cacheKey];

                            // Hide loading state
                            self.showLoadingState(false);

                            // Clone for use (keep original in cache)
                            const clonedModel = model.clone();
                            resolveLoad(clonedModel);
                        },
                        // onProgress callback
                        function (xhr) {
                            if (xhr.lengthComputable) {
                                const percentComplete = (xhr.loaded / xhr.total * 100).toFixed(0);
                                console.log('Model loading: ' + percentComplete + '%');
                                self.updateLoadingProgress(percentComplete);
                            }
                        },
                        // onError callback
                        function (error) {
                            console.error('Error loading model:', modelUrl, error);

                            // Remove from loading tracker
                            delete self.config.loadingModels[cacheKey];

                            // Hide loading state
                            self.showLoadingState(false);

                            // Show error to user
                            self.showModelLoadError(modelUrl);

                            rejectLoad(new Error('Failed to load 3D model: ' + (error.message || 'Unknown error')));
                        }
                    );
                });

                // Track this loading operation
                self.config.loadingModels[cacheKey] = loadPromise;

                // Return the promise
                loadPromise.then(resolve).catch(reject);
            });
        },

        // Optimize loaded model for performance
        // Requirements: 2.3
        optimizeModel: function (model) {
            if (!model) return;

            model.traverse(function (child) {
                if (child.isMesh) {
                    // Enable shadows
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Optimize geometry
                    if (child.geometry) {
                        child.geometry.computeBoundingBox();
                        child.geometry.computeBoundingSphere();
                    }

                    // Optimize materials
                    if (child.material) {
                        child.material.needsUpdate = true;

                        // Set reasonable defaults if not set
                        if (child.material.metalness === undefined) {
                            child.material.metalness = 0.1;
                        }
                        if (child.material.roughness === undefined) {
                            child.material.roughness = 0.8;
                        }
                    }
                }
            });

            console.log('Model optimized for performance');
        },

        // Show/hide loading state
        // Requirements: 2.3
        showLoadingState: function (isLoading) {
            const loadingIndicator = $('.model-loading-indicator');

            if (isLoading) {
                if (loadingIndicator.length === 0) {
                    const indicator = $('<div class="model-loading-indicator">' +
                        '<div class="loading-spinner"></div>' +
                        '<div class="loading-text">Loading 3D model...</div>' +
                        '<div class="loading-progress">0%</div>' +
                        '</div>');
                    $('.blasti-configurator-container').append(indicator);
                } else {
                    loadingIndicator.show();
                }
            } else {
                loadingIndicator.fadeOut(300, function () {
                    $(this).remove();
                });
            }
        },

        // Update loading progress display
        // Requirements: 2.3
        updateLoadingProgress: function (percent) {
            $('.loading-progress').text(percent + '%');
        },

        // Show model loading error
        // Requirements: 2.3
        showModelLoadError: function (modelUrl) {
            const errorMessage = 'Failed to load 3D model. Please check that the model file exists and is in GLB/GLTF format.';
            this.showError(errorMessage);

            // Log detailed error for debugging
            console.error('Model load error details:', {
                url: modelUrl,
                timestamp: new Date().toISOString()
            });
        },

        // Clear model cache (useful for memory management)
        // Requirements: 2.3
        clearModelCache: function () {
            console.log('Clearing model cache...');

            // Dispose of cached models to free memory
            Object.keys(this.config.modelCache).forEach(function (key) {
                const model = this.config.modelCache[key];
                if (model) {
                    model.traverse(function (child) {
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(function (mat) {
                                    mat.dispose();
                                });
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
            }.bind(this));

            this.config.modelCache = {};
            console.log('Model cache cleared');
        },

        // Get cache statistics
        // Requirements: 2.3
        getModelCacheStats: function () {
            const stats = {
                cachedModels: Object.keys(this.config.modelCache).length,
                loadingModels: Object.keys(this.config.loadingModels).length,
                cacheKeys: Object.keys(this.config.modelCache)
            };

            console.log('Model cache statistics:', stats);
            return stats;
        },

        // Bind event listeners
        bindEvents: function () {
            const self = this;

            // Pegboard selection with validation
            $(document).on('click', '.pegboard-item', function () {
                // Check if item is disabled (out of stock)
                if ($(this).hasClass('disabled')) {
                    self.showError('This pegboard is currently out of stock');
                    return;
                }

                const pegboardId = $(this).data('product-id');
                self.selectPegboard(pegboardId);
            });

            // Accessory selection with validation
            $(document).on('click', '.accessory-item', function () {
                // Check if item is disabled (out of stock)
                if ($(this).hasClass('disabled')) {
                    self.showError('This accessory is currently out of stock');
                    return;
                }

                const accessoryId = $(this).data('product-id');
                self.selectAccessory(accessoryId);
            });

            // Add to cart button
            $(document).on('click', '#add-to-cart-btn', function () {
                self.addToCart();
            });

            // Remove accessory
            $(document).on('click', '.remove-accessory-btn', function () {
                const placementId = $(this).data('placement-id');
                self.removeAccessory(placementId);
            });

            // Reposition accessory
            $(document).on('click', '.reposition-accessory-btn', function () {
                const placementId = $(this).data('placement-id');
                self.repositionAccessory(placementId);
            });

            // Remove pegboard
            $(document).on('click', '.remove-pegboard-btn', function () {
                self.removePegboard();
            });

            // Camera angle buttons (placeholder)
            $(document).on('click', '.camera-angle-btn', function () {
                const angle = $(this).data('angle');
                self.setCameraAngle(angle);
            });

            // Accessory filter controls
            // Requirements: 3.1, 12.2, 12.4

            // Toggle filters visibility
            $(document).on('click', '#toggle-filters-btn', function () {
                $('#accessory-filters').slideToggle(200);
                $(this).toggleClass('active');
            });

            // Search filter with debounce
            let searchTimeout;
            $(document).on('input', '#accessory-search', function () {
                clearTimeout(searchTimeout);
                const searchTerm = $(this).val();

                searchTimeout = setTimeout(function () {
                    self.applyAccessoryFilters();
                }, 300);
            });

            // Category filter buttons
            $(document).on('click', '#category-filters .filter-btn', function () {
                $('#category-filters .filter-btn').removeClass('active');
                $(this).addClass('active');
                self.applyAccessoryFilters();
            });

            // Compatibility filter buttons
            $(document).on('click', '#filter-compatible, #filter-all', function () {
                $('#filter-compatible, #filter-all').removeClass('active');
                $(this).addClass('active');
                self.applyAccessoryFilters();
            });
        },

        // Apply accessory filters based on current filter state
        // Requirements: 3.1, 12.2, 12.4
        applyAccessoryFilters: function () {
            const filterOptions = {};

            // Get search term
            const searchTerm = $('#accessory-search').val();
            if (searchTerm) {
                filterOptions.search = searchTerm;
            }

            // Get selected category
            const selectedCategory = $('#category-filters .filter-btn.active').data('category');
            if (selectedCategory && selectedCategory !== 'all') {
                filterOptions.category = selectedCategory;
            }

            // Get compatibility filter
            const compatibilityFilter = $('#filter-compatible').hasClass('active');
            filterOptions.compatibleOnly = compatibilityFilter;

            // Apply filters
            this.displayAccessories(filterOptions);
        },

        // Initialize category filter buttons based on available accessories
        // Requirements: 12.4
        initializeCategoryFilters: function () {
            const self = this;

            if (!this.config.allProducts) {
                return;
            }

            // Get all unique categories from accessories
            const categories = new Set();
            this.config.allProducts.forEach(function (product) {
                if (product.type === 'accessory' && product.categories) {
                    product.categories.forEach(function (category) {
                        categories.add(category);
                    });
                }
            });

            // Add category filter buttons
            const categoryFilters = $('#category-filters');
            const allButton = categoryFilters.find('[data-category="all"]');

            // Remove existing category buttons (except "All")
            categoryFilters.find('.filter-btn:not([data-category="all"])').remove();

            // Add buttons for each category
            Array.from(categories).sort().forEach(function (category) {
                const button = $('<button class="filter-btn" data-category="' + category + '" type="button">' +
                    category +
                    '</button>');
                categoryFilters.append(button);
            });

            console.log('Category filters initialized with', categories.size, 'categories');
        },

        // Load products from server
        loadProducts: function () {
            const self = this;

            $.ajax({
                url: blastiConfigurator.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'blasti_get_products',
                    nonce: blastiConfigurator.nonce
                },
                success: function (response) {
                    if (response.success) {
                        self.displayProducts(response.data);
                    } else {
                        console.error('Failed to load products:', response.data);
                    }
                },
                error: function () {
                    console.error('AJAX error loading products');
                }
            });
        },

        // Create pegboard element with preview image and specifications
        // Requirements: 2.3, 12.1, 12.3
        createPegboardElement: function (pegboard) {
            const self = this;

            // Use placeholder if no image
            const imageUrl = pegboard.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

            // Build specifications display
            let specsHtml = '';
            if (pegboard.dimensions) {
                const dims = pegboard.dimensions;
                if (dims.width && dims.height) {
                    specsHtml += '<div class="spec-item">' +
                        '<span class="spec-label">Size:</span> ' +
                        dims.width + ' × ' + dims.height +
                        (dims.depth ? ' × ' + dims.depth : '') +
                        '</div>';
                }
            }

            // Add SKU if available
            if (pegboard.sku) {
                specsHtml += '<div class="spec-item">' +
                    '<span class="spec-label">SKU:</span> ' + pegboard.sku +
                    '</div>';
            }

            // Build badges
            let badgesHtml = '';
            if (pegboard.featured) {
                badgesHtml += '<span class="product-badge featured">Featured</span> ';
            }
            if (!pegboard.in_stock) {
                badgesHtml += '<span class="product-badge out-of-stock">Out of Stock</span> ';
            } else if (pegboard.stock_quantity && pegboard.stock_quantity < 5) {
                badgesHtml += '<span class="product-badge low-stock">Low Stock</span> ';
            }

            // Create the element
            const item = $('<div class="product-item pegboard-item" ' +
                'data-product-id="' + pegboard.id + '" ' +
                'data-price="' + pegboard.price + '" ' +
                'data-model-url="' + (pegboard.model_url || '') + '" ' +
                'data-dimensions=\'' + JSON.stringify(pegboard.dimensions || {}) + '\' ' +
                'title="' + pegboard.name + (pegboard.description ? ' - ' + pegboard.description : '') + '">' +
                '<img src="' + imageUrl + '" alt="' + pegboard.name + '" ' +
                'onerror="this.src=\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+\';">' +
                '<div class="product-info">' +
                '<div class="product-name">' + pegboard.name + '</div>' +
                '<div class="product-price">' + pegboard.formatted_price + '</div>' +
                (specsHtml ? '<div class="product-specs">' + specsHtml + '</div>' : '') +
                (badgesHtml ? '<div class="product-badges">' + badgesHtml + '</div>' : '') +
                '</div>' +
                '</div>');

            // Disable if out of stock
            if (!pegboard.in_stock) {
                item.addClass('disabled').css({
                    'opacity': '0.6',
                    'cursor': 'not-allowed'
                });
            }

            return item;
        },

        // Create accessory element with preview image and specifications
        // Requirements: 3.1, 12.2, 12.4
        createAccessoryElement: function (accessory) {
            const self = this;

            // Use placeholder if no image
            const imageUrl = accessory.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

            // Build specifications display
            let specsHtml = '';
            if (accessory.dimensions) {
                const dims = accessory.dimensions;
                if (dims.width && dims.height) {
                    specsHtml += '<div class="spec-item">' +
                        '<span class="spec-label">Size:</span> ' +
                        dims.width + ' × ' + dims.height +
                        '</div>';
                }
            }

            // Add category if available
            if (accessory.categories && accessory.categories.length > 0) {
                specsHtml += '<div class="spec-item">' +
                    '<span class="spec-label">Type:</span> ' + accessory.categories[0] +
                    '</div>';
            }

            // Build badges
            let badgesHtml = '';
            if (accessory.featured) {
                badgesHtml += '<span class="product-badge featured">Popular</span> ';
            }
            if (!accessory.in_stock) {
                badgesHtml += '<span class="product-badge out-of-stock">Out of Stock</span> ';
            } else if (accessory.stock_quantity && accessory.stock_quantity < 5) {
                badgesHtml += '<span class="product-badge low-stock">Low Stock</span> ';
            }

            // Create the element
            const item = $('<div class="product-item accessory-item" ' +
                'data-product-id="' + accessory.id + '" ' +
                'data-price="' + accessory.price + '" ' +
                'data-model-url="' + (accessory.model_url || '') + '" ' +
                'data-dimensions=\'' + JSON.stringify(accessory.dimensions || {}) + '\' ' +
                'title="' + accessory.name + (accessory.description ? ' - ' + accessory.description : '') + '">' +
                '<img src="' + imageUrl + '" alt="' + accessory.name + '" ' +
                'onerror="this.src=\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNlMGUwZTAiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+\';">' +
                '<div class="product-info">' +
                '<div class="product-name">' + accessory.name + '</div>' +
                '<div class="product-price">' + accessory.formatted_price + '</div>' +
                (specsHtml ? '<div class="product-specs">' + specsHtml + '</div>' : '') +
                (badgesHtml ? '<div class="product-badges">' + badgesHtml + '</div>' : '') +
                '</div>' +
                '</div>');

            // Disable if out of stock
            if (!accessory.in_stock) {
                item.addClass('disabled').css({
                    'opacity': '0.6',
                    'cursor': 'not-allowed'
                });
            }

            return item;
        },

        // Display products in the interface
        // Requirements: 2.3, 12.1, 12.3
        displayProducts: function (data) {
            const self = this;

            // Store all products for filtering
            this.config.allProducts = data.products || [];

            // Display pegboards with enhanced UI
            const pegboardList = $('#pegboard-list');
            if (pegboardList.length && data.products) {
                pegboardList.empty();

                // Filter pegboards
                const pegboards = data.products.filter(function (product) {
                    return product.type === 'pegboard';
                });

                if (pegboards.length === 0) {
                    pegboardList.html('<p style="padding: 10px; color: #666;">No pegboards available</p>');
                    return;
                }

                pegboards.forEach(function (pegboard) {
                    const item = self.createPegboardElement(pegboard);
                    pegboardList.append(item);

                    // Cache price data
                    self.config.productPrices[pegboard.id] = {
                        id: pegboard.id,
                        price: pegboard.price,
                        formatted_price: pegboard.formatted_price
                    };
                });
            }

            // Initialize category filters based on available accessories
            // Requirements: 12.4
            this.initializeCategoryFilters();

            // Display accessories with enhanced UI and filtering
            // Requirements: 3.1, 12.2, 12.4
            this.displayAccessories();
        },

        // Display accessories with filtering by compatibility
        // Requirements: 3.1, 12.2, 12.4
        displayAccessories: function (filterOptions) {
            const self = this;
            filterOptions = filterOptions || {};

            const accessoryList = $('#accessory-list');
            if (!accessoryList.length || !this.config.allProducts) {
                return;
            }

            accessoryList.empty();

            // Filter accessories
            let accessories = this.config.allProducts.filter(function (product) {
                return product.type === 'accessory';
            });

            if (accessories.length === 0) {
                accessoryList.html('<p style="padding: 10px; color: #666;">No accessories available</p>');
                return;
            }

            // Apply compatibility filter if pegboard is selected
            // Requirements: 3.1, 12.2
            if (this.config.currentPegboard && filterOptions.compatibleOnly !== false) {
                accessories = this.filterAccessoriesByCompatibility(accessories, this.config.currentPegboard.id);
            }

            // Apply category filter if specified
            // Requirements: 12.4
            if (filterOptions.category) {
                accessories = accessories.filter(function (accessory) {
                    return accessory.categories && accessory.categories.includes(filterOptions.category);
                });
            }

            // Apply search filter if specified
            if (filterOptions.search) {
                const searchTerm = filterOptions.search.toLowerCase();
                accessories = accessories.filter(function (accessory) {
                    return accessory.name.toLowerCase().includes(searchTerm) ||
                        (accessory.description && accessory.description.toLowerCase().includes(searchTerm));
                });
            }

            // Sort accessories: popular first, then by name
            // Requirements: 12.2
            accessories.sort(function (a, b) {
                // Featured/popular items first
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;

                // Then alphabetically
                return a.name.localeCompare(b.name);
            });

            // Display filtered accessories
            if (accessories.length === 0) {
                let message = 'No accessories found';
                if (this.config.currentPegboard) {
                    message = 'No compatible accessories found for this pegboard';
                }
                if (filterOptions.search) {
                    message = 'No accessories match your search';
                }
                accessoryList.html('<p style="padding: 10px; color: #666;">' + message + '</p>');
                return;
            }

            // Group accessories by category for better organization
            // Requirements: 12.4
            const categorizedAccessories = this.categorizeAccessories(accessories);

            // Display accessories by category
            Object.keys(categorizedAccessories).forEach(function (category) {
                const categoryAccessories = categorizedAccessories[category];

                // Add category header if there are multiple categories
                if (Object.keys(categorizedAccessories).length > 1) {
                    const categoryHeader = $('<div class="accessory-category-header">' +
                        '<h4>' + category + '</h4>' +
                        '</div>');
                    accessoryList.append(categoryHeader);
                }

                // Add accessories in this category
                categoryAccessories.forEach(function (accessory) {
                    const item = self.createAccessoryElement(accessory);

                    // Add compatibility indicator if pegboard is selected
                    if (self.config.currentPegboard) {
                        const isCompatible = self.isAccessoryCompatible(accessory, self.config.currentPegboard.id);
                        if (isCompatible) {
                            item.addClass('compatible');
                            item.find('.product-badges').prepend('<span class="product-badge compatible">Compatible</span> ');
                        }
                    }

                    accessoryList.append(item);

                    // Cache price data
                    self.config.productPrices[accessory.id] = {
                        id: accessory.id,
                        price: accessory.price,
                        formatted_price: accessory.formatted_price
                    };
                });
            });

            // Update accessory count display
            this.updateAccessoryCount(accessories.length);
        },

        // Filter accessories by compatibility with selected pegboard
        // Requirements: 3.1, 12.2
        filterAccessoriesByCompatibility: function (accessories, pegboardId) {
            const self = this;

            return accessories.filter(function (accessory) {
                return self.isAccessoryCompatible(accessory, pegboardId);
            });
        },

        // Check if accessory is compatible with pegboard
        // Requirements: 3.1, 12.2
        isAccessoryCompatible: function (accessory, pegboardId) {
            // If no compatibility data, assume compatible
            if (!accessory.compatibility || accessory.compatibility.length === 0) {
                return true;
            }

            // Check if pegboard ID is in compatibility list
            return accessory.compatibility.includes(pegboardId) ||
                accessory.compatibility.includes('all') ||
                accessory.compatibility.includes('*');
        },

        // Categorize accessories for organized display
        // Requirements: 12.4
        categorizeAccessories: function (accessories) {
            const categorized = {};

            accessories.forEach(function (accessory) {
                let category = 'Other';

                if (accessory.categories && accessory.categories.length > 0) {
                    category = accessory.categories[0];
                }

                if (!categorized[category]) {
                    categorized[category] = [];
                }

                categorized[category].push(accessory);
            });

            return categorized;
        },

        // Update accessory count display
        updateAccessoryCount: function (count) {
            const countDisplay = $('.accessory-count');
            if (countDisplay.length) {
                countDisplay.text(count + ' ' + (count === 1 ? 'accessory' : 'accessories'));
            }
        },

        // Select a pegboard
        // Requirements: 2.3 (display pegboard model), 3.3 (grid system)
        selectPegboard: function (pegboardId) {
            console.log('Selecting pegboard:', pegboardId);
            const self = this;

            // Get pegboard data from the UI element
            const pegboardElement = $('.pegboard-item[data-product-id="' + pegboardId + '"]');
            const dimensionsData = pegboardElement.data('dimensions') || {};

            const pegboardData = {
                id: pegboardId,
                name: pegboardElement.find('.product-name').text(),
                price: pegboardElement.data('price') || 0,
                model_url: pegboardElement.data('model-url') || '',
                dimensions: dimensionsData
            };

            // Check if model URL is provided
            if (!pegboardData.model_url) {
                console.warn('No model URL provided for pegboard');
                this.showError('This pegboard does not have a 3D model configured. Please configure a model in the admin panel.');
                return;
            }

            // Show loading message
            this.showMessage('Loading pegboard...', 'info');

            // Load 3D model first, only update UI if successful
            console.log('Loading pegboard 3D model:', pegboardData.model_url);

            this.loadModel(pegboardData.model_url, 'pegboard-' + pegboardId)
                .then(function (model) {
                    console.log('Pegboard model loaded successfully');

                    // Remove any existing pegboard model and accessories
                    if (self.config.currentPegboardModel) {
                        self.config.scene.remove(self.config.currentPegboardModel);
                    }

                    // Clear placed accessories when changing pegboard
                    self.config.placedAccessories.forEach(function (accessory) {
                        if (accessory.model) {
                            self.config.scene.remove(accessory.model);
                        }
                    });
                    self.config.placedAccessories = [];
                    self.updatePlacedAccessoriesDisplay();

                    // Position and scale the pegboard model
                    self.positionPegboardModel(model, pegboardData.dimensions);

                    // Add to scene
                    self.config.scene.add(model);
                    console.log('Model added to scene. Scene children count:', self.config.scene.children.length);

                    // Store reference
                    self.config.currentPegboardModel = model;

                    // Log final model state
                    const finalBox = new THREE.Box3().setFromObject(model);
                    const finalSize = new THREE.Vector3();
                    finalBox.getSize(finalSize);
                    console.log('Final model size in scene:', finalSize);
                    console.log('Final model position:', model.position);
                    console.log('Final model scale:', model.scale);

                    // Check model contents
                    let meshCount = 0;
                    let materialCount = 0;
                    model.traverse(function (child) {
                        if (child.isMesh) {
                            meshCount++;
                            if (child.material) {
                                materialCount++;
                                console.log('Mesh material:', {
                                    visible: child.visible,
                                    materialType: child.material.type,
                                    opacity: child.material.opacity,
                                    transparent: child.material.transparent
                                });
                            }
                        }
                    });
                    console.log('Model contains:', meshCount, 'meshes with', materialCount, 'materials');

                    // Add axes helper (shows X=red, Y=green, Z=blue)
                    // Always show axes for orientation reference
                    const axesHelper = new THREE.AxesHelper(0.5); // 50cm long
                    self.config.scene.add(axesHelper);
                    console.log('Added axes helper (50cm) at origin');

                    // Initialize grid system for accessory placement using ACTUAL model size
                    const actualSize = new THREE.Vector3();
                    finalBox.getSize(actualSize);
                    const actualDimensions = {
                        width: actualSize.x,
                        height: actualSize.y,
                        depth: actualSize.z
                    };
                    console.log('🔧 Using actual pegboard size for grid:', actualDimensions);
                    self.initializeGridSystem(actualDimensions);

                    // DON'T adjust camera for pegboard - keep the default view
                    // The pegboard should be visible from the initial camera position
                    // self.frameCameraToModel(model);  // Commented out - causes camera to move too close
                    console.log('🎥 Keeping camera at default position for better overview');

                    // NOW update configuration and UI (only after successful load)
                    self.config.currentPegboard = pegboardData;

                    // Update UI
                    $('.pegboard-item').removeClass('selected');
                    pegboardElement.addClass('selected');

                    // Update current pegboard display
                    $('#current-pegboard').html(
                        '<div class="selected-pegboard">' +
                        '<span class="pegboard-name">' + pegboardData.name + '</span>' +
                        '<button class="remove-pegboard-btn" type="button">&times;</button>' +
                        '</div>'
                    );

                    // Update price
                    self.updatePrice();

                    // Refresh accessory list to show only compatible accessories
                    // Requirements: 3.1, 12.2
                    self.displayAccessories({ compatibleOnly: true });

                    // Show success message
                    self.showMessage('Pegboard "' + pegboardData.name + '" added successfully!', 'success');

                    console.log('Pegboard model added to scene with grid system');
                })
                .catch(function (error) {
                    console.error('Failed to load pegboard model:', error);
                    self.showError('Failed to load 3D model for this pegboard. Please check that the model file exists and is in GLB/GLTF format.');

                    // Do NOT update UI or configuration if model fails to load
                    $('.pegboard-item').removeClass('selected');
                });
        },

        // Position and scale pegboard model based on dimensions
        // Requirements: 2.3
        positionPegboardModel: function (model, dimensions) {
            if (!model) return;

            // IMPORTANT: Reset any existing transformations first
            model.scale.set(1, 1, 1);
            model.position.set(0, 0, 0);
            model.rotation.set(0, 0, 0);

            // Force update the matrix
            model.updateMatrix();
            model.updateMatrixWorld(true);

            // Calculate bounding box to understand ORIGINAL model size
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);

            console.log('🔧 Model original size (after reset):', size);
            console.log('🔧 Target dimensions:', dimensions);

            // Check if model is lying flat (Y dimension is much smaller than X or Z)
            const isLyingFlat = size.y < Math.max(size.x, size.z) * 0.5;
            if (isLyingFlat) {
                console.log('⚠️ Model appears to be lying flat (Y=' + size.y + ' vs X=' + size.x + ', Z=' + size.z + ')');
                console.log('🔄 Rotating model 90° around X axis to stand it up');
                model.rotation.x = Math.PI / 2; // Rotate 90 degrees
                model.updateMatrix();
                model.updateMatrixWorld(true);

                // Recalculate size after rotation
                const rotatedBox = new THREE.Box3().setFromObject(model);
                rotatedBox.getSize(size);
                console.log('🔧 Model size after rotation:', size);
            }

            // Check if model is in centimeters (needs conversion to meters)
            // If largest dimension > 10, assume it's in centimeters
            const maxDim = Math.max(size.x, size.y, size.z);
            let scale = 1;

            if (maxDim > 10) {
                // Model is in centimeters, convert to meters
                scale = 0.01; // Divide by 100
                console.log('🔧 Model appears to be in centimeters, converting to meters (scale: 0.01)');
            }

            console.log('🔧 Model size:', {
                original: { x: size.x, y: size.y, z: size.z },
                unit: maxDim > 10 ? 'centimeters' : 'meters',
                finalSize: {
                    x: (size.x * scale).toFixed(3) + 'm',
                    y: (size.y * scale).toFixed(3) + 'm',
                    z: (size.z * scale).toFixed(3) + 'm'
                }
            });

            model.scale.set(scale, scale, scale);

            // Position pegboard - center it and lift it off the ground
            // After rotation and scaling, recalculate the bounding box
            model.updateMatrix();
            model.updateMatrixWorld(true);

            const finalBox = new THREE.Box3().setFromObject(model);
            const finalSize = new THREE.Vector3();
            const finalCenter = new THREE.Vector3();
            finalBox.getSize(finalSize);
            finalBox.getCenter(finalCenter);

            // Position so the bottom of the pegboard is at y=0 and centered on X and Z
            model.position.set(
                -finalCenter.x,  // Center on X axis
                finalSize.y / 2 - finalCenter.y,  // Bottom at y=0
                -finalCenter.z   // Center on Z axis
            );

            // Force update transformations
            model.updateMatrix();
            model.updateMatrixWorld(true);

            console.log('🔧 Pegboard positioned at:', model.position);
            console.log('🔧 Pegboard scale:', model.scale);
            console.log('🔧 Pegboard final size:', finalSize);
        },

        // Initialize grid system for accessory placement with peg holes
        // Requirements: 3.3
        initializeGridSystem: function (dimensions) {
            const self = this;

            // Peg hole spacing (standard pegboard has holes every 1 inch = 2.54cm)
            const pegHoleSpacing = 0.0254; // 2.54cm in meters

            // Get dimensions and convert from cm to meters if needed
            let width = dimensions && dimensions.width ? dimensions.width : 1.0;
            let height = dimensions && dimensions.height ? dimensions.height : 1.0;

            // If dimensions are > 10, assume they're in cm and convert to meters
            if (width > 10) {
                width = width / 100;
                height = height / 100;
                console.log('Grid: Converted dimensions from cm to meters:', { width: width, height: height });
            }

            // Generate peg hole positions
            const pegHoles = [];
            const holesX = Math.floor(width / pegHoleSpacing);
            const holesY = Math.floor(height / pegHoleSpacing);

            for (let x = 0; x <= holesX; x++) {
                for (let y = 0; y <= holesY; y++) {
                    pegHoles.push({
                        x: (x * pegHoleSpacing) - (width / 2),
                        y: (y * pegHoleSpacing) - (height / 2),
                        occupied: false
                    });
                }
            }

            // Store grid configuration with peg holes
            this.config.gridSystem = {
                enabled: true,
                pegHoleSpacing: pegHoleSpacing,
                width: width,
                height: height,
                pegHoles: pegHoles,
                occupiedPositions: new Map() // Map of placement IDs to occupied peg holes
            };

            // Create visual grid helper (optional, for debugging)
            if (this.config.showGrid) {
                this.createPegHoleHelper(pegHoles);
            }

            console.log('Grid system initialized with peg holes:', {
                spacing: pegHoleSpacing,
                width: width,
                height: height,
                totalHoles: pegHoles.length,
                holesX: holesX + 1,
                holesY: holesY + 1
            });
        },

        // Create visual peg hole helper
        // Requirements: 3.3
        createPegHoleHelper: function (pegHoles) {
            // Remove existing helper if present
            if (this.config.pegHoleHelper) {
                this.config.scene.remove(this.config.pegHoleHelper);
            }

            const pegHoleHelper = new THREE.Group();
            const dotGeometry = new THREE.CircleGeometry(0.002, 8);
            const dotMaterial = new THREE.MeshBasicMaterial({
                color: 0x888888,
                opacity: 0.5,
                transparent: true,
                side: THREE.DoubleSide
            });

            pegHoles.forEach(function (hole) {
                const dot = new THREE.Mesh(dotGeometry, dotMaterial);
                dot.position.set(hole.x, hole.y, 0.01);
                pegHoleHelper.add(dot);
            });

            this.config.scene.add(pegHoleHelper);
            this.config.pegHoleHelper = pegHoleHelper;

            console.log('Peg hole helper created with', pegHoles.length, 'holes');
        },

        // Create visual grid helper
        // Requirements: 3.3
        createGridHelper: function (width, height, gridSize) {
            // Remove existing grid helper if present
            if (this.config.gridHelper) {
                this.config.scene.remove(this.config.gridHelper);
            }

            const gridHelper = new THREE.Group();

            // Create grid lines
            const material = new THREE.LineBasicMaterial({
                color: 0x888888,
                opacity: 0.3,
                transparent: true
            });

            // Vertical lines
            for (let x = -width / 2; x <= width / 2; x += gridSize) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(x, -height / 2, 0.01),
                    new THREE.Vector3(x, height / 2, 0.01)
                ]);
                const line = new THREE.Line(geometry, material);
                gridHelper.add(line);
            }

            // Horizontal lines
            for (let y = -height / 2; y <= height / 2; y += gridSize) {
                const geometry = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(-width / 2, y, 0.01),
                    new THREE.Vector3(width / 2, y, 0.01)
                ]);
                const line = new THREE.Line(geometry, material);
                gridHelper.add(line);
            }

            this.config.scene.add(gridHelper);
            this.config.gridHelper = gridHelper;

            console.log('Grid helper created');
        },

        // Snap position to nearest peg hole
        // Requirements: 3.3
        snapToGrid: function (position) {
            if (!this.config.gridSystem || !this.config.gridSystem.enabled) {
                return position;
            }

            // Find nearest peg hole
            const pegHoles = this.config.gridSystem.pegHoles;
            let nearestHole = null;
            let minDistance = Infinity;

            pegHoles.forEach(function (hole) {
                const dx = hole.x - position.x;
                const dy = hole.y - position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestHole = hole;
                }
            });

            if (nearestHole) {
                return {
                    x: nearestHole.x,
                    y: nearestHole.y,
                    z: position.z
                };
            }

            return position;
        },

        // Find peg hole at position (with small tolerance)
        // Requirements: 3.3
        findPegHoleAtPosition: function (position) {
            if (!this.config.gridSystem) {
                return null;
            }

            const tolerance = 0.001; // 1mm tolerance
            const pegHoles = this.config.gridSystem.pegHoles;

            for (let i = 0; i < pegHoles.length; i++) {
                const hole = pegHoles[i];
                const dx = Math.abs(hole.x - position.x);
                const dy = Math.abs(hole.y - position.y);

                if (dx < tolerance && dy < tolerance) {
                    return hole;
                }
            }

            return null;
        },

        // Check if grid position is valid for placement
        // Requirements: 3.3, 3.4
        isValidGridPosition: function (position, dimensions) {
            if (!this.config.gridSystem) {
                return false;
            }

            const grid = this.config.gridSystem;
            const snappedPos = this.snapToGrid(position);

            // Check if position is on a valid peg hole
            const pegHole = this.findPegHoleAtPosition(snappedPos);
            if (!pegHole) {
                console.log('❌ Validation failed: No peg hole at position', snappedPos);
                return false;
            }

            // Check bounds
            const halfWidth = grid.width / 2;
            const halfHeight = grid.height / 2;

            const accessoryWidth = dimensions.width || 0.05;
            const accessoryHeight = dimensions.height || 0.05;

            const bounds = {
                minX: snappedPos.x - accessoryWidth / 2,
                maxX: snappedPos.x + accessoryWidth / 2,
                minY: snappedPos.y - accessoryHeight / 2,
                maxY: snappedPos.y + accessoryHeight / 2,
                gridMinX: -halfWidth,
                gridMaxX: halfWidth,
                gridMinY: -halfHeight,
                gridMaxY: halfHeight
            };

            if (bounds.minX < bounds.gridMinX || bounds.maxX > bounds.gridMaxX ||
                bounds.minY < bounds.gridMinY || bounds.maxY > bounds.gridMaxY) {
                console.log('❌ Validation failed: Out of bounds', bounds);
                return false;
            }

            // Check for overlaps with placed accessories using bounding box collision
            const hasOverlap = this.checkAccessoryOverlap(snappedPos, dimensions);
            if (hasOverlap) {
                console.log('❌ Validation failed: Overlap detected');
            }

            return !hasOverlap;
        },

        // Check for accessory overlap with 2cm margin
        // Requirements: 3.4
        checkAccessoryOverlap: function (position, dimensions, excludePlacementId) {
            if (!this.config.placedAccessories || this.config.placedAccessories.length === 0) {
                return false;
            }

            const margin = 0.02; // 2cm margin between accessories
            const newWidth = (dimensions.width || 0.05) + margin;
            const newHeight = (dimensions.height || 0.05) + margin;

            // Create bounding box for new accessory
            const newBox = {
                minX: position.x - newWidth / 2,
                maxX: position.x + newWidth / 2,
                minY: position.y - newHeight / 2,
                maxY: position.y + newHeight / 2
            };

            console.log('🔍 Checking overlap for new accessory:', {
                position: position,
                dimensions: dimensions,
                newBox: newBox,
                placedAccessoriesCount: this.config.placedAccessories.length
            });

            // Check against all placed accessories
            for (let i = 0; i < this.config.placedAccessories.length; i++) {
                const accessory = this.config.placedAccessories[i];

                // Skip if this is the accessory being repositioned
                if (excludePlacementId && accessory.placementId === excludePlacementId) {
                    continue;
                }

                // Use stored dimensions (which are already calculated from model)
                let actualWidth = accessory.dimensions.width || 0.05;
                let actualHeight = accessory.dimensions.height || 0.05;

                console.log('🔍 Placed accessory #' + i + ' dimensions:', {
                    name: accessory.name,
                    dimensions: accessory.dimensions,
                    position: accessory.position
                });

                const existingWidth = actualWidth + margin;
                const existingHeight = actualHeight + margin;

                // Create bounding box for existing accessory
                const existingBox = {
                    minX: accessory.position.x - existingWidth / 2,
                    maxX: accessory.position.x + existingWidth / 2,
                    minY: accessory.position.y - existingHeight / 2,
                    maxY: accessory.position.y + existingHeight / 2
                };

                console.log('🔍 Comparing with placed accessory #' + i + ':', {
                    name: accessory.name,
                    existingBox: existingBox,
                    newBox: newBox
                });

                // Check for overlap
                const overlaps = !(newBox.maxX < existingBox.minX ||
                    newBox.minX > existingBox.maxX ||
                    newBox.maxY < existingBox.minY ||
                    newBox.minY > existingBox.maxY);

                if (overlaps) {
                    console.log('❌ OVERLAP DETECTED with accessory #' + i + ':', {
                        name: accessory.name,
                        existingBox: existingBox,
                        newBox: newBox,
                        xOverlap: !(newBox.maxX < existingBox.minX || newBox.minX > existingBox.maxX),
                        yOverlap: !(newBox.maxY < existingBox.minY || newBox.minY > existingBox.maxY)
                    });
                    return true; // Overlap detected
                }
            }

            console.log('✅ No overlap detected');
            return false; // No overlap
        },

        // Get model dimensions in local space (unaffected by rotation/position)
        // Requirements: 3.4
        getModelDimensions: function (model) {
            if (!model) {
                return { width: 0.05, height: 0.05, depth: 0.05 };
            }

            // Calculate bounding box from geometry in local space
            const bbox = new THREE.Box3();
            
            model.traverse(function (child) {
                if (child.isMesh && child.geometry) {
                    // Get geometry bounding box (local space, no transformations)
                    if (!child.geometry.boundingBox) {
                        child.geometry.computeBoundingBox();
                    }
                    
                    const geomBox = child.geometry.boundingBox.clone();
                    
                    // Apply only the scale (not rotation or position)
                    geomBox.min.multiply(child.scale);
                    geomBox.max.multiply(child.scale);
                    
                    // Apply parent scale if exists
                    if (model.scale) {
                        geomBox.min.multiply(model.scale);
                        geomBox.max.multiply(model.scale);
                    }
                    
                    bbox.union(geomBox);
                }
            });

            const size = new THREE.Vector3();
            bbox.getSize(size);

            // Return absolute values (in case of negative scales)
            return {
                width: Math.abs(size.x),
                height: Math.abs(size.y),
                depth: Math.abs(size.z)
            };
        },

        // Orient accessory model to face pegboard correctly
        // Requirements: 3.2
        orientAccessoryModel: function (model, intersectionData) {
            if (!model || !intersectionData) {
                return;
            }

            // Get surface normal from intersection
            const normal = intersectionData.face ? intersectionData.face.normal.clone() : new THREE.Vector3(0, 0, 1);

            // Transform normal to world space
            if (intersectionData.object) {
                normal.transformDirection(intersectionData.object.matrixWorld);
            }

            // Ensure accessory faces outward from pegboard
            // Pegboard typically faces +Z direction, accessories should face same direction
            const targetNormal = new THREE.Vector3(0, 0, 1);

            // Calculate rotation to align accessory with pegboard surface
            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), targetNormal);

            model.quaternion.copy(quaternion);

            // Ensure accessory is upright (Y-axis points up)
            const up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(model.quaternion);

            // If accessory is tilted, correct it
            if (Math.abs(up.y) < 0.9) {
                // Reset to upright orientation
                model.rotation.set(0, 0, 0);
            }

            // Apply 180 degree horizontal rotation (flip to face correct direction)
            model.rotation.y += Math.PI;

            console.log('Accessory oriented with normal:', normal, 'rotation:', model.rotation);
        },

        // Select an accessory for placement
        // Requirements: 2.3 (display accessory model), 3.2 (click-to-place)
        selectAccessory: function (accessoryId) {
            console.log('Selecting accessory for placement:', accessoryId);
            const self = this;

            // Get accessory data from the UI element
            const accessoryElement = $('.accessory-item[data-product-id="' + accessoryId + '"]');
            const dimensionsData = accessoryElement.data('dimensions') || {};

            const accessoryData = {
                id: accessoryId,
                name: accessoryElement.find('.product-name').text(),
                price: accessoryElement.data('price') || 0,
                model_url: accessoryElement.data('model-url') || '',
                dimensions: dimensionsData
            };

            // Check if pegboard is selected
            if (!this.config.currentPegboard) {
                this.showError('Please select a pegboard first');
                return;
            }

            // Check if grid system is initialized
            if (!this.config.gridSystem) {
                this.showError('Grid system not initialized. Please select a pegboard first.');
                return;
            }

            // Load 3D model if URL is provided
            if (accessoryData.model_url) {
                console.log('Loading accessory 3D model:', accessoryData.model_url);

                this.loadModel(accessoryData.model_url, 'accessory-' + accessoryId)
                    .then(function (model) {
                        console.log('Accessory model loaded successfully');

                        // Log accessory size before any modifications
                        const bbox = new THREE.Box3().setFromObject(model);
                        const size = new THREE.Vector3();
                        bbox.getSize(size);
                        console.log('🔧 Accessory original size:', {
                            x: size.x,
                            y: size.y,
                            z: size.z,
                            scale: model.scale
                        });

                        // Check if accessory needs scaling (same logic as pegboard)
                        const maxDim = Math.max(size.x, size.y, size.z);
                        if (maxDim > 10) {
                            const scale = 0.01;
                            model.scale.set(scale, scale, scale);
                            model.updateMatrix();
                            model.updateMatrixWorld(true);

                            const newBbox = new THREE.Box3().setFromObject(model);
                            newBbox.getSize(size);
                            console.log('🔧 Accessory scaled from cm to m. New size:', {
                                x: size.x.toFixed(3) + 'm',
                                y: size.y.toFixed(3) + 'm',
                                z: size.z.toFixed(3) + 'm'
                            });
                        }

                        // Rotate accessory 180 degrees around Y axis (horizontal flip)
                        model.rotation.y = Math.PI; // 180 degrees
                        model.updateMatrix();
                        model.updateMatrixWorld(true);

                        // Log bounding box info to understand model pivot/center
                        const rotatedBbox = new THREE.Box3().setFromObject(model);
                        const center = new THREE.Vector3();
                        rotatedBbox.getCenter(center);
                        console.log('🔄 Rotated accessory 180° horizontally');
                        console.log('🔧 Model center after rotation:', center);
                        console.log('🔧 Model position:', model.position);

                        // Store accessory data for placement mode
                        self.config.placementMode = {
                            active: true,
                            accessoryData: accessoryData,
                            model: model,
                            previewModel: null
                        };

                        // Create preview model (semi-transparent)
                        const previewModel = model.clone();
                        previewModel.visible = true; // Ensure it's visible
                        self.makeModelTransparent(previewModel, 0.5);
                        self.config.placementMode.previewModel = previewModel;

                        // Add preview to scene
                        self.config.scene.add(previewModel);
                        console.log('🔧 Preview model added to scene, visible:', previewModel.visible);

                        // Enable placement mode UI
                        self.enablePlacementMode();

                        // Show instruction message
                        self.showMessage('Click on the pegboard to place the accessory. Press ESC to cancel.', 'info');

                        console.log('✅ Placement mode activated. Accessory size:', size);
                    })
                    .catch(function (error) {
                        console.error('Failed to load accessory model:', error);
                        self.showError('Failed to load 3D model for this accessory');
                    });
            } else {
                console.warn('No model URL provided for accessory');
                this.showError('This accessory does not have a 3D model configured');
            }
        },

        // Make model transparent for preview
        // Requirements: 3.2
        makeModelTransparent: function (model, opacity) {
            model.traverse(function (child) {
                if (child.isMesh && child.material) {
                    // Clone material to avoid affecting cached model
                    if (Array.isArray(child.material)) {
                        child.material = child.material.map(function (mat) {
                            const newMat = mat.clone();
                            newMat.transparent = true;
                            newMat.opacity = opacity;
                            newMat.depthWrite = false;
                            return newMat;
                        });
                    } else {
                        child.material = child.material.clone();
                        child.material.transparent = true;
                        child.material.opacity = opacity;
                        child.material.depthWrite = false;
                    }
                }
            });
        },

        // Enable placement mode UI and event listeners
        // Requirements: 3.2
        enablePlacementMode: function () {
            const self = this;

            // Add placement mode class to container
            $('.blasti-configurator-container').addClass('placement-mode');

            // Change cursor
            if (this.config.renderer && this.config.renderer.domElement) {
                this.config.renderer.domElement.style.cursor = 'crosshair';
            }

            // Setup mouse move listener for preview
            this.config.placementMouseMoveHandler = function (event) {
                self.updatePlacementPreview(event);
            };

            // Setup click listener for placement
            this.config.placementClickHandler = function (event) {
                self.placeAccessoryAtClick(event);
            };

            // Setup keyboard listener for cancellation
            this.config.placementKeyHandler = function (event) {
                if (event.key === 'Escape' || event.keyCode === 27) {
                    self.cancelPlacementMode();
                }
            };

            // Attach event listeners
            if (this.config.renderer && this.config.renderer.domElement) {
                this.config.renderer.domElement.addEventListener('mousemove', this.config.placementMouseMoveHandler);
                this.config.renderer.domElement.addEventListener('click', this.config.placementClickHandler);
            }
            document.addEventListener('keydown', this.config.placementKeyHandler);

            console.log('Placement mode UI enabled');
        },

        // Disable placement mode
        // Requirements: 3.2
        disablePlacementMode: function () {
            // Remove placement mode class
            $('.blasti-configurator-container').removeClass('placement-mode');

            // Reset cursor
            if (this.config.renderer && this.config.renderer.domElement) {
                this.config.renderer.domElement.style.cursor = 'default';
            }

            // Remove event listeners
            if (this.config.renderer && this.config.renderer.domElement) {
                if (this.config.placementMouseMoveHandler) {
                    this.config.renderer.domElement.removeEventListener('mousemove', this.config.placementMouseMoveHandler);
                }
                if (this.config.placementClickHandler) {
                    this.config.renderer.domElement.removeEventListener('click', this.config.placementClickHandler);
                }
            }
            if (this.config.placementKeyHandler) {
                document.removeEventListener('keydown', this.config.placementKeyHandler);
            }

            // Remove preview model from scene
            if (this.config.placementMode && this.config.placementMode.previewModel) {
                this.config.scene.remove(this.config.placementMode.previewModel);
            }

            // Clear placement mode data
            this.config.placementMode = null;

            console.log('Placement mode disabled');
        },

        // Cancel placement mode
        // Requirements: 3.2
        cancelPlacementMode: function () {
            console.log('Cancelling placement mode');
            this.disablePlacementMode();
            this.showMessage('Placement cancelled', 'info');
        },

        // Update placement preview as mouse moves
        // Requirements: 3.2, 3.3 (grid snapping)
        updatePlacementPreview: function (event) {
            if (!this.config.placementMode || !this.config.placementMode.active) {
                console.log('⚠️ updatePlacementPreview called but placement mode not active');
                return;
            }

            const intersectionData = this.getIntersectionPoint(event);
            console.log('🎯 Mouse move - intersection:', intersectionData ? 'found' : 'none');

            if (intersectionData && intersectionData.point) {
                // Snap to nearest peg hole
                const snappedPosition = this.snapToGrid(intersectionData.point);

                // Update preview model position and orientation
                if (this.config.placementMode.previewModel) {
                    this.config.placementMode.previewModel.visible = true; // Make sure it's visible

                    // Calculate depth offset so back of accessory touches pegboard
                    const bbox = new THREE.Box3().setFromObject(this.config.placementMode.previewModel);
                    const size = new THREE.Vector3();
                    bbox.getSize(size);
                    const depthOffset = size.z / 2;

                    this.config.placementMode.previewModel.position.set(
                        snappedPosition.x,
                        snappedPosition.y,
                        snappedPosition.z + depthOffset - 0.001 // Back against pegboard, extends toward camera
                    );

                    // Orient accessory to face correctly
                    this.orientAccessoryModel(this.config.placementMode.previewModel, intersectionData);

                    // Get actual dimensions from the BASE model (before transformations)
                    // This gives us the true size without rotation/position affecting the bounding box
                    const actualDimensions = this.getModelDimensions(this.config.placementMode.model);

                    // Check if position is valid (no collision)
                    const isValid = this.isValidGridPosition(snappedPosition, actualDimensions);

                    console.log('🎯 Validation check:', {
                        position: snappedPosition,
                        metadataDimensions: this.config.placementMode.accessoryData.dimensions,
                        actualDimensions: actualDimensions,
                        isValid: isValid
                    });

                    // Change preview color based on validity
                    this.updatePreviewColor(this.config.placementMode.previewModel, isValid);

                    // Store validation state for click handler
                    this.config.placementMode.lastValidState = isValid;
                    this.config.placementMode.lastPosition = snappedPosition;
                    this.config.placementMode.lastIntersectionData = intersectionData;
                }
            } else {
                // Hide preview when not over pegboard
                if (this.config.placementMode.previewModel) {
                    this.config.placementMode.previewModel.visible = false;
                }
            }
        },

        // Get intersection point on pegboard from mouse event
        // Requirements: 3.2
        getIntersectionPoint: function (event) {
            if (!this.config.camera || !this.config.currentPegboardModel) {
                console.log('⚠️ Missing camera or pegboard model:', {
                    hasCamera: !!this.config.camera,
                    hasPegboard: !!this.config.currentPegboardModel
                });
                return null;
            }

            // Calculate mouse position in normalized device coordinates
            const rect = this.config.renderer.domElement.getBoundingClientRect();
            const mouse = new THREE.Vector2();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Create raycaster
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.config.camera);

            // Check intersection with pegboard only (not accessories)
            const intersects = raycaster.intersectObject(this.config.currentPegboardModel, true);

            if (intersects.length > 0) {
                // Return both point and intersection data for orientation
                return {
                    point: intersects[0].point,
                    face: intersects[0].face,
                    object: intersects[0].object,
                    normal: intersects[0].face ? intersects[0].face.normal : null
                };
            }

            return null;
        },

        // Update preview model color based on placement validity
        // Requirements: 3.2, 3.4 (collision detection)
        updatePreviewColor: function (model, isValid) {
            const color = isValid ? 0x00ff00 : 0xff0000; // Green if valid, red if invalid

            model.traverse(function (child) {
                if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(function (mat) {
                            mat.color.setHex(color);
                        });
                    } else {
                        child.material.color.setHex(color);
                    }
                }
            });
        },

        // Place accessory at click position
        // Requirements: 3.2, 3.3 (grid snapping), 3.4 (collision detection)
        placeAccessoryAtClick: function (event) {
            console.log('🖱️ Click detected for accessory placement');

            if (!this.config.placementMode || !this.config.placementMode.active) {
                console.log('⚠️ Placement mode not active');
                return;
            }

            const intersectionData = this.getIntersectionPoint(event);
            console.log('🎯 Click intersection:', intersectionData);

            if (!intersectionData || !intersectionData.point) {
                console.log('❌ No intersection with pegboard');
                this.showError('Please click on the pegboard surface to place the accessory');
                return;
            }

            console.log('✅ Valid intersection at:', intersectionData.point);

            // Snap to nearest peg hole
            const snappedPosition = this.snapToGrid(intersectionData.point);

            // Get actual dimensions from the BASE model (before transformations)
            // This gives us the true size without rotation/position affecting the bounding box
            const dimensions = this.getModelDimensions(this.config.placementMode.model);
            console.log('🔧 Click handler using actual dimensions:', dimensions);

            // Verify position is on a valid peg hole
            const pegHole = this.findPegHoleAtPosition(snappedPosition);
            if (!pegHole) {
                this.showError('Accessories can only be placed on peg holes');
                return;
            }

            // Check if position is valid (collision detection)
            if (!this.isValidGridPosition(snappedPosition, dimensions)) {
                this.showError('Position already occupied or out of bounds');
                return;
            }

            // Create final model by cloning the preview model (which is already scaled and oriented)
            const model = this.config.placementMode.model.clone();

            // Copy the scale from the preview model (which has the correct 0.01 scale)
            if (this.config.placementMode.previewModel) {
                model.scale.copy(this.config.placementMode.previewModel.scale);
                console.log('🔧 Copied scale from preview:', model.scale);
            }

            // Get actual dimensions from the BASE model (before transformations)
            const actualDimensions = this.getModelDimensions(this.config.placementMode.model);
            const depthOffset = actualDimensions.depth / 2; // Half the depth to position back against pegboard

            console.log('🔧 Accessory dimensions:', actualDimensions, 'Depth offset:', depthOffset);

            // Position the model with back against pegboard (negative Z to go toward camera)
            model.position.set(
                snappedPosition.x,
                snappedPosition.y,
                snappedPosition.z + depthOffset + 0.001 // Back touches pegboard, extends toward camera
            );

            // Orient the model correctly
            this.orientAccessoryModel(model, intersectionData);

            // Add to scene
            this.config.scene.add(model);

            // Generate unique placement ID
            const placementId = 'accessory-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            console.log('📦 Storing accessory with dimensions:', {
                metadataDimensions: dimensions,
                actualDimensions: actualDimensions,
                usingActual: true
            });

            // Add to placed accessories
            this.config.placedAccessories.push({
                placementId: placementId,
                id: this.config.placementMode.accessoryData.id,
                name: this.config.placementMode.accessoryData.name,
                price: this.config.placementMode.accessoryData.price,
                model: model,
                position: {
                    x: snappedPosition.x,
                    y: snappedPosition.y,
                    z: snappedPosition.z
                },
                dimensions: actualDimensions // Use actual model dimensions instead of metadata
            });

            // Update UI
            this.updatePlacedAccessoriesDisplay();
            this.updatePrice();

            // Keep placement mode active for multiple placements
            // User can press ESC or select another accessory to exit
            this.showMessage('Accessory placed! Click to place another or press ESC to finish', 'success');

            console.log('Accessory placed at peg hole:', snappedPosition);
        },

        // Scale accessory model based on dimensions
        // Requirements: 2.3
        scaleAccessoryModel: function (model, dimensions) {
            if (!model || !dimensions) return;

            // Calculate bounding box
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);

            // Scale to match dimensions if provided
            if (dimensions.width && dimensions.height) {
                const scaleX = dimensions.width / size.x;
                const scaleY = dimensions.height / size.y;
                const scaleZ = dimensions.depth ? dimensions.depth / size.z : scaleX;

                // Use uniform scale
                const uniformScale = Math.min(scaleX, scaleY, scaleZ);
                model.scale.set(uniformScale, uniformScale, uniformScale);
            } else {
                // Default scale for accessories
                model.scale.set(0.5, 0.5, 0.5);
            }
        },

        // Remove an accessory
        // Requirements: 3.4, 3.5
        removeAccessory: function (placementId) {
            console.log('Removing accessory:', placementId);
            const self = this;

            // Find the accessory
            const accessory = this.config.placedAccessories.find(function (a) {
                return a.placementId === placementId;
            });

            if (accessory) {
                // Remove from scene
                if (accessory.model) {
                    this.config.scene.remove(accessory.model);

                    // Dispose of geometry and materials to free memory
                    accessory.model.traverse(function (child) {
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(function (mat) {
                                    mat.dispose();
                                });
                            } else {
                                child.material.dispose();
                            }
                        }
                    });

                    console.log('Accessory model removed from scene');
                }
            }

            // Remove from configuration
            this.config.placedAccessories = this.config.placedAccessories.filter(function (accessory) {
                return accessory.placementId !== placementId;
            });

            // Update placed accessories display
            this.updatePlacedAccessoriesDisplay();

            // Update price immediately
            this.updatePrice();

            // Show success message
            this.showMessage('Accessory removed successfully', 'success');
        },

        // Reposition an accessory
        // Requirements: 3.4, 3.5
        repositionAccessory: function (placementId) {
            console.log('Repositioning accessory:', placementId);
            const self = this;

            // Find the accessory
            const accessory = this.config.placedAccessories.find(function (a) {
                return a.placementId === placementId;
            });

            if (!accessory) {
                this.showError('Accessory not found');
                return;
            }

            // Check if pegboard is selected
            if (!this.config.currentPegboard) {
                this.showError('Pegboard not found');
                return;
            }

            // Free current grid cells
            if (accessory.position && accessory.dimensions) {
                this.freeGridCells(accessory.position, accessory.dimensions);
            }

            // Remove model from scene temporarily
            if (accessory.model) {
                this.config.scene.remove(accessory.model);
            }

            // Create accessory data for repositioning mode
            const accessoryData = {
                id: accessory.id,
                name: accessory.name,
                price: accessory.price,
                dimensions: accessory.dimensions
            };

            // Clone the model for preview
            const previewModel = accessory.model.clone();
            this.makeModelTransparent(previewModel, 0.5);

            // Store repositioning mode data
            this.config.repositionMode = {
                active: true,
                placementId: placementId,
                accessoryData: accessoryData,
                originalModel: accessory.model,
                previewModel: previewModel,
                originalPosition: Object.assign({}, accessory.position)
            };

            // Add preview to scene
            this.config.scene.add(previewModel);

            // Enable repositioning mode UI
            this.enableRepositionMode();

            // Show instruction message
            this.showMessage('Click on the pegboard to reposition the accessory. Press ESC to cancel.', 'info');

            console.log('Reposition mode activated for:', placementId);
        },

        // Enable reposition mode UI and event listeners
        // Requirements: 3.4, 3.5
        enableRepositionMode: function () {
            const self = this;

            // Add reposition mode class to container
            $('.blasti-configurator-container').addClass('placement-mode reposition-mode');

            // Change cursor
            if (this.config.renderer && this.config.renderer.domElement) {
                this.config.renderer.domElement.style.cursor = 'crosshair';
            }

            // Setup mouse move listener for preview
            this.config.repositionMouseMoveHandler = function (event) {
                self.updateRepositionPreview(event);
            };

            // Setup click listener for repositioning
            this.config.repositionClickHandler = function (event) {
                self.repositionAccessoryAtClick(event);
            };

            // Setup keyboard listener for cancellation
            this.config.repositionKeyHandler = function (event) {
                if (event.key === 'Escape' || event.keyCode === 27) {
                    self.cancelRepositionMode();
                }
            };

            // Attach event listeners
            if (this.config.renderer && this.config.renderer.domElement) {
                this.config.renderer.domElement.addEventListener('mousemove', this.config.repositionMouseMoveHandler);
                this.config.renderer.domElement.addEventListener('click', this.config.repositionClickHandler);
            }
            document.addEventListener('keydown', this.config.repositionKeyHandler);

            console.log('Reposition mode UI enabled');
        },

        // Disable reposition mode
        // Requirements: 3.4, 3.5
        disableRepositionMode: function () {
            // Remove reposition mode class
            $('.blasti-configurator-container').removeClass('placement-mode reposition-mode');

            // Reset cursor
            if (this.config.renderer && this.config.renderer.domElement) {
                this.config.renderer.domElement.style.cursor = 'default';
            }

            // Remove event listeners
            if (this.config.renderer && this.config.renderer.domElement) {
                if (this.config.repositionMouseMoveHandler) {
                    this.config.renderer.domElement.removeEventListener('mousemove', this.config.repositionMouseMoveHandler);
                }
                if (this.config.repositionClickHandler) {
                    this.config.renderer.domElement.removeEventListener('click', this.config.repositionClickHandler);
                }
            }
            if (this.config.repositionKeyHandler) {
                document.removeEventListener('keydown', this.config.repositionKeyHandler);
            }

            // Remove preview model from scene
            if (this.config.repositionMode && this.config.repositionMode.previewModel) {
                this.config.scene.remove(this.config.repositionMode.previewModel);
            }

            // Clear reposition mode data
            this.config.repositionMode = null;

            console.log('Reposition mode disabled');
        },

        // Cancel reposition mode and restore original position
        // Requirements: 3.4, 3.5
        cancelRepositionMode: function () {
            console.log('Cancelling reposition mode');

            if (!this.config.repositionMode) {
                return;
            }

            const placementId = this.config.repositionMode.placementId;
            const originalModel = this.config.repositionMode.originalModel;
            const originalPosition = this.config.repositionMode.originalPosition;

            // Find the accessory in configuration
            const accessory = this.config.placedAccessories.find(function (a) {
                return a.placementId === placementId;
            });

            if (accessory) {
                // Restore original model to scene
                if (originalModel) {
                    this.config.scene.add(originalModel);
                }

                // Re-occupy original grid cells
                if (originalPosition && accessory.dimensions) {
                    this.occupyGridCells(originalPosition, accessory.dimensions);
                }
            }

            // Disable reposition mode
            this.disableRepositionMode();

            this.showMessage('Repositioning cancelled', 'info');
        },

        // Update reposition preview as mouse moves
        // Requirements: 3.4, 3.5
        updateRepositionPreview: function (event) {
            if (!this.config.repositionMode || !this.config.repositionMode.active) {
                return;
            }

            const intersectionPoint = this.getIntersectionPoint(event);

            if (intersectionPoint) {
                // Snap to grid
                const snappedPosition = this.snapToGrid(intersectionPoint);

                // Update preview model position
                if (this.config.repositionMode.previewModel) {
                    this.config.repositionMode.previewModel.position.set(
                        snappedPosition.x,
                        snappedPosition.y,
                        snappedPosition.z
                    );

                    // Check if position is valid (no collision)
                    const dimensions = this.config.repositionMode.accessoryData.dimensions || { width: 0.1, height: 0.1 };
                    const isValid = this.isValidGridPosition(snappedPosition, dimensions);

                    // Change preview color based on validity
                    this.updatePreviewColor(this.config.repositionMode.previewModel, isValid);
                }
            }
        },

        // Reposition accessory at click position
        // Requirements: 3.4, 3.5
        repositionAccessoryAtClick: function (event) {
            if (!this.config.repositionMode || !this.config.repositionMode.active) {
                return;
            }

            const intersectionPoint = this.getIntersectionPoint(event);

            if (!intersectionPoint) {
                this.showError('Please click on the pegboard to reposition the accessory');
                return;
            }

            // Snap to grid
            const snappedPosition = this.snapToGrid(intersectionPoint);

            // Get accessory dimensions
            const dimensions = this.config.repositionMode.accessoryData.dimensions || { width: 0.1, height: 0.1 };

            // Check if position is valid (collision detection)
            if (!this.isValidGridPosition(snappedPosition, dimensions)) {
                this.showError('Cannot reposition accessory here - position is occupied or out of bounds');
                return;
            }

            const placementId = this.config.repositionMode.placementId;
            const originalModel = this.config.repositionMode.originalModel;

            // Find the accessory in configuration
            const accessory = this.config.placedAccessories.find(function (a) {
                return a.placementId === placementId;
            });

            if (!accessory) {
                this.showError('Accessory not found in configuration');
                this.disableRepositionMode();
                return;
            }

            // Update model position
            if (originalModel) {
                originalModel.position.set(snappedPosition.x, snappedPosition.y, snappedPosition.z);
                this.config.scene.add(originalModel);
            }

            // Update accessory position in configuration
            accessory.position = {
                x: snappedPosition.x,
                y: snappedPosition.y,
                z: snappedPosition.z
            };

            // Occupy new grid cells
            this.occupyGridCells(snappedPosition, dimensions);

            // Disable reposition mode
            this.disableRepositionMode();

            // Show success message
            this.showMessage('Accessory repositioned successfully', 'success');

            console.log('Accessory repositioned at:', snappedPosition);
        },

        // Remove pegboard selection
        removePegboard: function () {
            console.log('Removing pegboard selection');

            // Remove pegboard model from scene
            if (this.config.currentPegboardModel) {
                this.config.scene.remove(this.config.currentPegboardModel);
                this.config.currentPegboardModel = null;
                console.log('Pegboard model removed from scene');
            }

            // Remove all accessories
            const self = this;
            this.config.placedAccessories.forEach(function (accessory) {
                if (accessory.model) {
                    self.config.scene.remove(accessory.model);
                }
            });
            this.config.placedAccessories = [];

            // Clear configuration
            this.config.currentPegboard = null;

            // Update UI
            $('.pegboard-item').removeClass('selected');
            $('#current-pegboard').html('<p>' + blastiConfigurator.strings.noPegboardSelected + '</p>');
            this.updatePlacedAccessoriesDisplay();

            // Update price immediately
            this.updatePrice();
        },

        // Update placed accessories display
        // Requirements: 3.4, 3.5
        updatePlacedAccessoriesDisplay: function () {
            const placedContainer = $('#placed-accessories');

            if (this.config.placedAccessories.length === 0) {
                placedContainer.html('<p>' + blastiConfigurator.strings.noAccessoriesPlaced + '</p>');
                return;
            }

            let html = '<div class="placed-accessories-list">';
            this.config.placedAccessories.forEach(function (accessory) {
                html += '<div class="placed-accessory-item" data-placement-id="' + accessory.placementId + '">' +
                    '<span class="accessory-name">' + accessory.name + '</span>' +
                    '<div class="accessory-actions">' +
                    '<button class="reposition-accessory-btn" data-placement-id="' + accessory.placementId + '" type="button" title="Reposition">↻</button>' +
                    '<button class="remove-accessory-btn" data-placement-id="' + accessory.placementId + '" type="button" title="Remove">&times;</button>' +
                    '</div>' +
                    '</div>';
            });
            html += '</div>';

            placedContainer.html(html);
        },

        // Camera angle presets
        // Requirements: 2.2, 8.1, 8.2, 8.5
        // Optimized for objects up to 2.5m in size
        cameraAngles: {
            'front': { position: { x: 0, y: 1.2, z: 4.0 }, target: { x: 0, y: 1.1, z: 0 } },
            'side': { position: { x: 4.0, y: 1.2, z: 0 }, target: { x: 0, y: 1.1, z: 0 } },
            'top': { position: { x: 0, y: 5.0, z: 1.0 }, target: { x: 0, y: 1.1, z: 0 } },
            'angle': { position: { x: 2, y: 1.5, z: 4.5 }, target: { x: 0, y: 1.1, z: 0 } },
            'close': { position: { x: 0, y: 1.0, z: 2.0 }, target: { x: 0, y: 1.1, z: 0 } }
        },

        // Initialize camera controls with predefined angles
        // Requirements: 2.2, 8.1, 8.2
        initializeCameraControls: function () {
            const self = this;
            const cameraControlsContainer = $('.camera-controls');

            if (!cameraControlsContainer.length) {
                return;
            }

            // Clear any existing buttons
            cameraControlsContainer.find('.camera-angle-btn').remove();

            // Create buttons for each camera angle
            Object.keys(this.cameraAngles).forEach(function (angleName) {
                const button = $('<button class="camera-angle-btn" data-angle="' + angleName + '">' +
                    angleName.charAt(0).toUpperCase() + angleName.slice(1) +
                    '</button>');

                cameraControlsContainer.append(button);
            });

            // Set default angle as active
            $('.camera-angle-btn[data-angle="angle"]').addClass('active');

            console.log('Camera controls initialized with', Object.keys(this.cameraAngles).length, 'preset angles');
        },

        // Set camera angle with smooth transition
        // Requirements: 2.2, 8.1, 8.2, 8.5
        setCameraAngle: function (angle) {
            console.log('Setting camera angle:', angle);

            if (!this.config.camera || !this.config.controls) {
                console.warn('Camera or controls not initialized');
                return;
            }

            const preset = this.cameraAngles[angle];
            if (!preset) {
                console.warn('Unknown camera angle:', angle);
                return;
            }

            // Update button states
            $('.camera-angle-btn').removeClass('active');
            $('.camera-angle-btn[data-angle="' + angle + '"]').addClass('active');

            // Animate camera to new position
            this.animateCameraToPosition(preset.position, preset.target);
        },

        // Animate camera to a specific position with smooth transition
        // Requirements: 8.2, 8.5
        animateCameraToPosition: function (targetPosition, targetLookAt) {
            const self = this;

            if (!this.config.camera || !this.config.controls) {
                return;
            }

            // Store start positions
            const startPosition = this.config.camera.position.clone();
            const startTarget = this.config.controls.target.clone();

            // Create target vectors
            const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
            const endTarget = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);

            // Animation parameters
            const duration = 1000; // 1 second
            const startTime = Date.now();

            // Animation function
            function animate() {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Smooth easing function (ease-in-out cubic)
                const eased = progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

                // Interpolate camera position
                self.config.camera.position.lerpVectors(startPosition, endPosition, eased);

                // Interpolate controls target
                self.config.controls.target.lerpVectors(startTarget, endTarget, eased);

                // Update controls
                self.config.controls.update();

                // Continue animation if not complete
                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            }

            // Start animation
            animate();
        },

        // Automatically frame camera to view model optimally
        // Requirements: 2.3, 8.1
        frameCameraToModel: function (model) {
            if (!model || !this.config.camera || !this.config.controls) {
                return;
            }

            // Calculate bounding box AFTER scaling
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();

            box.getSize(size);
            box.getCenter(center);

            // Calculate the maximum dimension
            const maxDim = Math.max(size.x, size.y, size.z);

            // For pegboards, use a reasonable fixed distance based on typical size
            // Most pegboards are 0.3-1.0 meters, so camera should be 1-3 meters away
            let cameraDistance;

            if (maxDim < 0.1) {
                // Very small model (< 10cm) - probably an error, use default
                cameraDistance = 1.0;
                console.warn('Model is very small after scaling. Using default camera distance.');
            } else if (maxDim > 10) {
                // Very large model (> 10m) - probably an error, use default
                cameraDistance = 3.0;
                console.warn('Model is very large after scaling. Using default camera distance.');
            } else {
                // Normal size - calculate based on FOV
                const fov = this.config.camera.fov * (Math.PI / 180);
                cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;
                // Clamp to reasonable range
                cameraDistance = Math.max(0.5, Math.min(cameraDistance, 5.0));
            }

            // Position camera at an angle for better view
            const cameraOffset = new THREE.Vector3(
                cameraDistance * 0.5,  // X: slightly to the side
                cameraDistance * 0.4,  // Y: slightly above
                cameraDistance * 0.9   // Z: mostly in front
            );

            const cameraPosition = center.clone().add(cameraOffset);

            // Always look at origin since model is positioned there
            const lookAtTarget = new THREE.Vector3(0, 0, 0);

            // Animate camera to new position
            this.animateCameraToPosition(
                {
                    x: cameraPosition.x,
                    y: cameraPosition.y,
                    z: cameraPosition.z
                },
                {
                    x: lookAtTarget.x,
                    y: lookAtTarget.y,
                    z: lookAtTarget.z
                }
            );

            // Update controls limits based on model size
            if (this.config.controls) {
                this.config.controls.minDistance = Math.max(cameraDistance * 0.2, 0.1);
                this.config.controls.maxDistance = Math.max(cameraDistance * 3, 10.0);
                this.config.controls.target.set(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
                this.config.controls.update();
            }

            console.log('Camera framed to model:', {
                modelSize: size,
                modelCenter: center,
                maxDim: maxDim,
                cameraDistance: cameraDistance,
                cameraPosition: cameraPosition,
                lookingAt: lookAtTarget
            });

            // Log camera frustum to check if model is in view
            this.config.camera.updateProjectionMatrix();
            console.log('Camera frustum check:', {
                near: this.config.camera.near,
                far: this.config.camera.far,
                distanceToOrigin: this.config.camera.position.distanceTo(lookAtTarget)
            });
        },

        // Update total price display with real-time calculation
        // Requirements: 7.1, 7.2, 7.5
        updatePrice: function () {
            const self = this;

            // Get current configuration
            const pegboard_id = this.config.currentPegboard ? this.config.currentPegboard.id : 0;
            const accessory_ids = this.config.placedAccessories.map(function (a) { return a.id; });

            // Calculate price via AJAX for accurate WooCommerce pricing
            $.ajax({
                url: blastiConfigurator.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'blasti_calculate_price',
                    nonce: blastiConfigurator.nonce,
                    pegboard_id: pegboard_id,
                    accessory_ids: accessory_ids
                },
                success: function (response) {
                    if (response.success) {
                        self.config.priceBreakdown = response.data;
                        self.config.totalPrice = response.data.total;
                        self.displayPriceBreakdown(response.data);
                    } else {
                        console.error('Price calculation failed:', response.data);
                        self.displayPriceError();
                    }
                },
                error: function () {
                    console.error('AJAX error calculating price');
                    self.displayPriceError();
                }
            });
        },

        // Display detailed price breakdown
        // Requirements: 7.1, 7.2
        displayPriceBreakdown: function (priceData) {
            const self = this;

            // Update main price display with animation
            const priceElement = $('.price-amount');
            priceElement.addClass('price-updating');

            setTimeout(function () {
                priceElement.html(priceData.formatted_total);
                priceElement.removeClass('price-updating');
            }, 200);

            // Update detailed breakdown if container exists
            const breakdownContainer = $('.price-breakdown');
            if (breakdownContainer.length) {
                let breakdownHtml = '';

                // Pegboard price
                if (priceData.pegboard) {
                    breakdownHtml += '<div class="price-item pegboard-price">' +
                        '<span class="item-name">' + priceData.pegboard.name + '</span>' +
                        '<span class="item-price">' + priceData.pegboard.formatted_price + '</span>' +
                        '</div>';
                }

                // Accessory prices
                if (priceData.accessories && priceData.accessories.length > 0) {
                    priceData.accessories.forEach(function (accessory) {
                        breakdownHtml += '<div class="price-item accessory-price">' +
                            '<span class="item-name">' + accessory.name + '</span>' +
                            '<span class="item-price">' + accessory.formatted_price + '</span>' +
                            '</div>';
                    });
                }

                // Subtotal
                if (priceData.subtotal > 0) {
                    breakdownHtml += '<div class="price-item subtotal">' +
                        '<span class="item-name"><strong>' + blastiConfigurator.strings.subtotal + '</strong></span>' +
                        '<span class="item-price"><strong>' + priceData.formatted_subtotal + '</strong></span>' +
                        '</div>';
                }

                breakdownContainer.html(breakdownHtml);
            }

            // Enable/disable add to cart button based on configuration
            const addToCartBtn = $('#add-to-cart-btn, .add-to-cart-btn');
            addToCartBtn.prop('disabled', !priceData.pegboard);

            // Update button text to show total
            if (priceData.pegboard && priceData.total > 0) {
                const originalText = addToCartBtn.data('original-text') || blastiConfigurator.strings.addToCart;
                addToCartBtn.text(originalText + ' - ' + priceData.formatted_total);
            } else {
                addToCartBtn.text(blastiConfigurator.strings.selectPegboard);
            }

            // Trigger custom event for theme integration
            $(document).trigger('blasti_price_updated', [priceData]);
        },

        // Display price calculation error
        displayPriceError: function () {
            const priceElement = $('.price-amount');
            priceElement.text('--');

            const addToCartBtn = $('#add-to-cart-btn, .add-to-cart-btn');
            addToCartBtn.prop('disabled', true).text(blastiConfigurator.strings.priceError);
        },

        // Get cached product prices or fetch from server
        // Requirements: 7.5
        getProductPrices: function (productIds) {
            const self = this;

            return new Promise(function (resolve, reject) {
                // Check cache first
                const uncachedIds = productIds.filter(function (id) {
                    return !self.config.productPrices[id];
                });

                if (uncachedIds.length === 0) {
                    // All prices are cached
                    const cachedPrices = {};
                    productIds.forEach(function (id) {
                        cachedPrices[id] = self.config.productPrices[id];
                    });
                    resolve(cachedPrices);
                    return;
                }

                // Fetch uncached prices
                $.ajax({
                    url: blastiConfigurator.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'blasti_get_product_prices',
                        nonce: blastiConfigurator.nonce,
                        product_ids: uncachedIds
                    },
                    success: function (response) {
                        if (response.success) {
                            // Cache the prices
                            Object.keys(response.data.prices).forEach(function (id) {
                                self.config.productPrices[id] = response.data.prices[id];
                            });

                            // Return all requested prices
                            const allPrices = {};
                            productIds.forEach(function (id) {
                                allPrices[id] = self.config.productPrices[id];
                            });

                            resolve(allPrices);
                        } else {
                            reject(new Error(response.data.message || 'Failed to get prices'));
                        }
                    },
                    error: function () {
                        reject(new Error('Network error getting prices'));
                    }
                });
            });
        },

        // Initialize price display on load
        // Requirements: 7.1
        initializePriceDisplay: function () {
            // Set initial price to $0.00
            $('.price-amount').text('$0.00');

            // Disable add to cart button initially
            $('#add-to-cart-btn, .add-to-cart-btn').prop('disabled', true)
                .text(blastiConfigurator.strings.selectPegboard);

            // Store original button text
            $('#add-to-cart-btn, .add-to-cart-btn').each(function () {
                $(this).data('original-text', $(this).text());
            });
        },

        // Validate configuration before adding to cart
        validateConfiguration: function () {
            const self = this;

            return new Promise(function (resolve, reject) {
                if (!self.config.currentPegboard) {
                    reject(new Error(blastiConfigurator.strings.selectPegboard));
                    return;
                }

                const configuration = {
                    pegboard_id: self.config.currentPegboard.id,
                    accessories: self.config.placedAccessories.map(function (a) {
                        return {
                            id: a.id,
                            position: a.position
                        };
                    })
                };

                $.ajax({
                    url: blastiConfigurator.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'blasti_validate_cart_config',
                        nonce: blastiConfigurator.nonce,
                        configuration: JSON.stringify(configuration)
                    },
                    success: function (response) {
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(new Error(response.data.message || blastiConfigurator.strings.error));
                        }
                    },
                    error: function (xhr, status, error) {
                        reject(new Error(blastiConfigurator.strings.error + ' (' + error + ')'));
                    }
                });
            });
        },

        // Add configuration to cart with enhanced validation and error handling
        addToCart: function () {
            const self = this;

            // Show loading state
            const button = $('#add-to-cart-btn');
            const originalText = button.text();
            button.text(blastiConfigurator.strings.loading).prop('disabled', true);

            // First validate the configuration
            this.validateConfiguration()
                .then(function (validationData) {
                    // Show validation success briefly
                    self.showMessage(validationData.message, 'success');

                    // Prepare configuration data
                    const configuration = {
                        pegboard_id: self.config.currentPegboard.id,
                        accessories: self.config.placedAccessories.map(function (a) {
                            return {
                                id: a.id,
                                position: a.position
                            };
                        })
                    };

                    // Add to cart
                    return $.ajax({
                        url: blastiConfigurator.ajaxUrl,
                        type: 'POST',
                        data: {
                            action: 'blasti_add_to_cart',
                            nonce: blastiConfigurator.nonce,
                            configuration: JSON.stringify(configuration)
                        }
                    });
                })
                .then(function (response) {
                    if (response.success) {
                        // Show success message
                        self.showMessage(response.data.message, 'success');

                        // Update button to show success
                        button.text('✓ ' + blastiConfigurator.strings.addToCartSuccess);

                        // Redirect to cart after delay
                        const redirectDelay = response.data.redirect_delay || 1500;
                        setTimeout(function () {
                            window.location.href = response.data.cart_url;
                        }, redirectDelay);

                    } else {
                        throw new Error(response.data.message || blastiConfigurator.strings.addToCartError);
                    }
                })
                .catch(function (error) {
                    // Handle validation or cart errors
                    let errorMessage = blastiConfigurator.strings.addToCartError;

                    if (error.responseJSON && error.responseJSON.data) {
                        const errorData = error.responseJSON.data;

                        if (errorData.validation_errors) {
                            // Handle validation errors
                            errorMessage = self.formatValidationErrors(errorData.validation_errors);
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }

                    self.showError(errorMessage);

                    // Reset button
                    button.text(originalText).prop('disabled', false);
                });
        },

        // Format validation errors for display
        formatValidationErrors: function (errors) {
            let message = blastiConfigurator.strings.error + '\n\n';

            if (errors.pegboard) {
                message += '• ' + errors.pegboard + '\n';
            }

            if (errors.accessories) {
                message += '• Accessory issues:\n';
                Object.keys(errors.accessories).forEach(function (index) {
                    message += '  - ' + errors.accessories[index] + '\n';
                });
            }

            return message.trim();
        },

        // Show error message
        showError: function (message) {
            this.showMessage(message, 'error');
        },

        // Show message with type (success, error, info)
        showMessage: function (message, type) {
            type = type || 'info';

            // Remove existing messages of the same type
            $('.configurator-message.' + type).remove();

            const messageDiv = $('<div class="configurator-message ' + type + '">' +
                '<span class="message-text">' + message + '</span>' +
                '<button class="message-close" type="button">&times;</button>' +
                '</div>');

            // Add to page
            if ($('.configurator-messages').length) {
                $('.configurator-messages').append(messageDiv);
            } else {
                $('body').append('<div class="configurator-messages"></div>');
                $('.configurator-messages').append(messageDiv);
            }

            // Handle close button
            messageDiv.find('.message-close').on('click', function () {
                messageDiv.fadeOut(function () {
                    messageDiv.remove();
                });
            });

            // Auto-remove after delay (longer for errors)
            const delay = type === 'error' ? 8000 : (type === 'success' ? 4000 : 5000);
            setTimeout(function () {
                if (messageDiv.is(':visible')) {
                    messageDiv.fadeOut(function () {
                        messageDiv.remove();
                    });
                }
            }, delay);

            return messageDiv;
        },

        // Get cart status
        getCartStatus: function () {
            const self = this;

            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: blastiConfigurator.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'blasti_get_cart_status',
                        nonce: blastiConfigurator.nonce
                    },
                    success: function (response) {
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(new Error(response.data.message || 'Failed to get cart status'));
                        }
                    },
                    error: function (xhr, status, error) {
                        reject(new Error('Network error: ' + error));
                    }
                });
            });
        },

        // Update cart display in header/widget if present
        updateCartDisplay: function () {
            const self = this;

            this.getCartStatus()
                .then(function (cartData) {
                    // Update cart count in theme header if present
                    $('.cart-count, .cart-contents-count').text(cartData.cart_count);

                    // Update cart total if present
                    $('.cart-total').html(cartData.cart_total);

                    // Trigger custom event for theme integration
                    $(document).trigger('blasti_cart_updated', [cartData]);
                })
                .catch(function (error) {
                    console.warn('Failed to update cart display:', error.message);
                });
        }
    };

    // Initialize when document is ready
    $(document).ready(function () {
        BlastiConfigurator.init();
    });

})(jQuery);