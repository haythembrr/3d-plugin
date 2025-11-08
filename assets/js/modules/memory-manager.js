/**
 * Blasti 3D Configurator - Memory Manager
 * Handles proper disposal of 3D resources to prevent memory leaks
 */

(function(window) {
    'use strict';

    const BlastiMemoryManager = {
        // Track allocated resources
        resources: {
            geometries: new Set(),
            materials: new Set(),
            textures: new Set(),
            renderTargets: new Set(),
            scenes: new Set()
        },

        // Memory usage tracking
        stats: {
            geometriesCreated: 0,
            materialsCreated: 0,
            texturesCreated: 0,
            geometriesDisposed: 0,
            materialsDisposed: 0,
            texturesDisposed: 0
        },

        // Register a resource for tracking
        register: function(resource, type) {
            if (!resource || !type) return;

            if (this.resources[type]) {
                this.resources[type].add(resource);
                this.stats[type + 'Created']++;
            }
        },

        // Dispose a single resource properly
        disposeResource: function(resource, type) {
            if (!resource) return;

            try {
                switch (type) {
                    case 'geometry':
                        this.disposeGeometry(resource);
                        break;
                    case 'material':
                        this.disposeMaterial(resource);
                        break;
                    case 'texture':
                        this.disposeTexture(resource);
                        break;
                    case 'renderTarget':
                        this.disposeRenderTarget(resource);
                        break;
                    case 'scene':
                        this.disposeScene(resource);
                        break;
                }

                // Remove from tracking
                if (this.resources[type + 's']) {
                    this.resources[type + 's'].delete(resource);
                    this.stats[type + 'sDisposed']++;
                }
            } catch (error) {
                console.warn('⚠️ Error disposing resource:', error);
            }
        },

        // Dispose geometry
        disposeGeometry: function(geometry) {
            if (geometry && typeof geometry.dispose === 'function') {
                geometry.dispose();
                this.resources.geometries.delete(geometry);
                this.stats.geometriesDisposed++;
            }
        },

        // Dispose material and its textures
        disposeMaterial: function(material) {
            if (!material) return;

            // Dispose all textures in the material
            Object.keys(material).forEach(key => {
                const value = material[key];
                if (value && typeof value === 'object' && value.isTexture) {
                    this.disposeTexture(value);
                }
            });

            // Dispose the material itself
            if (typeof material.dispose === 'function') {
                material.dispose();
                this.resources.materials.delete(material);
                this.stats.materialsDisposed++;
            }
        },

        // Dispose texture
        disposeTexture: function(texture) {
            if (texture && typeof texture.dispose === 'function') {
                texture.dispose();
                this.resources.textures.delete(texture);
                this.stats.texturesDisposed++;
            }
        },

        // Dispose render target
        disposeRenderTarget: function(renderTarget) {
            if (renderTarget && typeof renderTarget.dispose === 'function') {
                renderTarget.dispose();
                this.resources.renderTargets.delete(renderTarget);
            }
        },

        // Dispose entire scene and all its children
        disposeScene: function(scene) {
            if (!scene) return;

            scene.traverse((object) => {
                // Dispose geometry
                if (object.geometry) {
                    this.disposeGeometry(object.geometry);
                }

                // Dispose materials
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => this.disposeMaterial(material));
                    } else {
                        this.disposeMaterial(object.material);
                    }
                }

                // Dispose any render targets
                if (object.renderTarget) {
                    this.disposeRenderTarget(object.renderTarget);
                }
            });

            // Clear the scene
            if (typeof scene.clear === 'function') {
                scene.clear();
            }

            this.resources.scenes.delete(scene);
        },

        // Dispose object and all its resources
        disposeObject: function(object) {
            if (!object) return;

            // Dispose geometry
            if (object.geometry) {
                this.disposeGeometry(object.geometry);
            }

            // Dispose materials
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => this.disposeMaterial(material));
                } else {
                    this.disposeMaterial(object.material);
                }
            }

            // Recursively dispose children
            if (object.children && object.children.length > 0) {
                const children = [...object.children]; // Create copy to avoid modification during iteration
                children.forEach(child => {
                    this.disposeObject(child);
                    object.remove(child);
                });
            }
        },

        // Dispose all tracked resources
        disposeAll: function() {
            console.log('🧹 Disposing all tracked resources...');

            // Dispose all scenes
            this.resources.scenes.forEach(scene => this.disposeScene(scene));
            this.resources.scenes.clear();

            // Dispose all geometries
            this.resources.geometries.forEach(geometry => this.disposeGeometry(geometry));
            this.resources.geometries.clear();

            // Dispose all materials
            this.resources.materials.forEach(material => this.disposeMaterial(material));
            this.resources.materials.clear();

            // Dispose all textures
            this.resources.textures.forEach(texture => this.disposeTexture(texture));
            this.resources.textures.clear();

            // Dispose all render targets
            this.resources.renderTargets.forEach(rt => this.disposeRenderTarget(rt));
            this.resources.renderTargets.clear();

            console.log('✅ All resources disposed');
        },

        // Get memory usage statistics
        getStats: function() {
            return {
                ...this.stats,
                activeGeometries: this.resources.geometries.size,
                activeMaterials: this.resources.materials.size,
                activeTextures: this.resources.textures.size,
                activeRenderTargets: this.resources.renderTargets.size,
                activeScenes: this.resources.scenes.size,
                memoryUsage: this.estimateMemoryUsage()
            };
        },

        // Estimate memory usage (rough calculation)
        estimateMemoryUsage: function() {
            let estimated = 0;

            // Rough estimates in bytes
            estimated += this.resources.geometries.size * 50000; // ~50KB per geometry
            estimated += this.resources.materials.size * 1000;   // ~1KB per material
            estimated += this.resources.textures.size * 500000;  // ~500KB per texture
            estimated += this.resources.renderTargets.size * 100000; // ~100KB per render target

            return {
                bytes: estimated,
                kb: Math.round(estimated / 1024),
                mb: Math.round(estimated / (1024 * 1024))
            };
        },

        // Monitor memory usage and warn if high
        monitorMemory: function() {
            const stats = this.getStats();
            const memoryMB = stats.memoryUsage.mb;

            if (memoryMB > 100) {
                console.warn('⚠️ High memory usage detected:', memoryMB + 'MB');
                console.log('Memory stats:', stats);
            }

            return stats;
        },

        // Force garbage collection (if available)
        forceGC: function() {
            if (window.gc && typeof window.gc === 'function') {
                console.log('🗑️ Forcing garbage collection...');
                window.gc();
            } else {
                console.log('ℹ️ Garbage collection not available (requires --expose-gc flag)');
            }
        },

        // Clean up unused resources periodically
        cleanup: function() {
            console.log('🧹 Running memory cleanup...');

            // Remove disposed resources from tracking
            ['geometries', 'materials', 'textures', 'renderTargets', 'scenes'].forEach(type => {
                const resources = Array.from(this.resources[type]);
                resources.forEach(resource => {
                    // Check if resource is still valid/needed
                    if (this.isResourceDisposed(resource)) {
                        this.resources[type].delete(resource);
                    }
                });
            });

            // Force garbage collection if available
            this.forceGC();

            const stats = this.getStats();
            console.log('✅ Cleanup complete. Memory usage:', stats.memoryUsage.mb + 'MB');
            
            return stats;
        },

        // Check if a resource has been disposed
        isResourceDisposed: function(resource) {
            if (!resource) return true;

            // Check common disposal indicators
            if (resource.disposed === true) return true;
            if (resource.isDisposed === true) return true;
            
            // For textures, check if image is null
            if (resource.isTexture && !resource.image) return true;
            
            // For geometries, check if attributes are empty
            if (resource.isGeometry && Object.keys(resource.attributes || {}).length === 0) return true;

            return false;
        },

        // Reset all statistics
        resetStats: function() {
            this.stats = {
                geometriesCreated: 0,
                materialsCreated: 0,
                texturesCreated: 0,
                geometriesDisposed: 0,
                materialsDisposed: 0,
                texturesDisposed: 0
            };
            console.log('📊 Memory statistics reset');
        }
    };

    // Expose to global scope
    window.BlastiMemoryManager = BlastiMemoryManager;

    // Auto-cleanup on page unload
    window.addEventListener('beforeunload', function() {
        BlastiMemoryManager.disposeAll();
    });

    // Periodic memory monitoring (every 30 seconds)
    if (typeof setInterval !== 'undefined') {
        setInterval(function() {
            BlastiMemoryManager.monitorMemory();
        }, 30000);
    }

})(window);