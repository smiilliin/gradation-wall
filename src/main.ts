import * as PIXI from "pixi.js";
import { SimplexNoise } from "ts-perlin-simplex";

const app = new PIXI.Application({ background: "#000000", resizeTo: window });

class Vector2 {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  add(vector: Vector2) {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }
  mul(x: number) {
    return new Vector2(this.x * x, this.y * x);
  }
  clone() {
    return new Vector2(this.x, this.y);
  }
}

const simplex = new SimplexNoise();
class GradientPoint {
  startVector: Vector2;
  vector: Vector2;

  constructor() {
    this.vector = new Vector2(0, 0);
    this.startVector = new Vector2(Math.random() * 100, Math.random() * 100);
  }

  move(t: number) {
    const timeVector = new Vector2(t / 10000, t / 10000);
    const noiseVector = this.startVector.add(timeVector);
    const x =
      simplex.noise3d(noiseVector.x, noiseVector.y, 0) *
        app.screen.width *
        0.6 +
      app.screen.width / 2;
    const y =
      simplex.noise3d(noiseVector.x, noiseVector.y, 100) *
        app.screen.height *
        0.6 +
      app.screen.height / 2;

    this.vector.x = x;
    this.vector.y = y;
  }
}

document.body.appendChild(app.view as HTMLCanvasElement);

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;

const view = new PIXI.Container();

app.stage.addChild(view);

const points: GradientPoint[] = [];

for (let i = 0; i < 6; i++) {
  const p = new GradientPoint();
  points.push(p);
}

const fragment = `
  precision mediump float;
  
  #define MAX_GRADS 10
  uniform int gradcount;
  uniform float grad[MAX_GRADS*2];
  uniform vec2 size;
  uniform float colors[MAX_GRADS*3];
  uniform float brightness;
  uniform float maxweight;

  void main() {
    vec2 coord = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
    vec3 color = vec3(0.0, 0.0, 0.0);
    float sum = 0.0;
    float d[MAX_GRADS];

    for (int i = 0; i < MAX_GRADS; i++) {
      if (i == gradcount) break;
      vec2 gradvec = vec2(grad[i*2], grad[i*2+1]);
      d[i] = distance(coord, gradvec);
      sum += d[i];
    }

    for (int i = 0; i < MAX_GRADS; i++) {
      if (i == gradcount) break;
      float weight = d[i] / sum;
      color += vec3(colors[i*3], colors[i*3+1], colors[i*3+2]) * min(weight, maxweight) * brightness;
    }
    
    gl_FragColor = vec4(color.xyz, 1.0);
  }
`;

const uniform = {
  grad: new Array(6 * 2),
  size: [app.screen.width, app.screen.height],
  gradcount: 6,
  brightness: 2.2,
  maxweight: 0.7,
  colors: [
    ...[1, 0, 0],
    ...[0, 1, 0],
    ...[0, 0, 1],
    ...[0.5, 0, 0],
    ...[0, 0.5, 0],
    ...[0, 0, 0.5],
  ],
};
const filter = new PIXI.Filter("", fragment, uniform);
app.renderer.on("resize", () => {
  uniform.size[0] = app.screen.width;
  uniform.size[1] = app.screen.height;
});

const background = new PIXI.Graphics();
background.position.set(0, 0);
background.scale.set(app.screen.width, app.screen.height);
background.beginFill(0xffffff);
background.drawRect(0, 0, app.screen.width, app.screen.height);
background.endFill();

background.filters = [filter];

view.addChild(background);

const startTime = Date.now();
app.ticker.add(() => {
  const t = Date.now() - startTime;
  points.forEach((p) => p.move(t));

  points.forEach((p, i) => {
    uniform.grad[i * 2] = p.vector.x;
    uniform.grad[i * 2 + 1] = p.vector.y;
  });
});
