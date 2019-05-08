#include "fog.glsl"

void main() {
  highp vec4 base_color = vec4(48.0 / 255.0, 104.0 / 255.0, 216.0 / 255.0, 1.0);
  gl_FragColor = mix_fog(base_color);
}
