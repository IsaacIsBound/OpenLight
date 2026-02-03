/**
 * ShapeTool - Draw rectangles and ovals
 */

import { Tool, ToolContext, PointerEvent } from './Tool';
import { Shape } from '../core/Shape';
import { ToolType, FillStyle, StrokeStyle, hexToColor } from '../core/types';
import { AddShapeCommand } from '../core/History';

export class RectangleTool extends Tool {
  readonly type: ToolType = 'rectangle';
  readonly name = 'Rectangle';
  readonly icon = '▭';
  readonly shortcut = 'R';
  
  private previewShape: Shape | null = null;
  
  constructor(context: ToolContext) {
    super(context);
  }
  
  onPointerDown(event: PointerEvent): void {
    super.onPointerDown(event);
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    this.startPoint = stagePoint;
    
    // Create preview shape
    const fill = this.createFill();
    const stroke = this.createStroke();
    
    this.previewShape = Shape.createRectangle(
      stagePoint.x,
      stagePoint.y,
      0,
      0,
      fill,
      stroke
    );
  }
  
  onPointerMove(event: PointerEvent): void {
    if (!this.isActive || !this.startPoint || !this.previewShape) return;
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    let x = Math.min(this.startPoint.x, stagePoint.x);
    let y = Math.min(this.startPoint.y, stagePoint.y);
    let width = Math.abs(stagePoint.x - this.startPoint.x);
    let height = Math.abs(stagePoint.y - this.startPoint.y);
    
    // Shift for square
    if (event.shiftKey) {
      const size = Math.max(width, height);
      width = size;
      height = size;
      if (stagePoint.x < this.startPoint.x) x = this.startPoint.x - size;
      if (stagePoint.y < this.startPoint.y) y = this.startPoint.y - size;
    }
    
    // Update preview shape
    const fill = this.createFill();
    const stroke = this.createStroke();
    
    this.previewShape = Shape.createRectangle(x, y, width, height, fill, stroke);
    this.context.renderer.render();
  }
  
  onPointerUp(event: PointerEvent): void {
    if (this.previewShape && this.startPoint) {
      const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
      const width = Math.abs(stagePoint.x - this.startPoint.x);
      const height = Math.abs(stagePoint.y - this.startPoint.y);
      
      // Only add if it has some size
      if (width > 2 && height > 2) {
        const layerId = this.context.document.selectedLayerId;
        const frameIndex = this.context.document.currentFrame;
        
        if (layerId && this.context.history) {
          // Use history command for undo support
          const cmd = new AddShapeCommand(
            this.context.document,
            layerId,
            frameIndex,
            this.previewShape
          );
          this.context.history.execute(cmd);
        } else {
          // Fallback to direct add
          this.context.document.addShape(this.previewShape);
        }
      }
    }
    
    this.previewShape = null;
    super.onPointerUp(event);
    this.context.renderer.render();
  }
  
  drawPreview(ctx: CanvasRenderingContext2D): void {
    if (this.previewShape) {
      // Draw with dashed outline
      ctx.save();
      ctx.setLineDash([4, 4]);
      this.context.renderer.drawShape(this.previewShape);
      ctx.restore();
    }
  }
  
  getCursor(): string {
    return 'crosshair';
  }
  
  private createFill(): FillStyle {
    return {
      type: 'solid',
      color: hexToColor(this.context.fillColor),
    };
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

export class OvalTool extends Tool {
  readonly type: ToolType = 'oval';
  readonly name = 'Oval';
  readonly icon = '◯';
  readonly shortcut = 'O';
  
  private previewShape: Shape | null = null;
  
  constructor(context: ToolContext) {
    super(context);
  }
  
  onPointerDown(event: PointerEvent): void {
    super.onPointerDown(event);
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    this.startPoint = stagePoint;
    
    const fill = this.createFill();
    const stroke = this.createStroke();
    
    this.previewShape = Shape.createOval(
      stagePoint.x,
      stagePoint.y,
      0,
      0,
      fill,
      stroke
    );
  }
  
  onPointerMove(event: PointerEvent): void {
    if (!this.isActive || !this.startPoint) return;
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    // Calculate center and radius
    let cx = (this.startPoint.x + stagePoint.x) / 2;
    let cy = (this.startPoint.y + stagePoint.y) / 2;
    let rx = Math.abs(stagePoint.x - this.startPoint.x) / 2;
    let ry = Math.abs(stagePoint.y - this.startPoint.y) / 2;
    
    // Shift for circle
    if (event.shiftKey) {
      const r = Math.max(rx, ry);
      rx = r;
      ry = r;
    }
    
    const fill = this.createFill();
    const stroke = this.createStroke();
    
    this.previewShape = Shape.createOval(cx, cy, rx, ry, fill, stroke);
    this.context.renderer.render();
  }
  
  onPointerUp(event: PointerEvent): void {
    if (this.previewShape && this.startPoint) {
      const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
      const width = Math.abs(stagePoint.x - this.startPoint.x);
      const height = Math.abs(stagePoint.y - this.startPoint.y);
      
      if (width > 2 && height > 2) {
        const layerId = this.context.document.selectedLayerId;
        const frameIndex = this.context.document.currentFrame;
        
        if (layerId && this.context.history) {
          const cmd = new AddShapeCommand(
            this.context.document,
            layerId,
            frameIndex,
            this.previewShape
          );
          this.context.history.execute(cmd);
        } else {
          this.context.document.addShape(this.previewShape);
        }
      }
    }
    
    this.previewShape = null;
    super.onPointerUp(event);
    this.context.renderer.render();
  }
  
  drawPreview(ctx: CanvasRenderingContext2D): void {
    if (this.previewShape) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      this.context.renderer.drawShape(this.previewShape);
      ctx.restore();
    }
  }
  
  getCursor(): string {
    return 'crosshair';
  }
  
  private createFill(): FillStyle {
    return {
      type: 'solid',
      color: hexToColor(this.context.fillColor),
    };
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

export class LineTool extends Tool {
  readonly type: ToolType = 'line';
  readonly name = 'Line';
  readonly icon = '╱';
  readonly shortcut = 'N';
  
  private previewShape: Shape | null = null;
  
  constructor(context: ToolContext) {
    super(context);
  }
  
  onPointerDown(event: PointerEvent): void {
    super.onPointerDown(event);
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    this.startPoint = stagePoint;
  }
  
  onPointerMove(event: PointerEvent): void {
    if (!this.isActive || !this.startPoint) return;
    
    let stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    // Shift for constrained angles (45 degree increments)
    if (event.shiftKey) {
      const dx = stagePoint.x - this.startPoint.x;
      const dy = stagePoint.y - this.startPoint.y;
      const angle = Math.atan2(dy, dx);
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      stagePoint = {
        x: this.startPoint.x + Math.cos(snappedAngle) * distance,
        y: this.startPoint.y + Math.sin(snappedAngle) * distance,
      };
    }
    
    const stroke = this.createStroke();
    this.previewShape = Shape.createLine(
      this.startPoint.x,
      this.startPoint.y,
      stagePoint.x,
      stagePoint.y,
      stroke
    );
    
    this.context.renderer.render();
  }
  
  onPointerUp(event: PointerEvent): void {
    if (this.previewShape && this.startPoint) {
      const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
      const distance = Math.sqrt(
        Math.pow(stagePoint.x - this.startPoint.x, 2) +
        Math.pow(stagePoint.y - this.startPoint.y, 2)
      );
      
      if (distance > 2) {
        const layerId = this.context.document.selectedLayerId;
        const frameIndex = this.context.document.currentFrame;
        
        if (layerId && this.context.history) {
          const cmd = new AddShapeCommand(
            this.context.document,
            layerId,
            frameIndex,
            this.previewShape
          );
          this.context.history.execute(cmd);
        } else {
          this.context.document.addShape(this.previewShape);
        }
      }
    }
    
    this.previewShape = null;
    super.onPointerUp(event);
    this.context.renderer.render();
  }
  
  drawPreview(_ctx: CanvasRenderingContext2D): void {
    if (this.previewShape) {
      this.context.renderer.drawShape(this.previewShape);
    }
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
