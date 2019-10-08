attribute vec4 position;
attribute vec2 texcoord;

uniform mat4 view;
uniform mat4 projection;
uniform mat4 model;
uniform vec2 scale;

uniform highp float interpolation;
uniform highp float rotation;

varying highp vec2 f_texcoord;

void main() {
  highp vec4 rotated_pos = position;
  highp float p_angle = atan(position.y, position.x);
  rotated_pos.x = cos(p_angle + rotation);
  rotated_pos.y = sin(p_angle + rotation);

  mat4 mv = view * model;
  mv[0] = vec4(scale.x, 0, 0, 0);
  mv[1] = vec4(0, scale.y, 0, 0);
  mv[2] = vec4(0, 0, 1, 0);
  gl_Position = projection * mv * rotated_pos;
  f_texcoord = texcoord;
}
