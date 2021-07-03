#version 300 es

precision mediump float;

in vec3 fs_norm;
in vec3 fs_pos;

out vec4 outColor;

uniform vec3 lightDirection; 			    //directional light direction vec
uniform vec3 lightColor; 				      //directional light color
//uniform vec3 mDiffColor; 				    //material diffuse color

uniform mat4 inverseViewProjMatrix; 	//inv-transp of the ViewProjMatrix
uniform samplerCube cubeMap; 			    //texture of the skybox

void main() {
  vec4 p = inverseViewProjMatrix*vec4(fs_pos, 1.0);
  vec4 rgba = texture(cubeMap, normalize(p.xyz / p.w));
  vec3 mDiffColor = rgba.rgb;

  vec3 lightDirNorm = normalize(lightDirection);
  vec3 nNormal = normalize(fs_norm);
  vec3 lambertColor = mDiffColor * lightColor * dot(-lightDirNorm,nNormal);
  outColor = vec4(clamp(lambertColor, 0.0, 1.0),1.0);
}