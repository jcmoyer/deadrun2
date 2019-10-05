varying highp vec2 f_texcoord;
uniform sampler2D weaponTexture;

void main() {
  gl_FragColor = texture2D(weaponTexture, f_texcoord);
}
