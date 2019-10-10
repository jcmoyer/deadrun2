#include "fog.glsl"
#include "light.glsl"

uniform sampler2D deathTexture;

varying highp vec2 f_texcoord;
varying highp vec4 f_position;

uniform highp float billboardFlash;
uniform highp float billboardAlpha;

void main() {
  highp vec4 base_color = texture2D(deathTexture, f_texcoord);

  if (base_color.a < 0.05)
    discard;

  base_color = mix(base_color, vec4(1, 1, 1, 1), billboardFlash);

  gl_FragColor = mix_fog(base_color);
  gl_FragColor.a *= billboardAlpha;
  gl_FragColor.xyz = mixLight(gl_FragColor.xyz, f_position.xyz);
}
