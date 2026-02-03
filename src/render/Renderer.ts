/**
 * Renderer - Canvas rendering engine for Flare
 */

import { Document } from '../core/Document';
import { Shape } from '../core/Shape';
import { VectorPath, Point, colorToRGBA, Transform } from '../core/types';

export interface RenderOptions {
  showGrid: boolean;
  gridSize: number;
  showGuides: boolean;
  onionSkinning: boolean;
  onionSkinFrames: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private document: Document;
  private options: RenderOptions;
  
  // Pan and zoom
  private panX: number = 0;
  private panY: number = 0;
  private zoom: number = 1;
  
  constructor(canvas: HTMLCanvasElement, document: Document) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.document = document;
    
    this.options = {
      showGrid: false,
      gridSize: 20,
      showGuides: true,
      onionSkinning: false,
      onionSkinFrames: 2,
    };
    
    // Center the stage
    this.centerStage();
  }
  
  /**
   * Center the stage in the viewport
   */
  centerStage(): void {
    const containerWidth = this.canvas.parentElement?.clientWidth ?? this.canvas.width;
    const containerHeight = this.canvas.parentElement?.clientHeight ?? this.canvas.height;
    
    this.panX = (containerWidth - this.document.settings.width * this.zoom) / 2;
    this.panY = (containerHeight - this.document.settings.height * this.zoom) / 2;
  }
  
  /**
   * Set zoom level
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(4, zoom));
  }
  
  /**
   * Pan by delta
   */
  pan(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
  }
  
  /**
   * Convert screen coordinates to stage coordinates
   */
  screenToStage(x: number, y: number): Point {
    return {
      x: (x - this.panX) / this.zoom,
      y: (y - this.panY) / this.zoom,
    };
  }
  
  /**
   * Convert stage coordinates to screen coordinates
   */
  stageToScreen(x: number, y: number): Point {
    return {
      x: x * this.zoom + this.panX,
      y: y * this.zoom + this.panY,
    };
  }
  
  /**
   * Render the full scene
   */
  render(): void {
    const { ctx, canvas } = this;
    const { width, height } = canvas;
    
    // Clear canvas with workspace color
    ctx.fillStyle = '#2d2d30';
    ctx.fillRect(0, 0, width, height);
    
    ctx.save();
    
    // Apply pan and zoom
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);
    
    // Draw stage background
    this.drawStageBackground();
    
    // Draw grid if enabled
    if (this.options.showGrid) {
      this.drawGrid();
    }
    
    // Draw onion skin (previous frames) if enabled
    if (this.options.onionSkinning) {
      this.drawOnionSkin();
    }
    
    // Draw all visible shapes
    const shapes = this.document.getVisibleShapes();
    for (const { shape } of shapes) {
      this.drawShape(shape);
    }
    
    // Draw selection handles
    this.drawSelectionHandles();
    
    ctx.restore();
  }
  
  /**
   * Draw the white stage background
   */
  private drawStageBackground(): void {
    const { ctx } = this;
    const { width, height, backgroundColor } = this.document.settings;
    
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    
    // Stage
    ctx.fillStyle = colorToRGBA(backgroundColor);
    ctx.fillRect(0, 0, width, height);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  
  /**
   * Draw grid overlay
   */
  private drawGrid(): void {
    const { ctx } = this;
    const { width, height } = this.document.settings;
    const { gridSize } = this.options;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  
  /**
   * Draw onion skinning (previous/next frames)
   */
  private drawOnionSkin(): void {
    const currentFrame = this.document.currentFrame;
    const { onionSkinFrames } = this.options;
    
    // Draw previous frames
    for (let i = 1; i <= onionSkinFrames; i++) {
      const frameIndex = currentFrame - i;
      if (frameIndex < 1) continue;
      
      const opacity = 0.3 - (i * 0.1);
      this.drawFrameShapes(frameIndex, `rgba(255, 0, 0, ${opacity})`);
    }
    
    // Draw next frames (optional)
    for (let i = 1; i <= onionSkinFrames; i++) {
      const frameIndex = currentFrame + i;
      if (frameIndex > this.document.totalFrames) continue;
      
      const opacity = 0.3 - (i * 0.1);
      this.drawFrameShapes(frameIndex, `rgba(0, 128, 0, ${opacity})`);
    }
  }
  
  /**
   * Draw shapes at a specific frame with tint
   */
  private drawFrameShapes(frameIndex: number, tint: string): void {
    const originalFrame = this.document.currentFrame;
    this.document.currentFrame = frameIndex;
    
    const shapes = this.document.getVisibleShapes();
    this.ctx.globalAlpha = 0.3;
    
    for (const { shape } of shapes) {
      this.drawShape(shape, tint);
    }
    
    this.ctx.globalAlpha = 1;
    this.document.currentFrame = originalFrame;
  }
  
  /**
   * Draw a shape
   */
  drawShape(shape: Shape, fillOverride?: string): void {
    const { ctx } = this;
    
    ctx.save();
    
    // Apply shape transform
    this.applyTransform(shape.transform);
    
    // Draw each path
    for (const path of shape.paths) {
      ctx.beginPath();
      this.tracePath(path);
      
      // Fill
      if (shape.fill || fillOverride) {
        if (fillOverride) {
          ctx.fillStyle = fillOverride;
        } else if (shape.fill?.type === 'solid' && shape.fill.color) {
          ctx.fillStyle = colorToRGBA(shape.fill.color);
        }
        ctx.fill();
      }
      
      // Stroke
      if (shape.stroke) {
        ctx.strokeStyle = colorToRGBA(shape.stroke.color);
        ctx.lineWidth = shape.stroke.width;
        ctx.lineCap = shape.stroke.lineCap;
        ctx.lineJoin = shape.stroke.lineJoin;
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }
  
  /**
   * Apply transform to context
   */
  private applyTransform(transform: Transform): void {
    const { ctx } = this;
    
    ctx.translate(transform.x, transform.y);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.globalAlpha *= transform.alpha;
    
    // Skew would require matrix transforms
  }
  
  /**
   * Trace a vector path
   */
  private tracePath(path: VectorPath): void {
    const { ctx } = this;
    
    for (const cmd of path.commands) {
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
        case 'Q':
          ctx.quadraticCurveTo(
            cmd.points[0].x, cmd.points[0].y,
            cmd.points[1].x, cmd.points[1].y
          );
          break;
        case 'Z':
          ctx.closePath();
          break;
      }
    }
  }
  
  /**
   * Draw selection handles for selected shapes
   */
  private drawSelectionHandles(): void {
    const { ctx } = this;
    const selectedIds = this.document.selectedShapeIds;
    
    if (selectedIds.length === 0) return;
    
    const shapes = this.document.getVisibleShapes();
    
    for (const { shape } of shapes) {
      if (!selectedIds.includes(shape.id)) continue;
      
      const bounds = shape.getBounds();
      
      // Draw bounding box
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 1 / this.zoom;
      ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.setLineDash([]);
      
      // Draw corner handles
      const handleSize = 6 / this.zoom;
      ctx.fillStyle = '#4fc3f7';
      
      const corners = [
        { x: bounds.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
        { x: bounds.x, y: bounds.y + bounds.height },
      ];
      
      for (const corner of corners) {
        ctx.fillRect(
          corner.x - handleSize / 2,
          corner.y - handleSize / 2,
          handleSize,
          handleSize
        );
      }
      
      // Draw center handles
      ctx.fillStyle = 'white';
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 1 / this.zoom;
      
      const centers = [
        { x: bounds.x + bounds.width / 2, y: bounds.y },
        { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
        { x: bounds.x, y: bounds.y + bounds.height / 2 },
      ];
      
      for (const center of centers) {
        ctx.fillRect(
          center.x - handleSize / 2,
          center.y - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.strokeRect(
          center.x - handleSize / 2,
          center.y - handleSize / 2,
          handleSize,
          handleSize
        );
      }
    }
  }
  
  /**
   * Hit test - find shape at point
   */
  hitTest(screenX: number, screenY: number): Shape | null {
    const point = this.screenToStage(screenX, screenY);
    const shapes = this.document.getVisibleShapes();
    
    // Test from top to bottom
    for (let i = shapes.length - 1; i >= 0; i--) {
      const { shape, layerId } = shapes[i];
      const layer = this.document.getLayer(layerId);
      
      if (layer?.locked) continue;
      
      if (shape.containsPoint(point)) {
        return shape;
      }
    }
    
    return null;
  }
  
  /**
   * Update render options
   */
  setOptions(options: Partial<RenderOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Get current render options
   */
  getOptions(): RenderOptions {
    return { ...this.options };
  }
}
