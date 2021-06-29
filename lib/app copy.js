var canvas;

var gl = null,
	program = null;
	
var projectionMatrix, 
	perspProjectionMatrix,
	viewMatrix,
	worldMatrix;


//Parameters for Camera
var cx = 4.5;
var cy = 0.0;
var cz = 10.0;
var elevation = 0.0;
var angle = 0.0;

var lookRadius = 10.0;

var matnames = ["tex/1/flat-cobble-moss-", "tex/2/redbricks2b-",
				"tex/3/space-crate1-","tex/4/scuffed-metal1-","tex/5/rustediron-streaks-"];
//var matcomp = ["alb.png", "normal-ogl.png", "met_rou_ao.png"];
var matcomp = ["alb.png", "norm_hei.png", "met_rou_ao.png"];


var visTypes = ["Complete", "Albedo"];


		
// Vertex shader
var vs = `#version 300 es
#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
#define UV_LOCATION 2

layout(location = POSITION_LOCATION) in vec3 in_pos;
layout(location = NORMAL_LOCATION) in vec3 in_norm;
layout(location = UV_LOCATION) in vec2 in_uv;

uniform mat4 wvpMatrix;
uniform mat4 wMatrix;

out vec3 fs_pos;
out vec3 fs_norm;
out vec2 fs_uv;

void main() {
	fs_pos = (wMatrix * vec4(in_pos, 1.0)).xyz;
	fs_norm = (wMatrix * vec4(in_norm, 0.0)).xyz;
	fs_uv = in_uv;
	
	gl_Position = wvpMatrix * vec4(in_pos, 1.0);
}`;

// Fragment shader
var fs = `#version 300 es
precision highp float;

in vec3 fs_pos;
in vec3 fs_norm;
in vec2 fs_uv;

uniform vec4 lightDir1;
uniform vec4 lightDir2;
uniform vec4 lightDir3;
uniform vec4 matcol;
uniform vec3 eyePos;

uniform vec4 shown;
uniform vec4 effect;
uniform vec4 texSelect;
uniform vec4 monoSelect;
uniform vec4 repMetRough;

uniform sampler2D u_tex_Albedo;
uniform sampler2D u_tex_NormalMap;
uniform sampler2D u_tex_RMAO;
uniform samplerCube u_tex_Env;

const float ambEmuFact = 0.08;

out vec4 color;

const float heightScale = 0.02;

vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir)
{ 

//    float height =  texture(u_tex_NormalMap, texCoords).w;    
//    vec2 p = viewDir.xy / viewDir.z * (height * heightScale);
//    return texCoords - p;

    // number of depth layers
    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));  
    // calculate the size of each layer
    float layerDepth = 1.0 / numLayers;
    // depth of current layer
    float currentLayerDepth = 0.0;
    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * heightScale; 
    vec2 deltaTexCoords = P / numLayers;
  
    // get initial values
    vec2  currentTexCoords     = texCoords;
    float currentDepthMapValue = texture(u_tex_NormalMap, currentTexCoords).w;
      
    while(currentLayerDepth < currentDepthMapValue)
    {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(u_tex_NormalMap, currentTexCoords).w;  
        // get depth of next layer
        currentLayerDepth += layerDepth;  
    }
    
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;

    // get depth after and before collision for linear interpolation
    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(u_tex_NormalMap, prevTexCoords).w - currentLayerDepth + layerDepth;
 
    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);

    return finalTexCoords;

}


void main() {
	vec3 n_norm = normalize(fs_norm);

	//// online computation of tangent and bitangent

	// compute derivations of the world position
	vec3 p_dx = dFdx(fs_pos);
	vec3 p_dy = dFdy(fs_pos);
	// compute derivations of the texture coordinate
	vec2 tc_dx = dFdx(fs_uv);
	vec2 tc_dy = dFdy(fs_uv);
	// compute initial tangent and bi-tangent
	vec3 t = (tc_dy.y * p_dx - tc_dx.y * p_dy) / (tc_dx.x*tc_dy.y - tc_dy.x*tc_dx.y);

	t = normalize(t - n_norm * dot(n_norm, t));
	vec3 b = normalize(cross(n_norm,t));
	
	mat3 tbn = mat3(t, b, n_norm);



	
	// parallax mapping
	vec3 v = normalize(eyePos - fs_pos);

    vec3 viewDir = transpose(tbn) * v;
    vec2 texCoords = mix(fs_uv, ParallaxMapping(fs_uv,  viewDir), effect.g);       
	
	vec4 nMap = texture(u_tex_NormalMap, texCoords);
	vec3 n = mix(n_norm, normalize(tbn * (nMap.xyz * 2.0 - 1.0)), effect.r);

	vec4 RMAO = texture(u_tex_RMAO, texCoords);
	
	// Diffuse + ambient
	float dimFact = lightDir1.w * max(dot(n, lightDir1.xyz),0.0);
	dimFact += lightDir2.w * max(dot(n, lightDir2.xyz),0.0);
	dimFact += lightDir3.w * max(dot(n, lightDir3.xyz),0.0);
	dimFact *= mix(1.0, RMAO.b, effect.b);
//	dimFact = dimFact * matcol.a + (1.0 - matcol.a);
	
	// Phong specular
	float Rough = mix(RMAO.g, repMetRough.g, matcol.a);
	float rf = 1.0 - Rough;
	rf = 250.0 * rf * rf + 1.0;
	float specFact = lightDir1.w * pow(max(dot(v, -reflect(lightDir1.xyz,n)),0.0), rf);
	specFact += lightDir2.w * pow(max(dot(v, -reflect(lightDir2.xyz,n)),0.0), rf);
	specFact += lightDir3.w * pow(max(dot(v, -reflect(lightDir3.xyz,n)),0.0), rf);
	
	vec4 albedo = vec4(mix(texture(u_tex_Albedo, texCoords).rgb, matcol.rgb, matcol.a), 1.0);
	vec4 texout = albedo;
	texout = mix(texout, vec4(nMap.rgb, 1.0), texSelect.g);
	vec4 mono = vec4(vec3(dot(vec4(RMAO.rgb, nMap.a), monoSelect)), 1.0);
	texout = mix(texout, mono, texSelect.b);
	
	float Metal = mix(RMAO.r, repMetRough.r, matcol.a);
	vec4 diffColor = albedo * 0.96 * (1.0 - Metal);
	diffColor = mix(diffColor, vec4(1.0), ambEmuFact);
	vec4 specColor = 1.0 + 0.96 * Metal * (albedo - 1.0);
	specColor = mix(specColor, vec4(1.0), ambEmuFact);
	
	vec3 refDir = -reflect(v,n);
    float mipCount = 9.0; // resolution of 512x512
    float lod = (Rough * mipCount);
	vec4 specFactFromEnvMap = textureLod(u_tex_Env, refDir, lod);
	
	vec4 selSpecFact = mix(specFactFromEnvMap * mix(0.4, 1.0, Metal), vec4(specFact), repMetRough.b);
	vec4 selDimFact = mix(textureLod(u_tex_Env, n, 8.0), vec4(dimFact), repMetRough.b);
	
//	color = mix(specFactFromEnvMap, texture(u_tex_Env, -v) ,repMetRough.a);
//	color = mix(specFactFromEnvMap, vec4(0.5,0.5,0.5,1.0) ,repMetRough.a);
	color = mix(specFactFromEnvMap, mix(texture(u_tex_Env, -v), vec4(0.5,0.5,0.5,1.0), repMetRough.b) ,repMetRough.a);
	
	color = mix(color, vec4((diffColor * selDimFact + specColor * selSpecFact).rgb, 1.0), shown.r);
	color = mix(color, texout, shown.g);
	color = mix(color, vec4(0.5+0.5*n, 1.0), shown.b);
	color = mix(color, vec4(0.5+0.5*(10.0*texCoords-9.0*fs_uv), 0.0, 1.0), shown.a);
}`;

// event handler

var mouseState = false;
var lastMouseX = -100, lastMouseY = -100;
function doMouseDown(event) {
	lastMouseX = event.pageX;
	lastMouseY = event.pageY;
	mouseState = true;
}
function doMouseUp(event) {
	lastMouseX = -100;
	lastMouseY = -100;
	mouseState = false;
}
function doMouseMove(event) {
	if(mouseState) {
		var dx = event.pageX - lastMouseX;
		var dy = lastMouseY - event.pageY;
		lastMouseX = event.pageX;
		lastMouseY = event.pageY;
		
		if((dx != 0) || (dy != 0)) {
			angle = angle + 0.5 * dx;
			elevation = elevation + 0.5 * dy;
		}
	}
}
function doMouseWheel(event) {
	var nLookRadius = lookRadius + event.wheelDelta/200.0;
	if((nLookRadius > 2.0) && (nLookRadius < 100.0)) {
		lookRadius = nLookRadius;
	}
}
function doResize() {
    // set canvas dimensions
	var canvas = document.getElementById("my-canvas");
    if((window.innerWidth > 40) && (window.innerHeight > 240)) {
		canvas.width  = window.innerWidth-16;
		canvas.height = window.innerHeight-200;
		gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    }
}

var wireframeMode = 0;
var keyFunction =function(e) {
//	if (e.keyCode == 32) {	// Space
//		wireframeMode = (wireframeMode + 1) % visTypes.length;
//	}
//	output.innerHTML = visTypes[wireframeMode];
}
window.addEventListener("keyup", keyFunction, false);

var shownUnifVals;
var effectUnifVals;
var texSelectUnifVals;
var monoSelectUnifVals;
var repColor = [1,1,1,0];
var repMetRough = [0.5, 0.5, 0.0, 0.0];

function setEffectSelector() {
	document.getElementById("shown").value = "R";
	effectUnifVals = [1,1,1,0];
	document.getElementById("NormMap").checked = true;
	document.getElementById("ParMap").checked = true;
	document.getElementById("AmbOcc").checked = true;
	document.getElementById("TxSel").value = "0";
	setTxSelType("0");
	setShownType("R");
}

function setEffectUnifVal(e, v) {
	effectUnifVals[e] = v ? 1 : 0;
}

function setShownType(type) {
	switch(type) {
		case "R":
			document.getElementById("TxSelBl").style.display = "none";
			document.getElementById("NMBl").style.display = "inline";
			document.getElementById("PMBl").style.display = "inline";
			document.getElementById("AOBl").style.display = "inline";
			document.getElementById("RebAlbBox").style.display = "inline";
			shownUnifVals = [1,0,0,0];
			break;
		case "T":
			document.getElementById("TxSelBl").style.display = "inline";
			document.getElementById("NMBl").style.display = "none";
			document.getElementById("PMBl").style.display = "inline";
			document.getElementById("AOBl").style.display = "none";
			document.getElementById("RebAlbBox").style.display = "none";
			shownUnifVals = [0,1,0,0];
			break;
		case "N":
			document.getElementById("TxSelBl").style.display = "none";
			document.getElementById("NMBl").style.display = "inline";
			document.getElementById("PMBl").style.display = "inline";
			document.getElementById("AOBl").style.display = "none";
			document.getElementById("RebAlbBox").style.display = "none";
			shownUnifVals = [0,0,1,0];
			break;
		case "U":
			document.getElementById("TxSelBl").style.display = "none";
			document.getElementById("NMBl").style.display = "none";
			document.getElementById("PMBl").style.display = "inline";
			document.getElementById("AOBl").style.display = "none";
			document.getElementById("RebAlbBox").style.display = "none";
			shownUnifVals = [0,0,0,1];
			break;
		case "E":
			document.getElementById("TxSelBl").style.display = "none";
			document.getElementById("NMBl").style.display = "inline";
			document.getElementById("PMBl").style.display = "inline";
			document.getElementById("AOBl").style.display = "none";
			document.getElementById("RebAlbBox").style.display = "inline";
			shownUnifVals = [0,0,0,0];
			break;
	}
}

function setTxSelType(type) {
	switch(type) {
		case "0":
			texSelectUnifVals = [1,0,0,0];
			monoSelectUnifVals = [0,0,0,0];
			break;
		case "1":
			texSelectUnifVals = [0,1,0,0];
			monoSelectUnifVals = [0,0,0,0];
			break;
		case "2":
			texSelectUnifVals = [0,0,1,0];
			monoSelectUnifVals = [0,0,0,1];
			break;
		case "3":
			texSelectUnifVals = [0,0,1,0];
			monoSelectUnifVals = [0,0,1,0];
			break;
		case "4":
			texSelectUnifVals = [0,0,1,0];
			monoSelectUnifVals = [1,0,0,0];
			break;
		case "5":
			texSelectUnifVals = [0,0,1,0];
			monoSelectUnifVals = [0,1,0,0];
			break;
	}
}	

function ReplaceAlbedo(val) {
	if(val) {
		document.getElementById("showAMR").style.display = "inline";
		repColor[3] = 1;
	} else {
		document.getElementById("showAMR").style.display = "none";
		repColor[3] = 0;
	}
}

function setNewAlbedo(gl) {
	col = gl.substring(1,7);
    repColor[0] = parseInt(col.substring(0,2) ,16) / 255;
    repColor[1] = parseInt(col.substring(2,4) ,16) / 255;
    repColor[2] = parseInt(col.substring(4,6) ,16) / 255;
}

function updateRepMetRough(e, v) {
	repMetRough[e] = v;
}

function setEnvSelType(v) {
	if(v < 0) {
		repMetRough[2] = 1;
	} else {
		LoadEnvironment(v)
		repMetRough[2] = 0;
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
//console.log(i_vertices);
	for(i = 0; i < i_vertices.length; i++) {
		vertices[(i + startVertex[totMesh]) * 3 + 0 ] = i_vertices[i][0];
		vertices[(i + startVertex[totMesh]) * 3 + 1 ] = i_vertices[i][1];
		vertices[(i + startVertex[totMesh]) * 3 + 2 ] = i_vertices[i][2];
		normals[ (i + startVertex[totMesh]) * 3 + 0 ] = i_norm[i][0];
		normals[ (i + startVertex[totMesh]) * 3 + 1 ] = i_norm[i][1];
		normals[ (i + startVertex[totMesh]) * 3 + 2 ] = i_norm[i][2];
		uvs[ (i + startVertex[totMesh]) * 2 + 0 ] = i_uv[i][0];
		uvs[ (i + startVertex[totMesh]) * 2 + 1 ] = i_uv[i][1];
	}
	for(i = 0; i < i_indices.length; i++) {
		indices[i + startIndex[totMesh]] = startVertex[totMesh] + i_indices[i];
	}
	colors[totMesh] = i_color;

	totMesh ++;	
	
	startVertex[totMesh] = startVertex[totMesh-1] + i_vertices.length;
	startIndex[totMesh] = startIndex[totMesh-1] + i_indices.length;	
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


// load the environment map
function LoadEnvironment(id) {
	// Create a texture.
	var texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + 3);
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
		gl.activeTexture(gl.TEXTURE0 + 3);
	    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
	    gl.texImage2D(target, level, internalFormat, format, type, image);
	    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	  });
	});
	gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}

// The real app starts here
function main(){

	// setup everything else
	var canvas = document.getElementById("my-canvas");
	canvas.addEventListener("mousedown", doMouseDown, false);
	canvas.addEventListener("mouseup", doMouseUp, false);
	canvas.addEventListener("mousemove", doMouseMove, false);
	canvas.addEventListener("mousewheel", doMouseWheel, false);
	window.onresize = doResize;
	canvas.width  = window.innerWidth-16;
	canvas.height = window.innerHeight-180;

	try{
		gl= canvas.getContext("webgl2");
	} catch(e){
		console.log(e);
	}
	
	if(gl){
		// Compile and link shaders
		program = gl.createProgram();
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
		gl.linkProgram(program);				
		
		gl.useProgram(program);
				
		/// load textures
		LoadTexture(0);
		LoadEnvironment(1);

		buildGeometry();
		totMesh--;
		setEffectSelector();
		
		document.getElementById("myRange").max = totMesh;
//console.log(totMesh);
//console.log(startVertex);
//console.log(startIndex);
//console.log(vertices);
//console.log(indices);
//console.log(colors);
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

		UVBuffer = gl.createBuffer();
		uvs = new Float32Array(uvs);
		gl.bindBuffer(gl.ARRAY_BUFFER, UVBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, uvs.byteLength, gl.STATIC_DRAW);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, uvs);

		indexBuffer = gl.createBuffer();
		indices = new Uint16Array(indices);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
//console.log(indices.byteLength);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices.byteLength, gl.STATIC_DRAW);
		gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, indices);	
//		
//		mesh = new OBJ.Mesh(objStr);
//		OBJ.initMeshBuffers(gl, mesh);
		
		// links mesh attributes to shader attributes
		program.vertexPositionAttribute = gl.getAttribLocation(program, "in_pos");
		gl.enableVertexAttribArray(program.vertexPositionAttribute);

		program.vertexNormalAttribute = gl.getAttribLocation(program, "in_norm");
		gl.enableVertexAttribArray(program.vertexNormalAttribute);
		 
		program.vertexUVAttribute = gl.getAttribLocation(program, "in_uv");
		gl.enableVertexAttribArray(program.vertexUVAttribute);
		 
		program.WVPmatrixUniform = gl.getUniformLocation(program, "wvpMatrix");
		program.WmatrixUniform = gl.getUniformLocation(program, "wMatrix");
		program.eyePosUniform = gl.getUniformLocation(program, "eyePos");
		program.lightDir1 = gl.getUniformLocation(program, "lightDir1");
		program.lightDir2 = gl.getUniformLocation(program, "lightDir2");
		program.lightDir3 = gl.getUniformLocation(program, "lightDir3");
		program.matcol = gl.getUniformLocation(program, "matcol");
		program.shown = gl.getUniformLocation(program, "shown");
		program.effect = gl.getUniformLocation(program, "effect");
		program.texSelect = gl.getUniformLocation(program, "texSelect");
		program.monoSelect = gl.getUniformLocation(program, "monoSelect");
		program.repMetRough = gl.getUniformLocation(program, "repMetRough");
		program.textureAlbedo = gl.getUniformLocation(program, "u_tex_Albedo");
		program.textureNormalMap = gl.getUniformLocation(program, "u_tex_NormalMap");
		program.textureRMAO = gl.getUniformLocation(program, "u_tex_RMAO");
		program.textureEnv = gl.getUniformLocation(program, "u_tex_Env");
		
		// prepares the world, view and projection matrices.
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

		gLightDir1 = [ 0.0, 0.70711, 0.707106, 1.0];
		gLightDir2 = [0.73855, 0.60302, -0.30151, 0.7];
		gLightDir3 = [-0.73855, -0.60302, -0.30151, 0.5];

		drawScene();
	}else{
		alert("Error: WebGL not supported by your browser!");
	}
}

function drawScene() {
		// update perspective matrix
	var canvas = document.getElementById("my-canvas");
	var slider = document.getElementById("myRange").value - 1;
	var rang = document.getElementById("rot").value;
	
	perspProjectionMatrix = utils.MakePerspective(65, canvas.width / canvas.height, 0.1, 180.0)

	// update WV matrix
	cz = lookRadius * Math.cos(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	cx = lookRadius * Math.sin(utils.degToRad(-angle)) * Math.cos(utils.degToRad(-elevation));
	cy = lookRadius * Math.sin(utils.degToRad(-elevation));
	viewMatrix = utils.MakeView(cx, cy, cz, elevation, -angle);
	projectionMatrix = utils.multiplyMatrices(perspProjectionMatrix, viewMatrix);
	var worldMatrix;
	if((rang < 0) || (rang > 360)) {
		worldMatrix = utils.MakeRotateXMatrix(rang);
	} else {
		worldMatrix = utils.MakeRotateYMatrix(rang);
	}
	projectionMatrix = utils.multiplyMatrices(projectionMatrix, worldMatrix);
//	gl.uniform1i(program.textureUniform, 0);

	// draws the request
	gl.uniformMatrix4fv(program.WVPmatrixUniform, gl.FALSE, utils.transposeMatrix(projectionMatrix));
	gl.uniformMatrix4fv(program.WmatrixUniform, gl.FALSE, utils.transposeMatrix(worldMatrix));
	gl.uniform3f(program.eyePosUniform, cx, cy, cz);
	gl.uniform4f(program.lightDir1, gLightDir1[0], gLightDir1[1], gLightDir1[2], gLightDir1[3]);
	gl.uniform4f(program.lightDir2, gLightDir2[0], gLightDir2[1], gLightDir2[2], gLightDir2[3]);
	gl.uniform4f(program.lightDir3, gLightDir3[0], gLightDir3[1], gLightDir3[2], gLightDir3[3]);

	gl.uniform1i(program.textureAlbedo, 0);
	gl.uniform1i(program.textureNormalMap, 1);
	gl.uniform1i(program.textureRMAO, 2);
	gl.uniform1i(program.textureEnv, 3);

	gl.enable(gl.CULL_FACE);
	gl.uniform4f(program.matcol, repColor[0], repColor[1], repColor[2], repColor[3]);
	gl.uniform4f(program.shown, shownUnifVals[0], shownUnifVals[1], shownUnifVals[2], shownUnifVals[3]);
	gl.uniform4f(program.effect, effectUnifVals[0], effectUnifVals[1], effectUnifVals[2], effectUnifVals[3]);
	gl.uniform4f(program.texSelect, texSelectUnifVals[0], texSelectUnifVals[1], texSelectUnifVals[2], texSelectUnifVals[3]);
	gl.uniform4f(program.monoSelect, monoSelectUnifVals[0], monoSelectUnifVals[1], monoSelectUnifVals[2], monoSelectUnifVals[3]);
	gl.uniform4f(program.repMetRough, repMetRough[0], repMetRough[1], repMetRough[2], repMetRough[3]);
	gl.drawElements(gl.TRIANGLES, startIndex[slider+1] - startIndex[slider],
				    gl.UNSIGNED_SHORT, startIndex[slider] * 2);


	gl.uniform4f(program.shown, 0, 0, 0, 0);
	gl.uniform4f(program.repMetRough, 0, 0, repMetRough[2], 1);
	gl.drawElements(gl.TRIANGLES, startIndex[totMesh+1] - startIndex[totMesh],
				    gl.UNSIGNED_SHORT, startIndex[totMesh] * 2);

	window.requestAnimationFrame(drawScene);		
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