\vertex
//Spherical Environment map shader
// https://www.clicktorelease.com/blog/creating-spherical-environment-mapping-shader
precision highp float;
attribute vec3 a_vertex;
attribute vec3 a_normal;
attribute vec2 a_coord;
uniform mat4 u_mvp;
uniform mat4 u_mv;
uniform mat4 u_normal_matrix;


varying vec3 e;
varying vec3 n;

void main() { 
	
    e = normalize( vec3( u_mv * vec4( a_vertex, 1.0 ) ) );
    n = normalize( vec3( u_normal_matrix * vec4( a_normal, 0.0 ) ) );

	gl_Position = u_mvp * vec4(a_vertex,1.0);
}


\fragment
precision highp float;
uniform sampler2D u_texture;

varying vec3 e;
varying vec3 n;

void main() {
    
    vec3 r = reflect( e, n );
    float m = 2.0 * sqrt( pow( r.x, 2.0 ) + pow( r.y, 2.0 ) + pow( r.z + 1.0, 2.0 ) );
    vec2 vN = r.xy / m + 0.5;

    vec3 base = texture2D( u_texture, vN ).rgb;

    gl_FragColor = vec4( base, 1.0 );

}