var canvas;

var gl = null,
	program = null;
	
var projectionMatrix, 
	perspProjectionMatrix,
	viewMatrix,
	worldMatrix,
	lastUpdateTime,
	totTextures = 1,
	canvas,
	locked = false;

var skyboxBuffer;

//Parameters for Camera
var cx = 0.0;
var cy = 0.0;
var cz = 0.0;
var elevation = 0.0;
var angle = 90.0;

var lookRadius = 10.0;

async function main(){
	document.addEventListener('pointerlockchange', lockChangeAlert, false);
	getCanvas();
	try{
		gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("webgl2"));
		//gl= canvas.getContext("webgl2");
	} catch(e){
		console.log(e);
	}
	
	if(gl){
		// Compile and link shaders
		program = gl.createProgram();

		var vs = await getString("shaders/vertexShader.glsl");
		var ss = await getString("shaders/fragmentShader.glsl");
		//compileAndLinkShader(vs, ss);
		cvs = compileVertexShader(vs);
		css = compileFragmentShader(ss);
		gl.attachShader(program, cvs);
		gl.attachShader(program, css);

		gl.linkProgram(program);				
		gl.useProgram(program);

		LoadEnvironment("red1");
		LoadTexture("xwingColors.png");

		//await loadObject("obj/ring.obj");
		await loadObject("obj/square.obj");
		await loadObject("obj/X-WING.obj");
		//await loadObject("obj/asteroid.obj");
		//totMesh--;
		
		createAndLinkAttributes();
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

		gl.bindBuffer(gl.ARRAY_BUFFER, UVBuffer);
		gl.vertexAttribPointer(program.vertexUVAttribute, 2, gl.FLOAT, false, 0, 0);



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
	//animate();
	worldMatrix = utils.MakeWorld( 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);
		// update perspective matrix
	var slider = 0;
	
	//worldMatrix = utils.MakeWorld(0.0, 0.0, 0.0, 90, 0.0, 0.0, 1.0);
	
	// update WV matrix
	//cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	//cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	//cy = lookRadius * Math.sin(utils.degToRad(-elevation));
	viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);
	
	var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
	var projectionMatrix = utils.MakePerspective(65, canvas.width / canvas.height, 0.1, 180.0);
	//var inverseViewProjMatrix = utils.invertMatrix(utils.multiplyMatrices(projectionMatrix, viewMatrix));
	var inverseViewProjMatrix = utils.invertMatrix(utils.multiplyMatrices(projectionMatrix, viewMatrix));

	var normalMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));
	var wvpMatrix = utils.multiplyMatrices(projectionMatrix, viewWorldMatrix);

	//var diffColor = [0.25, 0.25, 0.75];

	lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));
    dirLightTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(lightDirMatrix), lightDir);
	// draws the request
	gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(wvpMatrix));
	gl.uniformMatrix4fv(program.NmatrixUniform, gl.FALSE, utils.transposeMatrix(normalMatrix));
	gl.uniform3fv(program.lightDirUniform, dirLightTransformed);
	gl.uniform3fv(program.lightColorUniform, lightColor);
	//gl.uniform3fv(program.diffColorUniform, diffColor);
	gl.uniformMatrix4fv(program.inverseViewProjMatrixUniform, gl.FALSE, utils.transposeMatrix(inverseViewProjMatrix));
	gl.uniform1f(program.samplerModifier, 0);
	gl.uniform1f(program.cubemapModifier, 1);
	gl.uniform1i(program.sampler, 1);
	gl.uniform1i(program.cubemap, 0);
	
	//drawAllElements();


	slider = 0;

	gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
		gl.UNSIGNED_SHORT, startIndex[slider]*2);

	slider = 1;


	gl.uniform1f(program.samplerModifier, 1);
	gl.uniform1f(program.cubemapModifier, 0);
	gl.activeTexture(gl.TEXTURE1);

	gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
		gl.UNSIGNED_SHORT, startIndex[slider]*2);

	window.requestAnimationFrame(drawScene);		
}

function lockChangeAlert() {
	if(document.pointerLockElement === canvas) {
	  locked = true;
	  canvas.requestFullscreen();
	} else {
	  document.exitPointerLock();
	  locked = false;
	}
}

function doResize() {
    // set canvas dimensions
	
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
	imgtx = new Image();
	imgtx.txNum = totTextures;
	imgtx.onload = textureLoaderCallback;
	imgtx.src = "tex/" + id
	totTextures++;
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
		i_indices[i] = i_indices[i] + startVertex[totMesh]/3;
	}
	indices = indices.concat(i_indices);

	colors[totMesh] = i_color;

	totMesh ++;
	//console.log(indices);
	//console.log(Math.max(...i_indices)+1);
	//console.log(vertices);
	//console.log(vertices.length/3);
	//console.log(uvs);
	
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
	canvas = document.getElementById("my-canvas");

	canvas.addEventListener("mousedown", doMouseDown, false);
	canvas.addEventListener("mouseup", doMouseUp, false);
	canvas.addEventListener("mousemove", doMouseMove, false);
	canvas.addEventListener("mousewheel", doMouseWheel, false);
	window.addEventListener("keyup", keyFunctionUp, false);
	window.addEventListener("keydown", keyFunctionDown, false);
	canvas.requestPointerLock();

	window.onresize = doResize;

	canvas.onclick = function() {
		//canvas.requestFullscreen();
		canvas.requestPointerLock();
	}

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

function compileFragmentShader(str) {
	var fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, str);
	gl.compileShader(fs);
	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		alert("ERROR IN FS SHADER : " + gl.getShaderInfoLog(fs));
	}
	return fs;
}

function compileVertexShader(str) {
	var vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, str);
	gl.compileShader(vs);
	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
		alert("ERROR IN VS SHADER : " + gl.getShaderInfoLog(vs));
	}
	return vs;
}

function drawAllElements() {
	for(slider = 0; slider < startIndex.length-1; slider++) {
		gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
			gl.UNSIGNED_SHORT, startIndex[slider]*2);
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
	program.inverseViewProjMatrixUniform = gl.getUniformLocation(program, "inverseViewProjMatrix");
	program.cubemap = gl.getUniformLocation(program, "cubemap");
	program.sampler = gl.getUniformLocation(program, "sampler");
	program.samplerModifier = gl.getUniformLocation(program, "samplerModifier");
	program.cubemapModifier = gl.getUniformLocation(program, "cubemapModifier")
}


function createAndLinkAttributes() {
	// create and fill vertex, normals, uvs and index buffers
	vertexBuffer = gl.createBuffer();
	vertices = new Float32Array(vertices);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	//gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
	
	normalBuffer = gl.createBuffer();
	normals = new Float32Array(normals);
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
	//gl.bufferSubData(gl.ARRAY_BUFFER, 0, normals);
	
	UVBuffer = gl.createBuffer();
	uvs = new Float32Array(uvs);
	gl.bindBuffer(gl.ARRAY_BUFFER, UVBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
	//gl.bufferSubData(gl.ARRAY_BUFFER, 0, uvs);
	
	indexBuffer = gl.createBuffer();
	indices = new Uint16Array(indices);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	//gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, indices);
	
	// links mesh attributes to shader attributes
	program.vertexPositionAttribute = gl.getAttribLocation(program, "in_pos");
	gl.enableVertexAttribArray(program.vertexPositionAttribute);
	
	program.vertexNormalAttribute = gl.getAttribLocation(program, "in_norm");
	gl.enableVertexAttribArray(program.vertexNormalAttribute);
	 
	program.vertexUVAttribute = gl.getAttribLocation(program, "in_uv");
	gl.enableVertexAttribArray(program.vertexUVAttribute);
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

function play() {
	canvas.requestFullscreen();
	canvas.requestPointerLock();
}