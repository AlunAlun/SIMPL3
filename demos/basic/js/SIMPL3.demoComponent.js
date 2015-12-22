/*
 * This is a sample component which interfaces with SIMPL3.
 * The only two functions you need to implement are:
 * update(dt);
 * draw(model, view, projection)
 *
 * The one property that must defined is this.ready, because
 * SIMPL3 only render draws/updates objects with this property
 * set to true
 *
 * To take full advantage of the framework I recommend you 
 * use GLMatrix.netto manage your matrices, as the mvp matrices
 * are passed to the draw method. However it is not mandatory.
 *
 * This example uses Javi Agenjo's LiteGL () to abstract on WebGL
 * rendering calls. You can use anything you want.
 *
 */

/*
 * Standard JS object contructor
 */
function DemoComponent(){
	//MVP matrix stack
	this.model = mat4.create();
	this.tmpModel = mat4.create();
	this.mv = mat4.create();
	this.mvp = mat4.create();

	//load the shader from hard-coded strings below, using LiteGL
	this.shader = new Shader(DemoVertexShader, DemoFragmentShader);

	//load a texture using LiteGL
	this.texture = GL.Texture.fromURL("earthmap2k.jpg", {temp_color:[80,120,40,255], minFilter: gl.LINEAR_MIPMAP_LINEAR});
	
	//load a mesh using LiteGL
	this.mesh = GL.Mesh.sphere({size:1});

	//If this is not set, the component won't draw
	this.ready = true;
    
}

/*
 * Update the component. Receives delta-time between last call
 */
DemoComponent.prototype.update = function(dt){
	mat4.rotateY(this.model, this.model, 0.01);
}

/*
 * Draw function. Receives MVP matrices in GLMatrix format
 */
DemoComponent.prototype.draw = function(model, view, projection) {
	//create MVP
	mat4.mul(this.tmpModel, model, this.model);
    mat4.multiply(this.mv,view,this.tmpModel);
    mat4.multiply(this.mvp,projection,this.mv);

    //LiteGL calls to bind texture, set uniforms, and draw
    this.texture.bind(0);
	this.shader.uniforms({
		u_mvp: this.mvp,
		u_texture:0
	}).draw(this.mesh);
}

//Shader code
var DemoVertexShader = 
"precision highp float;\
attribute vec3 a_vertex;\
attribute vec2 a_coord;\
uniform mat4 u_mvp;\
varying vec2 v_coord;\
void main() { \
	v_coord = a_coord;\
	gl_Position = u_mvp * vec4(a_vertex,1.0);\
}";

var DemoFragmentShader =
"precision highp float;\
uniform sampler2D u_texture;\
varying vec2 v_coord;\
void main() {\
	gl_FragColor = vec4(texture2D(u_texture, v_coord).xyz, 1.0);\
}";



