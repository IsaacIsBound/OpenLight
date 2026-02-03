/**
 * SelectionTool - Select and transform shapes
 */

import { Tool, ToolContext, PointerEvent } from './Tool';
import { Shape } from '../core/Shape';
import { Point, ToolType } from '../core/types';

type DragMode = 'none' | 'select' | 'move' | 'resize' | 'rotate';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export class SelectionTool extends Tool {
  readonly type: ToolType = 'selection';
  readonly name = 'Selection';
  readonly icon = '▢';
  readonly shortcut = 'V';
  
  private dragMode: DragMode = 'none';
  private _dragOffset: Point = { x: 0, y: 0 };
  private _resizeHandle: ResizeHandle | null = null;
  private _selectedShape: Shape | null = null;
  
  // Selection marquee
  private marqueeStart: Point | null = null;
  private marqueeEnd: Point | null = null;
  
  constructor(context: ToolContext) {
    super(context);
  }
  
  onPointerDown(event: PointerEvent): void {
    super.onPointerDown(event);
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    // Check if clicking on a selected shape's handle
    // (would implement resize/rotate handle detection here)
    
    // Check if clicking on a shape
    const hitShape = this.context.renderer.hitTest(event.x, event.y);
    
    if (hitShape) {
      // Click on shape
      if (event.shiftKey) {
        // Add to selection
        if (this.context.document.selectedShapeIds.includes(hitShape.id)) {
          this.context.document.deselectShape(hitShape.id);
        } else {
          this.context.document.selectShape(hitShape.id, true);
        }
      } else {
        // Select this shape (replace selection unless already selected)
        if (!this.context.document.selectedShapeIds.includes(hitShape.id)) {
          this.context.document.selectShape(hitShape.id, false);
        }
      }
      
      this._selectedShape = hitShape;
      this.dragMode = 'move';
      this._dragOffset = {
        x: stagePoint.x - hitShape.transform.x,
        y: stagePoint.y - hitShape.transform.y,
      };
    } else {
      // Click on empty space - start marquee selection
      this.context.document.clearSelection();
      this.dragMode = 'select';
      this.marqueeStart = stagePoint;
      this.marqueeEnd = stagePoint;
    }
    
    this.context.renderer.render();
  }
  
  onPointerMove(event: PointerEvent): void {
    if (!this.isActive) return;
    
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    
    switch (this.dragMode) {
      case 'move':
        this.handleMove(stagePoint);
        break;
      case 'select':
        this.marqueeEnd = stagePoint;
        break;
      case 'resize':
        // Handle resize
        break;
      case 'rotate':
        // Handle rotate
        break;
    }
    
    this.lastPoint = stagePoint;
    this.context.renderer.render();
  }
  
  onPointerUp(event: PointerEvent): void {
    if (this.dragMode === 'select' && this.marqueeStart && this.marqueeEnd) {
      // Select shapes within marquee
      this.selectInMarquee();
    }
    
    this.dragMode = 'none';
    this.marqueeStart = null;
    this.marqueeEnd = null;
    this._selectedShape = null;
    
    super.onPointerUp(event);
    this.context.renderer.render();
  }
  
  private handleMove(point: Point): void {
    const selectedIds = this.context.document.selectedShapeIds;
    if (selectedIds.length === 0) return;
    
    const shapes = this.context.document.getVisibleShapes();
    const dx = point.x - (this.lastPoint?.x ?? point.x);
    const dy = point.y - (this.lastPoint?.y ?? point.y);
    
    for (const { shape } of shapes) {
      if (selectedIds.includes(shape.id)) {
        shape.transform.x += dx;
        shape.transform.y += dy;
      }
    }
  }
  
  private selectInMarquee(): void {
    if (!this.marqueeStart || !this.marqueeEnd) return;
    
    const minX = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
    const maxX = Math.max(this.marqueeStart.x, this.marqueeEnd.x);
    const minY = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
    const maxY = Math.max(this.marqueeStart.y, this.marqueeEnd.y);
    
    const shapes = this.context.document.getVisibleShapes();
    
    for (const { shape, layerId } of shapes) {
      const layer = this.context.document.getLayer(layerId);
      if (layer?.locked) continue;
      
      const bounds = shape.getBounds();
      
      // Check if shape bounds intersect with marquee
      if (
        bounds.x < maxX &&
        bounds.x + bounds.width > minX &&
        bounds.y < maxY &&
        bounds.y + bounds.height > minY
      ) {
        this.context.document.selectShape(shape.id, true);
      }
    }
  }
  
  drawPreview(ctx: CanvasRenderingContext2D): void {
    // Draw selection marquee
    if (this.dragMode === 'select' && this.marqueeStart && this.marqueeEnd) {
      ctx.save();
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = 'rgba(79, 195, 247, 0.1)';
      
      const x = Math.min(this.marqueeStart.x, this.marqueeEnd.x);
      const y = Math.min(this.marqueeStart.y, this.marqueeEnd.y);
      const width = Math.abs(this.marqueeEnd.x - this.marqueeStart.x);
      const height = Math.abs(this.marqueeEnd.y - this.marqueeStart.y);
      
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
    }
  }
  
  getCursor(): string {
    if (this.dragMode === 'move') return 'move';
    return 'default';
  }
  
  onKeyDown(key: string, event: KeyboardEvent): void {
    // Delete selected shapes
    if (key === 'Delete' || key === 'Backspace') {
      this.context.document.removeSelectedShapes();
      this.context.renderer.render();
    }
    
    // Arrow key nudge
    const nudgeAmount = event.shiftKey ? 10 : 1;
    const selectedIds = this.context.document.selectedShapeIds;
    
    if (selectedIds.length > 0) {
      const shapes = this.context.document.getVisibleShapes();
      let dx = 0, dy = 0;
      
      switch (key) {
        case 'ArrowUp': dy = -nudgeAmount; break;
        case 'ArrowDown': dy = nudgeAmount; break;
        case 'ArrowLeft': dx = -nudgeAmount; break;
        case 'ArrowRight': dx = nudgeAmount; break;
      }
      
      if (dx !== 0 || dy !== 0) {
        for (const { shape } of shapes) {
          if (selectedIds.includes(shape.id)) {
            shape.transform.x += dx;
            shape.transform.y += dy;
          }
        }
        this.context.renderer.render();
      }
    }
  }
}
