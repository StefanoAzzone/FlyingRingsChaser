#version 300 es

precision mediump float;

in vec3 fs_norm;
in vec3 fs_pos;
in vec3 fs_camera_pos;
in vec2 fs_uv;

out vec4 outColor;

//Directional light
uniform vec3 directionalLightDirection; 			    //directional light direction vec
uniform vec3 directionalLightColor; 				      //directional light color


//Spot light
uniform vec3 spotLightDirection; 			    //Spot light direction vec
uniform vec3 spotLightColor; 				      //Spot light color
uniform vec3 spotLightPosition; 			    //Spot light direction vec
uniform float coneIn; 				            //Spot inner cone (in percentage of the outher cone)
uniform float coneOut; 				            //Spot outer cone (in degree)
uniform float target;
uniform float decay;

uniform vec3 effects; 				        //select the light effect
uniform mat4 inverseViewProjMatrix; 	//inv-transp of the ViewProjMatrix
uniform samplerCube cubemap; 			    //texture of the skybox
uniform sampler2D sampler;

void main() {

  vec4 p = vec4(fs_camera_pos, 1.0);

  vec4 cubemapRgba = texture(cubemap, normalize(p.xyz / p.w));

  vec4 samplerRgba = texture(sampler, fs_uv);
  vec3 mDiffColor = samplerRgba.rgb;

  vec3 lightDirNorm = normalize(directionalLightDirection);
  vec3 nNormal = normalize(fs_norm);
  vec3 directionalLambert = mDiffColor * directionalLightColor * dot(-lightDirNorm, nNormal);

  vec3 spotLightDir = normalize(spotLightPosition - fs_pos);
  
  float CosAngle = dot(spotLightDir, spotLightDirection);
  float LCosOut = cos(radians(coneOut / 2.0));
	float LCosIn = cos(radians(coneOut * coneIn / 2.0));
	vec4 spotLightCol = vec4(spotLightColor, 1.0) * pow(target / length(spotLightPosition - fs_pos), decay)
                                                * clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);

  float LdotN = max(0.0, dot(nNormal, spotLightDir));
	vec4 LDcol = spotLightCol * vec4(mDiffColor, 1.0);
	vec4 spotLambert = LDcol * LdotN;

  float skybox = effects.r;
  outColor = mix((vec4(spotLambert.rgb, 1.0) + vec4(directionalLambert.rgb, 1.0)), cubemapRgba, skybox);
} 