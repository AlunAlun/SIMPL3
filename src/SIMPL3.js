/*
 * SIMPL3.js
 * ---------
 *
 * An very simple WebGL framework for rapid prototyping of new components.
 * Copyright Alun Evans 2015.
 * http://alunevans.info/SIMPL3
 *
 * Dependencies (not required if using the minified build) 
 * - LiteGL: http://tamats.com/projects/litegl/
 * - GLMatrix: http:://glmatrix.net
 *
 * Usage:
 * SIMPL3.init("id_of_webgl_element");
 * SIMPL3.setCamera([positionX,positionY,positionZ], [targetX,targetY,targetZ]);
 * SIMPL3.objects.push(your_component_object);
 *
 * http://alunevans.info/SIMPL3/
 */

var SIMPL3 = (function() {

	//private vars
	var _model = mat4.create();
	var _objects = [];
	var _options, _containerId, _camera,
		_lightPos, _cameraControls, _gl;
	
	// * Initialise SIMPL3. Is revealed as PUBLIC
	// * domElementId: the dom element to contain webgl canvas
	// * options: an object with options
	// *  - cull_face: true/false
	 
	var _init = function(domElementId, options) {
		
		_options = options || {};

		_containerId = domElementId;

		_initRenderer();

		_setCamera([0,0,5], [0,0,0]);

		_setLight([10,10,10]);
	};

	// Sets camera. Is revealed as PUBLIC
	var _setCamera = function(camPos, camTarget) {
		_camera.position = camPos;
		_camera.target = camTarget;
	};

	// Sets light. Is revealed as PUBLIC
	var _setLight = function(lightPos) {
		_lightPos = lightPos;
	};
	
	// * Rotates entire scene by passed radians
	// * axis: SIMPL3.Axis = {X:0, Y:1, Z:2};
	_rotateModel = function(rads, axis){
		switch (axis) {
			case 0:
				mat4.rotateX(_model, _model, rads);
				break;
			case 1:
				mat4.rotateY(_model, _model, rads);
				break;
			case 2:
				mat4.rotateZ(_model, _model, rads);
		}
	};

	//private function to initialise renderer
	var _initRenderer = function() {
	
		//initGL
		_gl = _initGL();

		//create camera and controls
		_camera = new SIMPL3.Camera();
		_cameraControls = new SIMPL3.cameraControls(_camera, _containerId);
	
		//default GL flags
		gl.enable( gl.DEPTH_TEST );
		gl.enable( gl.CULL_FACE);

		//set GL flag based on passed options
		if (_options.hasOwnProperty("cull_face") && _options.cull_face == false)
			gl.disable( gl.CULL_FACE);



		//rendering loop
		gl.ondraw = function()
		{
			gl.viewport(0,0,gl.canvas.width, gl.canvas.height);
			gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
		
			for (i in _objects) {
				var currObject = _objects[i];
				if (currObject.ready) {
					currObject.draw(_model, _camera.view, _camera.projection, _lightPos);
				}
			}			
		};

		gl.onupdate = function(dt)
		{
			_cameraControls.update();
			for (i in _objects) {
				if (_objects[i].update)
					_objects[i].update(dt);
			}

		};

		gl.onresize = function(event) {

			var domElement = document.getElementById(_containerId);
			var displayWidth  = domElement.clientWidth;
  			var displayHeight = domElement.clientHeight;

  			  // Check if the canvas is not the same size.
		  	if (gl.canvas.width  != displayWidth || gl.canvas.height != displayHeight) {
		    	// Make the canvas the same size
		    	gl.canvas.width  = displayWidth;
		    	gl.canvas.height = displayHeight;
		    	_camera.projection = mat4.perspective(mat4.create(), 
		    											    _camera.fov * DEG2RAD, 
		    											    gl.canvas.width / gl.canvas.height, 0.1, 10000);
			}

		};

		window.addEventListener('resize', gl.onresize);

	};

	//private function to setup webgl
	var _initGL = function() {
		//get handle to DOM element
		var domElement = document.getElementById(_containerId);

		//create gl context using LiteGL.js
		var gl = GL.create({width:domElement.clientWidth, height:domElement.clientHeight});
		gl.animate();

		//append to window
		domElement.appendChild(gl.canvas);

		//generic gl flags and settings
		gl.clearColor(0,0,0,1);
		gl.enable( gl.DEPTH_TEST );
		gl.enable( gl.CULL_FACE);
		gl.cullFace(gl.BACK);

		//we need this for 32-bit index buffer support
		gl.getExtension("OES_element_index_uint");

		return gl;
	};

	return {
		objects: _objects,
		init: _init,
		setCamera: _setCamera,
		setLight: _setLight,
		rotateModel: _rotateModel,
		gl: _gl
	};

})();


// Enum for axes  
SIMPL3.Axis = {X:0, Y:1, Z:2};

// Look-at camera
SIMPL3.Camera = function(pos) {
	if (!pos)
		this.position = vec3.create();
	else 
		this.position = vec3.set(vec3.create(),pos[0], pos[1], pos[2]);
	this.target = vec3.create();
	this.initialAngle = Math.PI;
	this.fov = 45;

	//create basic matrices for cameras and transformation
	this.view = mat4.create();
	this.projection = mat4.perspective(mat4.create(), this.fov * DEG2RAD, gl.canvas.width / gl.canvas.height, 0.1, 10000);

	this.update = function() {
		//create view matrix
		mat4.lookAt(this.view, this.position, this.target, [0,1,0]);
	}
}



// Orbit Camera controls. Works perfectly with touch screens.
// Shamelessly copied from ThreeJS OrbitControls.js

SIMPL3.cameraControls = function(camera, domElementId) {
	this.camera = camera;
	this.domElement = document.getElementById(domElementId);;

	this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };
	this.mouseButtons = { ORBIT: 0, ZOOM: 1, PAN: 2 };
	this.rotateSpeed = 1.0;
	this.thetaDelta = 0;
	this.phiDelta = 0;
	// How far you can orbit vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = 5*DEG2RAD;// radians
	this.maxPolarAngle = Math.PI-5*DEG2RAD; // radians
	// How far you can orbit horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = - Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians
	// Set to true to automatically rotate around the target
	this.autoRotate = false;
	this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

	//zoom speed
	this.dollySpeed = 1;
	
	var offset = vec3.create();

	var rotateStart = vec2.create();
	var rotateEnd = vec2.create();
	var rotateDelta = vec2.create();

	var panStart = vec2.create();
	var panEnd = vec2.create();
	var panDelta = vec2.create();
	var panOffset = vec3.create();

	var offset = vec3.create();

	var dollyStart = vec2.create();
	var dollyEnd = vec2.create();
	var dollyDelta = vec2.create();

	var theta;
	var phi;
	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = vec3.create();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };
	var state = STATE.NONE;
	var scope = this;

	function getAutoRotationAngle() {
		return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
	}
	function getDollyScale() {
		return Math.pow( 0.95, scope.dollySpeed );
	}

	this.rotateLeft = function ( angle ) {
		if ( angle === undefined ) {
			angle = getAutoRotationAngle();
		}
		scope.thetaDelta -= angle;
	}

	this.rotateUp = function ( angle ) {
		if ( angle === undefined ) {
			angle = getAutoRotationAngle();
		}
		scope.phiDelta -= angle;
	}

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.camera.view;
		// get X column of matrix
		var panOffset = vec3.set(vec3.create(), te[0], te[4], te[8] );
		vec3.scale(panOffset, panOffset, -distance);
		vec3.add(pan, pan, panOffset);


	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.camera.view;
		// get Y column of matrix
		var panOffset = vec3.set(vec3.create(), te[1], te[5], te[9] );
		vec3.scale(panOffset, panOffset, distance);
		vec3.add(pan, pan, panOffset);
	};
	
	// main entry point; pass in Vector2 of change desired in pixel space,
	// right and down are positive
	this.pan = function ( delta ) {

		var element = scope.domElement;

		var offset = vec3.sub(vec3.create(), scope.camera.position, scope.camera.target);
		var targetDistance = vec3.length(offset);

		// half of the fov is center to top of screen
		//targetDistance *= Math.tan( (scope.camera.fov/2) * Math.PI / 180.0 );
		// we actually don't use screenWidth, since perspective camera is fixed to screen height
		scope.panLeft( 2 * delta[0] * targetDistance / element.clientHeight );
		scope.panUp( 2 * delta[1] * targetDistance / element.clientHeight );
	};

	this.dollyIn = function(dollyScale) {
		if ( dollyScale === undefined ) {
			dollyScale = getDollyScale();
		}

		scale /= dollyScale;
	}

	this.dollyOut = function(dollyScale) {
		if ( dollyScale === undefined ) {
			dollyScale = getDollyScale();
		}
		scale *= dollyScale;
	}

	this.update = function() {
		offset = vec3.subtract(vec3.create(), this.camera.position, this.camera.target);

		// angle from z-axis around y-axis
		theta = Math.atan2( offset[0], offset[2] );

		// angle from y-axis
		phi = Math.atan2( Math.sqrt( offset[0] * offset[0] + offset[2] * offset[2] ), offset[1] );

		theta += this.thetaDelta;
		phi += this.phiDelta;

		// restrict theta to be between desired limits
		theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

		// restrict phi to be between desired limits
		phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

		var radius = vec3.length(offset) * scale;

		//TODO add pan to target here
		vec3.add(this.camera.target, this.camera.target, pan);
		

		vec3.set(offset,
				 radius * Math.sin( phi ) * Math.sin( theta ),
				 radius * Math.cos( phi ),
				 radius * Math.sin( phi ) * Math.cos( theta )
				 );
		
		vec3.add(this.camera.position, this.camera.target, offset);

		this.phiDelta = 0;
		this.thetaDelta = 0;
		this.distanceDelta = 0;
		scale = 1;
		vec3.set(pan, 0, 0, 0);

		this.camera.update();
	}

	function onMouseDown( event ) {
		
		event.preventDefault();

		if ( event.button === scope.mouseButtons.ORBIT ) {
			
			state = STATE.ROTATE;
			vec2.set(rotateStart, event.clientX, event.clientY );

		} else if ( event.button === scope.mouseButtons.ZOOM ) {

			state = STATE.DOLLY;
			vec2.set(dollyStart, event.clientX, event.clientY );

		} else if ( event.button === scope.mouseButtons.PAN ) {

			state = STATE.PAN;
			vec2.set(panStart, event.clientX, event.clientY );
		}

		if ( state !== STATE.NONE ) {
			document.addEventListener( 'mousemove', onMouseMove, false );
			document.addEventListener( 'mouseup', onMouseUp, false );
		}
	}

	function onMouseMove( event ) {

		event.preventDefault();

		var element = scope.domElement;

		if ( state === STATE.ROTATE ) {
			vec2.set(rotateEnd, event.clientX, event.clientY );
			vec2.subtract(rotateDelta, rotateEnd, rotateStart );
			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta[0] / element.clientWidth * scope.rotateSpeed );
			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta[1] / element.clientHeight * scope.rotateSpeed );

			vec3.copy(rotateStart, rotateEnd);

		} else if ( state === STATE.DOLLY ) {

			vec2.set(dollyEnd,event.clientX, event.clientY ); 
			vec2.subtract(dollyDelta, dollyEnd, dollyStart);

			if ( dollyDelta[1] > 0 ) {

				scope.dollyIn();

			} else if ( dollyDelta[1] < 0 ) {

				scope.dollyOut();

			}
			vec2.copy(dollyStart, dollyEnd);

		} else if ( state === STATE.PAN ) {

			vec2.set(panEnd,event.clientX, event.clientY ); 
			vec2.subtract(panDelta, panEnd, panStart );

			scope.pan( panDelta );
			vec2.copy(panStart, panEnd);


		}

		if ( state !== STATE.NONE ) scope.update();
	}

	function onMouseUp( /* event */ ) {
		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'mouseup', onMouseUp, false );
		state = STATE.NONE;
	}

	function onMouseWheel( event ) {

		if ( state !== STATE.NONE ) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}

		if ( delta > 0 ) {

			scope.dollyOut();

		} else if ( delta < 0 ) {

			scope.dollyIn();

		}

		scope.update();
	}

	function onKeyDown( event ) {
	}

	function touchstart( event ) {
		switch ( event.touches.length ) {

			case 1:	// one-fingered touch: rotate

				state = STATE.TOUCH_ROTATE;
				vec2.set(rotateStart, event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				break;

			case 2:	// two-fingered touch: dolly

				state = STATE.TOUCH_DOLLY;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );
				vec2.set(dollyStart, 0, distance );
				console.log("start");
				break;

			case 3: // three-fingered touch: pan

				state = STATE.TOUCH_PAN;
				vec2.set(panStart, event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );

				break;

			default:

				state = STATE.NONE;

		}

	}

	function touchmove( event ) {

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch ( event.touches.length ) {

			case 1: // one-fingered touch: rotate

				if ( state !== STATE.TOUCH_ROTATE ) return;

				vec2.set(rotateEnd, event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				vec2.sub(rotateDelta, rotateEnd, rotateStart);

				// rotating across whole screen goes 360 degrees around
				scope.rotateLeft( 2 * Math.PI * rotateDelta[0]/ element.clientWidth * scope.rotateSpeed );
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				scope.rotateUp( 2 * Math.PI * rotateDelta[1] / element.clientHeight * scope.rotateSpeed );



				vec2.copy(rotateStart, rotateEnd);

				scope.update();
				break;

			case 2: // two-fingered touch: dolly


				if ( state !== STATE.TOUCH_DOLLY ) return;

				var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
				var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
				var distance = Math.sqrt( dx * dx + dy * dy );

				

				vec2.set(dollyEnd, 0, distance);
				vec2.sub(dollyDelta, dollyEnd, dollyStart);

				if ( dollyDelta[1] > 0 ) {

					scope.dollyOut();

				} else if ( dollyDelta[1] < 0 ) {

					scope.dollyIn();

				}

				vec2.copy(dollyStart, dollyEnd);

				scope.update();
				break;

			case 3: // three-fingered touch: pan


				if ( state !== STATE.TOUCH_PAN ) return;

				vec2.set(panEnd, event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
				vec2.sub(panDelta, panEnd, panStart );



				scope.pan( panDelta );

				vec2.copy(panStart, panEnd );

				scope.update();
				break;

			default:

				state = STATE.NONE;

		}
	}

	function touchend( /* event */ ) {

		state = STATE.NONE;
	}


	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', onKeyDown, false );

}

function inheritPrototype(childObject, parentObject) {
	var copyOfParent = Object.create(parentObject.prototype);
	copyOfParent.constructor = childObject;
	childObject.prototype = copyOfParent;
}





