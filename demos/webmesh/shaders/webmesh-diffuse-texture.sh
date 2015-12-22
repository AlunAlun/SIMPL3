\vertex
precision highp float;
attribute vec3 a_vertex;
#if defined NORMAL_OCT
attribute vec2 a_normal;
#elif defined NORMAL_QUANT
attribute vec3 a_normal;
#elif defined NORMAL_FIB
attribute vec3 a_normal;
#endif


attribute vec2 a_coord;
attribute float a_id;


uniform mat4 u_mvp;
uniform mat4 u_model;
uniform mat4 u_modelt;

uniform float u_wVertexX;
uniform float u_wVertexY;
uniform float u_wVertexZ;
uniform float u_wNormal;
uniform float u_wTexture;
uniform vec3 u_aabbMin;
uniform vec3 u_aabbRange;


varying vec3 v_worldNormalDirection;
varying vec3 v_worldVertexPosition;
varying vec2 v_coord;


float fromSNorm(float value) {
	return clamp(value, 0.0, 255.0) / 255.0 * 2.0 - 1.0;
}

float signNotZero(float value) {
	return value < 0.0 ? -1.0 : 1.0;
}

vec3 octDecode(float x, float y) {
	float theX = fromSNorm(x);
	float theY = fromSNorm(y);
	float theZ = 1.0 - (abs(theX) + abs(theY));

	vec3 result = vec3(theX, theY, theZ);

	if (result.z < 0.0) {
		float oldVX = result.x;
		result.x = (1.0 - abs(result.y)) * signNotZero(oldVX);
		result.y = (1.0 - abs(oldVX)) * signNotZero(result.y);
	}
	return normalize(result);
}

void main() {

	//calculate vectors in world space for lighting calculations in pixel shader

	vec4 worldPos = vec4((a_vertex.x/u_wVertexX)*u_aabbRange.x+u_aabbMin.x,
						 (a_vertex.y/u_wVertexY)*u_aabbRange.y+u_aabbMin.y,
						 (a_vertex.z/u_wVertexZ)*u_aabbRange.z+u_aabbMin.z,
						1.0);

#if defined NORMAL_OCT
	vec3 decodedNormal = octDecode(a_normal.x, a_normal.y);
	vec4 normalPos = vec4(decodedNormal.xyz, 1.0);
#elif defined NORMAL_QUANT
   vec4 normalPos = vec4((a_normal.x/(u_wNormal-1.0))*2.0-1.0,
                          (a_normal.y/(u_wNormal-1.0))*2.0-1.0,
                          (a_normal.z/(u_wNormal-1.0))*2.0-1.0,
                          1.0);
#elif defined NORMAL_FIB
   vec4 normalPos = vec4(a_normal.xyz, 1);
#endif

	v_worldVertexPosition = (u_model * worldPos).xyz;
	v_worldNormalDirection = (u_modelt * normalPos).xyz;

	v_coord = vec2(a_coord.x,a_coord.y);

	gl_Position = u_mvp * worldPos;


}

\fragment
precision highp float;
uniform vec3 u_lightPosition;
uniform vec3 u_materialColor;
uniform sampler2D u_diffuse_texture;
uniform float u_wTexture;
varying vec3 v_worldNormalDirection;
varying vec3 v_worldVertexPosition;
varying vec2 v_coord;

void main() {
	vec3 diffuseColor = u_materialColor;

#if defined TEXTURE_DIFFUSE
	vec4 texColor = texture2D(u_diffuse_texture, v_coord);
	diffuseColor *= texColor.xyz;
#endif

#if defined LIGHT
	vec3 L = normalize(u_lightPosition- v_worldVertexPosition);
	vec3 N = normalize(v_worldNormalDirection);
	float NdotL = max(0.0, dot(L,N));
	diffuseColor *= NdotL;
	diffuseColor += vec3(0.1,0.1,0.1);
#endif

	gl_FragColor = vec4(diffuseColor,1.0);

}