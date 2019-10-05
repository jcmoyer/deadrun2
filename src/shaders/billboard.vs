attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 model;
uniform float scale;

uniform highp float interpolation;

varying highp vec2 f_texcoord;

void main() {
  mat4 mv = view * model;
  mv[0] = vec4(scale, 0, 0, 0);
  mv[1] = vec4(0, scale, 0, 0);
  mv[2] = vec4(0, 0, scale, 0);
  gl_Position = projection * mv * position;
  f_texcoord = texcoord;
}
