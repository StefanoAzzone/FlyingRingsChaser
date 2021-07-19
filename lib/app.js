// Global variables for gl
var canvas,
	textCanvas,
	gl,
	gl2,
	program,
	parentDiv;
	
// MVP matrices
var projectionMatrix, 
	viewMatrix,
	worldMatrix;

// Game element structures
var	rings = [],
	asteroids = [],
	quads = [],
	lasers = [];

// Parameters for camera
var cx,
	cy,
	cz,
	elevation,
	angle;

// Parameters for the ship
var shipElevation,
	shipAngle,
	shipSpeed;

// Game global variables
var start,
	dead,
	startTime,
	deathTime;

// For debugging purposes
var totFrames;

async function main(){
	parentDiv = document.getElementById("my-div");
	get2DCanvas();
	getAudio();
	getCanvas();
	getContext();
	await getProgram();

	if(gl){
		getAttributeLocations();
		getUniformLocations();
		loadTextures();
		await loadObjects();
		createAndLinkAttributes();
		doResize();
		gl.enable(gl.BLEND);									// Enable transparency
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		reset();
		setShaderConstants();
		drawScene();
	}else{
		alert("Error: WebGL not supported by your browser!");
	}
}

function loadTextures() {
	LoadEnvironment("lightblue");				// 0
	loadSimpleObjectTextures("spaceship");		// 1-3
	loadObjectTextures("ring");					// 4-8
	loadObjectTextures("asteroid");				// 9-13
	LoadTexture("explosion.png");				// 14
	LoadTexture("laser.png");					// 15
}

function loadSimpleObjectTextures(obj) {
	LoadTexture(obj + "/albedo.png");
	LoadTexture(obj + "/metallic.png");
	LoadTexture(obj + "/roughness.png");
}

function loadObjectTextures(obj) {
	LoadTexture(obj + "/albedo.png");
	LoadTexture(obj + "/normal.png");
	LoadTexture(obj + "/metallic.png");
	LoadTexture(obj + "/roughness.png");
	LoadTexture(obj + "/ao.png");
}

async function loadObjects() {
	await loadObject("obj/square.obj");
	await loadObject("obj/cockpit.obj");
	await loadObject("obj/ring.obj");
	await loadObject("obj/laser.obj");
	await loadObject("obj/asteroid.obj");
	await loadObject("obj/rock2.obj");
	await loadObject("obj/rock3.obj");
	await loadObject("obj/rock4.obj");
	await loadObject("obj/quad.obj");
}

async function getProgram() {
	program = gl.createProgram();
	var vs = await getString("shaders/vertexShader.glsl");
	var fs = await getString("shaders/fragmentShader.glsl");
	cvs = compileVertexShader(vs);
	cfs = compileFragmentShader(fs);
	gl.attachShader(program, cvs);
	gl.attachShader(program, cfs);
	gl.linkProgram(program);				
	gl.useProgram(program);
}

function setShaderConstants() {
	gl.uniform3fv(program.spotLightColorUniform, [0.7, 0.7, 0.5]);
	gl.uniform1f(program.coneOutUniform, 15.0);
	gl.uniform1f(program.coneInUniform, 0.9);
	gl.uniform1f(program.targetUniform, 40.0);
	gl.uniform1f(program.decayUniform, 2);
	gl.uniform3fv(program.directionalLightColorUniform, [0.7, 0.7, 0.7]);
}

var mesh;
var samplers;

function drawScene() {
	samplers = 1;
	mesh = 0;
	totFrames++;

	write();
	animate();
	collisionDetection();

	cx = cx + Math.sin(utils.degToRad((angle + shipAngle)/2));
	cy = cy + Math.sin(utils.degToRad((elevation + shipElevation)/2));

	viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);
	projectionMatrix = utils.MakePerspective(65 + shipSpeed, canvas.width / canvas.height, 0.1, 200.0);
	
	gl.uniform3fv(program.eyePosUniform, [cx, cy, cz]);
	gl.uniform1f(program.animationUniform, 0.0);

	setLights();

	gl.disable(gl.DEPTH_TEST);
	drawSkybox();
	gl.enable(gl.DEPTH_TEST);

	drawShip();
	drawRings();
	drawLasers();
	drawAsteroids();
	drawQuads();

	window.requestAnimationFrame(drawScene);		
}

function setMatrices() {
	var viewWorldMatrix = utils.multiplyMatrices(viewMatrix, worldMatrix);
	var normalMatrix = utils.invertMatrix(utils.transposeMatrix(viewWorldMatrix));
	var wvpMatrix = utils.multiplyMatrices(projectionMatrix, viewWorldMatrix);

	gl.uniformMatrix4fv(program.nMatrixUniform, gl.FALSE, utils.transposeMatrix(normalMatrix));
	gl.uniformMatrix4fv(program.pMatrixUniform, gl.FALSE, utils.transposeMatrix(viewWorldMatrix));
	gl.uniformMatrix4fv(program.wvpMatrixUniform, gl.FALSE, utils.transposeMatrix(wvpMatrix));
}

var lightDirMatrix;

function setLights() {
	lightDirMatrix = utils.invertMatrix(utils.transposeMatrix(viewMatrix));

	setSpotlight();
	setDirectionalLight();
}

function setSpotlight() {
	var spotLightDir = [0.0, 0.0, 1.0, 0.0];
	var spotLightPos = [cx, cy, cz - 2, 1.0];

	var rot = utils.multiplyMatrices(utils.MakeRotateYMatrix(shipAngle), utils.MakeRotateXMatrix(shipElevation));
	spotLightDir = utils.multiplyMatrixVector(rot, spotLightDir);

	var spotLightTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(lightDirMatrix), spotLightDir);
    var spotLightPosTransformed = utils.multiplyMatrixVector(viewMatrix, spotLightPos).splice(0,3);

	gl.uniform3fv(program.spotLightDirUniform, spotLightTransformed);
	gl.uniform3fv(program.spotLightPosUniform, spotLightPosTransformed);
}

function setDirectionalLight() {
	var directionalLightDir = [0.0, -1.0, 0.0];

    var dirLightTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(lightDirMatrix), directionalLightDir);

	gl.uniform3fv(program.directionalLightDirUniform, dirLightTransformed);
}

function drawSkybox() {
	gl.uniform4fv(program.effectsUniform, [1,0,0,0]);
	gl.uniform1i(program.cubemap, 0);

	worldMatrix = utils.MakeWorld(cx, cy, cz, 0, 0, 0, 1);
	setMatrices();
		
	drawMesh(mesh);
	mesh++;
}

function drawShip() {
	gl.uniform4fv(program.effectsUniform, [0,1,0,0]);
	setSimpleObjectSamplers();

	worldMatrix = utils.MakeWorld(cx, cy, cz, shipElevation, shipAngle, 0.0, 1.0);
	setMatrices();

	drawMesh(mesh);
	mesh++;
}

function drawRings() {
	gl.uniform4fv(program.effectsUniform, [0,1,1,1]);
	setObjectSamplers();

	for(i = 0; i < rings.length; i++) {
		if (rings[i].active) {
			worldMatrix = utils.MakeWorld(rings[i].x, rings[i].y, rings[i].z, 0.0, 0.0, 0.0, 1.0);
			setMatrices();

			drawMesh(mesh);
		}
		else {
			rings.splice(i, 1);
			i--;
		}
	}

	mesh++;
}

const asteroidMeshNum = 4;

function drawAsteroids() {
	gl.uniform4fv(program.effectsUniform, [0,1,0,1]);
	setObjectSamplers();

	for(i = 0; i < asteroids.length; i++) {
		if (asteroids[i].active) {
			gl.uniform1f(program.fadeInUniform, asteroids[i].fadeInTime);

			worldMatrix = utils.multiplyMatrices(asteroids[i].getRotationMatrix(), utils.MakeScaleMatrix(asteroids[i].size));
			worldMatrix = utils.multiplyMatrices(utils.MakeTranslateMatrix(asteroids[i].x, asteroids[i].y, asteroids[i].z), worldMatrix);
			setMatrices();

			drawMesh(mesh + asteroids[i].type);
		}
		else {
			asteroids.splice(i, 1);
			i--;
		}
	}

	mesh += asteroidMeshNum;

	gl.uniform1f(program.fadeInUniform, 1.0);
}

function drawQuads() {
	gl.uniform1f(program.animationUniform, 1.0);
	gl.uniform1i(program.albedoSamplerUniform, 14);
	for(i = 0; i < quads.length; i++) {
		if(quads[i].active) {
			var mat = explosion(quads[i].explosionAnimTime);
			gl.uniformMatrix4fv(program.animMatUniform, gl.FALSE, mat);
	
			worldMatrix = utils.multiplyMatrices(utils.MakeTranslateMatrix(quads[i].x, quads[i].y, quads[i].z), utils.MakeScaleMatrix(quads[i].size));
			setMatrices();
	
			drawMesh(mesh);
		}
		else {
			quads.splice(i, 1);
			i--;
		}
	}
	gl.uniform1f(program.animationUniform, 0.0);
}

function drawLasers() {
	gl.uniform4fv(program.effectsUniform, [0,0,1,0]);
	gl.uniform1i(program.albedoSamplerUniform, 15);

	for(i = 0; i < lasers.length; i++) {
		if (lasers[i].active) {
			worldMatrix = utils.MakeWorld(lasers[i].pos[0], lasers[i].pos[1] - 1, lasers[i].pos[2], lasers[i].lElevation, lasers[i].lAngle, 0, 1);
			setMatrices();

			drawMesh(mesh);
		}
		else lasers.pop(i);
	}
	mesh++;
}

function setObjectSamplers() {
	gl.uniform1i(program.albedoSamplerUniform, samplers + 0);
	gl.uniform1i(program.normalSamplerUniform, samplers + 1);
	gl.uniform1i(program.metalSamplerUniform, samplers + 2);
	gl.uniform1i(program.roughSamplerUniform, samplers + 3);
	gl.uniform1i(program.AOSamplerUniform, samplers + 4);

	samplers += 5;
}

function setSimpleObjectSamplers() {
	gl.uniform1i(program.albedoSamplerUniform, samplers + 0);
	gl.uniform1i(program.metalSamplerUniform, samplers + 1);
	gl.uniform1i(program.roughSamplerUniform, samplers + 2);

	samplers += 3;
}

function drawMesh(mesh) {
	gl.drawElements(gl.TRIANGLES, startIndex[mesh+1] - startIndex[mesh],
		gl.UNSIGNED_SHORT, startIndex[mesh]*2);
}

var locked = false;
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
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this);		

	gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
}

// Load a texture set
var totTextures = 1;
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
	gl.activeTexture(gl.TEXTURE0+0);
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
			gl.activeTexture(gl.TEXTURE0+0);
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


const fps = 30;
const maxSpawnDistance = -200.0;
const despawnDistance = 30;
const maxAsteroidCount = 20;
const ringSpawnCooldown = 1000.0 * 4.5;
const asteroidSpawnCooldown = 1000.0 * 1;
const maxFuel = 4.0;

var speed = 0.4;
var lastRingSpawn = 0;
var lastAsteroidSpawn = 0;
var	lastUpdateTime = 0.0;
var fuel;

function animate(){
	var currentTime = getCurrentTime();
	
	if(lastUpdateTime){
		var delta = (currentTime - lastUpdateTime)/1000;
		var deltaC = fps * delta;
		var i;
		
		if(shipSpeed > 1) {
			shipSpeed = shipSpeed - 0.06*deltaC;
		}
		
		updateDirection(deltaC);
		updateShipDirection();

		if(dead) {
			deathAnimation();
		}
		
		if(fuel > 0 && start) {
			fuel = fuel - delta * 0.15;
			if(fuel < 0)
				dead = true;
			energyRefill(deltaC);
			boostShip(deltaC);
		}

		
		for (i = 0; i < rings.length; i++) {
			rings[i].update(deltaC);
		}
		spawnRing();

		for (i = 0; i < asteroids.length; i++) {
			asteroids[i].update(deltaC);
		}
		spawnAsteroid();
		
		for (i = 0; i < quads.length; i++) {
			quads[i].update(deltaC);
		}

		updateLasers(deltaC);
	}
	
	if(dead) {
		if(!deathTime) 
			deathTime = currentTime;
		else if(currentTime - deathTime > resetTime * 1000)
			reset();
	}
	
	lastUpdateTime = currentTime;       
}

function updateLasers(delta) {
	for (let index = 0; index < lasers.length; index++) {
		lasers[index].update(delta);
	}
}

var lastExpTime;
var lastExpMat;
function explosion(t) {
	var dt = 19 - Math.floor((t / 3.0) * 20);

	if(dt != lastExpTime) {
		var r = 4 - Math.floor(dt / 5);
		var c = dt % 5;
		var translate = utils.MakeTranslateMatrix(c/5,r/5,0.0);
		var scale = utils.MakeScaleMatrix(1/5);
		var out = utils.multiplyMatrices(translate, scale);
		out = utils.transposeMatrix(out);
		lastExpMat = out;
		lastExpTime = dt;
	}
	else out = lastExpMat;
	return out;
}

const maxEnergy = 1000;
const energyRefillFactor = 1;
const cost = 500;
var energy;

function energyRefill(delta) {
	newEnergy = energy + delta * energyRefillFactor;
	energy = newEnergy < maxEnergy ? newEnergy : maxEnergy; 
}

const energyDepletionFactor = 4;
const boostFactor = 2.5;
var boost;

function boostShip(delta) {
	if(boost) {
		newEnergy = energy - delta * energyDepletionFactor;
		if(newEnergy >= 0) {
			shipSpeed = boostFactor;
			energy = newEnergy;
		}
		else {
			energy = 0;
			boost = false;
		}
	}

}

function spawnRing() {
	var currentTime = getCurrentTime();
	if(!lastRingSpawn || (currentTime - lastRingSpawn >= ringSpawnCooldown)) {
		lastRingSpawn = currentTime;
		var rx = cx + (Math.random() - 0.5) * 20;
		var ry = cy + (Math.random() - 0.5) * 20;

		rings.push(new Ring(rx, ry, true));
	}
}

var rotationSpeed = 1;
function spawnAsteroid() {
	var currentTime = getCurrentTime();
	if((!lastAsteroidSpawn || (currentTime - lastAsteroidSpawn >= asteroidSpawnCooldown)) && asteroids.length < maxAsteroidCount) {
		lastAsteroidSpawn = currentTime;
		var ax = cx + (Math.random() - 0.5) * 100;
		var ay = cy + (Math.random() - 0.5) * 100;
		var sx = (Math.random() - 0.1) * speed * 0.4 * (cx - ax) * 0.02;
		var sy = (Math.random() - 0.1) * speed * 0.4 * (cy - ay) * 0.02;
		var s = (Math.random() * 0.7) + 0.2;
		var rx = (Math.random() - 0.5) * rotationSpeed;
		var ry = (Math.random() - 0.5) * rotationSpeed;
		var rz = (Math.random() - 0.5) * rotationSpeed;
		var type = Math.floor(Math.random()*asteroidMeshNum);

		asteroids.push(new Asteroid(ax, ay, maxSpawnDistance, sx, sy, s, rx, ry, rz, type, 0.0, true));
	}
}

function spawnLaser() {
	if(energy >= cost) {
		lasers.push(new Laser([cx,cy,cz], angle, elevation, true));
		energy = energy - cost;
	}
}

function getAttributeLocations() {
	program.vertexPositionAttribute = gl.getAttribLocation(program, "in_pos");
	program.vertexNormalAttribute = gl.getAttribLocation(program, "in_norm");
	program.vertexUVAttribute = gl.getAttribLocation(program, "in_uv");
}

function getUniformLocations() {
	program.effectsUniform = gl.getUniformLocation(program, "effects");
	program.wvpMatrixUniform = gl.getUniformLocation(program, "wvpMatrix");
	program.pMatrixUniform = gl.getUniformLocation(program, "pMatrix");
	program.nMatrixUniform = gl.getUniformLocation(program, "nMatrix");
	program.directionalLightDirUniform = gl.getUniformLocation(program, "directionalLightDirection");
	program.directionalLightColorUniform = gl.getUniformLocation(program, "directionalLightColor");
	program.spotLightDirUniform = gl.getUniformLocation(program, "spotLightDirection");
	program.spotLightColorUniform = gl.getUniformLocation(program, "spotLightColor");
	program.spotLightPosUniform = gl.getUniformLocation(program, "spotLightPosition");
	program.coneInUniform = gl.getUniformLocation(program, "coneIn");
	program.coneOutUniform = gl.getUniformLocation(program, "coneOut");
	program.targetUniform = gl.getUniformLocation(program, "target");
	program.decayUniform = gl.getUniformLocation(program, "decay");
	program.cubemap = gl.getUniformLocation(program, "cubemap");
	program.albedoSamplerUniform = gl.getUniformLocation(program, "albedoSampler");
	program.normalSamplerUniform = gl.getUniformLocation(program, "normalSampler");
	program.metalSamplerUniform = gl.getUniformLocation(program, "metalSampler");
	program.roughSamplerUniform = gl.getUniformLocation(program, "roughSampler");
	program.AOSamplerUniform = gl.getUniformLocation(program, "AOSampler");
	program.metalnessUniform = gl.getUniformLocation(program, "metalness");
	program.roughnessUniform = gl.getUniformLocation(program, "roughness");
	program.eyePosUniform = gl.getUniformLocation(program, "eyePos");
	program.fadeInUniform = gl.getUniformLocation(program, "fadeIn");
	program.animationUniform = gl.getUniformLocation(program, "animation");
	program.animMatUniform = gl.getUniformLocation(program, "animMat");
	
}


function createAndLinkAttributes() {
	var vertexBuffer = gl.createBuffer();
	vertices = new Float32Array(vertices);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(program.vertexPositionAttribute);
	gl.vertexAttribPointer(program.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
	
	var normalBuffer = gl.createBuffer();
	normals = new Float32Array(normals);
	gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(program.vertexNormalAttribute);
	gl.vertexAttribPointer(program.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

	var UVBuffer = gl.createBuffer();
	uvs = new Float32Array(uvs);
	gl.bindBuffer(gl.ARRAY_BUFFER, UVBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
	gl.enableVertexAttribArray(program.vertexUVAttribute);
	gl.vertexAttribPointer(program.vertexUVAttribute, 2, gl.FLOAT, false, 0, 0);
	
	var indexBuffer = gl.createBuffer();
	indices = new Uint16Array(indices);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
}

var collectedRings;
const ringDetectionInterval = [-1.5, 0.0];
const asteroidDetectionInterval = [-5, 0];
const innerRadius = 1.0;
const baseAsteroidSize = 3;

function collisionDetection() {
	checkRingCollision();
	checkAsteroidCollision();
}

function checkRingCollision() {
	for (i = 0; i < rings.length; i++) {
		if (rings[i].z > ringDetectionInterval[0] && rings[i].z < ringDetectionInterval[1] && 
													distanceFromShip(rings[i].x, rings[i].y) < innerRadius && rings[i].active) {
			
			rings[i].active = false;
			collectedRings++;
			console.log("Yayks, you got " + collectedRings + " rings!!1!");
			ringSound.play();
			shipSpeed = shipSpeed + 2;
			fuel = Math.min(fuel + 1.0, maxFuel);
		}
	}
}


function checkAsteroidCollision() {
	for (i = 0; i < asteroids.length; i++) {
		var size = baseAsteroidSize;
		size += 4 * (asteroids[i].size - 0.2) / 0.7;

		if (asteroids[i].z > asteroidDetectionInterval[0] && asteroids[i].z < asteroidDetectionInterval[1] && 
													distanceFromShip(asteroids[i].x, asteroids[i].y) < size && asteroids[i].active
													&& !dead) {
			
			
			console.log("Ouch, that hurt!!!\nNext time remember to stay more than " + distanceFromShip(asteroids[i].x, asteroids[i].y)
													+ " away from an asteroid of size " + size);
			dead = true;
			deathSound.play();
			asteroids[i].active = false;
		}

		for(var j = 0; j < lasers.length; j++) {
			var dx = asteroids[i].x - lasers[j].pos[0];
			var dy = asteroids[i].y - lasers[j].pos[1];
			var dz = asteroids[i].z - lasers[j].pos[2];
			if(Math.abs(dx) < size && Math.abs(dy) < size && Math.abs(dz) < size) {
				quads.push(new Quad(asteroids[i].x, asteroids[i].y, asteroids[i].z, asteroids[i].size));
				var sx = Math.abs(asteroids[i].xSpeed) >= 0.02 ? asteroids[i].xSpeed * 7 : 0.1;
				var sy = Math.abs(asteroids[i].ySpeed) >= 0.02 ? asteroids[i].ySpeed * 7 : 0.1;
				var s = asteroids[i].size / 2;
				var rx = asteroids[i].xRotation;
				var ry = asteroids[i].yRotation;
				var rz = asteroids[i].zRotation;
				var type = Math.floor(Math.random()*asteroidMeshNum);

				asteroids.push(new Asteroid(asteroids[i].x + 1, asteroids[i].y + 1, asteroids[i].z, sx, sy, s, rx, ry, rz, type, 1.0, true));
				asteroids.push(new Asteroid(asteroids[i].x - 1, asteroids[i].y - 1, asteroids[i].z, -sx, -sy, s, rx, ry, rz, type, 1.0, true));
				asteroids[i].active = false;
				lasers.splice(j, 1);
				j--;
			}
		}
	}
}

function distanceFromShip(x, y) {
	return Math.sqrt(Math.pow((cx - x),2) + Math.pow((cy - y),2));
}

var audioContext;
var themeSong;
var ringSound;
var deathSound;

function getAudio() {
	audioContext = new AudioContext();
	themeSong = document.getElementById("theme");
	var themeTrack = audioContext.createMediaElementSource(themeSong);
	ringSound = document.getElementById("ring");
	var ringTrack = audioContext.createMediaElementSource(ringSound);
	deathSound = document.getElementById("death");
	var deathTrack = audioContext.createMediaElementSource(deathSound);
	themeTrack.connect(audioContext.destination);
	ringTrack.connect(audioContext.destination);
	deathTrack.connect(audioContext.destination);
}

function get2DCanvas() {
	textCanvas = document.querySelector("#text");
	gl2 = textCanvas.getContext("2d");
}

function getCurrentTime() {
	return (new Date).getTime();
}

function getGameTime() {
	return (getCurrentTime() - startTime)/1000;
}

const resetTime = 5;
const loadingTime = 5;
const fadingTime = 10;

function write() {
	gl2.clearRect(0, 0, gl2.canvas.width, gl2.canvas.height); // clean 2d canvas
	gl2.font = '48px sans-serif';
	if(!dead) {
		var gameTime = getGameTime();
		
		if(gameTime < fadingTime) 
			gameIntro(gameTime)
		else 
			renderHUD(gameTime)
	}
	else
		gameOutro();
}


function gameIntro(gameTime) {
	var a;
	var r = 50;
	var g = 50;
	var b = 50;
	console.log(gameTime);
	if(gameTime < loadingTime)
		a = 1;
	else
		a = 1 - (gameTime - (fadingTime - loadingTime))/loadingTime;

	gl2.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
	gl2.fillRect(0, 0, window.innerWidth, window.innerHeight);

	if(gameTime < loadingTime && gameTime > 1) {
		gl2.fillStyle = 'green';
		gl2.fillRect(window.innerWidth/2 - 300, window.innerHeight/2 - 70, 610, 160);

		gl2.fillStyle = 'lightgreen'
		var message = 'TRAVERSE RINGS';
		gl2.fillText(message, window.innerWidth/2 - message.length/2*28, window.innerHeight/2 - 20);

		message = 'AVOID ROCKS';
		gl2.fillText(message, window.innerWidth/2 - message.length/2*28, window.innerHeight/2 + 80);
	}
}

function gameOutro() {
	var r = 50;
	var g = 50;
	var b = 50;
	var a = (getCurrentTime() - deathTime) / (resetTime * 1000);

	gl2.fillStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
	if(deathTime)
		gl2.fillRect(0, 0, window.innerWidth, window.innerHeight);

	gl2.fillStyle = 'green';
	gl2.fillRect(window.innerWidth/2 - 300, window.innerHeight/2 - 70, 610, 160);

	gl2.fillStyle = 'lightgreen';
	var deathMessage = 'GAME OVER';
	gl2.fillText(deathMessage, window.innerWidth/2 - deathMessage.length/2*28, window.innerHeight/2 - 20);

	deathMessage = 'YOU GOT ' + collectedRings + ' RINGS';	
	gl2.fillText(deathMessage, window.innerWidth/2 - deathMessage.length/2*28, window.innerHeight/2 + 80);
}

function renderHUD(gameTime) {
	if(start == false && gameTime > 15)
	start = true;
	
	gl2.fillStyle = 'green';
	gl2.fillRect(0, 0, 210 + collectedRings.toString().length*25, 65);
	
	gl2.fillStyle = 'lightgreen';
	gl2.fillText('RINGS: ' + collectedRings, 10, 50);
	
	const crossDim = 10;
	gl2.fillRect(window.innerWidth/2, window.innerHeight/2 - crossDim/2, 1, crossDim);
	gl2.fillRect(window.innerWidth/2 - crossDim/2, window.innerHeight/2, crossDim, 1)

	drawFuelBar();
	drawEnergyBar();	
}


function drawFuelBar() {
	gl2.fillStyle = 'green';
	gl2.fillRect(window.innerWidth - 300, 0, 300, 65);
	gl2.fillStyle = 'lightgreen';
	gl2.fillRect(window.innerWidth - 290, 10, 280/maxFuel*fuel, 45);
}

function drawEnergyBar() {
	gl2.fillStyle = 'blue';
	gl2.fillRect(window.innerWidth - 300, 65, 300, 65);
	gl2.fillStyle = 'lightblue';
	if(energy >= cost)
		gl2.fillStyle = 'white';
	gl2.fillRect(window.innerWidth - 290, 75, 280/maxEnergy*energy, 45);
}

function reset() {
	if(dead) console.log(totFrames/getGameTime());
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
	shipSpeed = 1.0;
	start = false;
	asteroids = [];
	rings = [];
	lasers = [];
	fuel = maxFuel;
	lastUpdateTime = 0.0;
	totFrames = 0.0;
	energy = 0;
	boost = false;
}

function getContext() {
	try{
		gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("webgl2"));
		//gl= canvas.getContext("webgl2");
	} catch(e){
		console.log(e);
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