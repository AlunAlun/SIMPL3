var WebMesh = function(shaderPath, meshPath, options, callback){
    
    this.model = mat4.create();
    this.tmpModel = mat4.create();
    this.mv = mat4.create();
    this.mvp = mat4.create();
    this.modelt = mat4.create();
    this.DEBUG = false;
    this.ready = false;
    this.shaderPath = shaderPath;
    this.shaderOptions = {};
    this.onLoadProgress = function (evt) {};// {console.log(parseInt(evt.loaded/1000) + "kB");};
    this.onLoadComplete = function(evt) {console.log("Loading complete")};

    if (options) {
        if (options.light == true) this.shaderOptions.light = true;
    }

    this.load(meshPath, callback);
}

WebMesh.prototype.draw = function(model, view, proj, light_pos) {

    mat4.mul(this.tmpModel, model, this.model);

    //create modeview matrix
    mat4.multiply(this.mv,view,this.tmpModel);
    //create mvp matrix
    mat4.multiply(this.mvp,proj,this.mv);
    //create world-normal matrix
    mat4.toRotationMat4(this.modelt, this.tmpModel);

    if (this.material){
        if (this.material.diffuse_texture)
            this.material.diffuse_texture.bind(0);
    }

    this.shader.uniforms({
        u_model:this.tmpModel,
        u_modelt:this.modelt,
        u_mvp: this.mvp,
        u_lightPosition: light_pos,
        u_materialColor: [1,1,1],
        u_diffuse_texture: 0,
        u_wVertexX: this.meta.wValues.vertex.x,
        u_wVertexY: this.meta.wValues.vertex.y,
        u_wVertexZ: this.meta.wValues.vertex.z,
        u_wNormal: this.meta.wValues.normal,
        u_wTexture: this.meta.wValues.texture,
        u_aabbMin: this.meta.AABB.min,
        u_aabbRange: this.meta.AABB.range
    }).draw(this.mesh);
}




var MeshType = { UTF: 1, PNG: 2, B128: 3 };

WebMesh.prototype.load = function(fullpath, callback) {
    var splPath = splitPath(fullpath);
    this.filepath = splPath.dirPart;
    this.filename = splPath.filePart;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', fullpath);

    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 400){
            var jsonData = JSON.parse(xhr.responseText);
            this.parseJSON(splPath.dirPart, jsonData, callback);
        }
    }.bind(this);

    xhr.send();
}

WebMesh.prototype.parseJSON = function(filepath, jsonData, callback) {
    if (filepath) this.filepath = filepath;
    //clean up metadata
    this.meta = jsonData;
    if (this.meta.data.endsWith("png"))
        this.meshType = MeshType.PNG;
    else if (this.meta.data.endsWith("utf8"))
        this.meshType = MeshType.UTF;
    else if (this.meta.data.endsWith("b128"))
        this.meshType = MeshType.B128;
    
    this.meta.wValues = {
        vertex: {},
        normal: Math.pow(2,this.meta.bits.normal),
        texture: Math.pow(2, this.meta.bits.texture)
    }
    //assign w values to dequantize in shader
    if (this.meta.vertexQuantization == "perVertex"){
        this.meta.wValues.vertex.x = Math.pow(2,this.meta.bits.vertex.x);
        this.meta.wValues.vertex.y = Math.pow(2,this.meta.bits.vertex.y);
        this.meta.wValues.vertex.z = Math.pow(2,this.meta.bits.vertex.z);
    }
    else {
        this.meta.wValues.vertex.x = Math.pow(2,this.meta.bits.vertex);
        this.meta.wValues.vertex.y = Math.pow(2,this.meta.bits.vertex);
        this.meta.wValues.vertex.z = Math.pow(2,this.meta.bits.vertex);
    }



    this.skipTexture = false;
    if (this.meta.bits.texture == 0)
        this.skipTexture = true;

    //initialise material if it should have one
    if (!this.material)
        this.material = {};
    //this.material.diffuse_texture = GL.Texture.fromURL("./assets/white.jpg");
    this.material.diffuse_texture = GL.Texture(1,1,{pixel_data:[255,255,255,255]});

    if (this.meta.material) {
        if (this.meta.material.diffuse_texture) {
            this.material.diffuse_texture = GL.Texture.fromURL(this.filepath+this.meta.material.diffuse_texture);
            this.shaderOptions.textureDiffuse = true;
        }
    }
    if (this.DEBUG) this.tStart = performance.now();
    if (this.meshType == MeshType.B128)
        this.loadB128Data();
    else if (this.meshType == MeshType.PNG)
        this.loadPNGData();
    else if (this.meshType == MeshType.UTF)
        this.loadUTFData();
    else
        console.log("Unknown data format");

    if (callback)
        callback(this.meta.AABB)

}

WebMesh.prototype.loadB128Data = function() {


    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.filepath+this.meta.data);
    xhr.responseType = "arraybuffer";
    xhr.onload = function () {
        var arrayBuffer = xhr.response;
   
        if (!arrayBuffer){ console.log("no b128 data!"); return;}

        if (this.DEBUG) console.log("received all data: "+(performance.now()-this.tStart));

        var byteArray = new Uint8Array(arrayBuffer);

        var dataToRead = this.meta.vertices*5; //positions and norms
        if (this.meta.normalEncoding == "quantisation")
            dataToRead += this.meta.vertices;
        if (!this.skipTexture)
            dataToRead += this.meta.vertices*2;

        dataToRead += this.meta.indexBufferSize;


        var data = new Uint32Array(dataToRead);

        var n = 0;
        var counter = 0;

        var c1, c2, c3;
        var i = new Uint32Array(3); //use this for faster bit shifting
        while (counter < dataToRead) {
            var c1 = byteArray[n++];
            if (c1 & 0x80) { //first bit is set, so we need to read another byte
                c2 = byteArray[n++];
                if (c2 & 0x80) {
                    c3 = byteArray[n++];
                    i[0] = c1; //cast first byte to uint32
                    i[0] &= ~(1 << 7); // reset marker bit to 0

                    i[1] = c2 << 7; //cast second byte uint32
                    i[1] &= ~(1 << 14); //reset marker bit

                    i[2] = c3 << 14;

                    data[counter++] = i[0] | i[1] | i[2]; //join all three
                }
                else {

                    i[0] = c1; //cast first byte to uint32
                    i[0] &= ~(1 << 7); //set marker bit to 0
                    i[1] = c2 << 7; //cast second byte to uint32
                    data[counter++] = i[0] | i[1]; //join both
                }
            }
            else
                data[counter++] = c1;

        }
        if (this.DEBUG) console.log("read b128: "+(performance.now()-this.tStart));
        this.parseData(data);
    }.bind(this);
    xhr.onprogress=this.onLoadProgress;

    xhr.send();

}

WebMesh.prototype.loadPNGData = function(){
    var meshImage = new Image();
    meshImage.src = this.filepath+this.meta.data;
    meshImage.onload = function(){
        if (this.DEBUG) console.log("received all data: "+(performance.now()-this.tStart));

        var canvas = document.createElement('canvas');
        canvas.width = meshImage.width;
        canvas.height = meshImage.height;
        canvas.getContext('2d').drawImage(meshImage, 0, 0, meshImage.width, meshImage.height);
        var vCounter = 0;
        var iCounter = 0;
        var data = [];

        var vertexMultiplier = 5;
        if (this.meta.normalEncoding == "quantisation")
            vertexMultiplier++;
        if (this.meta.bits.texture != 0)
            vertexMultiplier += 2;
        var dataEntries = this.meta.vertices*vertexMultiplier;
        dataEntries+= this.meta.indexBufferSize;
        numRowsToRead= Math.ceil(dataEntries/4096);


        var pixelData = canvas.getContext('2d').getImageData(0, 0, meshImage.width, 4096).data;

        //console.log(pixelData);
        for (var i = 0; i < dataEntries*4; i+=4) {
            var RGB = (pixelData[i] << 16);
            RGB = RGB | (pixelData[i+1] << 8);
            RGB = RGB | (pixelData[i+2]);
            data.push(RGB);
        }

        if (this.DEBUG) console.log("read png: "+(performance.now()-this.tStart));
        this.parseData(data);

    }.bind(this);
}

WebMesh.prototype.loadUTFData = function() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.filepath+this.meta.data);
    xhr.setRequestHeader('Content-type', "application/x-www-form-urlencoded; charset=utf-8")
    xhr.overrideMimeType("application/x-www-form-urlencoded; charset=utf-8");

    xhr.onload = function () {
        var data = xhr.response;
        if (this.DEBUG) console.log("received all data: "+(performance.now()-this.tStart));
        this.parseData(data)
    }.bind(this);
    xhr.onprogress=this.onLoadProgress;

    xhr.send();
}

WebMesh.prototype.parseData = function(data) {
    
    var offset = 0;
    var newBuffers = {};
    var aabbMin = this.meta.AABB.min;
    var aabbRange = this.meta.AABB.range;
    var currNumVerts = this.meta.vertices;
    var currNumIndices = this.meta.indexBufferSize;
    var utfIndexBuffer = this.meta.utfIndexBuffer;

    var normEnc = this.meta.normalEncoding;

    var vertIntsX = new Uint16Array(currNumVerts);
    var vertIntsY = new Uint16Array(currNumVerts);
    var vertIntsZ = new Uint16Array(currNumVerts);
    var vertNormsX = new Uint16Array(currNumVerts);
    var vertNormsY, vertNormsZ;
    if (normEnc == "octahedral" || normEnc == "quantisation") 
        vertNormsY = new Uint16Array(currNumVerts);
    if (normEnc == "quantisation")
        vertNormsZ = new Uint16Array(currNumVerts);  
    var vertCoordsU = new Uint16Array(currNumVerts);
    var vertCoordsV = new Uint16Array(currNumVerts);
    var indexArray;
    if (this.meshType == MeshType.UTF) indexArray = new Uint32Array(utfIndexBuffer);
    else indexArray = new Uint32Array(currNumIndices);

    if (this.meshType == MeshType.UTF) {
        for (var i = 0; i < currNumVerts; i++) {vertIntsX[i] = data.charCodeAt(offset);offset++;}
        for (var i = 0; i < currNumVerts; i++) {vertIntsY[i] = data.charCodeAt(offset);offset++}
        for (var i = 0; i < currNumVerts; i++) {vertIntsZ[i] = data.charCodeAt(offset);offset++}
        for (var i = 0; i < currNumVerts; i++) {vertNormsX[i] = data.charCodeAt(offset);offset++}
        if (normEnc == "octahedral" || normEnc == "quantisation")   
            for (var i = 0; i < currNumVerts; i++) {vertNormsY[i] = data.charCodeAt(offset);offset++}
        if (normEnc == "quantisation")
            for (var i = 0; i < currNumVerts; i++) {vertNormsZ[i] = data.charCodeAt(offset);offset++}
        if (!this.skipTexture){
            for (var i = 0; i < currNumVerts; i++) {vertCoordsU[i] = data.charCodeAt(offset);offset++}
            for (var i = 0; i < currNumVerts; i++) {vertCoordsV[i] = data.charCodeAt(offset);offset++}
        }
        for (var i = 0; i < utfIndexBuffer; i++) {indexArray[i] = data.charCodeAt(offset);offset++;}

    } else {
        for (var i = 0; i < currNumVerts; i++) {vertIntsX[i] = data[offset];offset++;}
        for (var i = 0; i < currNumVerts; i++) {vertIntsY[i] = data[offset];offset++}
        for (var i = 0; i < currNumVerts; i++) {vertIntsZ[i] = data[offset];offset++}
        for (var i = 0; i < currNumVerts; i++) {vertNormsX[i] = data[offset];offset++}
        if (normEnc == "octahedral" || normEnc == "quantisation")  
            for (var i = 0; i < currNumVerts; i++) {vertNormsY[i] = data[offset];offset++}
        if (normEnc == "quantisation")
            for (var i = 0; i < currNumVerts; i++) {vertNormsZ[i] = data[offset];offset++}
        if (!this.skipTexture){
            for (var i = 0; i < currNumVerts; i++) {vertCoordsU[i] = data[offset];offset++}
            for (var i = 0; i < currNumVerts; i++) {vertCoordsV[i] = data[offset];offset++}
        }
        for (var i = 0; i < currNumIndices; i++) {indexArray[i] = data[offset];offset++;}
    }

    if (this.DEBUG) console.log("parse buffers: "+(performance.now()-this.tStart));

    newBuffers.vertices = new Float32Array(currNumVerts*3);
    lastIndexX = 0; lastIndexY = 0; lastIndexZ = 0;
    for (var i = 0; i < currNumVerts; i++){
        //x
        if (this.meshType == MeshType.UTF){
            var result = this.decodeSafeInterleavedUTF(vertIntsX, i);
            delta = result.delta; i = result.i;
        }
        else
            delta = this.decodeInterleavedInt(vertIntsX[i]);
        newVal = lastIndexX+delta;
        lastIndexX = newVal;
        newBuffers.vertices[i*3] = newVal
    }
    for (var i = 0; i < currNumVerts; i++){
        //y
        if (this.meshType == MeshType.UTF){
            var result = this.decodeSafeInterleavedUTF(vertIntsY, i);
            delta = result.delta; i = result.i;
        }
        else
            delta= this.decodeInterleavedInt(vertIntsY[i]);
        newVal = lastIndexY+delta;
        lastIndexY = newVal;
        newBuffers.vertices[i*3+1] = newVal
    }
    for (var i = 0; i < currNumVerts; i++){
        //z
        if (this.meshType == MeshType.UTF){
            var result = this.decodeSafeInterleavedUTF(vertIntsZ, i);
            delta = result.delta; i = result.i;
        }
        else
            delta = this.decodeInterleavedInt(vertIntsZ[i]);
        newVal = lastIndexZ+delta;
        lastIndexZ = newVal;
        newBuffers.vertices[i*3+2] = newVal;
    }

    if (this.DEBUG) console.log("set verts: "+(performance.now()-this.tStart));


    //normals
    var numNormCoords = 2;
    if (normEnc == "quantisation" || normEnc == "fibonacci")
        numNormCoords = 3;

    newBuffers.normals = new Float32Array(currNumVerts*numNormCoords);
    lastIndexX = 0; lastIndexY = 0; lastIndexZ = 0;

    //create fibonacci sphere if required
    var fibSphere;
    if (normEnc == "fibonacci") 
        fibSphere = computeFibonacci_sphere(this.meta.fibonacciLevel);

    for (var i = 0; i < currNumVerts; i++){
        //x
        delta = this.decodeInterleavedInt(vertNormsX[i]);
        newVal = lastIndexX+delta;
        lastIndexX = newVal;
        if (normEnc == "fibonacci") {
            var fibIndex = newVal;

            newBuffers.normals[i*numNormCoords] = fibSphere[fibIndex*3];
            newBuffers.normals[i*numNormCoords+1] = fibSphere[fibIndex*3+1];
            newBuffers.normals[i*numNormCoords+2] = fibSphere[fibIndex*3+2];
        }
        else 
            newBuffers.normals[i*numNormCoords] = newVal;
    }
    if (normEnc == "octahedral" || normEnc == "quantisation") {
        for (var i = 0; i < currNumVerts; i++){
            //y
            delta = this.decodeInterleavedInt(vertNormsY[i]);
            newVal = lastIndexY+delta;
            lastIndexY = newVal;
            newBuffers.normals[i*numNormCoords+1] = newVal;
        }
    }
    if (normEnc == "quantisation") {
        for (var i = 0; i < currNumVerts; i++){
            //z
            delta = this.decodeInterleavedInt(vertNormsZ[i]);
            newVal = lastIndexZ+delta;
            lastIndexZ = newVal;
            newBuffers.normals[i*numNormCoords+2] = newVal;
        }
    }

    if (this.DEBUG) console.log("set norms: "+(performance.now()-this.tStart));

    if (!this.skipTexture){
        lastIndexU = 0; lastIndexV = 0;
        newBuffers.coords = new Float32Array(currNumVerts*2);
        for (var i = 0; i < currNumVerts; i++){
            //u
            delta = this.decodeInterleavedInt(vertCoordsU[i]);
            newVal = lastIndexU+delta;
            lastIndexU = newVal;
            newBuffers.coords[i*2] = newVal/2048;
        }
        for (var i = 0; i < currNumVerts; i++){
            //v
            delta = this.decodeInterleavedInt(vertCoordsV[i]);
            newVal = lastIndexV+delta;
            lastIndexV = newVal;
            newBuffers.coords[i*2+1] = newVal/2048;

        }

        if (this.DEBUG) console.log("set coords: "+(performance.now()-this.tStart));
    }

    newBuffers.triangles = new Uint32Array(utfIndexBuffer);

    lastIndex = 0;
    if (!this.meta.max_step)
        this.meta.max_step = 1;
    nextHighWaterMark = this.meta.max_step - 1;
    hi = this.meta.max_step - 1;
    triCounter = 0;
    var prev = 0;
    var result = 0;
    var v = 0;
    for (var i = 0; i < utfIndexBuffer; i++) //
    {
        if (this.meta.indexCoding == "delta") {
            //delta decoding
            if (this.meshType == MeshType.UTF) {
                var result = this.decodeSafeInterleavedUTF(indexArray, i);
                prev += result.delta;
                i = result.i;
            }
            else {
                result = this.decodeInterleavedInt(indexArray[i]);
                prev += result;
            }
            newBuffers.triangles[triCounter++] = prev;
        } else {
            //highwatermark
            if (this.meshType == MeshType.UTF) {
                var result = this.decodeSafeUTF(indexArray, i);
                v = result.value;
                i = result.i;
            }
            else
                v = indexArray[i];
            v = hi - v;
            newBuffers.triangles[triCounter++] = v;
            hi = Math.max(hi, v + this.meta.max_step);
        }
    }

    if (this.meta.indexCompression == "pairedtris") {
        newArray = new Uint32Array(this.meta.faces*3);
        var nACounter = 0;
        for (var base = 0; base < newBuffers.triangles.length;) {//
            var a = newBuffers.triangles[base++];
            var b = newBuffers.triangles[base++];
            var c = newBuffers.triangles[base++];
            newArray[nACounter++] = a;
            newArray[nACounter++] = b;
            newArray[nACounter++] = c;

            if (a < b) {
                var d = newBuffers.triangles[base++];
                newArray[nACounter++] = a;
                newArray[nACounter++] = d;
                newArray[nACounter++] = b;
            }
        }
        newBuffers.triangles = newArray;
    }

    if (this.DEBUG) console.log("set inds: "+(performance.now()-this.tStart));

    newBuffers.ids = new Float32Array(currNumVerts)
    for (var i = 0; i < currNumVerts; i++) newBuffers.ids[i] = i;

    this.buffers = newBuffers;

    //create mesh now
    options = {};
    this.mesh = Mesh.load(this.buffers, options);
    //add ids attribute
    this.mesh.createVertexBuffer("id", "a_id", 1, this.buffers.ids);
    if (typeof this.meta.normalEncoding == "undefined"
            || this.meta.normalEncoding == "octahedral") {
        //remove existing normal attribute and add new 2 component compressed normal
        delete this.mesh.vertexBuffers.normals;
        this.mesh.createVertexBuffer("normals2", "a_normal", 2, this.buffers.normals);
    }



    if (this.meta.normalEncoding == "quantisation")
        this.shaderOptions.normal = "quantisation";
    else if (this.meta.normalEncoding == "octahedral")
        this.shaderOptions.normal = "octahedral";
    else if (this.meta.normalEncoding == "fibonacci")
        this.shaderOptions.normal = "fibonacci";
    this.compileShader();

    if (this.DEBUG) {
        if (TIMER)
            console.log("ready "+(performance.now()-TIMER));
        console.log("ready "+(performance.now()-this.tStart));
    }
    if (this.onLoadComplete)
        this.onLoadComplete();

    return;


}

WebMesh.prototype.decodeInterleavedInt = function(val) {
    if (val%2==0)
        return -1*(val/2)
    else
        return ((val-1)/2)+1
}

WebMesh.prototype.decodeSafeInterleavedUTF = function(array, i) {
    var delta = 0;
    var dodgy = false;
    if (array[i] == 55295) {
        i++;
        delta = this.decodeInterleavedInt(array[i]);
        if (delta < 0)
            delta -= 14000;
        else
            delta += 14000;
    }
    else if (array[i] >= 55296 && array[i] <= 57343) {
        var interLeavedVal = surrogatePairToCodePoint(array[i], array[i+1]);
        delta = this.decodeInterleavedInt(interLeavedVal);
        dodgy = true;
        i++;

    }
    else
        delta = this.decodeInterleavedInt(array[i]);

    return {delta:delta, i:i, dodgy:dodgy};
}

WebMesh.prototype.decodeSafeUTF = function(array, i) {
    var value = 0;
    var dodgy = false;
    if (array[i] == 55295) {
        i++;
        value = array[i] + 14000;
    }
    else if (array[i] >= 55296 && array[i] <= 57343) {
        value = surrogatePairToCodePoint(array[i], array[i+1]);
        dodgy = true;
        i++;
        glob++;
    }
    else
        value = array[i];
    return {value:value, i:i, dodgy:dodgy}
}



WebMesh.prototype.compileShader = function() {

    GL.loadFileAtlas(this.shaderPath, function(shaders) {
        this.vertShaderCode = shaders.vertex;
        this.fragShaderCode = shaders.fragment;

        if (!this.vertShaderCode | !this.fragShaderCode)
            throw("Mesh doesn't have shader code");

        var macros = {};
        if (typeof this.shaderOptions.normal == "undefined" || this.shaderOptions.normal == "octahedral")
            macros.NORMAL_OCT = "";
        else if (this.shaderOptions.normal == "quantisation")
            macros.NORMAL_QUANT = "";
        else if (this.shaderOptions.normal == "fibonacci")
            macros.NORMAL_FIB = "";

        if (this.shaderOptions.light == true)
            macros.LIGHT = "";
        if (this.shaderOptions.textureDiffuse == true)
            macros.TEXTURE_DIFFUSE = "";

        this.shader = new Shader(this.vertShaderCode, this.fragShaderCode, macros);

        //ready after compiled shader!
        this.ready = true;

    }.bind(this));
}

function surrogatePairToCodePoint(charCode1, charCode2) {
    return ((charCode1 & 0x3FF) << 10) + (charCode2 & 0x3FF) + 0x10000;
}

if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

function computeFibonacci_sphere(samples) {
    var rnd = 1.0;
    var points = [];
    var offset = 2.0/samples;
    var increment = Math.PI * (3.0 - Math.sqrt(5.0));
    for (var i = 0; i < samples; i++) {
        var y = ((i * offset) - 1) + (offset / 2);
        var r = Math.sqrt(1 - Math.pow(y, 2));

        var phi = ((i + rnd) % samples) * increment;

        var x = Math.cos(phi) * r;
        var z = Math.sin(phi) * r; 

        points.push(x);
        points.push(y);
        points.push(z);
    }
    return points;
}

function splitPath(path) {
  var dirPart, filePart;
  path.replace(/^(.*\/)?([^/]*)$/, function(_, dir, file) {
    dirPart = dir; filePart = file;
  });
  return { dirPart: dirPart, filePart: filePart };
}

function WebMesh_peak(filepath, filename, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', filepath+filename);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 400){
            var jsonData = JSON.parse(xhr.responseText);
            callback(jsonData);
        }
    }
    xhr.send();
}
