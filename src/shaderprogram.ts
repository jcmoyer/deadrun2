import {
  shaderClassUniformName,
  shaderClassAttributeName,
  extractAttributes,
  extractUniforms
} from 'ts-shader/lib/shaderparse';

export default class ShaderProgram {
  private gl: WebGLRenderingContext;
  private vs: WebGLShader;
  private fs: WebGLShader;
  private program: WebGLProgram;

  constructor(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
    this.gl = gl;

    this.vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(this.vs, vsSource);
    gl.compileShader(this.vs);
    
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(this.fs, fsSource);
    gl.compileShader(this.fs);

    this.program = gl.createProgram();
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);

    if (!gl.getShaderParameter(this.vs, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(this.vs);
      throw new Error(`error compiling VS:\n\n${info}`);
    }
  
    if (!gl.getShaderParameter(this.fs, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(this.fs);
      throw new Error(`error compiling FS:\n\n${info}`);
    }

    this.getUniformLocations(vsSource, fsSource);
    this.getAttributeLocations(vsSource);
  }

  use() {
    this.gl.useProgram(this.program);
  }

  private getAttributeLocations(vssrc: string) {
    const uniformSet = new Set<string>();
    for (const a of extractAttributes(vssrc)) {
      uniformSet.add(a.name);
    }
    for (const a of uniformSet.values()) {
      const aPropertyName = shaderClassAttributeName(a);
      (this as any)[aPropertyName] = this.gl.getAttribLocation(this.program, a);
    }
  }

  private getUniformLocations(vssrc: string, fssrc: string) {
    const uniformSet = new Set<string>();
    for (const u of extractUniforms(vssrc)) {
      uniformSet.add(u.name);
    }
    for (const u of extractUniforms(fssrc)) {
      uniformSet.add(u.name);
    }
    for (const u of uniformSet.values()) {
      const uPropertyName = shaderClassUniformName(u);
      (this as any)[uPropertyName] = this.gl.getUniformLocation(this.program, u);
    }
  }
}
