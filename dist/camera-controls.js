/*!
 * camera-controls
 * https://github.com/yomotsu/camera-controls
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.CameraControls = factory());
}(this, (function () { 'use strict';

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var THREE = void 0;
	var _v3 = void 0;
	var _xColumn = void 0;
	var _yColumn = void 0;
	var EPSILON = 0.001;
	var STATE = {
		NONE: -1,
		ROTATE: 0,
		DOLLY: 1,
		PAN: 2,
		TOUCH_ROTATE: 3,
		TOUCH_DOLLY: 4,
		TOUCH_PAN: 5
	};

	var CameraControls = function () {
		CameraControls.install = function install(libs) {

			THREE = libs.THREE;
			_v3 = new THREE.Vector3();
			_xColumn = new THREE.Vector3();
			_yColumn = new THREE.Vector3();
		};

		function CameraControls(object, domElement) {
			_classCallCheck(this, CameraControls);

			this.object = object;
			this.enabled = true;

			this.minDistance = 0;
			this.maxDistance = Infinity;
			this.minPolarAngle = 0; // radians
			this.maxPolarAngle = Math.PI; // radians
			this.minAzimuthAngle = -Infinity; // radians
			this.maxAzimuthAngle = Infinity; // radians
			this.dampingFactor = 0.05;
			this.draggingDampingFactor = 0.25;
			this.zoomSpeed = 1.0;
			this.panSpeed = 2.0;

			this.domElement = domElement;

			// the location of focus, where the object orbits around
			this.target = new THREE.Vector3();
			this._targetEnd = new THREE.Vector3();

			// rotation
			this._spherical = new THREE.Spherical();
			this._spherical.setFromVector3(this.object.position);
			this._sphericalEnd = new THREE.Spherical().copy(this._spherical);

			// reset
			this._target0 = this.target.clone();
			this._position0 = this.object.position.clone();

			this._needsUpdate = true;
			this.update();

			if (!this.domElement) {

				this.dispose = function () {};
			} else {
				var _onMouseDown = function _onMouseDown(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var prevState = state;

					switch (event.button) {

						case THREE.MOUSE.LEFT:

							state = STATE.ROTATE;
							break;

						case THREE.MOUSE.MIDDLE:

							state = STATE.DOLLY;
							break;

						case THREE.MOUSE.RIGHT:

							state = STATE.PAN;
							break;

					}

					if (prevState === STATE.NONE) {

						_startDragging(event);
					}
				};

				var _onTouchStart = function _onTouchStart(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var prevState = state;

					switch (event.touches.length) {

						case 1:
							// one-fingered touch: rotate

							state = STATE.TOUCH_ROTATE;
							break;

						case 2:
							// two-fingered touch: dolly

							state = STATE.TOUCH_DOLLY;
							break;

						case 3:
							// three-fingered touch: pan

							state = STATE.TOUCH_PAN;
							break;

					}

					if (prevState === STATE.NONE) {

						_startDragging(event);
					}
				};

				var _onMouseWheel = function _onMouseWheel(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					if (event.deltaY < 0) {

						_dollyIn();
					} else if (event.deltaY > 0) {

						_dollyOut();
					}
				};

				var _onContextMenu = function _onContextMenu(event) {

					if (!scope.enabled) return;

					event.preventDefault();
				};

				var _startDragging = function _startDragging(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var _event = !!event.touches ? event.touches[0] : event;
					var x = _event.clientX;
					var y = _event.clientY;

					elementRect = scope.domElement.getBoundingClientRect();
					dragStart.set(x, y);

					// if ( state === STATE.DOLLY ) {

					// 	dollyStart.set( x, y );

					// }

					if (state === STATE.TOUCH_DOLLY) {

						var dx = x - event.touches[1].pageX;
						var dy = y - event.touches[1].pageY;
						var distance = Math.sqrt(dx * dx + dy * dy);

						dollyStart.set(0, distance);
					}

					savedDampingFactor = scope.dampingFactor;
					scope.dampingFactor = scope.draggingDampingFactor;

					document.addEventListener('mousemove', _dragging, { passive: false });
					document.addEventListener('touchmove', _dragging, { passive: false });
					document.addEventListener('mouseup', _endDragging);
					document.addEventListener('touchend', _endDragging);
				};

				var _dragging = function _dragging(event) {

					if (!scope.enabled) return;

					event.preventDefault();

					var _event = !!event.touches ? event.touches[0] : event;
					var x = _event.clientX;
					var y = _event.clientY;

					var deltaX = dragStart.x - x;
					var deltaY = dragStart.y - y;

					dragStart.set(x, y);

					switch (state) {

						case STATE.ROTATE:
						case STATE.TOUCH_ROTATE:

							var rotX = 2 * Math.PI * deltaX / elementRect.width;
							var rotY = 2 * Math.PI * deltaY / elementRect.height;
							scope.rotate(rotX, rotY, true);
							break;

						case STATE.DOLLY:
							// not implemented
							break;

						case STATE.TOUCH_DOLLY:

							var dx = x - event.touches[1].pageX;
							var dy = y - event.touches[1].pageY;
							var distance = Math.sqrt(dx * dx + dy * dy);
							var dollyDelta = dollyStart.y - distance;

							if (dollyDelta > 0) {

								_dollyOut();
							} else if (dollyDelta < 0) {

								_dollyIn();
							}

							dollyStart.set(0, distance);
							break;

						case STATE.PAN:
						case STATE.TOUCH_PAN:

							var offset = _v3.copy(scope.object.position).sub(scope.target);
							// half of the fov is center to top of screen
							var targetDistance = offset.length() * Math.tan(scope.object.fov / 2 * Math.PI / 180);
							var panX = scope.panSpeed * deltaX * targetDistance / elementRect.height;
							var panY = scope.panSpeed * deltaY * targetDistance / elementRect.height;
							scope.pan(panX, panY, true);
							break;

					}
				};

				var _endDragging = function _endDragging() {

					if (!scope.enabled) return;

					scope.dampingFactor = savedDampingFactor;
					state = STATE.NONE;

					document.removeEventListener('mousemove', _dragging);
					document.removeEventListener('touchmove', _dragging);
					document.removeEventListener('mouseup', _endDragging);
					document.removeEventListener('touchend', _endDragging);
				};

				var _dollyIn = function _dollyIn() {

					var zoomScale = Math.pow(0.95, scope.zoomSpeed);
					scope.dolly(scope._sphericalEnd.radius * zoomScale - scope._sphericalEnd.radius);
				};

				var _dollyOut = function _dollyOut() {

					var zoomScale = Math.pow(0.95, scope.zoomSpeed);
					scope.dolly(scope._sphericalEnd.radius / zoomScale - scope._sphericalEnd.radius);
				};

				var scope = this;
				var dragStart = new THREE.Vector2();
				var dollyStart = new THREE.Vector2();
				var state = STATE.NONE;
				var elementRect = void 0;
				var savedDampingFactor = void 0;

				this.domElement.addEventListener('mousedown', _onMouseDown);
				this.domElement.addEventListener('touchstart', _onTouchStart);
				this.domElement.addEventListener('wheel', _onMouseWheel);
				this.domElement.addEventListener('contextmenu', _onContextMenu);

				this.dispose = function () {

					scope.domElement.removeEventListener('mousedown', _onMouseDown);
					scope.domElement.removeEventListener('touchstart', _onTouchStart);
					scope.domElement.removeEventListener('wheel', _onMouseWheel);
					scope.domElement.removeEventListener('contextmenu', _onContextMenu);
					document.removeEventListener('mousemove', _dragging);
					document.removeEventListener('touchmove', _dragging);
					document.removeEventListener('mouseup', _endDragging);
					document.removeEventListener('touchend', _endDragging);
				};
			}
		}

		// rotX in radian
		// rotY in radian


		CameraControls.prototype.rotate = function rotate(rotX, rotY, enableTransition) {

			this.rotateTo(this._sphericalEnd.theta + rotX, this._sphericalEnd.phi + rotY, enableTransition);
		};

		// rotX in radian
		// rotY in radian


		CameraControls.prototype.rotateTo = function rotateTo(rotX, rotY, enableTransition) {

			var theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, rotX));
			var phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, rotY));

			this._sphericalEnd.theta = theta;
			this._sphericalEnd.phi = phi;
			this._sphericalEnd.makeSafe();

			if (!enableTransition) {

				this._spherical.theta = this._sphericalEnd.theta;
				this._spherical.phi = this._sphericalEnd.phi;
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.dolly = function dolly(distance, enableTransition) {

			this.dollyTo(this._sphericalEnd.radius + distance, enableTransition);
		};

		CameraControls.prototype.dollyTo = function dollyTo(distance, enableTransition) {

			this._sphericalEnd.radius = THREE.Math.clamp(distance, this.minDistance, this.maxDistance);

			if (!enableTransition) {

				this._spherical.radius = this._sphericalEnd.radius;
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.pan = function pan(x, y, enableTransition) {

			this.object.updateMatrix();

			_xColumn.setFromMatrixColumn(this.object.matrix, 0);
			_yColumn.setFromMatrixColumn(this.object.matrix, 1);
			_xColumn.multiplyScalar(x);
			_yColumn.multiplyScalar(-y);

			var offset = _v3.copy(_xColumn).add(_yColumn);
			this._targetEnd.add(offset);

			if (!enableTransition) {

				this.target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.moveTo = function moveTo(x, y, z, enableTransition) {

			this._targetEnd.set(x, y, z);

			if (!enableTransition) {

				this.target.copy(this._targetEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.saveState = function saveState() {

			this._target0.copy(this.target);
			this._position0.copy(this.object.position);
		};

		CameraControls.prototype.reset = function reset(enableTransition) {

			this._targetEnd.copy(this._target0);
			this._sphericalEnd.setFromVector3(this._position0);
			this._sphericalEnd.theta = this._sphericalEnd.theta % (2 * Math.PI);
			this._spherical.theta = this._spherical.theta % (2 * Math.PI);

			if (!enableTransition) {

				this.target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		CameraControls.prototype.update = function update(delta) {

			var dampingFactor = this.dampingFactor * delta / 0.016;
			var deltaTheta = this._sphericalEnd.theta - this._spherical.theta;
			var deltaPhi = this._sphericalEnd.phi - this._spherical.phi;
			var deltaRadius = this._sphericalEnd.radius - this._spherical.radius;
			var deltaTarget = new THREE.Vector3().subVectors(this._targetEnd, this.target);

			if (Math.abs(deltaTheta) > EPSILON || Math.abs(deltaPhi) > EPSILON || Math.abs(deltaRadius) > EPSILON || Math.abs(deltaTarget.x) > EPSILON || Math.abs(deltaTarget.y) > EPSILON || Math.abs(deltaTarget.z) > EPSILON) {

				this._spherical.set(this._spherical.radius + deltaRadius * dampingFactor, this._spherical.phi + deltaPhi * dampingFactor, this._spherical.theta + deltaTheta * dampingFactor);

				this.target.add(deltaTarget.multiplyScalar(dampingFactor));

				this._needsUpdate = true;
			} else {

				this._spherical.copy(this._sphericalEnd);
				this.target.copy(this._targetEnd);
			}

			this._spherical.makeSafe();
			this.object.position.setFromSpherical(this._spherical).add(this.target);
			this.object.lookAt(this.target);

			var needsUpdate = this._needsUpdate;
			this._needsUpdate = false;

			return needsUpdate;
		};

		CameraControls.prototype.toJSON = function toJSON() {

			return JSON.stringify({
				enabled: this.enabled,

				minDistance: this.minDistance,
				maxDistance: infinityToMaxNumber(this.maxDistance),
				minPolarAngle: this.minPolarAngle,
				maxPolarAngle: infinityToMaxNumber(this.maxPolarAngle),
				minAzimuthAngle: infinityToMaxNumber(this.minAzimuthAngle),
				maxAzimuthAngle: infinityToMaxNumber(this.maxAzimuthAngle),
				dampingFactor: this.dampingFactor,
				draggingDampingFactor: this.draggingDampingFactor,
				zoomSpeed: this.zoomSpeed,
				panSpeed: this.panSpeed,

				target: this._targetEnd.toArray(),
				position: this.object.position.toArray(),

				target0: this._target0.toArray(),
				position0: this._position0.toArray()
			});
		};

		CameraControls.prototype.fromJSON = function fromJSON(json, enableTransition) {

			var obj = JSON.parse(json);
			var position = new THREE.Vector3().fromArray(obj.position);

			this.enabled = obj.enabled;

			this.minDistance = obj.minDistance;
			this.maxDistance = maxNumberToInfinity(obj.maxDistance);
			this.minPolarAngle = obj.minPolarAngle;
			this.maxPolarAngle = maxNumberToInfinity(obj.maxPolarAngle);
			this.minAzimuthAngle = maxNumberToInfinity(obj.minAzimuthAngle);
			this.maxAzimuthAngle = maxNumberToInfinity(obj.maxAzimuthAngle);
			this.dampingFactor = obj.dampingFactor;
			this.draggingDampingFactor = obj.draggingDampingFactor;
			this.zoomSpeed = obj.zoomSpeed;
			this.panSpeed = obj.panSpeed;

			this._targetEnd.fromArray(obj.target);
			this._sphericalEnd.setFromVector3(position);

			this._target0.fromArray(obj.target0);
			this._position0.fromArray(obj.position0);

			if (!enableTransition) {

				this.target.copy(this._targetEnd);
				this._spherical.copy(this._sphericalEnd);
			}

			this._needsUpdate = true;
		};

		return CameraControls;
	}();

	function infinityToMaxNumber(value) {

		if (isFinite(value)) return value;

		if (value < 0) return -Number.MAX_VALUE;

		return Number.MAX_VALUE;
	}

	function maxNumberToInfinity(value) {

		if (Math.abs(value) < Number.MAX_VALUE) return value;

		return value * Infinity;
	}

	return CameraControls;

})));
