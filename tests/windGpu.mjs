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
