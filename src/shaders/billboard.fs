#include "fog.glsl"

uniform sampler2D deathTexture;

varying highp vec2 f_texcoord;

void main() {
  highp vec4 base_color = texture2D(deathTexture, f_texcoord);

  gl_FragColor = mix_fog(base_color);
  gl_FragColor.a = base_color.a;

  if (base_color.a < 0.05)
    discard;
}
