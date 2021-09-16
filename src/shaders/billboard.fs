#include "fog.glsl"
#include "light.glsl"

uniform sampler2D deathTexture;

varying highp vec2 f_texcoord;
varying highp vec4 f_position;

uniform highp float billboardFlash;
uniform highp float billboardAlpha;

void main() {
  highp vec4 base_color = texture2D(deathTexture, f_texcoord);

  highp vec4 with_flash = mix(base_color, vec4(1, 1, 1, 1), billboardFlash);

  gl_FragColor = mix_fog(with_flash);
  gl_FragColor.rgb = mixLight(gl_FragColor.rgb, f_position.xyz);
  gl_FragColor.a = base_color.a;
  gl_FragColor.a *= billboardAlpha;
}
