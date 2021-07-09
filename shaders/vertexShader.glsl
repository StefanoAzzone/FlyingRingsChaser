#version 300 es

in vec3 in_pos;
in vec3 in_norm;
in vec2 in_uv;

out vec3 fs_norm;
out vec3 fs_pos;
out vec2 fs_uv;

uniform mat4 wvpMatrix; 	//WVP martix
uniform mat4 pMatrix;
uniform mat4 nMatrix; 		//InvTransp of the World-View matrix

void main() {
	gl_Position = wvpMatrix * vec4(in_pos, 1.0);
	fs_norm = mat3(nMatrix) * in_norm;
	fs_pos = in_pos;
	fs_uv = in_uv;
}