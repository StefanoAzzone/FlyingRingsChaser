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

uniform vec3 eyePos;
uniform float metalness;
uniform float roughness;

uniform vec4 effects; 				        //select the light effect
uniform samplerCube cubemap; 			    //texture of the skybox
uniform sampler2D albedoSampler;
uniform sampler2D normalSampler;
uniform sampler2D metalSampler;
uniform sampler2D roughSampler;
uniform sampler2D AOSampler;
uniform sampler2D heightSampler;

uniform float fadeIn;
uniform float animation;

uniform mat4 animMat;

void main() {

  vec3 nNormal = normalize(fs_norm);
  vec4 p = vec4(fs_camera_pos, 1.0);
  vec4 cubemapRgba = texture(cubemap, normalize(p.xyz / p.w));
  float metRough = effects.g;
  float normAO = effects.a;

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
	
	mat3 tbn = mat3(t, b, nNormal);													//Matrix containing tangent, bitangent and normal


  vec3 v = normalize(eyePos - fs_pos);
  vec3 viewDir = transpose(tbn) * v;



  vec2 texCoords = fs_uv;
  vec4 nMap = texture(normalSampler, texCoords);
  // vec3 ciaociao = normalize(tbn * (nMap.xyz * 2.0 - 1.0));
  // somehow the following statement does not work
  // it produces unpredictable behaviour
  //vec3 n = mix(nNormal, ciaociao, normAO);		//This means: use the "normal" normal ;) if NorMap is
								 													//unchecked, NormalMap's normal otherwise

  vec3 n;
  if(normAO == 0.0) {
    n = nNormal;
  } else {
    n = normalize(tbn * (nMap.xyz * 2.0 - 1.0));
  }

  vec4 RMAO = vec4(texture(roughSampler, texCoords).r, texture(metalSampler, texCoords).r,
                 texture(AOSampler, texCoords).r, 1.0);


  vec3 lightDirNorm = normalize(directionalLightDirection);
  float directionalDimFact = max(dot(n, -lightDirNorm), 0.0);
	directionalDimFact *= mix(1.0, RMAO.b, normAO);										//This means: if AmbOcl is selected multiply the
  float spotDimFact = max(dot(n, spotLightDirection), 0.0);
	spotDimFact *= mix(1.0, RMAO.b, metRough);											//This means: if AmbOcl is selected multiply the
	 																				//value with the value from the b channel of the RMAO
													  								//texture


  // Phong specular
	float Rough = mix(roughness, RMAO.r, metRough);								//This means: if Texture is selected use as roughness
																					//the value from the g channel of the RMAO texture,
   																				//otherwise the value specified by the user in repMetRough
	float rf = 1.0 - Rough;
	rf = 250.0 * rf * rf + 1.0;
	float directionalSpecFact = pow(max(dot(v, -reflect(-directionalLightDirection, n)), 0.0), rf);
	float spotSpecFact = pow(max(dot(v, -reflect(spotLightDirection, n)), 0.0), rf);//This is to compute the Phong specular factor
                                          //without the environment contribute 
																					//(only the incoming direct light is considered)

  //if(animation == 1.0) {
  //  texCoords = (animMat*vec4(texCoords, 0.0, 1.0)).rg;
  //}
  texCoords = mix(texCoords, (animMat * vec4(texCoords, 0.0, 1.0)).rg, animation);
  vec4 albedo = texture(albedoSampler, texCoords);

  float Metal = mix(metalness, RMAO.g, metRough);								//If if the material has alpha channel = 1 use as
																					//Metalness the one selected by the user, otherwise
																					//sample from the RMAO texture

  const float ambEmuFact = 0.08;
  vec3 refDir = -reflect(v,n);													//n is the normal and v = normalize(eyePos - fs_pos)
  float mipCount = 9.0; // resolution of 512x512
  float lod = (Rough * mipCount);													//The more the obj is rough, the more "blurry" the reflection
																					//will be (i.e.the level of detail will be lower)
	vec4 specFactFromEnvMap = textureLod(cubemap, refDir, lod);					//This is the light of the environment that is
																					//reflected on the object

  //Directional
  vec4 directionalDiffColor = albedo * vec4(directionalLightColor, 1.0) * 0.96 * (1.0 - Metal);
	directionalDiffColor = mix(directionalDiffColor, vec4(1.0), ambEmuFact);
	vec4 directionalSpecColor = (1.0 + 0.96 * Metal * (albedo - 1.0)) * vec4(directionalLightColor, 1.0);
  directionalSpecColor = mix(directionalSpecColor, vec4(1.0), ambEmuFact);

  vec4 selSpecFact = mix(specFactFromEnvMap * mix(0.4, 1.0, Metal), vec4(directionalSpecFact), 0.8);
	vec4 selDimFact = mix(textureLod(cubemap, n, 8.0), vec4(directionalDimFact), 0.8);

  vec4 color = vec4((directionalDiffColor * selDimFact + directionalSpecColor * selSpecFact).rgb, 1.0);

  //Spot
  vec3 spotLightDir = normalize(spotLightPosition - fs_pos);
  
  float CosAngle = dot(spotLightDir, spotLightDirection);
  float LCosOut = cos(radians(coneOut / 2.0));
	float LCosIn = cos(radians(coneOut * coneIn / 2.0));
	vec4 spotLightCol = vec4(spotLightColor, 1.0) * pow(target / length(spotLightPosition - fs_pos), decay)
                                                * clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);

  vec4 spotDiffColor = albedo * spotLightCol * 0.96 * (1.0 - Metal);
  vec4 spotSpecColor = (1.0 + 0.96 * Metal * (albedo - 1.0)) * spotLightCol;

  selSpecFact = mix(specFactFromEnvMap * mix(0.4, 1.0, Metal), vec4(spotSpecFact), 0.95);
	selDimFact = mix(textureLod(cubemap, n, 8.0), vec4(spotDimFact), 0.95);

  color += vec4((spotDiffColor * selDimFact + spotSpecColor * selSpecFact).rgb, 1.0);
  
  float skybox = effects.r;

  float emission = effects.b;

  vec4 emitColor = mix(vec4(0.0), albedo, emission);
  const float emissionThreshold = 0.8;
  emitColor *= step(vec4(emissionThreshold), emitColor);

  outColor = mix(vec4(mix(clamp(color + emitColor, 0.0, 1.0), cubemapRgba, skybox).rgb, fadeIn), albedo, animation);
}