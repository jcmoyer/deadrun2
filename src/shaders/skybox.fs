varying highp vec2 f_texcoord;

uniform sampler2D sky0;
uniform sampler2D sky1;
uniform mediump float time;

void main() {
  highp vec4 base    = texture2D(sky0, f_texcoord);
  highp vec2 offset  = vec2(
    time/200000.0,
    time/100000.0
  );
  highp vec4 overlay = texture2D(sky1, f_texcoord + offset);

  highp vec2 offset2  = vec2(
    time/400000.0,
    time/200000.0
  );
  highp vec4 overlay2 = texture2D(sky1, f_texcoord * 2.0 + offset2);

  
  highp vec4 final_color = vec4(mix(base.xyz, overlay2.xyz, overlay2.a), 1.0);
  final_color = vec4(mix(final_color.xyz, overlay.xyz, overlay.a), 1.0);
  gl_FragColor = final_color;

  //gl_FragColor = vec4(mix(base.xyz, overlay.xyz, overlay.a), 1.0);
}
