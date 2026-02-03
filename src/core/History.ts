/**
 * History - Undo/Redo system using command pattern
 */

import { Document } from './Document';
import { Shape, ShapeData } from './Shape';
import { Frame, FrameData } from './Frame';
import { Layer } from './Layer';
import { UID, Transform, TweenType, EasingFunction } from './types';

/**
 * Base command interface
 */
export interface Command {
  readonly type: string;
  readonly description: string;
  execute(): void;
  undo(): void;
}

/**
 * History manager - tracks and manages undo/redo operations
 */
export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number = 100;
  private document: Document;
  private isExecuting: boolean = false;
  
  constructor(document: Document) {
    this.document = document;
  }
  
  /**
   * Execute a command and add it to history
   */
  execute(command: Command): void {
    if (this.isExecuting) return;
    
    this.isExecuting = true;
    try {
      command.execute();
      this.undoStack.push(command);
      
      // Clear redo stack when new command is executed
      this.redoStack = [];
      
      // Limit history size
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      
      this.document.emit('historyChange', this.getState());
    } finally {
      this.isExecuting = false;
    }
  }
  
  /**
   * Undo the last command
   */
  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    if (this.isExecuting) return false;
    
    this.isExecuting = true;
    try {
      const command = this.undoStack.pop()!;
      command.undo();
      this.redoStack.push(command);
      
      this.document.emit('historyChange', this.getState());
      this.document.emit('render');
      return true;
    } finally {
      this.isExecuting = false;
    }
  }
  
  /**
   * Redo the last undone command
   */
  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    if (this.isExecuting) return false;
    
    this.isExecuting = true;
    try {
      const command = this.redoStack.pop()!;
      command.execute();
      this.undoStack.push(command);
      
      this.document.emit('historyChange', this.getState());
      this.document.emit('render');
      return true;
    } finally {
      this.isExecuting = false;
    }
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Get current state for UI
   */
  getState(): HistoryState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoDescription: this.undoStack[this.undoStack.length - 1]?.description ?? null,
      redoDescription: this.redoStack[this.redoStack.length - 1]?.description ?? null,
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
    };
  }
  
  /**
   * Get history list for UI panel
   */
  getHistoryList(): Array<{ description: string; isCurrent: boolean }> {
    const list: Array<{ description: string; isCurrent: boolean }> = [];
    
    // Show undo stack (oldest first)
    for (const cmd of this.undoStack) {
      list.push({ description: cmd.description, isCurrent: false });
    }
    
    // Mark current state
    if (list.length > 0) {
      list[list.length - 1].isCurrent = true;
    }
    
    return list;
  }
  
  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.document.emit('historyChange', this.getState());
  }
  
  /**
   * Set maximum history size
   */
  setMaxHistory(max: number): void {
    this.maxHistory = Math.max(1, max);
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }
}

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  undoCount: number;
  redoCount: number;
}

// ============ Command Implementations ============

/**
 * Add shape command
 */
export class AddShapeCommand implements Command {
  readonly type = 'addShape';
  readonly description: string;
  
  constructor(
    private document: Document,
    private layerId: UID,
    private frameIndex: number,
    private shape: Shape
  ) {
    this.description = `Add ${shape.name || 'shape'}`;
  }
  
  execute(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    layer.addShapeAtFrame(this.frameIndex, this.shape);
    this.document.selectShape(this.shape.id);
  }
  
  undo(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    const keyframe = layer.getKeyframeAt(this.frameIndex);
    if (keyframe) {
      keyframe.removeShape(this.shape.id);
    }
    this.document.deselectShape(this.shape.id);
  }
}

/**
 * Remove shapes command
 */
export class RemoveShapesCommand implements Command {
  readonly type = 'removeShapes';
  readonly description: string;
  private removedShapes: Array<{ layerId: UID; frameIndex: number; shape: Shape }> = [];
  
  constructor(
    private document: Document,
    private shapeIds: UID[]
  ) {
    this.description = `Delete ${shapeIds.length} shape(s)`;
  }
  
  execute(): void {
    // Store shapes before removing
    this.removedShapes = [];
    
    for (const layer of this.document.layers) {
      const frameIndex = this.document.currentFrame;
      const keyframe = layer.getKeyframeAt(frameIndex);
      if (!keyframe) continue;
      
      for (const shapeId of this.shapeIds) {
        const shape = keyframe.getShape(shapeId);
        if (shape) {
          this.removedShapes.push({
            layerId: layer.id,
            frameIndex: keyframe.index,
            shape: shape.clone(),
          });
          keyframe.removeShape(shapeId);
        }
      }
    }
    
    this.document.clearSelection();
  }
  
  undo(): void {
    for (const { layerId, frameIndex, shape } of this.removedShapes) {
      const layer = this.document.getLayer(layerId);
      if (!layer) continue;
      
      const keyframe = layer.getKeyframeAt(frameIndex);
      if (keyframe) {
        keyframe.addShape(shape.clone());
      }
    }
  }
}

/**
 * Move shapes command
 */
export class MoveShapesCommand implements Command {
  readonly type = 'moveShapes';
  readonly description = 'Move shapes';
  
  constructor(
    private document: Document,
    private movements: Array<{ shapeId: UID; startX: number; startY: number; endX: number; endY: number }>
  ) {}
  
  execute(): void {
    for (const { shapeId, endX, endY } of this.movements) {
      const shape = this.findShape(shapeId);
      if (shape) {
        shape.transform.x = endX;
        shape.transform.y = endY;
      }
    }
  }
  
  undo(): void {
    for (const { shapeId, startX, startY } of this.movements) {
      const shape = this.findShape(shapeId);
      if (shape) {
        shape.transform.x = startX;
        shape.transform.y = startY;
      }
    }
  }
  
  private findShape(shapeId: UID): Shape | undefined {
    const shapes = this.document.getVisibleShapes();
    return shapes.find(s => s.shape.id === shapeId)?.shape;
  }
}

/**
 * Transform shapes command (scale, rotate, etc.)
 */
export class TransformShapesCommand implements Command {
  readonly type = 'transformShapes';
  readonly description: string;
  
  constructor(
    private document: Document,
    private transforms: Array<{ shapeId: UID; before: Transform; after: Transform }>,
    description?: string
  ) {
    this.description = description ?? 'Transform shapes';
  }
  
  execute(): void {
    for (const { shapeId, after } of this.transforms) {
      const shape = this.findShape(shapeId);
      if (shape) {
        shape.transform = { ...after };
      }
    }
  }
  
  undo(): void {
    for (const { shapeId, before } of this.transforms) {
      const shape = this.findShape(shapeId);
      if (shape) {
        shape.transform = { ...before };
      }
    }
  }
  
  private findShape(shapeId: UID): Shape | undefined {
    const shapes = this.document.getVisibleShapes();
    return shapes.find(s => s.shape.id === shapeId)?.shape;
  }
}

/**
 * Insert keyframe command
 */
export class InsertKeyframeCommand implements Command {
  readonly type = 'insertKeyframe';
  readonly description: string;
  private wasKeyframe: boolean = false;
  private previousFrameData: FrameData | null = null;
  
  constructor(
    private document: Document,
    private layerId: UID,
    private frameIndex: number,
    private blank: boolean = false
  ) {
    this.description = blank ? 'Insert blank keyframe' : 'Insert keyframe';
  }
  
  execute(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    // Store previous state
    const existingFrame = layer.getFrame(this.frameIndex);
    if (existingFrame) {
      this.wasKeyframe = existingFrame.isKeyframe;
      this.previousFrameData = existingFrame.toJSON();
    }
    
    if (this.blank) {
      layer.insertBlankKeyframe(this.frameIndex);
    } else {
      layer.insertKeyframe(this.frameIndex);
    }
  }
  
  undo(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    if (this.previousFrameData && this.wasKeyframe) {
      // Restore previous frame state
      const frame = layer.getFrame(this.frameIndex);
      if (frame) {
        frame.shapes = this.previousFrameData.shapes.map(s => Shape.fromJSON(s as any));
        frame.isEmpty = this.previousFrameData.isEmpty;
        frame.tweenType = this.previousFrameData.tweenType;
        frame.easing = this.previousFrameData.easing;
      }
    } else {
      // Remove the keyframe
      layer.clearKeyframe(this.frameIndex);
    }
  }
}

/**
 * Clear keyframe command
 */
export class ClearKeyframeCommand implements Command {
  readonly type = 'clearKeyframe';
  readonly description = 'Clear keyframe';
  private frameData: FrameData | null = null;
  
  constructor(
    private document: Document,
    private layerId: UID,
    private frameIndex: number
  ) {}
  
  execute(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    const frame = layer.getFrame(this.frameIndex);
    if (frame?.isKeyframe) {
      this.frameData = frame.toJSON();
      layer.clearKeyframe(this.frameIndex);
    }
  }
  
  undo(): void {
    if (!this.frameData) return;
    
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    // Recreate the keyframe
    const frame = layer.insertKeyframe(this.frameIndex);
    frame.shapes = this.frameData.shapes.map(s => Shape.fromJSON(s as any));
    frame.isEmpty = this.frameData.isEmpty;
    frame.tweenType = this.frameData.tweenType;
    frame.easing = this.frameData.easing;
  }
}

/**
 * Add layer command
 */
export class AddLayerCommand implements Command {
  readonly type = 'addLayer';
  readonly description = 'Add layer';
  private layerId: UID | null = null;
  
  constructor(
    private document: Document,
    private name?: string
  ) {}
  
  execute(): void {
    const layer = this.document.addLayer(this.name);
    this.layerId = layer.id;
  }
  
  undo(): void {
    if (this.layerId) {
      this.document.removeLayer(this.layerId);
    }
  }
}

/**
 * Remove layer command
 */
export class RemoveLayerCommand implements Command {
  readonly type = 'removeLayer';
  readonly description = 'Remove layer';
  private layerIndex: number = -1;
  private layerData: any = null;
  
  constructor(
    private document: Document,
    private layerId: UID
  ) {}
  
  execute(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    this.layerIndex = this.document.layers.indexOf(layer);
    this.layerData = layer.toJSON();
    
    this.document.removeLayer(this.layerId);
  }
  
  undo(): void {
    if (!this.layerData || this.layerIndex < 0) return;
    
    const layer = new Layer(this.layerData);
    this.document.layers.splice(this.layerIndex, 0, layer);
    this.document.selectLayer(layer.id);
    this.document.emit('layerAdd', { layer });
  }
}

/**
 * Set tween command
 */
export class SetTweenCommand implements Command {
  readonly type = 'setTween';
  readonly description: string;
  private previousTweenType: TweenType = 'none';
  private previousEasing?: EasingFunction;
  
  constructor(
    private document: Document,
    private layerId: UID,
    private frameIndex: number,
    private tweenType: TweenType,
    private easing?: EasingFunction
  ) {
    this.description = tweenType === 'none' ? 'Remove tween' : `Set ${tweenType} tween`;
  }
  
  execute(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    const frame = layer.getFrame(this.frameIndex);
    if (!frame?.isKeyframe) return;
    
    // Store previous state
    this.previousTweenType = frame.tweenType;
    this.previousEasing = frame.easing;
    
    // Apply new tween
    if (this.tweenType === 'none') {
      frame.removeTween();
    } else if (this.tweenType === 'motion') {
      frame.setMotionTween(this.easing);
    } else if (this.tweenType === 'shape') {
      frame.setShapeTween(this.easing);
    }
  }
  
  undo(): void {
    const layer = this.document.getLayer(this.layerId);
    if (!layer) return;
    
    const frame = layer.getFrame(this.frameIndex);
    if (!frame?.isKeyframe) return;
    
    // Restore previous state
    if (this.previousTweenType === 'none') {
      frame.removeTween();
    } else if (this.previousTweenType === 'motion') {
      frame.setMotionTween(this.previousEasing);
    } else if (this.previousTweenType === 'shape') {
      frame.setShapeTween(this.previousEasing);
    }
  }
}

/**
 * Composite command - groups multiple commands into one
 */
export class CompositeCommand implements Command {
  readonly type = 'composite';
  readonly description: string;
  
  constructor(
    private commands: Command[],
    description?: string
  ) {
    this.description = description ?? commands[0]?.description ?? 'Multiple changes';
  }
  
  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }
  
  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}
