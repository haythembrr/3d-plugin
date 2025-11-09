/**
 * Blasti Peg-Hole System
 * Phase 2: Handles peg-to-hole validation, multi-peg pattern matching, and geometric positioning
 *
 * This module provides:
 * - Multi-peg pattern matching algorithm
 * - Peg validation (diameter, length, alignment)
 * - Occupancy tracking
 * - Geometric position calculation
 * - Flush mounting calculation
 */

(function(window) {
    'use strict';

    const BlastiPegSystem = {

        /**
         * Find compatible peg hole groups for an accessory
         *
         * For multi-peg accessories, this finds all possible hole patterns
         * that match the peg configuration within tolerance.
         *
         * @param {Object} pegConfig - Peg configuration from product data
         * @param {Array} availableHoles - Array of THREE.Vector3 hole positions
         * @param {THREE.Vector3} primaryHole - Starting hole for pattern search
         * @param {number} tolerance - Maximum distance tolerance (default 2mm)
         * @returns {Array} Array of valid hole groups (arrays of THREE.Vector3)
         */
        findCompatiblePegHoles: function(pegConfig, availableHoles, primaryHole, tolerance = 0.002) {
            if (!pegConfig || !pegConfig.pegs || pegConfig.pegs.length === 0) {
                console.warn('Invalid peg config:', pegConfig);
                return [];
            }

            const validGroups = [];
            const pegs = pegConfig.pegs;

            // If single peg, just return the closest hole within tolerance
            if (pegs.length === 1) {
                const closestHole = this.findClosestHole(primaryHole, availableHoles);
                if (closestHole && closestHole.distanceTo(primaryHole) <= tolerance) {
                    return [[closestHole]];
                }
                return [];
            }

            // Multi-peg: find patterns that match
            // Try each hole as a potential starting point
            for (let startHole of availableHoles) {
                const holeGroup = [startHole];
                let allPegsMatch = true;

                // Calculate expected positions for other pegs relative to first peg
                for (let i = 1; i < pegs.length; i++) {
                    // Get offset from first peg to this peg in local space
                    const pegOffset = new THREE.Vector3()
                        .copy(pegs[i].localPosition)
                        .sub(pegs[0].localPosition);

                    // Expected hole position = start hole + offset
                    const expectedHolePos = new THREE.Vector3()
                        .copy(startHole)
                        .add(pegOffset);

                    // Find closest actual hole to expected position
                    const closestHole = this.findClosestHole(expectedHolePos, availableHoles);

                    // Check if hole is close enough
                    if (!closestHole || closestHole.distanceTo(expectedHolePos) > tolerance) {
                        allPegsMatch = false;
                        break;
                    }

                    // Make sure we haven't already used this hole in the pattern
                    if (holeGroup.some(h => h.distanceTo(closestHole) < 0.001)) {
                        allPegsMatch = false;
                        break;
                    }

                    holeGroup.push(closestHole);
                }

                // If all pegs found matching holes, add this pattern to valid groups
                if (allPegsMatch && holeGroup.length === pegs.length) {
                    validGroups.push(holeGroup);
                }
            }

            console.log(`Found ${validGroups.length} compatible hole patterns for ${pegs.length}-peg accessory`);

            return validGroups;
        },

        /**
         * Find closest peg hole to a position
         *
         * @param {THREE.Vector3} position - Target position
         * @param {Array} holes - Array of hole positions (Vector3 or {x,y,z})
         * @returns {THREE.Vector3|null} Closest hole position or null
         */
        findClosestHole: function(position, holes) {
            if (!holes || holes.length === 0) {
                return null;
            }

            let closest = null;
            let minDist = Infinity;

            for (let hole of holes) {
                // Convert to Vector3 if needed
                const holePos = hole instanceof THREE.Vector3 ?
                    hole : new THREE.Vector3(hole.x, hole.y, hole.z);

                const dist = position.distanceTo(holePos);
                if (dist < minDist) {
                    minDist = dist;
                    closest = holePos;
                }
            }

            return closest;
        },

        /**
         * Validate if all pegs can be inserted into holes
         *
         * Checks:
         * - Peg diameter vs hole diameter
         * - Peg length vs hole depth
         * - Peg insertion direction vs hole direction
         *
         * @param {Object} pegConfig - Peg configuration
         * @param {Array} holeGroup - Array of hole positions matching pegs
         * @param {Object} pegboardMeta - Pegboard metadata (dimensions_v2)
         * @returns {Object} Validation result with status and errors
         */
        validatePegPlacement: function(pegConfig, holeGroup, pegboardMeta) {
            const validation = {
                valid: true,
                errors: [],
                pegStatus: []
            };

            if (!pegConfig || !pegConfig.pegs) {
                validation.valid = false;
                validation.errors.push('NO_PEG_CONFIG');
                return validation;
            }

            if (pegConfig.pegs.length !== holeGroup.length) {
                validation.valid = false;
                validation.errors.push('PEG_HOLE_COUNT_MISMATCH');
                return validation;
            }

            // Get pegboard hole specifications
            const holeDiameter = pegboardMeta.pegHoleGrid?.diameter || 0.0064; // 1/4 inch default
            const holeDepth = pegboardMeta.pegHoleGrid?.depth || 0.015; // 15mm default

            // Validate each peg
            for (let i = 0; i < pegConfig.pegs.length; i++) {
                const peg = pegConfig.pegs[i];
                const hole = holeGroup[i];

                const pegStatus = {
                    pegIndex: i,
                    pegId: peg.id || `peg_${i}`,
                    valid: true,
                    errors: []
                };

                // Check peg diameter vs hole diameter
                if (peg.diameter > holeDiameter) {
                    pegStatus.valid = false;
                    pegStatus.errors.push('PEG_TOO_LARGE');
                    validation.valid = false;
                }

                // Check peg length vs hole depth
                if (peg.length > holeDepth) {
                    pegStatus.valid = false;
                    pegStatus.errors.push('PEG_TOO_LONG');
                    validation.valid = false;
                }

                // Check alignment (peg insertion direction should oppose hole normal)
                const pegDirection = new THREE.Vector3(
                    peg.insertionDirection.x,
                    peg.insertionDirection.y,
                    peg.insertionDirection.z
                );
                const holeNormal = pegboardMeta.geometry?.frontFaceNormal || {x: 0, y: 0, z: 1};
                const holeDirection = new THREE.Vector3(holeNormal.x, holeNormal.y, holeNormal.z);

                // Peg should insert in opposite direction to hole normal
                const alignment = pegDirection.dot(holeDirection);

                // Should be close to -1 (opposite directions)
                if (Math.abs(alignment + 1) > 0.1) {
                    pegStatus.valid = false;
                    pegStatus.errors.push('PEG_MISALIGNED');
                    validation.valid = false;
                }

                validation.pegStatus.push(pegStatus);
            }

            if (!validation.valid) {
                console.warn('Peg validation failed:', validation);
            }

            return validation;
        },

        /**
         * Calculate accessory position from peg holes
         *
         * Position is calculated such that when the accessory is placed,
         * all pegs align with their corresponding holes.
         *
         * @param {Object} pegConfig - Peg configuration
         * @param {Array} holeGroup - Array of hole positions
         * @param {number} rotation - Rotation in radians (default 0)
         * @returns {THREE.Vector3|null} Accessory world position or null
         */
        calculateAccessoryPositionFromPegs: function(pegConfig, holeGroup, rotation = 0) {
            if (!pegConfig || !pegConfig.pegs || holeGroup.length === 0) {
                return null;
            }

            const primaryPeg = pegConfig.pegs[0];
            const primaryHole = holeGroup[0];

            // Transform primary peg local position with rotation
            const rotatedPegPos = new THREE.Vector3()
                .copy(primaryPeg.localPosition)
                .applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation);

            // Accessory position = hole position - rotated peg offset
            // This ensures when accessory is at this position, the peg is at the hole
            const accessoryPos = primaryHole.clone().sub(rotatedPegPos);

            return accessoryPos;
        },

        /**
         * Calculate flush mounting Z position
         *
         * Calculates the Z position where the accessory sits flush against
         * the pegboard surface after peg insertion.
         *
         * @param {Object} pegConfig - Peg configuration with mounting info
         * @param {Object} pegboardMeta - Pegboard metadata (dimensions_v2)
         * @returns {number} Z position for flush mounting
         */
        calculateFlushZ: function(pegConfig, pegboardMeta) {
            if (!pegConfig || !pegboardMeta) {
                return 0;
            }

            // Pegboard front face position
            const pegboardFrontFace = pegboardMeta.dimensions.depth / 2;

            // Get mounting parameters
            const flushGap = pegConfig.mounting?.flushOffset || 0.001; // 1mm default gap
            const mountingSurfaceOffset = pegConfig.mounting?.surfaceOffset || 0.002; // 2mm back surface

            // Accessory back surface should be at pegboard front + small gap
            // surfaceOffset is distance from accessory origin to mounting surface
            const flushZ = pegboardFrontFace + flushGap - mountingSurfaceOffset;

            return flushZ;
        },

        /**
         * Get peg world positions for an accessory
         *
         * Transforms peg local positions to world space based on accessory model matrix.
         *
         * @param {THREE.Object3D} accessoryModel - The accessory 3D model
         * @param {Object} pegConfig - Peg configuration
         * @returns {Array} Array of THREE.Vector3 world positions
         */
        getPegWorldPositions: function(accessoryModel, pegConfig) {
            const positions = [];

            if (!pegConfig || !pegConfig.pegs) {
                return positions;
            }

            for (let peg of pegConfig.pegs) {
                const localPos = new THREE.Vector3(
                    peg.localPosition.x,
                    peg.localPosition.y,
                    peg.localPosition.z
                );

                // Transform to world space
                const worldPos = localPos.clone().applyMatrix4(accessoryModel.matrixWorld);
                positions.push(worldPos);
            }

            return positions;
        },

        /**
         * Check if peg holes are occupied
         *
         * @param {Array} holeGroup - Array of holes to check
         * @param {Map} occupiedHoles - Map of occupied holes (key -> placementId)
         * @returns {boolean} True if any hole is occupied
         */
        checkHolesOccupied: function(holeGroup, occupiedHoles) {
            if (!occupiedHoles || occupiedHoles.size === 0) {
                return false;
            }

            for (let hole of holeGroup) {
                const holeKey = this.getHoleKey(hole);
                if (occupiedHoles.has(holeKey)) {
                    return true;
                }
            }

            return false;
        },

        /**
         * Generate unique key for a peg hole
         *
         * Uses position rounded to 4 decimal places (0.1mm precision)
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
         * Mark holes as occupied
         *
         * @param {Array} holeGroup - Array of holes to mark
         * @param {string} placementId - ID of placement occupying the holes
         * @param {Map} occupancyMap - Map to update
         */
        markHolesOccupied: function(holeGroup, placementId, occupancyMap) {
            for (let hole of holeGroup) {
                const key = this.getHoleKey(hole);
                occupancyMap.set(key, placementId);
            }
            console.log(`Marked ${holeGroup.length} holes as occupied by ${placementId}`);
        },

        /**
         * Free occupied holes
         *
         * @param {Array} holeGroup - Array of holes to free
         * @param {Map} occupancyMap - Map to update
         */
        freeOccupiedHoles: function(holeGroup, occupancyMap) {
            for (let hole of holeGroup) {
                const key = this.getHoleKey(hole);
                occupancyMap.delete(key);
            }
            console.log(`Freed ${holeGroup.length} holes`);
        },

        /**
         * Get which accessory is occupying specific holes
         *
         * @param {Array} holeGroup - Array of holes to check
         * @param {Map} occupancyMap - Occupancy map
         * @returns {string|null} Placement ID or null
         */
        getHoleOccupant: function(holeGroup, occupancyMap) {
            for (let hole of holeGroup) {
                const key = this.getHoleKey(hole);
                if (occupancyMap.has(key)) {
                    return occupancyMap.get(key);
                }
            }
            return null;
        },

        /**
         * Test rotation angles for accessory placement
         *
         * Some accessories may be placed at multiple rotations (0°, 90°, 180°, 270°)
         *
         * @param {Object} pegConfig - Peg configuration
         * @param {Array} availableHoles - Available hole positions
         * @param {THREE.Vector3} primaryHole - Starting hole
         * @returns {Array} Valid rotation angles in radians
         */
        testRotations: function(pegConfig, availableHoles, primaryHole) {
            const allowableRotations = pegConfig.mounting?.allowableRotations || [0];
            const validRotations = [];

            for (let angleDeg of allowableRotations) {
                const angleRad = (angleDeg * Math.PI) / 180;

                // Test if this rotation produces valid hole groups
                // For rotation, we need to rotate the peg pattern and check again
                const rotatedHoleGroups = this.findCompatiblePegHolesWithRotation(
                    pegConfig,
                    availableHoles,
                    primaryHole,
                    angleRad
                );

                if (rotatedHoleGroups.length > 0) {
                    validRotations.push(angleRad);
                }
            }

            return validRotations;
        },

        /**
         * Find compatible peg holes with rotation applied
         *
         * @param {Object} pegConfig - Peg configuration
         * @param {Array} availableHoles - Available holes
         * @param {THREE.Vector3} primaryHole - Starting hole
         * @param {number} rotation - Rotation in radians
         * @returns {Array} Valid hole groups
         */
        findCompatiblePegHolesWithRotation: function(pegConfig, availableHoles, primaryHole, rotation) {
            // Create rotated peg config
            const rotatedConfig = {
                ...pegConfig,
                pegs: pegConfig.pegs.map(peg => ({
                    ...peg,
                    localPosition: new THREE.Vector3()
                        .copy(peg.localPosition)
                        .applyAxisAngle(new THREE.Vector3(0, 0, 1), rotation)
                }))
            };

            return this.findCompatiblePegHoles(rotatedConfig, availableHoles, primaryHole);
        }
    };

    // Expose to global scope
    window.BlastiPegSystem = BlastiPegSystem;

    console.log('✅ Blasti Peg System module loaded');

})(window);
