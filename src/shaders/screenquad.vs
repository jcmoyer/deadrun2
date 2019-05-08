attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 projection;

varying highp vec2 f_texcoord;

void main() {
  gl_Position = projection * position;
  f_texcoord = texcoord;
}
