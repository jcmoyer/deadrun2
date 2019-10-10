#include "fog.glsl"
#include "light.glsl"

varying highp float f_shade;
varying highp vec2  f_texcoord;
varying highp vec4  f_position;

uniform sampler2D   wallTexture;



void main() {
  highp vec4 base_color = texture2D(wallTexture, f_texcoord);
  gl_FragColor = mix_fog(base_color);
  gl_FragColor.xyz = mixLight(gl_FragColor.xyz, f_position.xyz);
}
