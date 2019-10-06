attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 view;
uniform mat4 projection;

varying highp vec2 f_texcoord;

void main() {
  mat4 fixed_view = mat4(mat3(view));

  gl_Position = projection * fixed_view * position;
  f_texcoord = texcoord;
}
