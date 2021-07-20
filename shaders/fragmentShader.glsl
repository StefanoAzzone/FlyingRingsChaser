#version 300 es

precision mediump float;

in vec3 fs_norm;
in vec3 fs_pos;
in vec3 fs_camera_pos;
in vec2 fs_uv;

out vec4 outColor;

//Directional light
uniform vec3 directionalLightDirection; 			    //directional light direction vector
uniform vec3 directionalLightColor; 				      //directional light color


//Spot light
uniform vec3 spotLightDirection; 			    //Spot light direction vector
uniform vec3 spotLightColor; 				      //Spot light color
uniform vec3 spotLightPosition; 			    //Spot light position vector
uniform float coneIn; 				            //Spot inner cone (in percentage of the outher cone)
uniform float coneOut; 				            //Spot outer cone (in degree)
uniform float target;
uniform float decay;

uniform vec3 eyePos;                      //Position of the camera
uniform float metalness;                  //Param for the PBR
uniform float roughness;                  //Param for the PBR

uniform vec4 effects; 				            //select the light effect: [Skybox, MetalnessRoughness, NormalMappingAmbOcl, Emission]
uniform samplerCube cubemap; 			        //Sampler for the skybox
uniform sampler2D albedoSampler;          //Sampler for the albedo
uniform sampler2D normalSampler;          //Sampler for the normal map
uniform sampler2D metalSampler;           //Sampler for the metalness map
uniform sampler2D roughSampler;           //Sampler for the roughness map
uniform sampler2D AOSampler;              //Sampler for the ambient oclusion

uniform float fadeIn;                     //Uniform to define the alpha channell of a fading in object
uniform float animation;                  //Uniform to define whether the texture is animated or not

uniform mat4 animMat;                     //Matrix to apply to the texture if it is animated

void main() {

  vec3 nNormal = normalize(fs_norm);
  vec4 p = vec4(fs_camera_pos, 1.0);
  vec4 cubemapRgba = texture(cubemap, normalize(p.xyz / p.w));    //Samples from the skybox's cubemap

  float skybox = effects.r;                                       //Set the effect's parameters
  float metRough = effects.g;
  float normAO = effects.b;
  float emission = effects.a;

	//// online computation of tangent and bitangent
	// compute derivations of the world position
	vec3 p_dx = dFdx(fs_pos);
	vec3 p_dy = dFdy(fs_pos);
	// compute derivations of the texture coordinate
	vec2 tc_dx = dFdx(fs_uv);
	vec2 tc_dy = dFdy(fs_uv);
	// compute initial tangent and bi-tangent
	vec3 t = (tc_dy.y * p_dx - tc_dx.y * p_dy) / (tc_dx.x*tc_dy.y - tc_dy.x*tc_dx.y);
	t = normalize(t - nNormal * dot(nNormal, t));
	vec3 b = normalize(cross(nNormal,t));

	mat3 tbn = mat3(t, b, nNormal);													        //Matrix containing tangent, bitangent and normal.

  vec3 v = normalize(eyePos - fs_pos);

  vec2 texCoords = fs_uv;
  texCoords = mix(texCoords, (animMat * vec4(texCoords, 0.0, 1.0)).rg, animation);
                                                                  //If this is an animation multiply for animMat to get the right coord
  vec4 nMap = texture(normalSampler, texCoords);

  // somehow the following statement does not work
  // it produces unpredictable behaviour
  //vec3 n = mix(nNormal, normalize(tbn * (nMap.xyz * 2.0 - 1.0)), normAO);		

  vec3 n;
  if(normAO == 0.0) {                                             //If mormAO is selected
    n = nNormal;                                                  //use the mesh's normals;
  } else {                                                        //otherwise
    n = normalize(tbn * (nMap.xyz * 2.0 - 1.0));                  //use NormalMap's normal.
  }

  vec4 RMAO = vec4(texture(roughSampler, texCoords).r, texture(metalSampler, texCoords).r,
                 texture(AOSampler, texCoords).r, 1.0);           //Sample form the Roughness Metalness and Amb Ocl textures.


  vec3 lightDirNorm = normalize(directionalLightDirection);
  float directionalDimFact = max(dot(n, -lightDirNorm), 0.0);
	directionalDimFact *= mix(1.0, RMAO.b, normAO);									//If AmbOcl is selected multiply by the AO component of RMAO
  float spotDimFact = max(dot(n, spotLightDirection), 0.0);
	spotDimFact *= mix(1.0, RMAO.b, normAO);											  //If AmbOcl is selected multiply by the AO component of RMAO


  // Phong specular
	float Rough = mix(roughness, RMAO.r, metRough);								  //If metRough is selected use the roughness from the texture(in RMAO)
   																				                        //otherwise the value specified in the uniform
	float rf = 1.0 - Rough;
	rf = 250.0 * rf * rf + 1.0;
	float directionalSpecFact = pow(max(dot(v, -reflect(-directionalLightDirection, n)), 0.0), rf);
	float spotSpecFact = pow(max(dot(v, -reflect(spotLightDirection, n)), 0.0), rf);

  vec4 albedo = texture(albedoSampler, texCoords);                //Samples from the albedo texture

  float Metal = mix(metalness, RMAO.g, metRough);								  //If metRough is selected use the metalness from the texture(in RMAO)
   																				                        //otherwise the value specified in the uniform

  const float ambEmuFact = 0.08;
  vec3 refDir = -reflect(v,n);													          //n is the normal and v = normalize(eyePos - fs_pos)
  float mipCount = 9.0;                                           // resolution of 512x512
  float lod = (Rough * mipCount);
	vec4 specFactFromEnvMap = textureLod(cubemap, refDir, lod);

  //Directional diffuse
  vec4 directionalDiffColor = albedo * vec4(directionalLightColor, 1.0) * 0.96 * (1.0 - Metal);
	directionalDiffColor = mix(directionalDiffColor, vec4(1.0), ambEmuFact);  //Each channel is increased of ambEmuFact
  //Directional specular
	vec4 directionalSpecColor = (1.0 + 0.96 * Metal * (albedo - 1.0)) * vec4(directionalLightColor, 1.0);
  directionalSpecColor = mix(directionalSpecColor, vec4(1.0), ambEmuFact);  //Each channel is increased of ambEmuFact

  //Factors concerning the reflection of the environment's color.
	vec4 selDimFact = mix(textureLod(cubemap, n, 8.0), vec4(directionalDimFact), 0.8);
  vec4 selSpecFact = mix(specFactFromEnvMap * mix(0.4, 1.0, Metal), vec4(directionalSpecFact), 0.8);

  vec4 color = vec4((directionalDiffColor * selDimFact + directionalSpecColor * selSpecFact).rgb, 1.0);
                                                                            //Color considering only the directional light.

  //Spot
  vec3 spotLightDir = normalize(spotLightPosition - fs_pos);
  
  float CosAngle = dot(spotLightDir, spotLightDirection);
  float LCosOut = cos(radians(coneOut / 2.0));
	float LCosIn = cos(radians(coneOut * coneIn / 2.0));
	vec4 spotLightCol = vec4(spotLightColor, 1.0) * pow(target / length(spotLightPosition - fs_pos), decay)
                                                * clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);
  //Spot diffuse
  vec4 spotDiffColor = albedo * spotLightCol * 0.96 * (1.0 - Metal);
  //Spot specular
  vec4 spotSpecColor = (1.0 + 0.96 * Metal * (albedo - 1.0)) * spotLightCol;

  //Factors concerning the reflection of the environment's color.
  selSpecFact = mix(specFactFromEnvMap * mix(0.4, 1.0, Metal), vec4(spotSpecFact), 0.95);
	selDimFact = mix(textureLod(cubemap, n, 8.0), vec4(spotDimFact), 0.95);

  color += vec4((spotDiffColor * selDimFact + spotSpecColor * selSpecFact).rgb, 1.0);
                                                                            //Final color: diffuse + spot.
  
  vec4 emitColor = mix(vec4(0.0), albedo, emission);
  const float emissionThreshold = 0.8;
  emitColor *= step(vec4(emissionThreshold), emitColor);                    //If emitColor is selected compute the emission component.

  outColor = mix(clamp(color + emitColor, 0.0, 1.0), cubemapRgba, skybox);  //If we are rendering the skybox, only consider its color.
  outColor = vec4(outColor.rgb, fadeIn);                                    //Consider the alpha component of the fade in.
  outColor = mix(outColor, albedo, animation);                              //If we are rendering an animation, use only the image.
}