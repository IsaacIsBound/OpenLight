/**
 * Shape - A drawable vector object on the stage
 */

import {
  UID,
  Point,
  Rectangle,
  Transform,
  VectorPath,
  StrokeStyle,
  FillStyle,
  generateUID,
  createDefaultTransform,
} from './types';

export interface ShapeData {
  id: UID;
  name: string;
  paths: VectorPath[];
  stroke?: StrokeStyle;
  fill?: FillStyle;
  transform: Transform;
}

export class Shape {
  public id: UID;
  public name: string;
  public paths: VectorPath[] = [];
  public stroke?: StrokeStyle;
  public fill?: FillStyle;
  public transform: Transform;
  
  constructor(data?: Partial<ShapeData>) {
    this.id = data?.id ?? generateUID();
    this.name = data?.name ?? 'Shape';
    this.paths = data?.paths ?? [];
    this.stroke = data?.stroke;
    this.fill = data?.fill;
    this.transform = data?.transform ?? createDefaultTransform();
  }
  
  /**
   * Create a rectangle shape
   */
  static createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: FillStyle,
    stroke?: StrokeStyle
  ): Shape {
    const path: VectorPath = {
      commands: [
        { type: 'M', points: [{ x, y }] },
        { type: 'L', points: [{ x: x + width, y }] },
        { type: 'L', points: [{ x: x + width, y: y + height }] },
        { type: 'L', points: [{ x, y: y + height }] },
        { type: 'Z', points: [] },
      ],
      closed: true,
    };
    
    return new Shape({
      name: 'Rectangle',
      paths: [path],
      fill,
      stroke,
    });
  }
  
  /**
   * Create an oval shape
   */
  static createOval(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill?: FillStyle,
    stroke?: StrokeStyle
  ): Shape {
    // Approximate ellipse with 4 cubic bezier curves
    const k = 0.5522847498; // Magic number for circle approximation
    const kx = rx * k;
    const ky = ry * k;
    
    const path: VectorPath = {
      commands: [
        { type: 'M', points: [{ x: cx, y: cy - ry }] },
        { type: 'C', points: [
          { x: cx + kx, y: cy - ry },
          { x: cx + rx, y: cy - ky },
          { x: cx + rx, y: cy },
        ]},
        { type: 'C', points: [
          { x: cx + rx, y: cy + ky },
          { x: cx + kx, y: cy + ry },
          { x: cx, y: cy + ry },
        ]},
        { type: 'C', points: [
          { x: cx - kx, y: cy + ry },
          { x: cx - rx, y: cy + ky },
          { x: cx - rx, y: cy },
        ]},
        { type: 'C', points: [
          { x: cx - rx, y: cy - ky },
          { x: cx - kx, y: cy - ry },
          { x: cx, y: cy - ry },
        ]},
        { type: 'Z', points: [] },
      ],
      closed: true,
    };
    
    return new Shape({
      name: 'Oval',
      paths: [path],
      fill,
      stroke,
    });
  }
  
  /**
   * Create a line shape
   */
  static createLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke: StrokeStyle
  ): Shape {
    const path: VectorPath = {
      commands: [
        { type: 'M', points: [{ x: x1, y: y1 }] },
        { type: 'L', points: [{ x: x2, y: y2 }] },
      ],
      closed: false,
    };
    
    return new Shape({
      name: 'Line',
      paths: [path],
      stroke,
    });
  }
  
  /**
   * Calculate bounding box
   */
  getBounds(): Rectangle {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const path of this.paths) {
      for (const cmd of path.commands) {
        for (const point of cmd.points) {
          minX = Math.min(minX, point.x);
          minY = Math.min(minY, point.y);
          maxX = Math.max(maxX, point.x);
          maxY = Math.max(maxY, point.y);
        }
      }
    }
    
    if (minX === Infinity) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  
  /**
   * Check if point is inside shape
   */
  containsPoint(point: Point): boolean {
    // Simple bounding box check for now
    const bounds = this.getBounds();
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }
  
  /**
   * Clone the shape
   */
  clone(): Shape {
    return new Shape({
      name: this.name + ' Copy',
      paths: JSON.parse(JSON.stringify(this.paths)),
      stroke: this.stroke ? { ...this.stroke } : undefined,
      fill: this.fill ? { ...this.fill } : undefined,
      transform: { ...this.transform },
    });
  }
  
  /**
   * Serialize to JSON
   */
  toJSON(): ShapeData {
    return {
      id: this.id,
      name: this.name,
      paths: this.paths,
      stroke: this.stroke,
      fill: this.fill,
      transform: this.transform,
    };
  }
}
