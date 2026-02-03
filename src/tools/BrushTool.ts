/**
 * BrushTool - Freehand drawing with smoothing
 */

import { Tool, ToolContext, PointerEvent } from './Tool';
import { Shape } from '../core/Shape';
import { Point, ToolType, VectorPath, PathCommand, FillStyle, StrokeStyle, hexToColor } from '../core/types';

export class BrushTool extends Tool {
  readonly type: ToolType = 'brush';
  readonly name = 'Brush';
  readonly icon = '🖌';
  readonly shortcut = 'B';
  
  private points: Point[] = [];
  private previewPath: VectorPath | null = null;
  
  // Smoothing settings
  private smoothing = 0.3;
  private minDistance = 2;
  
  constructor(context: ToolContext) {
    super(context);
  }
  
  onPointerDown(event: PointerEvent): void {
    super.onPointerDown(event);
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    this.points = [stagePoint];
    
    this.updatePreview();
  }
  
  onPointerMove(event: PointerEvent): void {
    if (!this.isActive) return;
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    // Only add point if far enough from last point
    const lastPoint = this.points[this.points.length - 1];
    const distance = Math.sqrt(
      Math.pow(stagePoint.x - lastPoint.x, 2) +
      Math.pow(stagePoint.y - lastPoint.y, 2)
    );
    
    if (distance >= this.minDistance) {
      this.points.push(stagePoint);
      this.updatePreview();
      this.context.renderer.render();
    }
  }
  
  onPointerUp(event: PointerEvent): void {
    if (this.points.length > 1) {
      // Create final smoothed path
      const smoothedPath = this.createSmoothedPath(this.points);
      
      const stroke = this.createStroke();
      const shape = new Shape({
        name: 'Brush Stroke',
        paths: [smoothedPath],
        stroke,
      });
      
      this.context.document.addShape(shape);
    }
    
    this.points = [];
    this.previewPath = null;
    super.onPointerUp(event);
    this.context.renderer.render();
  }
  
  private updatePreview(): void {
    if (this.points.length < 2) {
      this.previewPath = null;
      return;
    }
    
    this.previewPath = this.createSmoothedPath(this.points);
  }
  
  /**
   * Create a smoothed bezier path from points
   */
  private createSmoothedPath(points: Point[]): VectorPath {
    if (points.length < 2) {
      return { commands: [], closed: false };
    }
    
    if (points.length === 2) {
      return {
        commands: [
          { type: 'M', points: [points[0]] },
          { type: 'L', points: [points[1]] },
        ],
        closed: false,
      };
    }
    
    const commands: PathCommand[] = [];
    
    // Start with move to first point
    commands.push({ type: 'M', points: [points[0]] });
    
    // Use Catmull-Rom spline converted to cubic bezier
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[Math.min(points.length - 1, i + 1)];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      
      // Convert Catmull-Rom to cubic bezier control points
      const cp1: Point = {
        x: p1.x + (p2.x - p0.x) * this.smoothing / 3,
        y: p1.y + (p2.y - p0.y) * this.smoothing / 3,
      };
      
      const cp2: Point = {
        x: p2.x - (p3.x - p1.x) * this.smoothing / 3,
        y: p2.y - (p3.y - p1.y) * this.smoothing / 3,
      };
      
      commands.push({
        type: 'C',
        points: [cp1, cp2, p2],
      });
    }
    
    return { commands, closed: false };
  }
  
  drawPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.previewPath || this.previewPath.commands.length === 0) return;
    
    ctx.save();
    
    const stroke = this.createStroke();
    ctx.strokeStyle = `rgba(${stroke.color.r}, ${stroke.color.g}, ${stroke.color.b}, 0.5)`;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = stroke.lineCap;
    ctx.lineJoin = stroke.lineJoin;
    
    ctx.beginPath();
    
    for (const cmd of this.previewPath.commands) {
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
          break;
        case 'L':
          ctx.lineTo(cmd.points[0].x, cmd.points[0].y);
          break;
        case 'C':
          ctx.bezierCurveTo(
            cmd.points[0].x, cmd.points[0].y,
            cmd.points[1].x, cmd.points[1].y,
            cmd.points[2].x, cmd.points[2].y
          );
          break;
      }
    }
    
    ctx.stroke();
    ctx.restore();
  }
  
  getCursor(): string {
    return 'crosshair';
  }
  
  private createStroke(): StrokeStyle {
    return {
      color: hexToColor(this.context.strokeColor),
      width: this.context.strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
    };
  }
}

export class PenTool extends Tool {
  readonly type: ToolType = 'pen';
  readonly name = 'Pen';
  readonly icon = '✒';
  readonly shortcut = 'P';
  
  private anchorPoints: Point[] = [];
  private controlPoints: Array<{ in: Point | null; out: Point | null }> = [];
  private isDraggingHandle = false;
  private currentHandlePoint: Point | null = null;
  
  constructor(context: ToolContext) {
    super(context);
  }
  
  onPointerDown(event: PointerEvent): void {
    super.onPointerDown(event);
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    // Check if clicking near first point to close path
    if (this.anchorPoints.length > 2) {
      const firstPoint = this.anchorPoints[0];
      const distance = Math.sqrt(
        Math.pow(stagePoint.x - firstPoint.x, 2) +
        Math.pow(stagePoint.y - firstPoint.y, 2)
      );
      
      if (distance < 10) {
        this.closePath();
        return;
      }
    }
    
    // Add new anchor point
    this.anchorPoints.push(stagePoint);
    this.controlPoints.push({ in: null, out: null });
    this.isDraggingHandle = true;
    
    this.context.renderer.render();
  }
  
  onPointerMove(event: PointerEvent): void {
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    if (this.isDraggingHandle && this.anchorPoints.length > 0) {
      // Create control handles while dragging
      const lastIndex = this.anchorPoints.length - 1;
      const anchor = this.anchorPoints[lastIndex];
      
      // Out handle follows mouse
      this.controlPoints[lastIndex].out = stagePoint;
      
      // In handle is mirrored
      this.controlPoints[lastIndex].in = {
        x: anchor.x - (stagePoint.x - anchor.x),
        y: anchor.y - (stagePoint.y - anchor.y),
      };
      
      this.currentHandlePoint = stagePoint;
    }
    
    this.context.renderer.render();
  }
  
  onPointerUp(event: PointerEvent): void {
    this.isDraggingHandle = false;
    this.currentHandlePoint = null;
    this.context.renderer.render();
  }
  
  private closePath(): void {
    if (this.anchorPoints.length < 3) return;
    
    const path = this.buildPath(true);
    const stroke = this.createStroke();
    const fill = this.createFill();
    
    const shape = new Shape({
      name: 'Pen Path',
      paths: [path],
      stroke,
      fill,
    });
    
    this.context.document.addShape(shape);
    
    // Reset
    this.anchorPoints = [];
    this.controlPoints = [];
    this.isDraggingHandle = false;
    
    this.context.renderer.render();
  }
  
  private buildPath(closed: boolean): VectorPath {
    const commands: PathCommand[] = [];
    
    if (this.anchorPoints.length === 0) {
      return { commands, closed };
    }
    
    // Move to first point
    commands.push({ type: 'M', points: [this.anchorPoints[0]] });
    
    // Build curve segments
    for (let i = 1; i < this.anchorPoints.length; i++) {
      const prevAnchor = this.anchorPoints[i - 1];
      const prevControl = this.controlPoints[i - 1];
      const currAnchor = this.anchorPoints[i];
      const currControl = this.controlPoints[i];
      
      const cp1 = prevControl.out ?? prevAnchor;
      const cp2 = currControl.in ?? currAnchor;
      
      commands.push({
        type: 'C',
        points: [cp1, cp2, currAnchor],
      });
    }
    
    if (closed) {
      // Close back to first point
      const lastIndex = this.anchorPoints.length - 1;
      const lastControl = this.controlPoints[lastIndex];
      const firstControl = this.controlPoints[0];
      
      const cp1 = lastControl.out ?? this.anchorPoints[lastIndex];
      const cp2 = firstControl.in ?? this.anchorPoints[0];
      
      commands.push({
        type: 'C',
        points: [cp1, cp2, this.anchorPoints[0]],
      });
      commands.push({ type: 'Z', points: [] });
    }
    
    return { commands, closed };
  }
  
  drawPreview(ctx: CanvasRenderingContext2D): void {
    if (this.anchorPoints.length === 0) return;
    
    ctx.save();
    
    // Draw path so far
    const path = this.buildPath(false);
    
    const stroke = this.createStroke();
    ctx.strokeStyle = `rgba(${stroke.color.r}, ${stroke.color.g}, ${stroke.color.b}, 0.7)`;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    for (const cmd of path.commands) {
      switch (cmd.type) {
        case 'M':
          ctx.moveTo(cmd.points[0].x, cmd.points[0].y);
          break;
        case 'C':
          ctx.bezierCurveTo(
            cmd.points[0].x, cmd.points[0].y,
            cmd.points[1].x, cmd.points[1].y,
            cmd.points[2].x, cmd.points[2].y
          );
          break;
      }
    }
    ctx.stroke();
    
    // Draw anchor points
    ctx.fillStyle = '#4fc3f7';
    for (const point of this.anchorPoints) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw control handles for last point
    if (this.anchorPoints.length > 0) {
      const lastIndex = this.anchorPoints.length - 1;
      const anchor = this.anchorPoints[lastIndex];
      const control = this.controlPoints[lastIndex];
      
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 1;
      
      if (control.out) {
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(control.out.x, control.out.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(control.out.x, control.out.y, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      if (control.in) {
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(control.in.x, control.in.y);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(control.in.x, control.in.y, 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
  
  getCursor(): string {
    return 'crosshair';
  }
  
  onKeyDown(key: string, event: KeyboardEvent): void {
    // Escape to cancel current path
    if (key === 'Escape') {
      this.anchorPoints = [];
      this.controlPoints = [];
      this.isDraggingHandle = false;
      this.context.renderer.render();
    }
    
    // Enter to finish path (open)
    if (key === 'Enter' && this.anchorPoints.length > 1) {
      const path = this.buildPath(false);
      const stroke = this.createStroke();
      
      const shape = new Shape({
        name: 'Pen Path',
        paths: [path],
        stroke,
      });
      
      this.context.document.addShape(shape);
      
      this.anchorPoints = [];
      this.controlPoints = [];
      this.isDraggingHandle = false;
      
      this.context.renderer.render();
    }
  }
  
  private createStroke(): StrokeStyle {
    return {
      color: hexToColor(this.context.strokeColor),
      width: this.context.strokeWidth,
      lineCap: 'round',
      lineJoin: 'round',
    };
  }
  
  private createFill(): FillStyle {
    return {
      type: 'solid',
      color: hexToColor(this.context.fillColor),
    };
  }
}
