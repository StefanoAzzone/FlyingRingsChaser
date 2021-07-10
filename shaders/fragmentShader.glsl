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

uniform vec3 effects; 				        //select the light effect
uniform mat4 inverseViewProjMatrix; 	//inv-transp of the ViewProjMatrix
uniform samplerCube cubemap; 			    //texture of the skybox
uniform sampler2D albedoSampler;
uniform sampler2D normalSampler;
uniform sampler2D metalSampler;
uniform sampler2D roughSampler;
uniform sampler2D AOSampler;
uniform sampler2D heightSampler;

vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir)
{ 
  const float heightScale = 0.02;

    // number of depth layers
    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));  
    // calculate the size of each layer
    float layerDepth = 1.0 / numLayers;
    // depth of current layer
    float currentLayerDepth = 0.0;
    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * heightScale; 
    vec2 deltaTexCoords = P / numLayers;
  
    // get initial values
    vec2  currentTexCoords     = texCoords;
    float currentDepthMapValue = texture(heightSampler, currentTexCoords).r;
      
    while(currentLayerDepth < currentDepthMapValue)
    {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(heightSampler, currentTexCoords).r;  
        // get depth of next layer
        currentLayerDepth += layerDepth;  
    }
    
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;

    // get depth after and before collision for linear interpolation
    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(heightSampler, prevTexCoords).r - currentLayerDepth + layerDepth;
 
    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);

    return finalTexCoords;
}


void main() {

  vec3 nNormal = normalize(fs_norm);
  vec4 p = vec4(fs_camera_pos, 1.0);
  vec4 cubemapRgba = texture(cubemap, normalize(p.xyz / p.w));
  float PBR = effects.g;

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



  vec2 texCoords = fs_uv; //mix(fs_uv, ParallaxMapping(fs_uv,  viewDir), effect.g);		//effect.g is 1 if parallax mapping is selected;
																					//this means: use the normal UVs if ParMap is
	 																				//unchecked, parallax mapping's coordinates otherwise
  vec4 nMap = texture(normalSampler, texCoords);
  vec3 n = mix(nNormal, normalize(tbn * (nMap.xyz * 2.0 - 1.0)), PBR);		//This means: use the "normal" normal ;) if NorMap is
								 													//unchecked, NormalMap's normal otherwise

  vec4 RMAO = vec4(texture(roughSampler, texCoords).r, texture(metalSampler, texCoords).r,
                 texture(AOSampler, texCoords).r, 1.0);


  vec3 lightDirNorm = normalize(directionalLightDirection);
  float directionalDimFact = max(dot(n, -lightDirNorm), 0.0);
	directionalDimFact *= mix(1.0, RMAO.b, PBR);											//This means: if AmbOcl is selected multiply the
  float spotDimFact = max(dot(n, spotLightDirection), 0.0);
	spotDimFact *= mix(1.0, RMAO.b, PBR);											//This means: if AmbOcl is selected multiply the
	 																				//value with the value from the b channel of the RMAO
													  								//texture


  // Phong specular
	float Rough = mix(roughness, RMAO.g, PBR);								//This means: if Texture is selected use as roughness
																					//the value from the g channel of the RMAO texture,
   																				//otherwise the value specified by the user in repMetRough
	float rf = 1.0 - Rough;
	rf = 250.0 * rf * rf + 1.0;
	float directionalSpecFact = pow(max(dot(v, -reflect(directionalLightDirection, n)), 0.0), rf);
	float spotSpecFact = pow(max(dot(v, -reflect(spotLightDirection, n)), 0.0), rf);//This is to compute the Phong specular factor
                                          //without the environment contribute 
																					//(only the incoming direct light is considered)

  vec4 albedo = texture(albedoSampler, texCoords);

  float Metal = mix(metalness, RMAO.r, PBR);								//If if the material has alpha channel = 1 use as
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

  vec4 selSpecFact = mix(specFactFromEnvMap * mix(0.4, 1.0, Metal), vec4(directionalSpecFact), 0.9);
	vec4 selDimFact = mix(textureLod(cubemap, n, 8.0), vec4(directionalDimFact), 0.9);

	vec4 color = vec4((directionalDiffColor * selDimFact + directionalSpecColor * selSpecFact).rgb, 1.0);

  //Spot
  vec3 spotLightDir = normalize(spotLightPosition - fs_pos);
  
  float CosAngle = dot(spotLightDir, spotLightDirection);
  float LCosOut = cos(radians(coneOut / 2.0));
	float LCosIn = cos(radians(coneOut * coneIn / 2.0));
	vec4 spotLightCol = vec4(spotLightColor, 1.0) * pow(target / length(spotLightPosition - fs_pos), decay)
                                                * clamp((CosAngle - LCosOut) / (LCosIn - LCosOut), 0.0, 1.0);

  vec4 spotDiffColor = albedo * spotLightCol * 0.96 * (1.0 - Metal);
	spotDiffColor = mix(spotDiffColor, vec4(1.0), ambEmuFact);
  vec4 spotSpecColor = (1.0 + 0.96 * Metal * (albedo - 1.0)) * spotLightCol;
  spotSpecColor = mix(spotSpecColor, vec4(1.0), ambEmuFact);

  selSpecFact = mix(specFactFromEnvMap * mix(0.4, 1.0, Metal), vec4(spotSpecFact), 0.2);
	selDimFact = mix(textureLod(cubemap, n, 8.0), vec4(spotDimFact), 0.2);

  color += vec4((spotDiffColor * selDimFact + spotSpecColor * selSpecFact).rgb, 1.0);
  
  float skybox = effects.r;
  outColor = mix(clamp(color, 0.0, 1.0), cubemapRgba, skybox);
}