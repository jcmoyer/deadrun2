varying highp vec2 f_texcoord;
uniform sampler2D screenTexture;

uniform highp vec4  color;
uniform highp float colorMix;

void main() {
  gl_FragColor = mix(texture2D(screenTexture, f_texcoord), color, colorMix);
}
