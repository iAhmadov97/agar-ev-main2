export class Mao {
  private wn: any;
  outer: any;
  inner: HTMLImageElement;
  imageSize: any;
  halfSize: number;
  pi: number;
  rot: number;
  rad: number;
  canvas: HTMLCanvasElement;
  ctx: any;
  stoped: boolean;

  constructor() {
    this.wn = window;
    this.outer = this.wn.pushIntoSkinsLoaded(this.wn.globalPreference.MEOACIRCLE, false, true);
    this.inner = new Image();
    this.imageSize = this.outer.width;
    this.halfSize = this.imageSize / 2;
    this.pi = Math.PI;
    this.rot = 0;
    this.rad = 0;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = this.canvas.height = this.imageSize;
    this.ctx.transform(1, 0, 0, -1, this.imageSize / 2, this.imageSize / 2);
    this.stoped = false;
    setInterval(() => {
      this.rot < 360 ? (this.rot += 1) : (this.rot = 0);
      this.rad = (this.rot * this.pi) / 180;
    }, 40);
    this.loop();
  }
  setImage(urlImage: string) {
    let imageContent = new Image();
    imageContent.src = urlImage;
    imageContent.onload = () => {
      this.stoped = true;
      this.ctx.clearRect(-this.halfSize, -this.halfSize, this.imageSize, this.imageSize);
      this.outer = imageContent;
      this.imageSize = this.outer.width;
      this.halfSize = this.imageSize / 2;
      this.pi = Math.PI;
      this.rot = 0;
      this.rad = 0;
      this.canvas.width = this.canvas.height = this.imageSize;
      this.ctx.transform(1, 0, 0, -1, this.imageSize / 2, this.imageSize / 2);
      this.stoped = false;
      this.loop();
    }
  }
  loop() { 
    if (this.stoped) return;
    this.ctx.clearRect(-this.halfSize, -this.halfSize, this.imageSize, this.imageSize);
    let rad = this.rad;
    this.ctx.rotate(rad);
    this.ctx.drawImage(this.outer, -this.halfSize, -this.halfSize);
    this.ctx.rotate(-rad * 2);
    this.ctx.drawImage(this.inner, -this.halfSize, -this.halfSize);
    this.ctx.rotate(rad);
    requestAnimationFrame(this.loop.bind(this));
  }
}

(window as any).Mao = Mao;