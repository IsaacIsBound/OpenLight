/**
 * Tool - Base class for all drawing/editing tools
 */

import { Document } from '../core/Document';
import { Renderer } from '../render/Renderer';
import { HistoryManager } from '../core/History';
import { Point, ToolType } from '../core/types';

export interface ToolContext {
  document: Document;
  renderer: Renderer;
  history?: HistoryManager;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
}

export interface PointerEvent {
  x: number;
  y: number;
  pressure: number;
  button: number;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
}

export abstract class Tool {
  abstract readonly type: ToolType;
  abstract readonly name: string;
  abstract readonly icon: string;
  abstract readonly shortcut: string;
  
  protected context: ToolContext;
  protected isActive: boolean = false;
  protected startPoint: Point | null = null;
  protected lastPoint: Point | null = null;
  
  constructor(context: ToolContext) {
    this.context = context;
  }
  
  /**
   * Called when tool is selected
   */
  onActivate(): void {
    // Override in subclass
  }
  
  /**
   * Called when tool is deselected
   */
  onDeactivate(): void {
    this.isActive = false;
    this.startPoint = null;
    this.lastPoint = null;
  }
  
  /**
   * Mouse/touch down
   */
  onPointerDown(event: PointerEvent): void {
    this.isActive = true;
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    this.startPoint = stagePoint;
    this.lastPoint = stagePoint;
  }
  
  /**
   * Mouse/touch move
   */
  onPointerMove(event: PointerEvent): void {
    if (!this.isActive) return;
    const stagePoint = this.context.renderer.screenToStage(event.x, event.y);
    this.lastPoint = stagePoint;
  }
  
  /**
   * Mouse/touch up
   */
  onPointerUp(event: PointerEvent): void {
    this.isActive = false;
    this.startPoint = null;
    this.lastPoint = null;
  }
  
  /**
   * Key down
   */
  onKeyDown(_key: string, _event: KeyboardEvent): void {
    // Override in subclass
  }
  
  /**
   * Key up
   */
  onKeyUp(_key: string, _event: KeyboardEvent): void {
    // Override in subclass
  }
  
  /**
   * Draw tool preview (e.g., shape being created)
   */
  drawPreview(_ctx: CanvasRenderingContext2D): void {
    // Override in subclass
  }
  
  /**
   * Get cursor style
   */
  getCursor(): string {
    return 'default';
  }
}
