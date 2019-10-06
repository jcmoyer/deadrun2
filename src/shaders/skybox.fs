varying highp vec2 f_texcoord;

uniform sampler2D sky0;
uniform sampler2D sky1;
uniform mediump float time;

void main() {
  highp vec4 base    = texture2D(sky0, f_texcoord);
  highp vec4 overlay = texture2D(sky1, f_texcoord + vec2(time / 100000.0, time / 100000.0));
  gl_FragColor = vec4(mix(base.xyz, overlay.xyz, overlay.a), 1.0);  
}
