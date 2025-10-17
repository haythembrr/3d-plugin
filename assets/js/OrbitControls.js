/**
 * Three.js OrbitControls
 * Simplified version for camera control
 * Based on Three.js examples
 */

(function() {
    'use strict';

    if (typeof THREE === 'undefined') {
        console.error('THREE is not defined. OrbitControls requires Three.js');
        return;
    }

    THREE.OrbitControls = function(object, domElement) {
        this.object = object;
        this.domElement = (domElement !== undefined) ? domElement : document;

        // API
        this.enabled = true;
        this.target = new THREE.Vector3();

        // Damping
        this.enableDamping = false;
        this.dampingFactor = 0.05;

        // Limits
        this.minDistance = 0;
        this.maxDistance = Infinity;
        this.minPolarAngle = 0;
        this.maxPolarAngle = Math.PI;

        // Rotation
        this.rotateSpeed = 1.0;
        this.enableRotate = true;

        // Zoom
        this.zoomSpeed = 1.0;
        this.enableZoom = true;

        // Pan
        this.panSpeed = 1.0;
        this.enablePan = true;

        // Internal state
        var scope = this;
        var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_DOLLY_PAN: 4 };
        var state = STATE.NONE;

        var spherical = new THREE.Spherical();
        var sphericalDelta = new THREE.Spherical();
        var scale = 1;
        var panOffset = new THREE.Vector3();

        var rotateStart = new THREE.Vector2();
        var rotateEnd = new THREE.Vector2();
        var rotateDelta = new THREE.Vector2();

        var panStart = new THREE.Vector2();
        var panEnd = new THREE.Vector2();
        var panDelta = new THREE.Vector2();

        var dollyStart = new THREE.Vector2();
        var dollyEnd = new THREE.Vector2();
        var dollyDelta = new THREE.Vector2();

        // Update function
        this.update = function() {
            var offset = new THREE.Vector3();
            var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
            var quatInverse = quat.clone().invert();

            var lastPosition = new THREE.Vector3();
            var lastQuaternion = new THREE.Quaternion();

            return function update() {
                var position = scope.object.position;

                offset.copy(position).sub(scope.target);
                offset.applyQuaternion(quat);

                spherical.setFromVector3(offset);

                if (scope.enableDamping) {
                    spherical.theta += sphericalDelta.theta * scope.dampingFactor;
                    spherical.phi += sphericalDelta.phi * scope.dampingFactor;
                } else {
                    spherical.theta += sphericalDelta.theta;
                    spherical.phi += sphericalDelta.phi;
                }

                // Restrict phi to be between desired limits
                spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
                spherical.makeSafe();

                spherical.radius *= scale;

                // Restrict radius to be between desired limits
                spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

                // Move target to panned location
                if (scope.enableDamping === true) {
                    scope.target.addScaledVector(panOffset, scope.dampingFactor);
                } else {
                    scope.target.add(panOffset);
                }

                offset.setFromSpherical(spherical);
                offset.applyQuaternion(quatInverse);

                position.copy(scope.target).add(offset);

                scope.object.lookAt(scope.target);

                if (scope.enableDamping === true) {
                    sphericalDelta.theta *= (1 - scope.dampingFactor);
                    sphericalDelta.phi *= (1 - scope.dampingFactor);
                    panOffset.multiplyScalar(1 - scope.dampingFactor);
                } else {
                    sphericalDelta.set(0, 0, 0);
                    panOffset.set(0, 0, 0);
                }

                scale = 1;

                // Update condition
                if (lastPosition.distanceToSquared(scope.object.position) > 0.000001 ||
                    8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > 0.000001) {
                    lastPosition.copy(scope.object.position);
                    lastQuaternion.copy(scope.object.quaternion);
                    return true;
                }

                return false;
            };
        }();

        // Mouse event handlers
        function onMouseDown(event) {
            if (scope.enabled === false) return;

            event.preventDefault();

            if (event.button === 0) {
                if (scope.enableRotate === false) return;
                handleMouseDownRotate(event);
                state = STATE.ROTATE;
            } else if (event.button === 1) {
                if (scope.enableZoom === false) return;
                handleMouseDownDolly(event);
                state = STATE.DOLLY;
            } else if (event.button === 2) {
                if (scope.enablePan === false) return;
                handleMouseDownPan(event);
                state = STATE.PAN;
            }

            if (state !== STATE.NONE) {
                document.addEventListener('mousemove', onMouseMove, false);
                document.addEventListener('mouseup', onMouseUp, false);
            }
        }

        function onMouseMove(event) {
            if (scope.enabled === false) return;

            event.preventDefault();

            if (state === STATE.ROTATE) {
                if (scope.enableRotate === false) return;
                handleMouseMoveRotate(event);
            } else if (state === STATE.DOLLY) {
                if (scope.enableZoom === false) return;
                handleMouseMoveDolly(event);
            } else if (state === STATE.PAN) {
                if (scope.enablePan === false) return;
                handleMouseMovePan(event);
            }
        }

        function onMouseUp(event) {
            if (scope.enabled === false) return;

            handleMouseUp(event);

            document.removeEventListener('mousemove', onMouseMove, false);
            document.removeEventListener('mouseup', onMouseUp, false);

            state = STATE.NONE;
        }

        function onMouseWheel(event) {
            if (scope.enabled === false || scope.enableZoom === false || (state !== STATE.NONE && state !== STATE.ROTATE)) return;

            event.preventDefault();
            event.stopPropagation();

            handleMouseWheel(event);
        }

        function handleMouseDownRotate(event) {
            rotateStart.set(event.clientX, event.clientY);
        }

        function handleMouseDownDolly(event) {
            dollyStart.set(event.clientX, event.clientY);
        }

        function handleMouseDownPan(event) {
            panStart.set(event.clientX, event.clientY);
        }

        function handleMouseMoveRotate(event) {
            rotateEnd.set(event.clientX, event.clientY);
            rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);

            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / element.clientHeight;
            sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / element.clientHeight;

            rotateStart.copy(rotateEnd);

            scope.update();
        }

        function handleMouseMoveDolly(event) {
            dollyEnd.set(event.clientX, event.clientY);
            dollyDelta.subVectors(dollyEnd, dollyStart);

            if (dollyDelta.y > 0) {
                dollyIn(getZoomScale());
            } else if (dollyDelta.y < 0) {
                dollyOut(getZoomScale());
            }

            dollyStart.copy(dollyEnd);

            scope.update();
        }

        function handleMouseMovePan(event) {
            panEnd.set(event.clientX, event.clientY);
            panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
            pan(panDelta.x, panDelta.y);
            panStart.copy(panEnd);
            scope.update();
        }

        function handleMouseUp(event) {
            // No-op
        }

        function handleMouseWheel(event) {
            if (event.deltaY < 0) {
                dollyOut(getZoomScale());
            } else if (event.deltaY > 0) {
                dollyIn(getZoomScale());
            }

            scope.update();
        }

        // Touch event handlers
        function onTouchStart(event) {
            if (scope.enabled === false) return;

            event.preventDefault();

            switch (event.touches.length) {
                case 1:
                    if (scope.enableRotate === false) return;
                    handleTouchStartRotate(event);
                    state = STATE.TOUCH_ROTATE;
                    break;

                case 2:
                    if (scope.enableZoom === false && scope.enablePan === false) return;
                    handleTouchStartDollyPan(event);
                    state = STATE.TOUCH_DOLLY_PAN;
                    break;

                default:
                    state = STATE.NONE;
            }
        }

        function onTouchMove(event) {
            if (scope.enabled === false) return;

            event.preventDefault();
            event.stopPropagation();

            switch (event.touches.length) {
                case 1:
                    if (scope.enableRotate === false) return;
                    if (state !== STATE.TOUCH_ROTATE) return;
                    handleTouchMoveRotate(event);
                    break;

                case 2:
                    if (scope.enableZoom === false && scope.enablePan === false) return;
                    if (state !== STATE.TOUCH_DOLLY_PAN) return;
                    handleTouchMoveDollyPan(event);
                    break;

                default:
                    state = STATE.NONE;
            }
        }

        function onTouchEnd(event) {
            if (scope.enabled === false) return;

            handleTouchEnd(event);

            state = STATE.NONE;
        }

        function handleTouchStartRotate(event) {
            rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
        }

        function handleTouchStartDollyPan(event) {
            if (scope.enableZoom) {
                var dx = event.touches[0].pageX - event.touches[1].pageX;
                var dy = event.touches[0].pageY - event.touches[1].pageY;
                var distance = Math.sqrt(dx * dx + dy * dy);
                dollyStart.set(0, distance);
            }

            if (scope.enablePan) {
                var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
                var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
                panStart.set(x, y);
            }
        }

        function handleTouchMoveRotate(event) {
            rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
            rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);

            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / element.clientHeight;
            sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / element.clientHeight;

            rotateStart.copy(rotateEnd);

            scope.update();
        }

        function handleTouchMoveDollyPan(event) {
            if (scope.enableZoom) {
                var dx = event.touches[0].pageX - event.touches[1].pageX;
                var dy = event.touches[0].pageY - event.touches[1].pageY;
                var distance = Math.sqrt(dx * dx + dy * dy);

                dollyEnd.set(0, distance);
                dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));

                dollyIn(dollyDelta.y);

                dollyStart.copy(dollyEnd);
            }

            if (scope.enablePan) {
                var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
                var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
                panEnd.set(x, y);
                panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
                pan(panDelta.x, panDelta.y);
                panStart.copy(panEnd);
            }

            scope.update();
        }

        function handleTouchEnd(event) {
            // No-op
        }

        // Helper functions
        function dollyIn(dollyScale) {
            scale /= dollyScale;
        }

        function dollyOut(dollyScale) {
            scale *= dollyScale;
        }

        function getZoomScale() {
            return Math.pow(0.95, scope.zoomSpeed);
        }

        function pan(deltaX, deltaY) {
            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            var offset = new THREE.Vector3();

            offset.copy(scope.object.position).sub(scope.target);
            var targetDistance = offset.length();

            targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

            var panLeft = new THREE.Vector3();
            var v = new THREE.Vector3();
            v.setFromMatrixColumn(scope.object.matrix, 0);
            panLeft.copy(v).multiplyScalar(-2 * deltaX * targetDistance / element.clientHeight);

            var panUp = new THREE.Vector3();
            v.setFromMatrixColumn(scope.object.matrix, 1);
            panUp.copy(v).multiplyScalar(2 * deltaY * targetDistance / element.clientHeight);

            panOffset.add(panLeft).add(panUp);
        }

        // Dispose
        this.dispose = function() {
            scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
            scope.domElement.removeEventListener('mousedown', onMouseDown, false);
            scope.domElement.removeEventListener('wheel', onMouseWheel, false);

            scope.domElement.removeEventListener('touchstart', onTouchStart, false);
            scope.domElement.removeEventListener('touchend', onTouchEnd, false);
            scope.domElement.removeEventListener('touchmove', onTouchMove, false);

            document.removeEventListener('mousemove', onMouseMove, false);
            document.removeEventListener('mouseup', onMouseUp, false);
        };

        // Context menu
        function onContextMenu(event) {
            if (scope.enabled === false) return;
            event.preventDefault();
        }

        // Initialize event listeners
        this.domElement.addEventListener('contextmenu', onContextMenu, false);
        this.domElement.addEventListener('mousedown', onMouseDown, false);
        this.domElement.addEventListener('wheel', onMouseWheel, false);

        this.domElement.addEventListener('touchstart', onTouchStart, false);
        this.domElement.addEventListener('touchend', onTouchEnd, false);
        this.domElement.addEventListener('touchmove', onTouchMove, false);

        // Force an update at start
        this.update();
    };

})();
