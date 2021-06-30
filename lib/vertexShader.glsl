#version 300 es
#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
#define UV_LOCATION 2

layout(location = POSITION_LOCATION) in vec3 in_pos;
layout(location = NORMAL_LOCATION) in vec3 in_norm;
//layout(location = UV_LOCATION) in vec2 in_uv;

uniform mat4 wvpMatrix;
uniform mat4 nMatrix;

//out vec3 fs_pos;
out vec3 fs_norm;
//out vec2 fs_uv;

void main() {
	//fs_pos = (wMatrix * vec4(in_pos, 1.0)).xyz;
	//fs_norm = (wMatrix * vec4(in_norm, 0.0)).xyz;
	//fs_uv = in_uv;
	fs_norm = mat3(nMatrix) * in_norm;
	
	gl_Position = wvpMatrix * vec4(in_pos, 1.0);
}



#version 300 es

in vec3 inPosition;
in vec3 inNormal;
out vec3 fsNormal;

//Change the shader as needed :)
uniform mat4 matrix; 		//WVP martix
uniform mat4 nMatrix; 		//InvTransp of the World-View matrix

void main() {
  gl_Position = matrix * vec4(inPosition, 1.0);
  fsNormal = mat3(nMatrix) * inNormal;
}