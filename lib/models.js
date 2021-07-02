async function loadObject(path) {
	
	var objStr = await get_objstr(path);
	var objModel = new OBJ.Mesh(objStr);
	vert = objModel.vertices; //Array of vertices
	norm = objModel.vertexNormals; //Array of normals
	ind = objModel.indices; //Array of indices
	uv = objModel.textures; //Array of uvcoordinates
	

	//OBJ.initMeshBuffers(gl, objModel)		??
	var color = [0.0, 0.0, 1.0];
	addMesh(vert, norm, uv, ind, color);
}


async function get_objstr(path) {
	var base = window.location.pathname;
	var page = base.split("/").pop();
	var baseDir = window.location.href.replace(page, '');
	var objPath = baseDir + path;
	var objstr = "";
	await utils.loadFiles([objPath], function(objText) {
		objstr = objText[0];
	});
	
	return objstr;
}

var skyBoxDim = 100.0;
async function loadSkyBox() {
	var vert = [[-skyBoxDim,-skyBoxDim,-skyBoxDim], [skyBoxDim,-skyBoxDim,-skyBoxDim],
				  [skyBoxDim,skyBoxDim,-skyBoxDim], [-skyBoxDim,skyBoxDim,-skyBoxDim], [-skyBoxDim,-skyBoxDim,skyBoxDim],
				  [skyBoxDim,-skyBoxDim,skyBoxDim],[skyBoxDim,skyBoxDim,skyBoxDim],[-skyBoxDim,skyBoxDim,skyBoxDim]];
	var norm = [[ 0.0, 0.0,1.0], [0.0, 0.0,1.0], [0.0,0.0,1.0], [ 0.0,0.0,1.0],
				 [ 0.0, 0.0,-1.0],[0.0, 0.0,-1.0],[0.0,0.0,-1.0],[ 0.0,0.0,-1.0]];
	var uv = [[1.0,0.0],[0.0,0.0],[0.0,1.0],[1.0,1.0],[0.0,0.0],[1.0,0.0],[1.0,1.0],[0.0,1.0]];
	var ind = [0, 1, 2,  0, 2, 3,  4, 6, 5,  4, 7, 6];
	
	var color = [0.0, 1.0, 1.0];

	addMesh(vert, norm, uv, ind, color);
}