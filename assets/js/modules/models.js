/**
 * Blasti 3D Configurator - Models Module
 * Handles 3D model loading, caching, and management
 */

(function (window) {
    'use strict';

    const BlastiModels = {
        // Configuration
        config: {
            modelLoader: null,
            modelCache: {},
            loadingModels: {},
            maxCacheSize: 50, // Maximum number of cached models
            cacheStats: {
                hits: 0,
                misses: 0,
                totalLoaded: 0
            }
        },

        // Initialize model loader
        initialize: function () {
            if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
                console.error('GLTFLoader not available');
                return false;
            }

            this.config.modelLoader = new THREE.GLTFLoader();
            console.log('✅ Model loader initialized');
            return true;
        },

        // Load 3D model with caching and error handling
        loadModel: function (modelUrl, productId) {
            const self = this;
            const cacheKey = modelUrl + '_' + (productId || 'default');

            return new Promise((resolve, reject) => {
                // Check cache first
                if (self.config.modelCache[cacheKey]) {
                    console.log('📦 Model loaded from cache:', modelUrl);
                    self.config.cacheStats.hits++;

                    // Clone the cached model to avoid reference issues
                    const cachedModel = self.config.modelCache[cacheKey];
                    const clonedModel = cachedModel.scene.clone();

                    resolve({
                        scene: clonedModel,
                        animations: cachedModel.animations || [],
                        userData: cachedModel.userData || {}
                    });
                    return;
                }

                // Check if already loading
                if (self.config.loadingModels[cacheKey]) {
                    console.log('⏳ Model already loading, waiting...:', modelUrl);
                    self.config.loadingModels[cacheKey].then(resolve).catch(reject);
                    return;
                }

                // Initialize loader if needed
                if (!self.config.modelLoader) {
                    if (!self.initialize()) {
                        reject(new Error('Failed to initialize model loader'));
                        return;
                    }
                }

                console.log('🔄 Loading model:', modelUrl);
                self.config.cacheStats.misses++;

                // Create loading promise
                const loadPromise = new Promise((loadResolve, loadReject) => {
                    self.config.modelLoader.load(
                        modelUrl,
                        // onLoad callback
                        function (gltf) {
                            console.log('✅ Model loaded successfully:', modelUrl);
                            self.config.cacheStats.totalLoaded++;

                            // Optimize the model
                            const optimizedModel = self.optimizeModel(gltf);

                            // Cache the model (store original, return clone)
                            self.cacheModel(cacheKey, optimizedModel);

                            // Clean up loading state
                            delete self.config.loadingModels[cacheKey];

                            // Return cloned model
                            const clonedModel = optimizedModel.scene.clone();
                            loadResolve({
                                scene: clonedModel,
                                animations: optimizedModel.animations || [],
                                userData: optimizedModel.userData || {}
                            });
                        },
                        // onProgress callback
                        function (xhr) {
                            if (xhr.lengthComputable) {
                                const percentComplete = (xhr.loaded / xhr.total * 100).toFixed(0);
                                console.log('📊 Loading progress:', percentComplete + '%', modelUrl);
                            }
                        },
                        // onError callback
                        function (error) {
                            console.error('❌ Error loading model:', modelUrl, error);
                            delete self.config.loadingModels[cacheKey];
                            loadReject(new Error('Failed to load 3D model: ' + modelUrl));
                        }
                    );
                });

                // Store loading promise
                self.config.loadingModels[cacheKey] = loadPromise;

                // Return the promise
                loadPromise.then(resolve).catch(reject);
            });
        },

        // Optimize loaded model for performance and fix scaling issues
        optimizeModel: function (gltf) {
            if (!gltf || !gltf.scene) return gltf;

            const model = gltf.scene;

            // Check model dimensions before optimization
            const originalBox = new THREE.Box3().setFromObject(model);
            const originalSize = originalBox.getSize(new THREE.Vector3());

            console.log('🔍 Original model size:', {
                width: originalSize.x,
                height: originalSize.y,
                depth: originalSize.z,
                maxDimension: Math.max(originalSize.x, originalSize.y, originalSize.z)
            });

            // Auto-fix scaling issues (standardize to 1000x scaling for consistency)
            const maxDimension = Math.max(originalSize.x, originalSize.y, originalSize.z);
            let scaleFactor = 1;

            // Apply consistent scaling - most models from Blender are in mm, need conversion to meters
            if (maxDimension > 2) {
                // For consistency, always use 1000x scaling for large models (mm -> m)
                // This ensures pegboards and accessories have the same scale reference
                scaleFactor = 0.001; // 1000x too big (mm -> m)
                console.log('🔧 Applying 1000x scale reduction (mm->m conversion)');

                model.scale.multiplyScalar(scaleFactor);

                // Verify the fix
                const fixedBox = new THREE.Box3().setFromObject(model);
                const fixedSize = fixedBox.getSize(new THREE.Vector3());
                console.log('✅ Fixed model size:', {
                    width: fixedSize.x,
                    height: fixedSize.y,
                    depth: fixedSize.z,
                    scaleFactor: scaleFactor
                });
            }

            // Traverse and optimize
            model.traverse((child) => {
                if (child.isMesh) {
                    // Enable shadow casting/receiving
                    child.castShadow = true;
                    child.receiveShadow = true;

                    // Optimize geometry
                    if (child.geometry) {
                        child.geometry.computeBoundingBox();
                        child.geometry.computeBoundingSphere();
                    }

                    // Optimize materials
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => this.optimizeMaterial(mat));
                        } else {
                            this.optimizeMaterial(child.material);
                        }
                    }
                }
            });

            // Store optimization metadata
            gltf.userData = gltf.userData || {};
            gltf.userData.optimized = true;
            gltf.userData.optimizedAt = Date.now();
            gltf.userData.scaleFactor = scaleFactor;

            return gltf;
        },

        // Optimize material settings
        optimizeMaterial: function (material) {
            if (!material) return;

            // Enable proper lighting
            material.needsUpdate = true;

            // Set reasonable defaults for PBR materials
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                if (material.roughness === undefined) material.roughness = 0.5;
                if (material.metalness === undefined) material.metalness = 0.0;
            }
        },

        // Cache model with size management
        cacheModel: function (cacheKey, model) {
            // Check cache size and clean if necessary
            if (Object.keys(this.config.modelCache).length >= this.config.maxCacheSize) {
                this.cleanCache();
            }

            // Store in cache with metadata
            this.config.modelCache[cacheKey] = {
                scene: model.scene,
                animations: model.animations || [],
                userData: model.userData || {},
                cachedAt: Date.now(),
                accessCount: 0
            };

            console.log('💾 Model cached:', cacheKey);
        },

        // Clean cache using LRU strategy
        cleanCache: function () {
            console.log('🧹 Cleaning model cache...');

            const cacheEntries = Object.entries(this.config.modelCache);

            // Sort by access count and age (LRU)
            cacheEntries.sort((a, b) => {
                const aScore = a[1].accessCount + (Date.now() - a[1].cachedAt) / 1000000;
                const bScore = b[1].accessCount + (Date.now() - b[1].cachedAt) / 1000000;
                return aScore - bScore;
            });

            // Remove oldest 25% of entries
            const removeCount = Math.floor(cacheEntries.length * 0.25);
            for (let i = 0; i < removeCount; i++) {
                const [key, model] = cacheEntries[i];
                this.disposeModel(model);
                delete this.config.modelCache[key];
            }

            console.log(`🗑️ Removed ${removeCount} models from cache`);
        },

        // Dispose model resources properly
        disposeModel: function (model) {
            if (!model || !model.scene) return;

            model.scene.traverse((object) => {
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

        // Clear entire model cache
        clearCache: function () {
            console.log('🧹 Clearing entire model cache...');

            Object.values(this.config.modelCache).forEach(model => {
                this.disposeModel(model);
            });

            this.config.modelCache = {};
            this.config.loadingModels = {};

            // Reset stats
            this.config.cacheStats = {
                hits: 0,
                misses: 0,
                totalLoaded: 0
            };

            console.log('✅ Model cache cleared');
        },

        // Get cache statistics
        getCacheStats: function () {
            const stats = {
                cachedModels: Object.keys(this.config.modelCache).length,
                loadingModels: Object.keys(this.config.loadingModels).length,
                maxCacheSize: this.config.maxCacheSize,
                cacheKeys: Object.keys(this.config.modelCache),
                ...this.config.cacheStats
            };

            // Calculate hit ratio
            const totalRequests = stats.hits + stats.misses;
            stats.hitRatio = totalRequests > 0 ? (stats.hits / totalRequests * 100).toFixed(1) + '%' : '0%';

            return stats;
        },

        // Get model dimensions in local space (fixed to prevent infinite loops)
        getModelDimensions: function (model) {
            if (!model) {
                return { width: 0.05, height: 0.05, depth: 0.05 };
            }

            // Use a more direct approach to avoid infinite loops
            const box = new THREE.Box3();

            // Calculate bounding box directly from the model
            model.traverse((child) => {
                if (child.isMesh && child.geometry) {
                    // Get geometry bounding box in local space
                    if (!child.geometry.boundingBox) {
                        child.geometry.computeBoundingBox();
                    }

                    // Transform the bounding box by the mesh's matrix
                    const meshBox = child.geometry.boundingBox.clone();
                    meshBox.applyMatrix4(child.matrixWorld);
                    box.union(meshBox);
                }
            });

            const size = box.getSize(new THREE.Vector3());

            const dimensions = {
                width: Math.abs(size.x) || 0.05,
                height: Math.abs(size.y) || 0.05,
                depth: Math.abs(size.z) || 0.05
            };

            console.log('📏 Model dimensions calculated:', dimensions);
            return dimensions;
        },

        // Preload models for better performance
        preloadModels: function (modelUrls) {
            const self = this;
            const promises = [];

            modelUrls.forEach(url => {
                if (url && !self.config.modelCache[url]) {
                    promises.push(
                        self.loadModel(url).catch(error => {
                            console.warn('Failed to preload model:', url, error);
                            return null;
                        })
                    );
                }
            });

            return Promise.all(promises);
        },

        // Dispose all resources
        dispose: function () {
            console.log('🧹 Disposing model manager...');

            this.clearCache();
            this.config.modelLoader = null;

            console.log('✅ Model manager disposed');
        }
    };

    // Expose to global scope
    window.BlastiModels = BlastiModels;

    // Auto-cleanup on page unload
    window.addEventListener('beforeunload', function () {
        BlastiModels.dispose();
    });

})(window);