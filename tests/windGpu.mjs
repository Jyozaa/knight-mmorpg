import assert from "node:assert/strict";
import {
  DEFAULT_WIND,
  WIND_GLSL,
  sampleWind,
} from "../src/environment/WindSystem.ts";
/** Compare the exact shader field used by grass/cloth with its CPU audio source. */
export async function verifyGpuWind(page) {
  const points = [
    { x: 0, z: 7, time: 3 },
    { x: 8, z: -2, time: 12 },
    { x: -12, z: 13, time: 21 },
    { x: 3, z: 5, time: 31 },
  ];
  const actual = await page.evaluate(
    ({ source, parameters, points }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const gl = canvas.getContext("webgl2", {
        antialias: false,
        preserveDrawingBuffer: true,
      });
      if (!gl) throw new Error("Wind verification requires WebGL2");
      const compile = (kind, text) => {
        const shader = gl.createShader(kind);
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      const vertex = compile(
        gl.VERTEX_SHADER,
        "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}",
      );
      const fragment = compile(
        gl.FRAGMENT_SHADER,
        "#version 300 es\nprecision highp float;\n" +
          source +
          "\nuniform vec2 samplePoint;out vec4 color;void main(){vec3 w=sharedWind(samplePoint);color=vec4(w.x/1.5,w.y,.5+w.z*2.,1.);}",
      );
      const program = gl.createProgram();
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      for (const [name, value] of Object.entries({
        windIntensity: parameters.intensity,
        windGust: parameters.gustStrength,
        windTurbulence: parameters.turbulence,
        windSpeed: parameters.speed,
      }))
        gl.uniform1f(gl.getUniformLocation(program, name), value);
      gl.uniform2f(
        gl.getUniformLocation(program, "windDirection"),
        parameters.directionX,
        parameters.directionZ,
      );
      const results = points.map((p) => {
        gl.uniform1f(gl.getUniformLocation(program, "windTime"), p.time);
        gl.uniform2f(gl.getUniformLocation(program, "samplePoint"), p.x, p.z);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        const bytes = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
        return {
          strength: (bytes[0] / 255) * 1.5,
          gust: bytes[1] / 255,
          turbulence: (bytes[2] / 255 - 0.5) / 2,
        };
      });
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return results;
    },
    { source: WIND_GLSL, parameters: DEFAULT_WIND, points },
  );
  let maximumError = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i],
      expected = sampleWind(point.x, point.z, point.time, DEFAULT_WIND, {
        strength: 0,
        gust: 0,
        turbulence: 0,
        rustle: 0,
      });
    for (const key of ["strength", "gust", "turbulence"])
      maximumError = Math.max(
        maximumError,
        Math.abs(expected[key] - actual[i][key]),
      );
  }
  assert.ok(maximumError < 0.006, `GPU/CPU wind mismatch ${maximumError}`);
  return { points: points.length, maximumError };
}

/** Execute the actual grass vertex function on the GPU: contact flattens tips, never roots or population. */
export async function verifyGrassContact(page, source) {
  const points = await page.evaluate((source) => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const compile = (type, code) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const vs = compile(
      gl.VERTEX_SHADER,
      "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}",
    );
    const fs = compile(
      gl.FRAGMENT_SHADER,
      "#version 300 es\nprecision highp float;\n" +
        source +
        "\nuniform vec3 probe,location;out vec4 color;void main(){vec3 p=bendGrass(probe,location,vec3(0.),vec3(1.,0.,0.),vec3(0.,0.,1.));color=vec4((p+2.)/4.,1.);}",
    );
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.uniform2f(gl.getUniformLocation(program, "windDirection"), 1, 0);
    gl.uniform2f(gl.getUniformLocation(program, "grassHeading"), 0, 1);
    gl.uniform1f(gl.getUniformLocation(program, "windSpeed"), 4);
    gl.uniform1f(gl.getUniformLocation(program, "grassIllustration"), 1);
    const result = [];
    for (const [height, z, rest] of [
      [0, 0, 0],
      [0, -0.9, 1],
      [1, 0, 0],
      [1, 0, 1],
      [1, -0.9, 0],
      [1, -0.9, 1],
      [1, 3, 1],
    ]) {
      gl.uniform3f(gl.getUniformLocation(program, "probe"), 0, height, 0);
      gl.uniform3f(gl.getUniformLocation(program, "location"), 0, 0, z);
      gl.uniform1f(gl.getUniformLocation(program, "grassRest"), rest);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const bytes = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      result.push(Array.from(bytes.subarray(0, 3), (v) => (v / 255) * 4 - 2));
    }
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return result;
  }, source);
  for (const root of points.slice(0, 2))
    assert.ok(
      root.every((v) => Math.abs(v) < 0.008),
      "grass roots must remain anchored",
    );
  assert.ok(points[3][1] < points[2][1] - 0.15);
  assert.ok(points[5][1] < points[4][1] - 0.25);
  assert.ok(points[6][1] > 0.7);
  assert.ok(points.every((p) => p[1] >= -0.008));
  return points;
}
