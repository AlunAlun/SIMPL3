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
function MeshComponent(shaderPath, texturePath, OBJPath){

	//MVP matrix stack
	this.model = mat4.create();
	this.tmpModel = mat4.create();
	this.mv = mat4.create();
	this.mvp = mat4.create();
	this.modelt = mat4.create();

	//load a texture using LiteGL
	if(texturePath)
		this.texture = GL.Texture.fromURL(texturePath, {temp_color:[255,255,255,255], minFilter: gl.LINEAR_MIPMAP_LINEAR});
	else
		this.texture = GL.Texture(1,1,{pixel_data:[255,255,255,255]});
	
	if (OBJPath)
		//load a mesh using LiteGL
		this.mesh = GL.Mesh.fromURL(OBJPath);
	else
		//just make a sphere
		this.mesh = GL.Mesh.sphere({size:1});

	//this function loads shader strings from an external atlas
	//see LiteGL documentation
	GL.loadFileAtlas(shaderPath, function(shaders) {
		//compile shader
		this.shader = new Shader(shaders.vertex, shaders.fragment);
		//Set this to be ready once shader has loaded
		this.ready = true;
	}.bind(this));
    
}


/*
 * Update the component. Receives delta-time between last call
 */
MeshComponent.prototype.update = function(dt){

}

/*
 * Draw function. Receives MVP matrices in GLMatrix format
 */
MeshComponent.prototype.draw = function(model, view, projection) {
	//create MVP
	mat4.mul(this.tmpModel, model, this.model);
    mat4.multiply(this.mv,view,this.tmpModel);
    mat4.multiply(this.mvp,projection,this.mv);
    //create normal matrix
    var inv = mat4.invert(mat4.create(), this.mv);
    var normal_matrix = mat4.transpose(mat4.create(), inv);

    //LiteGL calls to bind texture, set uniforms, and draw
    this.texture.bind(0);
	this.shader.uniforms({
		u_mv: this.mv,
		u_mvp: this.mvp,
		u_normal_matrix: normal_matrix,
		u_texture:0
	}).draw(this.mesh);
}

MeshComponent.prototype.setPosition = function(newPos) {
	mat4.translate(this.model, this.model, newPos);
}




