# SIMPL3
## A simple WebGL research framework for prototyping new ideas
SIMPL3 is a super simple library designed to prototype new ideas in WebGL. It abstracts several fiddly features common to most applications, allowing the programmer to concentrate on the more interesting aspects of developing new ideas.

### SIMPL3 is for you if:
* You want a simple scene renderer which calls update and draw methods for each object
* You want to write your own rendering and shader code
* You want comprehensive camera orbit controls which work on a touchscreen
* You don't need the bells and whistles of THREE.js.

SIMPL3 uses Javi Agenjo's [LiteGL](http://tamats.com/projects/litegl/) for gl rendering, though it exports a global gl variable to access the created webgl context for you to write any WebGL code you like. Most of the examples use LiteGL to abstract rendering.

### How to use:

Download the full build from the [github repository](https://github.com/AlunAlun/SIMPL3/tree/master/build).

Check out the demos: [basic](http://alunevans.info/projects/SIMPL3/demos/basic/) /
 [loading an external shader](http://alunevans.info/projects/SIMPL3/demos/external_shaders/) /
 [a fully-fledged component](http://alunevans.info/projects/SIMPL3/demos/webmesh/).
