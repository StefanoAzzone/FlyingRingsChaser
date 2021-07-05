#version 300 es

#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
#define UV_LOCATION 2

layout(location = POSITION_LOCATION) in vec3 in_pos;
layout(location = NORMAL_LOCATION) in vec3 in_norm;
layout(location = UV_LOCATION) in vec2 in_uv;

out vec3 fs_norm;
out vec3 fs_pos;

uniform mat4 wvpMatrix; 	//WVP martix
uniform mat4 nMatrix; 		//InvTransp of the World-View matrix

void main() {
	gl_Position = wvpMatrix * vec4(in_pos, 1.0);
	fs_norm = mat3(nMatrix) * in_norm;
	fs_pos = in_pos;
	fs_uv = in_uv;
}