# SIMPL3
## A simple WebGL research framework for prototyping new ideas
SIMPL3 is a super simple library designed to prototype new ideas in WebGL. It abstracts several fiddly features common to most applications, allowing the programmer to concentrate on the more interesting aspects of developing new ideas.

SIMPL3:
* is a simple boiler-plate renderer which enables you to quickly prototype ideas in WebGL 
* provides an orbit camera and mouse/touchscreen controls, but nothing else
* requires the programmer to write their own rendering and shader code

Compared to three.js, it is much lower level, but also easier to prototype new ideas.

### How to use

Download the full build from the [github repository](https://github.com/AlunAlun/SIMPL3/tree/master/build).

#### Dependencies

SIMPL3 has a couple of dependencies - all are included in the full build, so you only have to source one js file.

[GL-Matrix](http://glmatrix.net/) is used to manage all matrices. This is kind of essential to use also if you want to use the built in camera and controls.

(Optional) [LiteGL](http://tamats.com/projects/litegl/) is used for basic WebGL rendering. Using LiteGL is purely optional though. SIMPL3 exposes a gl variable to access the created webgl context for you to write any WebGL code you like. Most of the examples below use LiteGL to abstract the rendering, because it's a great library.

#### Defining components
SIMPL3 defines a simple scene which contains a list of objects. For each object, it calls two methods, update() and draw(). update gets sent a delta time variable, and draw gets sent parameters representing the global model, view, and projection matrices, and a 3-component vector representing a global scene light. It is up to you to manage the draw calls and shaders.

Finally, the object must set a property called 'ready' to true. 
```
function DemoComponent(){
	this.ready = true;
	this.update = function(dt) {
		//any code you want updating 
	}
	this.draw = function(model, view, projection, lightPosition) {
		//all your rendering code goes here
	}
}

```

#### Initialising the scene

Once you have defined your components, you only need four/five lines of code to set up the scene:

```
//initialise everything, passing the id of a parent element
SIMPL3.init("id_of_container_element");

//set camera, (position, target)
SIMPL3.setCamera([0,0,5], [0,0,0]);

//set single global light (optional)
SIMPL3.setLight([-100, 100, 100]);

//...create component object....
var dc = new DemoComponent();

//add component to the scene
SIMPL3.objects.push(dc);

```

#### Examples

Check out the demos: 
* [basic](http://alunevans.info/projects/SIMPL3/demos/basic/)
* [loading an external shader](http://alunevans.info/projects/SIMPL3/demos/external_shaders/)
* [a fully-fledged component](http://alunevans.info/projects/SIMPL3/demos/webmesh/)

###More info

SIMPL3 is licensed under the MIT license as described in the license file.

For more info contact me at [alunevans.info](http://alunevans.info) or [@alunthomasevans](https://twitter.com/alunthomasevans)
