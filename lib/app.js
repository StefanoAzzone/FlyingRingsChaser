var canvas;

var gl = null,
	program = null;
	
var projectionMatrix, 
	perspProjectionMatrix,
	viewMatrix,
	worldMatrix,
	rings = [],
	asteroids = [],
	lastUpdateTime,
	totTextures = 1,
	canvas,
	locked = false;

var skyboxBuffer;

var audioContext;
var audioBuffer;
var themeSong;
var ringSound;
var t
//Parameters for Camera
var cx = 0.0;
var cy = 0.0;
var cz = 0.0;
var elevation = 0.0;
var angle = 0.0;

var shipElevation = 0.0;
var shipAngle = 0.0;

var dead = false;
var deathTime = 0.0;
const resetTime = 5000;
const loadingTime = 5000;
const fadingTime = 10000;
var startTime = 0.0;
const loading = false;


const lookRadius = 10.0;

var parentDiv;

var deathAngle;
var deathElevation;



async function main(){
	get2DCanvas();
	getAudio();
	reset();
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

		LoadEnvironment("lightblue");
		LoadTexture("spaceship/albedo.png");
		LoadTexture("asteroid/albedo.png");

		await loadObject("obj/square.obj");
		await loadObject("obj/untitled.obj");
		await loadObject("obj/ring.obj");
		await loadObject("obj/asteroid.obj");
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

		initializeSpaceElements();

		drawScene();
	}else{
		alert("Error: WebGL not supported by your browser!");
	}
}

var updateShipDirectionSpeed = 0.01;
function updateShipDirection() {
	shipElevation = elevation*updateShipDirectionSpeed + shipElevation*(1-updateShipDirectionSpeed);
	shipAngle = angle*updateShipDirectionSpeed + shipAngle*(1-updateShipDirectionSpeed);
}

function deathAnimation() {
	elevation = elevation + 0.2;
	angle = angle + 0.2;
}


function drawScene() {
	//traversedRingsNode.nodeValue = collectedRings;

	write();
	animate();
	updateDirection();
	collisionDetection();

	cy = cy + Math.sin(utils.degToRad(elevation));
	cx = cx + Math.sin(utils.degToRad(angle));
	worldMatrix = utils.MakeWorld(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0);

	viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

	var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
	var projectionMatrix = utils.MakePerspective(65, canvas.width / canvas.height, 0.1, 500.0);
	//var inverseViewProjMatrix = utils.invertMatrix(utils.multiplyMatrices(projectionMatrix, viewMatrix));
	var inverseViewProjMatrix = utils.invertMatrix(utils.multiplyMatrices(projectionMatrix, viewMatrix));

	var normalMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));
	var wvpMatrix = utils.multiplyMatrices(projectionMatrix, viewWorldMatrix);

	//var diffColor = [0.25, 0.25, 0.75];

	lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));
    dirLightTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(lightDirMatrix), lightDir);
	// draws the request
	var skyboxMatrix = utils.multiplyMatrices(wvpMatrix, utils.MakeTranslateMatrix(cx, cy, cz));
	gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(skyboxMatrix));
	gl.uniformMatrix4fv(program.NmatrixUniform, gl.FALSE, utils.transposeMatrix(normalMatrix));
	gl.uniform3fv(program.lightDirUniform, dirLightTransformed);
	gl.uniform3fv(program.lightColorUniform, lightColor);
	//gl.uniform3fv(program.diffColorUniform, diffColor);
	gl.uniformMatrix4fv(program.inverseViewProjMatrixUniform, gl.FALSE, utils.transposeMatrix(inverseViewProjMatrix));
	//gl.uniform4fv(program.effectsUniform, [1.0,0.0,0.0,0.0]);
	gl.uniform1f(program.samplerModifier, 0);
	gl.uniform1f(program.cubemapModifier, 1);
	gl.uniform1i(program.sampler, 1);
	gl.uniform1i(program.cubemap, 0);
	
	var slider = 0;

	gl.disable(gl.DEPTH_TEST);
	//Skybox
	gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
		gl.UNSIGNED_SHORT, startIndex[slider]*2);

	gl.enable(gl.DEPTH_TEST);
	slider++;

	updateShipDirection();
	if(dead) {
		deathAnimation();
	}
	worldMatrix = utils.MakeWorld(cx, cy-0.5, cz, shipElevation, shipAngle - 90, 0.0, 1.0);
	viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
	wvpMatrix = utils.multiplyMatrices(projectionMatrix, viewWorldMatrix);
	gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(wvpMatrix));
	gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(wvpMatrix));
	//gl.uniform4fv(program.effectsUniform, [0.0,0.0,0.0,0.0]);
	gl.uniform1f(program.samplerModifier, 1);
	gl.uniform1f(program.cubemapModifier, 0);
	//Ship
	gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
		gl.UNSIGNED_SHORT, startIndex[slider]*2);

	gl.uniform1f(program.samplerModifier, 0);
	
		
	slider++;
	for(i = 0; i < rings.length; i++) {
		if (rings[i].active) {
			worldMatrix = utils.MakeWorld(rings[i].x, rings[i].y, rings[i].z, 90.0, 0.0, 0.0, 1.0);
			viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
			wvpMatrix = utils.multiplyMatrices(projectionMatrix, viewWorldMatrix);
			gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(wvpMatrix));
			//Rings
			gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
				gl.UNSIGNED_SHORT, startIndex[slider]*2);
		}
	}
	slider++;

	gl.uniform1f(program.samplerModifier, 1);
	gl.uniform1i(program.sampler, 2);
	
	for(i = 0; i < asteroids.length; i++) {
		if (asteroids[i].active) {
			//worldMatrix = utils.MakeWorld(asteroids[i].x, asteroids[i].y, asteroids[i].z, asteroids[i].currentXRotation,
			//							  asteroids[i].currentYRotation, asteroids[i].currentZRotation, asteroids[i].size);
			worldMatrix = utils.multiplyMatrices(asteroids[i].getRotationMatrix(), utils.MakeScaleMatrix(asteroids[i].size));
			worldMatrix = utils.multiplyMatrices(utils.MakeTranslateMatrix(asteroids[i].x, asteroids[i].y, asteroids[i].z), worldMatrix);;
			viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
			wvpMatrix = utils.multiplyMatrices(projectionMatrix, viewWorldMatrix);
			gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(wvpMatrix));
			//Asteroids
			gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
				gl.UNSIGNED_SHORT, startIndex[slider]*2);	
		}
	}


	window.requestAnimationFrame(drawScene);		
}

function lockChangeAlert() {
	if(document.pointerLockElement === canvas) {
		locked = true;
		parentDiv.requestFullscreen();
		themeSong.play();
		
		//canvas.requestFullscreen();
	} else {
	  document.exitPointerLock();
	  themeSong.pause();
	  locked = false;
	}
}

function doResize() {
    // set canvas dimensions
	
    if((window.innerWidth > 40) && (window.innerHeight > 230)) {
		canvas.width  = window.innerWidth;
		canvas.height = window.innerHeight;
		gl.viewport(0.0, 0.0, canvas.width, canvas.height);
		textCanvas.width = window.innerWidth;
		textCanvas.height = window.innerHeight;
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
	console.log(indices);
	//console.log(Math.max(...i_indices)+1);
	console.log(vertices);
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
	document.addEventListener('pointerlockchange', lockChangeAlert, false);

	canvas.addEventListener("mousedown", doMouseDown, false);
	canvas.addEventListener("mouseup", doMouseUp, false);
	canvas.addEventListener("mousemove", doMouseMove, false);
	canvas.addEventListener("mousewheel", doMouseWheel, false);
	window.addEventListener("keyup", keyFunctionUp, false);
	window.addEventListener("keydown", keyFunctionDown, false);

	window.onresize = doResize;

	parentDiv.onclick = function() {
		//canvas.requestFullscreen();
		canvas.requestPointerLock();
		if (audioContext.state === 'suspended') {
			audioContext.resume();
		}

	}

	canvas.width  = window.innerWidth;
	canvas.height = window.innerHeight;
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





const fps = 30;
const maxSpawnDistance = -300.0;
const despawnDistance = 15;
const maxRingCount = 3;
const maxAsteroidCount = 40;
const ringSpawnCooldown = 1000.0 * 4.5;
const asteroidSpawnCooldown = 1000.0 * 0.3;
var speed = 0.4;
var lastRingSpawn = 0;
var lastAsteroidSpawn = 0;
//var activeRings = new Array(maxAsteroidCount);
//activeRings.fill(false);

function animate(){
	var currentTime = (new Date).getTime();
	
	if(lastUpdateTime){
		var deltaC = (fps * (currentTime - lastUpdateTime)) / 1000.0;
		var i;

		for (i = 0; i < rings.length; i++) {
			rings[i].update(deltaC); 
		}
		spawnRing();

		for (i = 0; i < asteroids.length; i++) {
			asteroids[i].update(deltaC);
		}
		spawnAsteroid();
	}

	if(dead && !deathTime)
		deathTime = currentTime;

	if(dead && currentTime - deathTime > resetTime)
		reset();
	
	lastUpdateTime = currentTime;       
}

function spawnRing() {
	if((new Date).getTime() - lastRingSpawn >= ringSpawnCooldown) {
		for (i = 0; i < rings.length; i++) {
			if (!rings[i].active) {
				lastRingSpawn = (new Date).getTime();
				var rx = cx + (Math.random() - 0.5) * 20;
				var ry = cy + (Math.random() - 0.5) * 20;
				rings[i] = new Ring(rx, ry, true);
				break;
			}
		}
	}
}

var rotationSpeed = 1;
function spawnAsteroid() {
	if((new Date).getTime() - lastAsteroidSpawn >= asteroidSpawnCooldown) {
		for (i = 0; i < asteroids.length; i++) {
			if (!asteroids[i].active) {
				lastAsteroidSpawn = (new Date).getTime();
				var ax = cx + (Math.random() - 0.5) * 100;
				var ay = cy + (Math.random() - 0.5) * 100;
				var sx = (Math.random() - 0.1) * speed * 0.4 * (cx - ax) * 0.02;
				var sy = (Math.random() - 0.1) * speed * 0.4 * (cy - ay) * 0.02;
				var s = (Math.random() * 0.7) + 0.2;
				var rx = (Math.random() - 0.5) * rotationSpeed;
				var ry = (Math.random() - 0.5) * rotationSpeed;
				var rz = (Math.random() - 0.5) * rotationSpeed;

				asteroids[i] = new Asteroid(ax, ay, sx, sy, s, rx, ry, rz, true);
				break;
			}
		}
	}
}

function initializeSpaceElements() {
	for(var i = 0; i < maxAsteroidCount; i++)
		asteroids[i] = new Asteroid(0,0,0,0,0,0,0,0,0,false);
	for(var i = 0; i < maxRingCount; i++)
		rings[i] = new Ring(0,0,false);
	
}




function getUniformLocations() {
	//program.effectsUniform = gl.getUniformLocation(program, "effects");
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

var collectedRings = 0;
const ringDetectionInterval = [-1, -0.2];
const asteroidDetectionInterval = [-5, 0];
const innerRadius = 0.8;
//const outerRadius = 0.1;
const baseAsteroidSize = 5;
function collisionDetection() {
	//Rings
	for (i = 0; i < rings.length; i++) {
		if (rings[i].z > ringDetectionInterval[0] && rings[i].z < ringDetectionInterval[1] && 
													distanceFromShip(rings[i].x, rings[i].y) < innerRadius && rings[i].active) {
			
			rings[i].active = false;
			collectedRings++;
			console.log("Yayks, you got " + collectedRings + " rings!!1!");
			ringSound.play();
		}
	}
	//Asteroids
	for (i = 0; i < asteroids.length; i++) {
		var size = baseAsteroidSize;
		if (asteroids[i].size >= 0.7) size += 2;
		else if (asteroids[i].size <= 0.4) size -= 2;

		if (asteroids[i].z > asteroidDetectionInterval[0] && asteroids[i].z < asteroidDetectionInterval[1] && 
													distanceFromShip(asteroids[i].x, asteroids[i].y) < size && asteroids[i].active) {
			
			
			console.log("Ouch, that hurt!!!\nNext time remember to stay more than " + distanceFromShip(asteroids[i].x, asteroids[i].y)
													+ " away from an asteroid of size " + size);
			dead = true;
			deathSound.play();
			asteroids[i].active = false;
		}
	}
}

function distanceFromShip(x, y) {
	return Math.sqrt(Math.pow((cx - x),2) + Math.pow((cy - y),2));
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

function play() {
	canvas.requestFullscreen();
	canvas.requestPointerLock();
}
*/

function getAudio() {
	audioContext = new AudioContext();
	themeSong = document.getElementById("theme");
	themeTrack = audioContext.createMediaElementSource(themeSong);
	ringSound = document.getElementById("ring");
	ringTrack = audioContext.createMediaElementSource(ringSound);
	deathSound = document.getElementById("death");
	deathTrack = audioContext.createMediaElementSource(deathSound);
	//themeTrack.connect(audioContext.destination);
	ringTrack.connect(audioContext.destination);
	deathTrack.connect(audioContext.destination);
}

function get2DCanvas() {
	textCanvas = document.querySelector("#text");
	gl2 = textCanvas.getContext("2d");
	parentDiv = document.getElementById("my-div");
}

function getCurrentTime() {
	return (new Date).getTime();
}

function write() {
	gl2.clearRect(0, 0, gl2.canvas.width, gl2.canvas.height); // clean 2d canvas
	gl2.font = '48px sans-serif';
	midHeight = window.innerHeight/2;
	midWidth = window.innerWidth/2;
	crossDim = 10;
	var currentTime = getCurrentTime();
	var gameTime = currentTime - startTime;
	if(!dead) {
		if(gameTime < fadingTime) {
			var a;
			var r = 255;
			var g = 255;
			var b = 255;
			if(gameTime < loadingTime)
				a = 1;
			else
				a = 1 - (gameTime - (fadingTime - loadingTime))/loadingTime;
			gl2.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
			gl2.fillRect(0, 0, window.innerWidth, window.innerHeight);
			gl2.fillStyle = 'lightgreen'
			if(gameTime < loadingTime && gameTime > 1000) {
				gl2.fillText('TRAVERSE RINGS', midWidth - 200, midHeight);
				gl2.fillText('AVOID ROCKS', midWidth - 200, midHeight + 100);
			}

		}
		else {
			gl2.fillStyle = 'green';
			gl2.fillRect(0, 0, 210 + collectedRings.toString().length*25, 65);
			gl2.fillStyle = 'lightgreen';
			gl2.fillText('RINGS: ' + collectedRings, 10, 50);
			gl2.fillRect(midWidth, midHeight - crossDim/2, 1, crossDim);
			gl2.fillRect(midWidth - crossDim/2, midHeight, crossDim, 1);
		}

	}
	else{
		var r = 255;
		var g = 255;
		var b = 255;
		var a = (currentTime - deathTime) / resetTime;
		gl2.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
		if(deathTime) {
			gl2.fillRect(0, 0, window.innerWidth, window.innerHeight);
		}
		gl2.fillStyle = 'green';
		gl2.fillRect(window.innerWidth/2 - 300, window.innerHeight/2 - 70, 610, 160);
		gl2.fillStyle = 'lightgreen';
		var deathMessage = 'YOU GOT HIT BY A ROCK';
		gl2.fillText(deathMessage, window.innerWidth/2 - deathMessage.length/2*28, window.innerHeight/2 - 20);
		deathMessage = 'YOU GOT ' + collectedRings + ' RINGS';	
		gl2.fillText(deathMessage, window.innerWidth/2 - deathMessage.length/2*28, window.innerHeight/2 + 80);
	} 
}

function reset() {
	cx = 0.0;
	cy = 0.0;
	cz = 0.0;
	elevation = 0.0;
	angle = 0	
	shipElevation = 0.0;
	shipAngle = 0	
	dead = false;
	deathTime = 0.0;
	speed = 0.4;
	lastRingSpawn = 0;
	lastAsteroidSpawn = 0;
	collectedRings = 0;
	startTime = getCurrentTime();

	initializeSpaceElements();

}