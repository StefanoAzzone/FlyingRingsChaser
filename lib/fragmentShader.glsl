#version 300 es
precision highp float;

//in vec3 fs_pos;
in vec3 fs_norm;
//in vec2 fs_uv;

uniform vec4 lightDir1;
//uniform vec4 lightDir2;
//uniform vec4 lightDir3;
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

void main() {
	color = texture(u_tex_Albedo, fs_uv);
}



#version 300 es

precision mediump float;

in vec3 fsNormal;
out vec4 outColor;

uniform vec3 mDiffColor; //material diffuse color 
uniform vec3 lightDirection; // directional light direction vec
uniform vec3 lightColor; //directional light color 

void main() {
  vec3 lightDirNorm = normalize(lightDirection);
  vec3 nNormal = normalize(fsNormal);
  vec3 lambertColor = mDiffColor * lightColor * dot(-lightDirNorm,nNormal);
  outColor = vec4(clamp(lambertColor, 0.0, 1.0),1.0);
}