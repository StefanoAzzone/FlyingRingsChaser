async function buildGeometry() {
	var i;


	varobjStr = await get_objstr("obj/X-WING.obj");
	varobjModel = newOBJ.Mesh(objStr);
	vert = objModel.vertices; //Array of vertices
	norm = objModel.normals; //Array of normals
	ind = objModel.indices; //Array of indices
	uv = objModel.textures; //Array of uvcoordinates
	
	var color = [0.0, 0.0, 1.0];
	addMesh(vert, norm, uv, ind, color);
	

	var ind6 = [];
	k = 0;
	for(j = 0; j < 36; j++) {
		for(i = 0; i < 36; i++) {
			ind6[k++] = j * 36 + (i + 1) % 36;
			ind6[k++] = j * 36 + i;
			ind6[k++] = ((j+1) % 36) * 36 + i;

			ind6[k++] = ((j+1) % 36) * 36 + (i + 1) % 36;
			ind6[k++] = j * 36 + (i + 1) % 36;
			ind6[k++] = ((j+1) % 36) * 36 + i;
		}
	}
	var color6 = [1.0, 0.0, 0.0];
	addMesh(vert6, norm6, uv6, ind6, color6);

}


async function get_objstr() {
	var path = window.location.pathname;
	var page = path.split("/").pop();
	var baseDir = window.location.href.replace(page, '');
	var objPath = baseDir + "obj/X-WING.obj";
	var objstr = "";
	await utils.loadFiles([objPath], function(objText) {
		objstr = objText[0];
		alert(objstr);
	});
	alert(objstr);
	return objstr;
}