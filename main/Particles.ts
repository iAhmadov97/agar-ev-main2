interface ParticleType {
  color: string;
  radius: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  random: number;
  opacity: number;
}

export class Particles {
  width: number;
  height: number;
  canvas: any;
  context: any;
  oneParticle: any;
  particles: ParticleType[];
  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas = null;
    this.context = null;
    this.particles = [];
  }
  public init() {
    this.canvas = document.querySelector("#particles");
    this.context = this.canvas ? this.canvas.getContext("2d") : null;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    for (var i = 0; i < 150; i++) {
      this.createParticle();
    }
    this.createOneParticle();
    this.loop();
  }
  private createParticle() {
    this.particles.push({
      color: Math.random() > 0.3 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)",
      radius: Math.random() * 20,
      sx: 0,
      sy: 0,
      x: this.width * Math.random(),
      y: this.height * Math.random(),
      random: Math.random(),
      opacity: 1,
    });
  }
  private createOneParticle() {
    this.oneParticle = document.createElement("canvas");
    this.oneParticle.width = this.oneParticle.height = 30;
    let ctx = this.oneParticle.getContext("2d");
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#fff";
    ctx.arc(15, 15, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  private disappearParticle(p: ParticleType) {
    if (p.opacity < 0.2) {
      this.resetParticle(p);
    }
    if (Math.hypot(p.x, p.y) > this.width - 200) {
      p.opacity *= 0.9;
    }
    p.radius *= 0.994;
  }
  private resetParticle(p: ParticleType) {
    p.radius = p.random * 20;
    p.opacity += (Math.random() * 1) % 0.5;
    if (p.x - p.sx >= 10) {
      p.x = p.sx;
      p.y = p.sy;
    }
  }
  private moveParticle(p: ParticleType) {
    p.x += Math.random() * 0.8;
    p.y += Math.random() * 0.8;
  }
  private draw(p: ParticleType) {
    if (Math.hypot(p.x, p.y) < 140) return;
    if (p.sx === 0) p.sx = p.x;
    if (p.sy === 0) p.sy = p.y;
    this.context.beginPath();
    this.context.globalAlpha = p.opacity;
    this.context.drawImage(this.oneParticle, p.x - 15, p.y - 15);
  }
  private loop() {
    var _this = this;
    this.context.clearRect(0, 0, this.width, this.height);
    for (var i = 0; i < this.particles.length; i++) {
      this.moveParticle(this.particles[i]);
      this.disappearParticle(this.particles[i]);
      this.draw(this.particles[i]);
    }
    requestAnimationFrame(function () {
      return _this.loop();
    });
  }
}

export const particles = new Particles();
