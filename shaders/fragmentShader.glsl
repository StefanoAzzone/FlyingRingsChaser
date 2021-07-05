#version 300 es

precision mediump float;

in vec3 fs_norm;
in vec3 fs_pos;
in vec2 fs_uv;

out vec4 outColor;

uniform vec3 lightDirection; 			    //directional light direction vec
uniform vec3 lightColor; 				      //directional light color
//uniform vec3 mDiffColor; 				    //material diffuse color

uniform mat4 inverseViewProjMatrix; 	//inv-transp of the ViewProjMatrix
uniform samplerCube cubemap; 			    //texture of the skybox
uniform sampler2D sampler;
uniform float cubemapModifier;
uniform float samplerModifier;

void main() {
  vec4 p = vec4(fs_pos, 1.0);

  vec4 cubemapRgba = texture(cubemap, normalize(p.xyz / p.w));
  vec3 mDiffColor = cubemapRgba.rgb;

  vec4 samplerRgba = texture(sampler, fs_uv);

  vec3 lightDirNorm = normalize(lightDirection);
  vec3 nNormal = normalize(fs_norm);
  vec3 lambertColor = mDiffColor * lightColor * dot(-lightDirNorm,nNormal);
  outColor = cubemapModifier * cubemapRgba + samplerModifier * samplerRgba;
}