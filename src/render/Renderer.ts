/**
 * Renderer - Canvas rendering engine for Flare
 */

import { Document } from '../core/Document';
import { Shape } from '../core/Shape';
import { VectorPath, Point, colorToRGBA, Transform } from '../core/types';

export interface OnionSkinSettings {
  enabled: boolean;
  framesBefore: number;      // Number of previous frames to show
  framesAfter: number;       // Number of next frames to show
  opacityBefore: number;     // Base opacity for previous frames (0-1)
  opacityAfter: number;      // Base opacity for next frames (0-1)
  colorBefore: string;       // Tint color for previous frames (red/pink)
  colorAfter: string;        // Tint color for next frames (green/blue)
}

export interface RenderOptions {
  showGrid: boolean;
  gridSize: number;
  showGuides: boolean;
  onionSkin: OnionSkinSettings;
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
      onionSkin: {
        enabled: false,
        framesBefore: 2,
        framesAfter: 2,
        opacityBefore: 0.3,
        opacityAfter: 0.3,
        colorBefore: 'rgba(255, 100, 100',   // Red/pink tint
        colorAfter: 'rgba(100, 200, 100',    // Green tint
      },
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
    
    // Draw onion skin (previous/next frames) if enabled
    if (this.options.onionSkin.enabled) {
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
    const { onionSkin } = this.options;
    
    // Draw previous frames (furthest first so closer frames are on top)
    for (let i = onionSkin.framesBefore; i >= 1; i--) {
      const frameIndex = currentFrame - i;
      if (frameIndex < 1) continue;
      
      // Opacity decreases the further from current frame
      const opacityFactor = 1 - ((i - 1) / onionSkin.framesBefore);
      const opacity = onionSkin.opacityBefore * opacityFactor;
      const tint = `${onionSkin.colorBefore}, ${opacity})`;
      
      this.drawFrameShapes(frameIndex, tint, opacity);
    }
    
    // Draw next frames (furthest first so closer frames are on top)
    for (let i = onionSkin.framesAfter; i >= 1; i--) {
      const frameIndex = currentFrame + i;
      if (frameIndex > this.document.totalFrames) continue;
      
      // Opacity decreases the further from current frame
      const opacityFactor = 1 - ((i - 1) / onionSkin.framesAfter);
      const opacity = onionSkin.opacityAfter * opacityFactor;
      const tint = `${onionSkin.colorAfter}, ${opacity})`;
      
      this.drawFrameShapes(frameIndex, tint, opacity);
    }
  }
  
  /**
   * Draw shapes at a specific frame with tint for onion skinning
   */
  private drawFrameShapes(frameIndex: number, tint: string, opacity: number): void {
    const { ctx } = this;
    
    // Get shapes at the specified frame without changing document state
    const shapes = this.getShapesAtFrame(frameIndex);
    
    ctx.save();
    ctx.globalAlpha = opacity;
    
    for (const { shape } of shapes) {
      this.drawShape(shape, tint);
    }
    
    ctx.restore();
  }
  
  /**
   * Get shapes visible at a specific frame (without changing document state)
   */
  private getShapesAtFrame(frameIndex: number): Array<{ shape: Shape; layerId: string }> {
    const result: Array<{ shape: Shape; layerId: string }> = [];
    
    // Iterate from bottom to top (last layer is bottom)
    for (let i = this.document.layers.length - 1; i >= 0; i--) {
      const layer = this.document.layers[i];
      if (!layer.visible) continue;
      
      const shapes = layer.getShapesAtFrame(frameIndex);
      for (const shape of shapes) {
        result.push({ shape, layerId: layer.id });
      }
    }
    
    return result;
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
  
  /**
   * Toggle onion skinning on/off
   */
  toggleOnionSkin(): boolean {
    this.options.onionSkin.enabled = !this.options.onionSkin.enabled;
    return this.options.onionSkin.enabled;
  }
  
  /**
   * Get onion skin settings
   */
  getOnionSkinSettings(): OnionSkinSettings {
    return { ...this.options.onionSkin };
  }
  
  /**
   * Update onion skin settings
   */
  setOnionSkinSettings(settings: Partial<OnionSkinSettings>): void {
    this.options.onionSkin = { ...this.options.onionSkin, ...settings };
  }
}
