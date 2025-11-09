/**
 * Blasti Debug Visualization Module
 * Phase 3: Placement Precision
 *
 * Provides debug visualization tools for:
 * - Peg hole positions (red spheres)
 * - Accessory peg positions (green spheres)
 * - Flush mounting plane (blue semi-transparent plane)
 * - Occupied holes (yellow spheres)
 * - Validation errors (visual indicators)
 */

(function(window) {
    'use strict';

    const BlastiDebugViz = {

        // Debug mode state
        enabled: false,

        // Configuration
        config: {
            pegHoleSize: 0.002,      // 2mm spheres for peg holes
            pegSize: 0.003,          // 3mm spheres for pegs
            pegHoleColor: 0xff0000,  // Red for holes
            pegColor: 0x00ff00,      // Green for pegs
            occupiedColor: 0xffff00, // Yellow for occupied holes
            invalidColor: 0xff00ff,  // Magenta for invalid
            planeOpacity: 0.15       // Flush plane transparency
        },

        /**
         * Toggle debug mode on/off
         */
        toggleDebugMode: function() {
            this.enabled = !this.enabled;
            console.log('🐛 Debug visualization:', this.enabled ? 'ENABLED' : 'DISABLED');

            if (this.enabled) {
                console.log('Debug controls:');
                console.log('  - Red spheres: Peg holes');
                console.log('  - Green spheres: Accessory pegs');
                console.log('  - Blue plane: Pegboard front face (flush plane)');
                console.log('  - Yellow spheres: Occupied holes');
            }

            return this.enabled;
        },

        /**
         * Enable debug mode
         */
        enable: function() {
            this.enabled = true;
            console.log('🐛 Debug visualization ENABLED');
        },

        /**
         * Disable debug mode
         */
        disable: function() {
            this.enabled = false;
            console.log('🐛 Debug visualization DISABLED');
        },

        /**
         * Show all peg holes on pegboard as red spheres
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {Array} pegHoles - Array of peg hole positions (Vector3 or {x,y,z})
         * @param {number} color - Optional color override
         */
        showPegHoles: function(scene, pegHoles, color = null) {
            if (!this.enabled || !pegHoles) return;

            const holeColor = color !== null ? color : this.config.pegHoleColor;

            pegHoles.forEach((hole, index) => {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(this.config.pegHoleSize, 8, 8),
                    new THREE.MeshBasicMaterial({
                        color: holeColor,
                        transparent: true,
                        opacity: 0.6
                    })
                );

                const holePos = hole instanceof THREE.Vector3 ? hole : new THREE.Vector3(hole.x, hole.y, hole.z);
                sphere.position.copy(holePos);
                sphere.name = `debug-hole-${index}`;
                sphere.userData.debugType = 'peg-hole';

                scene.add(sphere);
            });

            console.log(`🔴 Debug: Showing ${pegHoles.length} peg holes`);
        },

        /**
         * Show accessory peg positions as green spheres
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {THREE.Object3D} accessoryModel - Accessory 3D model
         * @param {Object} pegConfig - Peg configuration
         * @param {number} color - Optional color override
         */
        showPegPositions: function(scene, accessoryModel, pegConfig, color = null) {
            if (!this.enabled || !accessoryModel || !pegConfig) return;

            const pegColor = color !== null ? color : this.config.pegColor;
            const pegPositions = this.getPegWorldPositions(accessoryModel, pegConfig);

            pegPositions.forEach((pegPos, index) => {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(this.config.pegSize, 8, 8),
                    new THREE.MeshBasicMaterial({
                        color: pegColor,
                        transparent: true,
                        opacity: 0.8
                    })
                );

                sphere.position.copy(pegPos);
                sphere.name = `debug-peg-${index}`;
                sphere.userData.debugType = 'accessory-peg';

                scene.add(sphere);
            });

            console.log(`🟢 Debug: Showing ${pegPositions.length} accessory pegs`);
        },

        /**
         * Show flush mounting plane (pegboard front face)
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {THREE.Object3D} pegboard - Pegboard model with metadata
         */
        showFlushPlane: function(scene, pegboard) {
            if (!this.enabled || !pegboard || !pegboard.userData.pegboardMetadata) return;

            const meta = pegboard.userData.pegboardMetadata;
            const frontZ = meta.dimensions.depth / 2;

            const geometry = new THREE.PlaneGeometry(
                meta.dimensions.width * 1.05, // Slightly larger for visibility
                meta.dimensions.height * 1.05
            );

            const material = new THREE.MeshBasicMaterial({
                color: 0x0088ff, // Bright blue
                transparent: true,
                opacity: this.config.planeOpacity,
                side: THREE.DoubleSide,
                depthWrite: false // Don't interfere with depth testing
            });

            const plane = new THREE.Mesh(geometry, material);
            plane.position.set(0, 0, frontZ);
            plane.name = 'debug-flush-plane';
            plane.userData.debugType = 'flush-plane';

            scene.add(plane);

            console.log(`🔵 Debug: Showing flush plane at Z = ${frontZ.toFixed(4)}m`);
        },

        /**
         * Show occupied peg holes as yellow spheres
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {Map} occupancyMap - Map of occupied holes
         * @param {Array} allHoles - Array of all peg holes
         */
        showOccupiedHoles: function(scene, occupancyMap, allHoles) {
            if (!this.enabled || !occupancyMap || occupancyMap.size === 0) return;

            let occupiedCount = 0;

            allHoles.forEach((hole, index) => {
                const holeKey = this.getHoleKey(hole);

                if (occupancyMap.has(holeKey)) {
                    const sphere = new THREE.Mesh(
                        new THREE.SphereGeometry(this.config.pegSize * 1.2, 8, 8),
                        new THREE.MeshBasicMaterial({
                            color: this.config.occupiedColor,
                            transparent: true,
                            opacity: 0.7
                        })
                    );

                    const holePos = hole instanceof THREE.Vector3 ? hole : new THREE.Vector3(hole.x, hole.y, hole.z);
                    sphere.position.copy(holePos);
                    sphere.name = `debug-occupied-${index}`;
                    sphere.userData.debugType = 'occupied-hole';
                    sphere.userData.occupiedBy = occupancyMap.get(holeKey);

                    scene.add(sphere);
                    occupiedCount++;
                }
            });

            console.log(`🟡 Debug: Showing ${occupiedCount} occupied holes`);
        },

        /**
         * Highlight specific holes (e.g., for showing pattern matching)
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {Array} holeGroup - Array of holes to highlight
         * @param {number} color - Color for highlight
         * @param {string} label - Label for debug group
         */
        highlightHoleGroup: function(scene, holeGroup, color = 0xff00ff, label = 'pattern') {
            if (!this.enabled || !holeGroup) return;

            holeGroup.forEach((hole, index) => {
                const sphere = new THREE.Mesh(
                    new THREE.SphereGeometry(this.config.pegSize * 1.5, 12, 12),
                    new THREE.MeshBasicMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.9
                    })
                );

                const holePos = hole instanceof THREE.Vector3 ? hole : new THREE.Vector3(hole.x, hole.y, hole.z);
                sphere.position.copy(holePos);
                sphere.name = `debug-highlight-${label}-${index}`;
                sphere.userData.debugType = 'highlight';

                scene.add(sphere);
            });

            console.log(`🔮 Debug: Highlighted ${holeGroup.length} holes for ${label}`);
        },

        /**
         * Show bounding box for an object
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {THREE.Object3D} object - Object to show bounds for
         * @param {number} color - Box color
         */
        showBoundingBox: function(scene, object, color = 0x00ffff) {
            if (!this.enabled || !object) return;

            const box = new THREE.Box3().setFromObject(object);
            const helper = new THREE.Box3Helper(box, color);
            helper.name = 'debug-bbox';
            helper.userData.debugType = 'bounding-box';

            scene.add(helper);

            const size = box.getSize(new THREE.Vector3());
            console.log(`📦 Debug: Bounding box size: ${size.x.toFixed(3)} x ${size.y.toFixed(3)} x ${size.z.toFixed(3)}`);
        },

        /**
         * Show coordinate axes at a position
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {THREE.Vector3} position - Position for axes
         * @param {number} size - Size of axes
         */
        showAxes: function(scene, position, size = 0.05) {
            if (!this.enabled) return;

            const axes = new THREE.AxesHelper(size);
            axes.position.copy(position);
            axes.name = 'debug-axes';
            axes.userData.debugType = 'axes';

            scene.add(axes);
        },

        /**
         * Show measurement line between two points
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {THREE.Vector3} start - Start position
         * @param {THREE.Vector3} end - End position
         * @param {number} color - Line color
         * @param {string} label - Label for measurement
         */
        showMeasurement: function(scene, start, end, color = 0xffffff, label = 'distance') {
            if (!this.enabled) return;

            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({ color: color });
            const line = new THREE.Line(geometry, material);
            line.name = `debug-measure-${label}`;
            line.userData.debugType = 'measurement';

            scene.add(line);

            const distance = start.distanceTo(end);
            console.log(`📏 Debug: ${label} = ${(distance * 1000).toFixed(2)}mm`);
        },

        /**
         * Clear all debug visualizations from scene
         *
         * @param {THREE.Scene} scene - Three.js scene
         */
        clearDebug: function(scene) {
            const debugObjects = [];

            scene.traverse(obj => {
                if (obj.name && obj.name.startsWith('debug-')) {
                    debugObjects.push(obj);
                }
            });

            debugObjects.forEach(obj => {
                scene.remove(obj);

                // Dispose geometry and materials
                if (obj.geometry) {
                    obj.geometry.dispose();
                }
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => mat.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });

            if (debugObjects.length > 0) {
                console.log(`🧹 Debug: Cleared ${debugObjects.length} debug objects`);
            }
        },

        /**
         * Clear specific type of debug visualizations
         *
         * @param {THREE.Scene} scene - Three.js scene
         * @param {string} debugType - Type to clear ('peg-hole', 'accessory-peg', etc.)
         */
        clearDebugType: function(scene, debugType) {
            const debugObjects = [];

            scene.traverse(obj => {
                if (obj.userData && obj.userData.debugType === debugType) {
                    debugObjects.push(obj);
                }
            });

            debugObjects.forEach(obj => {
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) obj.material.dispose();
            });

            if (debugObjects.length > 0) {
                console.log(`🧹 Debug: Cleared ${debugObjects.length} ${debugType} objects`);
            }
        },

        /**
         * Get world positions of pegs from accessory model
         * (Helper method - same as BlastiPegSystem)
         *
         * @param {THREE.Object3D} model - Accessory model
         * @param {Object} pegConfig - Peg configuration
         * @returns {Array} Array of Vector3 world positions
         */
        getPegWorldPositions: function(model, pegConfig) {
            const positions = [];

            if (!pegConfig || !pegConfig.pegs) {
                return positions;
            }

            // Ensure model matrix is up to date
            model.updateMatrixWorld(true);

            for (let peg of pegConfig.pegs) {
                const localPos = new THREE.Vector3(
                    peg.localPosition.x,
                    peg.localPosition.y,
                    peg.localPosition.z
                );

                // Transform to world space
                const worldPos = localPos.clone().applyMatrix4(model.matrixWorld);
                positions.push(worldPos);
            }

            return positions;
        },

        /**
         * Generate unique key for a peg hole
         * (Helper method - same as BlastiPegSystem)
         *
         * @param {THREE.Vector3|Object} hole - Hole position
         * @returns {string} Unique hole key
         */
        getHoleKey: function(hole) {
            const x = typeof hole.x === 'number' ? hole.x : 0;
            const y = typeof hole.y === 'number' ? hole.y : 0;
            const z = typeof hole.z === 'number' ? hole.z : 0;
            return `${x.toFixed(4)}_${y.toFixed(4)}_${z.toFixed(4)}`;
        },

        /**
         * Log placement validation details
         *
         * @param {Object} validation - Validation result from peg system
         */
        logValidation: function(validation) {
            if (!this.enabled || !validation) return;

            console.group('🔍 Peg Placement Validation');
            console.log('Valid:', validation.valid ? '✅ YES' : '❌ NO');

            if (validation.errors && validation.errors.length > 0) {
                console.log('Errors:', validation.errors);
            }

            if (validation.pegStatus && validation.pegStatus.length > 0) {
                console.log('Peg Status:');
                validation.pegStatus.forEach(status => {
                    const icon = status.valid ? '✅' : '❌';
                    console.log(`  ${icon} Peg ${status.pegIndex}:`, status.errors.length > 0 ? status.errors : 'OK');
                });
            }

            console.groupEnd();
        },

        /**
         * Log snap result details
         *
         * @param {Object} snapResult - Result from snapAccessoryToGrid
         */
        logSnapResult: function(snapResult) {
            if (!this.enabled || !snapResult) return;

            console.group('📍 Snap Result');
            console.log('Valid:', snapResult.valid ? '✅ YES' : '❌ NO');

            if (snapResult.valid) {
                console.log('Position:', snapResult.position);
                console.log('Rotation:', snapResult.rotation);
                console.log('Occupied Holes:', snapResult.occupiedHoles?.length || 0);
                console.log('Flush Z:', snapResult.position?.z.toFixed(4));
            } else {
                console.log('Reason:', snapResult.reason);
            }

            console.groupEnd();
        }
    };

    // Expose to global scope
    window.BlastiDebugViz = BlastiDebugViz;

    console.log('✅ Debug Visualization module loaded');

})(window);
