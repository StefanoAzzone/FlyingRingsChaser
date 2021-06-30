async function buildGeometry() {

	var objStr = await get_objstr("obj/X-WING.obj");
	var objModel = new OBJ.Mesh(objStr);
	vert = objModel.vertices; //Array of vertices
	norm = objModel.normals; //Array of normals
	ind = objModel.indices; //Array of indices
	uv = objModel.textures; //Array of uvcoordinates
	

	//OBJ.initMeshBuffers(gl, objModel)		??
	var color = [0.0, 0.0, 1.0];
	console.log(vert);
	console.log(objModel.normals);
	console.log(uv);
	console.log(ind);
	console.log(color);
	addMesh(vert, norm, uv, ind, color);
}


async function get_objstr() {
	var path = window.location.pathname;
	var page = path.split("/").pop();
	var baseDir = window.location.href.replace(page, '');
	var objPath = baseDir + "obj/X-WING.obj";
	var objstr = "";
	await utils.loadFiles([objPath], function(objText) {
		objstr = objText[0];
	});
	
	return objstr;
}