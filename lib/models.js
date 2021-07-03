async function loadObject(path) {
	
	var objStr = await getString(path);
	var objModel = new OBJ.Mesh(objStr);
	vert = objModel.vertices; //Array of vertices
	norm = objModel.vertexNormals; //Array of normals
	ind = objModel.indices; //Array of indices
	uv = objModel.textures; //Array of uvcoordinates
	

	console.log(vert);
	//OBJ.initMeshBuffers(gl, objModel)		??
	var color = [0.0, 0.0, 1.0];
	addMesh(vert, norm, uv, ind, color);
}


async function getString(path) {
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
    var vert_z = [-skyBoxDim,-skyBoxDim,-skyBoxDim,
         		 skyBoxDim,-skyBoxDim,-skyBoxDim,
                 skyBoxDim,skyBoxDim,-skyBoxDim,
                 -skyBoxDim,skyBoxDim,-skyBoxDim,
        		 -skyBoxDim,-skyBoxDim,skyBoxDim,
                 skyBoxDim,-skyBoxDim,skyBoxDim,
                 skyBoxDim,skyBoxDim,skyBoxDim,
                 -skyBoxDim,skyBoxDim,skyBoxDim];
    var norm_z = [ 0.0,0.0,1.0, 0.0,0.0,1.0, 0.0,0.0,1.0, 0.0,0.0,1.0,
                 0.0, 0.0,-1.0, 0.0, 0.0,-1.0, 0.0,0.0,-1.0, 0.0,0.0,-1.0];
    var uv_z = [1.0,0.0, 0.0,0.0 , 0.0,1.0, 1.0,1.0 ,0.0,0.0, 1.0,0.0, 1.0,1.0, 0.0,1.0];
    var ind = [0, 1, 2,  0, 2, 3,  4, 6, 5,  4, 7, 6];

    vert = [];
    norm = [];
    uv = [];
    for (i = 0; i < ind.length; i++) {
        vert[i * 3] = vert_z[3 * ind[i]];
        vert[i * 3 + 1] = vert_z[3 * ind[i] + 1];
        vert[i * 3 + 2] = vert_z[3 * ind[i] + 2];
        norm[i * 3] = norm_z[3 * ind[i]];
        norm[i * 3 + 1] = norm_z[3 * ind[i] + 1];
        norm[i * 3 + 2] = norm_z[3 * ind[i] + 2];
        uv[i * 3] = uv_z[3 * ind[i]];
        uv[i * 3 + 1] = uv_z[3 * ind[i] + 1];
    }
    
    var color = [0.0, 1.0, 1.0];

    addMesh(vert, norm, uv, ind, color);
}