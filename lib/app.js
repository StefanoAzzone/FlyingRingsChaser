var canvas;

var gl = null,
	program = null;
	
var projectionMatrix, 
	perspProjectionMatrix,
	viewMatrix,
	worldMatrix,
	lastUpdateTime;

//Parameters for Camera
var cx = 4.5;
var cy = 0.0;
var cz = 10.0;
var elevation = 0.0;
var angle = 0.0;

var lookRadius = 10.0;
	


async function main(){
	var canvas = getCanvas();
	try{
		gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("webgl2"));
		//gl= canvas.getContext("webgl2");
	} catch(e){
		console.log(e);
	}
	
	if(gl){
		// Compile and link shaders
		program = gl.createProgram();

		var vs = await getString("lib/vertexShader.glsl");
		var fs = await getString("lib/fragmentShader.glsl");
		compileAndLinkShader(vs, fs);

		gl.linkProgram(program);				
		gl.useProgram(program);
				
		//LoadTexture(0);		/// load textures
		LoadEnvironment(1);

		await loadObject("obj/ring.obj");
		await loadSkyBox();
		//totMesh--;
		
		createAndLinkAttribuses();
		getUniformLocations();

		var w=canvas.clientWidth;
		var h=canvas.clientHeight;
		
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		doResize();

		// selects the mesh
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
		gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

		//gl.bindBuffer(gl.ARRAY_BUFFER, UVBuffer);
		//gl.vertexAttribPointer(program.vertexUVAttribute, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		
		// turn on depth testing and back-face culling
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		
		lightDir = [0.0, 0.70711, 0.707106];
		lightColor = [0.1, 1.0, 1.0];

		drawScene();
	}else{
		alert("Error: WebGL not supported by your browser!");
	}
}


function drawScene() {
	animate();
		// update perspective matrix
	var canvas = document.getElementById("my-canvas");
	var slider = 0;
	
	//worldMatrix = utils.MakeWorld(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);
	
	// update WV matrix
	cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	cy = lookRadius * Math.sin(utils.degToRad(-elevation));
	viewMatrix = utils.MakeView(cx, cy, cz, elevation, -angle);
	
	var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
	var projectionMatrix = utils.MakePerspective(65, canvas.width / canvas.height, 0.1, 180.0);
	var inverseViewProjMatrix = utils.invertMatrix(utils.multiplyMatrices(projectionMatrix, viewMatrix));

	var normalMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));
	var wvpMatrix = utils.multiplyMatrices(projectionMatrix, viewWorldMatrix);

	//var diffColor = [0.25, 0.25, 0.75];

	lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));
    lightDir = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(lightDirMatrix), lightDir);

	// draws the request
	gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(wvpMatrix));
	gl.uniformMatrix4fv(program.NmatrixUniform, gl.FALSE, utils.transposeMatrix(normalMatrix));
	gl.uniform3fv(program.lightDirUniform, lightDir);
	gl.uniform3fv(program.lightColorUniform, lightColor);
	//gl.uniform3fv(program.diffColorUniform, diffColor);
	gl.uniformMatrix4fv(program.inverseViewProjMatrixUniform, gl.FALSE, utils.transposeMatrix(inverseViewProjMatrix));
	gl.uniform1i(program.textureEnv, 0);
	
	drawAllElements();

	window.requestAnimationFrame(drawScene);		
}



function doResize() {
    // set canvas dimensions
	
	var canvas = document.getElementById("my-canvas");
    if((window.innerWidth > 40) && (window.innerHeight > 240)) {
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;
		gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    }
	
}

// texture loader callback
var textureLoaderCallback = function() {
	console.log("Loaded: " + this.src);
	var textureId = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + this.txNum);
	gl.bindTexture(gl.TEXTURE_2D, textureId);		
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this);		

	gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

// Load a texture set
function LoadTexture(id) {
	for(i = 0; i < matcomp.length; i++) {
		imgtx = new Image();
		imgtx.txNum = i;
		imgtx.onload = textureLoaderCallback;
		imgtx.src = matnames[id] + matcomp[i];
	}
}


var totMesh = 0;
var startVertex = [0];
var startIndex = [0];
var vertices = [];
var normals = [];
var uvs = [];
var indices = [];
var colors = [];

function addMesh(i_vertices, i_norm, i_uv, i_indices, i_color) {
	var i;
	
	vertices = vertices.concat(i_vertices);
	normals = normals.concat(i_norm);
	uvs = uvs.concat(i_uv);
	
	
	for(i = 0; i < i_indices.length; i++) {
		indices[i + startIndex[totMesh]] = startVertex[totMesh] + i_indices[i];
	}
	colors[totMesh] = i_color;

	totMesh ++;	
	
	startVertex[totMesh] = startVertex[totMesh-1] + i_vertices.length;
	startIndex[totMesh] = startIndex[totMesh-1] + i_indices.length;
	//alert([totMesh, startIndex]);
}


// load the environment map
function LoadEnvironment(id) {
	// Create a texture.
	var texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
	
	baseName = "env/"+id+"/"
	 
	const faceInfos = [
		{
	    	target: gl.TEXTURE_CUBE_MAP_POSITIVE_X, 
	    	url: baseName+'posx.jpg',
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 
			url: baseName+'negx.jpg',
		},
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 
			url: baseName+'posy.jpg',
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 
			url: baseName+'negy.jpg',
		},
		{
			target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 
			url: baseName+'posz.jpg',
		},
		{
			target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 
			url: baseName+'negz.jpg',
		},
	];
	faceInfos.forEach((faceInfo) => {
		const {target, url} = faceInfo;
		
		// Upload the canvas to the cubemap face.
		const level = 0;
		const internalFormat = gl.RGBA;
		const width = 512;
		const height = 512;
		const format = gl.RGBA;
		const type = gl.UNSIGNED_BYTE;
		
		// setup each face so it's immediately renderable
		gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);
	 
		// Asynchronously load an image
		const image = new Image();
		image.src = url;
		image.addEventListener('load', function() {
			// Now that the image has loaded upload it to the texture.
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
			gl.texImage2D(target, level, internalFormat, format, type, image);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
		});
	});
	gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}


function getCanvas() {
	var canvas = document.getElementById("my-canvas");

	canvas.addEventListener("mousedown", doMouseDown, false);
	canvas.addEventListener("mouseup", doMouseUp, false);
	canvas.addEventListener("mousemove", doMouseMove, false);
	canvas.addEventListener("mousewheel", doMouseWheel, false);
	window.addEventListener("keyup", keyFunctionUp, false);
	window.addEventListener("keydown", keyFunctionDown, false);

	window.onresize = doResize;

	canvas.width  = window.innerWidth;
	canvas.height = window.innerHeight;

	return canvas;
}


function compileAndLinkShader(vs, fs) {
	var v1 = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(v1, vs);
	gl.compileShader(v1);
	if (!gl.getShaderParameter(v1, gl.COMPILE_STATUS)) {
		alert("ERROR IN VS SHADER : " + gl.getShaderInfoLog(v1));
	}
	var v2 = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(v2, fs)
	gl.compileShader(v2);		
	if (!gl.getShaderParameter(v2, gl.COMPILE_STATUS)) {
		alert("ERROR IN FS SHADER : " + gl.getShaderInfoLog(v2));
	}			
	gl.attachShader(program, v1);
	gl.attachShader(program, v2);
}


function drawAllElements() {
	for(slider = 0; slider < startIndex.length - 1; slider++) {
		gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
			gl.UNSIGNED_SHORT, startIndex[slider] * 2);
	}
}





var maxSpawnDistance = -170.0;
var despawnDistance = 15;
var speed = 0.4;
var zz = maxSpawnDistance;

function animate(){
	var fps = 30;
	
	var currentTime = (new Date).getTime();
	if(lastUpdateTime){
		var deltaC = (fps * (currentTime - lastUpdateTime)) / 1000.0;
		zz = zz + deltaC * speed;
		if (zz > despawnDistance) zz = maxSpawnDistance;
	}
	
	worldMatrix = utils.MakeWorld( 0.0, 0.0, zz, 90.0, 0.0, 0.0, 1.0);
	lastUpdateTime = currentTime;               
}


function getUniformLocations() {
	program.WVPmatrixUniform = gl.getUniformLocation(program, "wvpMatrix");
	program.NmatrixUniform = gl.getUniformLocation(program, "nMatrix");
	program.lightDirUniform = gl.getUniformLocation(program, "lightDirection");
	program.lightColorUniform = gl.getUniformLocation(program, "lightColor");
	//program.diffColorUniform = gl.getUniformLocation(program, "mDiffColor");
	program.textureEnv = gl.getUniformLocation(program, "cubeMap");
	program.inverseViewProjMatrixUniform = gl.getUniformLocation(program, "inverseViewProjMatrix");
}


function createAndLinkAttribuses() {
	// create and fill vertex, normals, uvs and index buffers
	vertexBuffer = gl.createBuffer();
	vertices = new Float32Array(vertices);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.STATIC_DRAW);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
	
	normalBuffer = gl.createBuffer();
	normals = new Float32Array(normals);
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, normals.byteLength, gl.STATIC_DRAW);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals);
	
	//UVBuffer = gl.createBuffer();
	//uvs = new Float32Array(uvs);
	//gl.bindBuffer(gl.ARRAY_BUFFER, UVBuffer);
	//gl.bufferData(gl.ARRAY_BUFFER, uvs.byteLength, gl.STATIC_DRAW);
	//gl.bufferSubData(gl.ARRAY_BUFFER, 0, uvs);
	
	indexBuffer = gl.createBuffer();
	indices = new Uint16Array(indices);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.byteLength, gl.STATIC_DRAW);
	gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, indices);
	
	// links mesh attributes to shader attributes
	program.vertexPositionAttribute = gl.getAttribLocation(program, "in_pos");
	gl.enableVertexAttribArray(program.vertexPositionAttribute);
	
	program.vertexNormalAttribute = gl.getAttribLocation(program, "in_norm");
	gl.enableVertexAttribArray(program.vertexNormalAttribute);
	 
	//program.vertexUVAttribute = gl.getAttribLocation(program, "in_uv");
	//gl.enableVertexAttribArray(program.vertexUVAttribute);
}



/* Might become handy later:

function createSolidTexture(gl, r, g, b, a) {
    var data = new Uint8Array([r, g, b, a]);
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    return texture;
}

*/