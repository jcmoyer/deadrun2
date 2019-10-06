#include "fog.glsl"

uniform sampler2D deathTexture;

varying highp vec2 f_texcoord;

uniform highp float billboardFlash;

void main() {
  highp vec4 base_color = texture2D(deathTexture, f_texcoord);

  if (base_color.a < 0.05)
    discard;

  base_color = mix(base_color, vec4(1, 1, 1, 1), billboardFlash);

  gl_FragColor = mix_fog(base_color);
  gl_FragColor.a = base_color.a;
}
