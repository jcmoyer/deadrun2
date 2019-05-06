// Adapted from https://stackoverflow.com/a/38796691
//
// This implementation supports stopping evaluation midway through.
export default class GridWalker {
  private x0: number;
  private y0: number;
  private x1: number;
  private y1: number;
  private slope: number;
  private max: number;
  private currentX: number;
  private currentY: number;
  private stepX: number;
  private stepY: number;
  private distX: number;
  private distY: number;
  private walkType: 'horizontal' | 'vertical' | 'x-dominant' | 'y-dominant';
  private state: 'walk' | 'end';
  private steps: number;

  setStartPoint(x0: number, y0: number) {
    this.x0 = x0;
    this.y0 = y0;
  }

  setEndPoint(x1: number, y1: number) {
    this.x1 = x1;
    this.y1 = y1;
  }

  begin() {
    this.currentX = this.x0;
    this.currentY = this.y0;
    this.stepX = this.x0 == this.x1 ? 0 : this.x1 > this.x0 ? 1 : -1;
    this.stepY = this.y0 == this.y1 ? 0 : this.y1 > this.y0 ? 1 : -1;
    this.distX = Math.abs(this.x1 - this.x0);
    this.distY = Math.abs(this.y1 - this.y0);
    this.steps = 0;

    // determine type of line
    if (this.x0 === this.x1 && this.y0 === this.y1) {
      // endpoints of line segment are the same
      this.state = 'end';
    } else if (this.distX === 0) {
      this.state = 'walk';
      this.walkType = 'vertical';
    } else if (this.distY === 0) {
      this.state = 'walk';
      this.walkType = 'horizontal';
    } else if (this.distX > this.distY) {
      this.state = 'walk';
      this.walkType = 'x-dominant';
      this.slope = (this.y1 - this.y0) / (this.x1 - this.x0);
      this.max = (1 - Math.abs(this.slope)) / 2;
    } else {
      this.state = 'walk';
      this.walkType = 'y-dominant';
      this.slope = (this.x1 - this.x0) / (this.y1 - this.y0);
      this.max = (1 - Math.abs(this.slope)) / 2;
    }
  }

  step() {
    if (this.state === 'end') {
      throw new Error('invalid state');
    }

    if (this.walkType === 'vertical') {
      this.stepVertical();
    } else if (this.walkType === 'horizontal') {
      this.stepHorizontal();
    } else if (this.walkType === 'x-dominant') {
      this.stepXDominant();
    } else if (this.walkType === 'y-dominant') {
      this.stepYDominant();
    }

    ++this.steps;
  }

  private stepHorizontal() {
    this.currentX += this.stepX;
    this.checkEnd();
  }

  private stepVertical() {
    this.currentY += this.stepY;
    this.checkEnd();
  }

  private stepXDominant() {
    const ideal = this.y0 + (this.currentX - this.x0) * this.slope;
    if ((ideal - this.currentY) * this.stepY >= this.max) {
      this.currentY += this.stepY;
    } else {
      this.currentX += this.stepX;
    }
    this.checkEnd();
  }

  private stepYDominant() {
    let ideal = this.x0 + (this.currentY - this.y0) * this.slope;
    if ((ideal - this.currentX) * this.stepX >= this.max) {
      this.currentX += this.stepX;
    } else {
      this.currentY += this.stepY;
    }
    this.checkEnd();
  }

  private checkEnd() {
    if (this.currentX === this.x1 && this.currentY === this.y1) {
      this.state = 'end';
    }
  }

  getX() {
    return this.currentX;
  }

  getY() {
    return this.currentY;
  }

  getSteps() {
    return this.steps;
  }

  isFinished() {
    return this.state === 'end';
  }
}
