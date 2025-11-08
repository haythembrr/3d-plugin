/**
 * Blasti 3D Configurator - Core Module
 * Handles 3D scene, camera, lighting, and basic rendering
 */

(function (window) {
    'use strict';

    const BlastiCore = {
        // Configuration
        config: {
            scene: null,
            camera: null,
            renderer: null,
            controls: null,
            container: null,
            initialized: false,
            showDebugHelpers: true
        },

        // Initialize 3D scene
        initializeScene: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Scene container not found:', containerId);
                return false;
            }

            this.config.container = container;

            // Check if Three.js is loaded
            if (typeof THREE === 'undefined') {
                console.error('Three.js library not loaded');
                container.innerHTML = '<div class="configurator-error"><p>Failed to load 3D engine. Please refresh the page.</p></div>';
                return false;
            }

            try {
                // Create scene
                this.config.scene = new THREE.Scene();
                this.config.scene.background = new THREE.Color(0xf5f5f5);

                // Create camera with close positioning for pegboards
                const aspect = container.clientWidth / container.clientHeight;
                this.config.camera = new THREE.PerspectiveCamera(60, aspect, 0.01, 100);
                // Position camera close for detailed view of pegboards (typically 0.2-0.3m wide)
                this.config.camera.position.set(0.6, 0.5, 0.8);

                // Create renderer
                this.config.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                    powerPreference: "high-performance"
                });

                this.config.renderer.setSize(container.clientWidth, container.clientHeight);
                this.config.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.config.renderer.shadowMap.enabled = true;
                this.config.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                this.config.renderer.outputEncoding = THREE.sRGBEncoding;
                this.config.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.config.renderer.toneMappingExposure = 1.0;

                container.appendChild(this.config.renderer.domElement);

                // Initialize camera controls
                this.initializeCameraControls();

                // Setup lighting
                this.setupLighting();

                // Add axis helper for reference
                this.addAxisHelper(0.3);

                // Setup resize handler
                this.setupResizeHandler();

                // Start render loop
                this.startRenderLoop();

                this.config.initialized = true;
                console.log('✅ 3D Scene initialized successfully');
                return true;

            } catch (error) {
                console.error('Failed to initialize 3D scene:', error);
                container.innerHTML = '<div class="configurator-error"><p>Failed to initialize 3D scene: ' + error.message + '</p></div>';
                return false;
            }
        },

        // Initialize camera controls
        initializeCameraControls: function () {
            if (!this.config.camera || !this.config.renderer) return;

            if (typeof THREE.OrbitControls === 'undefined') {
                console.error('OrbitControls not loaded');
                return;
            }

            this.config.controls = new THREE.OrbitControls(this.config.camera, this.config.renderer.domElement);
            this.config.controls.enableDamping = true;
            this.config.controls.dampingFactor = 0.05;
            this.config.controls.enableZoom = true;
            this.config.controls.enablePan = true;
            this.config.controls.enableRotate = true;
            this.config.controls.maxPolarAngle = Math.PI * 0.8;
            this.config.controls.minPolarAngle = Math.PI * 0.1;
            this.config.controls.minDistance = 0.2; // Allow getting close (20cm)
            this.config.controls.maxDistance = 3; // Reasonable max distance
            // Target the center of where pegboards will be positioned
            this.config.controls.target.set(0, 0.3, 0);
        },

        // Setup scene lighting optimized for pegboard front view
        setupLighting: function () {
            if (!this.config.scene) return;

            // Ambient light for overall illumination
            const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
            this.config.scene.add(ambientLight);

            // Main directional light positioned to illuminate pegboard front
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
            // Position light in front of and slightly above the pegboard
            directionalLight.position.set(0, 3, 8);
            directionalLight.target.position.set(0, 0, 0); // Point at pegboard center
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 50;
            directionalLight.shadow.camera.left = -2;
            directionalLight.shadow.camera.right = 2;
            directionalLight.shadow.camera.top = 2;
            directionalLight.shadow.camera.bottom = -2;
            this.config.scene.add(directionalLight);
            this.config.scene.add(directionalLight.target);

            // Secondary light from front-right for better accessory visibility
            const frontRightLight = new THREE.DirectionalLight(0xffffff, 0.6);
            frontRightLight.position.set(3, 2, 6);
            frontRightLight.target.position.set(0, 0, 0);
            this.config.scene.add(frontRightLight);
            this.config.scene.add(frontRightLight.target);

            // Soft fill light from front-left to reduce harsh shadows
            const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
            fillLight.position.set(-2, 1, 4);
            fillLight.target.position.set(0, 0, 0);
            this.config.scene.add(fillLight);
            this.config.scene.add(fillLight.target);

            // Add hemisphere light for natural lighting
            const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
            this.config.scene.add(hemisphereLight);

            console.log('💡 Lighting setup optimized for pegboard front view');
        },

        // Setup window resize handler
        setupResizeHandler: function () {
            const self = this;

            const handleResize = function () {
                if (!self.config.container || !self.config.camera || !self.config.renderer) return;

                const width = self.config.container.clientWidth;
                const height = self.config.container.clientHeight;

                self.config.camera.aspect = width / height;
                self.config.camera.updateProjectionMatrix();
                self.config.renderer.setSize(width, height);
            };

            window.addEventListener('resize', handleResize);

            // Also handle container resize (for responsive layouts)
            if (window.ResizeObserver) {
                const resizeObserver = new ResizeObserver(handleResize);
                resizeObserver.observe(this.config.container);
            }
        },

        // Start the render loop
        startRenderLoop: function () {
            const self = this;
            let firstFrameLogged = false;

            function animate() {
                requestAnimationFrame(animate);

                if (!self.config.scene || !self.config.camera || !self.config.renderer) {
                    return;
                }

                // Update controls
                if (self.config.controls) {
                    self.config.controls.update();
                }

                // Render the scene
                self.config.renderer.render(self.config.scene, self.config.camera);

                // Log first frame for debugging
                if (!firstFrameLogged) {
                    console.log('✅ First frame rendered successfully');
                    firstFrameLogged = true;
                }
            }

            animate();
        },

        // Add object to scene
        addToScene: function (object) {
            if (this.config.scene && object) {
                this.config.scene.add(object);
                return true;
            }
            return false;
        },

        // Remove object from scene
        removeFromScene: function (object) {
            if (this.config.scene && object) {
                this.config.scene.remove(object);
                return true;
            }
            return false;
        },

        // Dispose of 3D resources properly
        dispose: function () {
            console.log('🧹 Disposing 3D scene resources...');

            // Dispose of all objects in scene
            if (this.config.scene) {
                this.config.scene.traverse((object) => {
                    if (object.geometry) {
                        object.geometry.dispose();
                    }
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => this.disposeMaterial(material));
                        } else {
                            this.disposeMaterial(object.material);
                        }
                    }
                });
                this.config.scene.clear();
            }

            // Dispose renderer
            if (this.config.renderer) {
                this.config.renderer.dispose();
                if (this.config.renderer.domElement && this.config.renderer.domElement.parentNode) {
                    this.config.renderer.domElement.parentNode.removeChild(this.config.renderer.domElement);
                }
            }

            // Dispose controls
            if (this.config.controls) {
                this.config.controls.dispose();
            }

            // Clear references
            this.config.scene = null;
            this.config.camera = null;
            this.config.renderer = null;
            this.config.controls = null;
            this.config.initialized = false;

            console.log('✅ 3D scene disposed successfully');
        },

        // Helper to dispose materials properly
        disposeMaterial: function (material) {
            if (!material) return;

            // Dispose textures
            Object.keys(material).forEach(key => {
                const value = material[key];
                if (value && typeof value === 'object' && value.isTexture) {
                    value.dispose();
                }
            });

            // Dispose material
            material.dispose();
        },

        // Get scene bounds for camera positioning
        getSceneBounds: function () {
            if (!this.config.scene) return null;

            const box = new THREE.Box3().setFromObject(this.config.scene);
            return {
                min: box.min,
                max: box.max,
                center: box.getCenter(new THREE.Vector3()),
                size: box.getSize(new THREE.Vector3())
            };
        },

        // Focus camera on object with close pegboard framing
        focusOnObject: function (object, offset = 1.2) {
            if (!object || !this.config.camera || !this.config.controls) return;

            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            console.log('🔍 Object analysis for camera positioning:', {
                objectSize: size,
                maxDimension: maxDim,
                center: center
            });

            // Optimal distances for good product visibility
            let distance;

            if (maxDim >= 0.15 && maxDim <= 0.8) {
                // Pegboard size - optimal distance for full view
                distance = Math.max(maxDim * 1.2, 0.3); // Good distance: 1.2x size, min 30cm
                console.log('📏 Pegboard detected, using optimal distance:', distance);
            } else if (maxDim < 0.15) {
                distance = 0.25; // Good distance for small objects
                console.log('📏 Small object, using good distance:', distance);
            } else {
                distance = maxDim * 0.8; // Reasonable distance for larger objects
                console.log('📏 Large object, using reasonable distance:', distance);
            }

            // Position camera for good product view
            const angle = Math.PI / 6; // 30 degrees for better perspective
            this.config.camera.position.set(
                center.x + Math.sin(angle) * distance * 0.5, // Side offset
                center.y + distance * 0.3, // Above center
                center.z + distance * 0.8 // Main distance
            );

            this.config.controls.target.copy(center);
            this.config.controls.update();

            console.log('📷 Camera positioned closer:', {
                objectSize: size,
                maxDimension: maxDim,
                calculatedDistance: distance,
                cameraPosition: this.config.camera.position,
                target: this.config.controls.target
            });
        },

        // Add axis helper for reference
        addAxisHelper: function (size = 0.5) {
            // Remove existing axis helper
            this.removeAxisHelper();

            const axesHelper = new THREE.AxesHelper(size);
            axesHelper.name = 'blasti-axes-helper';
            this.config.scene.add(axesHelper);

            console.log('📐 Axis helper added (size: ' + size + 'm)');
        },

        // Remove axis helper
        removeAxisHelper: function () {
            const existingHelper = this.config.scene.getObjectByName('blasti-axes-helper');
            if (existingHelper) {
                this.config.scene.remove(existingHelper);
            }
        },

        // Set camera to preset view
        setCameraView: function (viewName) {
            if (!this.config.camera || !this.config.controls) return;

            const views = {
                front: {
                    position: { x: 0, y: 0.12, z: 0.4 },
                    target: { x: 0, y: 0.12, z: 0 },
                    description: 'Front View'
                },
                back: {
                    position: { x: 0, y: 0.12, z: -0.4 },
                    target: { x: 0, y: 0.12, z: 0 },
                    description: 'Back View'
                },
                right: {
                    position: { x: 0.4, y: 0.12, z: 0 },
                    target: { x: 0, y: 0.12, z: 0 },
                    description: 'Right Side'
                },
                left: {
                    position: { x: -0.4, y: 0.12, z: 0 },
                    target: { x: 0, y: 0.12, z: 0 },
                    description: 'Left Side'
                },
                top: {
                    position: { x: 0, y: 0.6, z: 0.05 },
                    target: { x: 0, y: 0, z: 0 },
                    description: 'Top View'
                },
                isometric: {
                    position: { x: 0.3, y: 0.3, z: 0.3 },
                    target: { x: 0, y: 0.12, z: 0 },
                    description: 'Isometric'
                }
            };

            const view = views[viewName];
            if (!view) {
                console.warn('Unknown camera view:', viewName);
                return;
            }

            // Animate to new position
            this.animateCameraTo(view.position, view.target);

            console.log('📷 Camera view set to:', view.description);
        },

        // Animate camera to position
        animateCameraTo: function (targetPosition, targetLookAt, duration = 1000) {
            if (!this.config.camera || !this.config.controls) return;

            const startPosition = this.config.camera.position.clone();
            const startTarget = this.config.controls.target.clone();

            const endPosition = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
            const endTarget = new THREE.Vector3(targetLookAt.x, targetLookAt.y, targetLookAt.z);

            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function (ease-in-out)
                const eased = progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                // Interpolate position and target
                this.config.camera.position.lerpVectors(startPosition, endPosition, eased);
                this.config.controls.target.lerpVectors(startTarget, endTarget, eased);

                this.config.controls.update();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            animate();
        }
    };

    // Expose to global scope
    window.BlastiCore = BlastiCore;

    // Auto-cleanup on page unload
    window.addEventListener('beforeunload', function () {
        if (BlastiCore.config.initialized) {
            BlastiCore.dispose();
        }
    });

})(window);