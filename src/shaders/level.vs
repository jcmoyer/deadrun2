attribute vec4  position;
attribute vec2  texcoord;

attribute float shade;

uniform mat4 view;
uniform mat4 projection;

varying highp float f_shade;
varying vec2        f_texcoord;

void main() {
  gl_Position = projection * view * position;
  f_shade     = shade;
  f_texcoord  = texcoord;
}
