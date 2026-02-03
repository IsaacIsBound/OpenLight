/**
 * Frame - Represents a single frame in the timeline
 */

import { UID, TweenType, EasingFunction, generateUID } from './types';
import { Shape } from './Shape';

export interface FrameData {
  id: UID;
  index: number;           // Frame number (1-based like Flash)
  isKeyframe: boolean;
  isEmpty: boolean;        // Blank keyframe (no content)
  shapes: Shape[];
  tweenType: TweenType;
  easing?: EasingFunction;
  duration: number;        // How many frames this keyframe spans
}

export class Frame {
  public id: UID;
  public index: number;
  public isKeyframe: boolean;
  public isEmpty: boolean;
  public shapes: Shape[] = [];
  public tweenType: TweenType = 'none';
  public easing?: EasingFunction;
  public duration: number = 1;
  
  constructor(data?: Partial<FrameData>) {
    this.id = data?.id ?? generateUID();
    this.index = data?.index ?? 1;
    this.isKeyframe = data?.isKeyframe ?? false;
    this.isEmpty = data?.isEmpty ?? true;
    this.shapes = data?.shapes ?? [];
    this.tweenType = data?.tweenType ?? 'none';
    this.easing = data?.easing;
    this.duration = data?.duration ?? 1;
    
    // If we have shapes, it's not empty
    if (this.shapes.length > 0) {
      this.isEmpty = false;
    }
  }
  
  /**
   * Add a shape to this frame
   */
  addShape(shape: Shape): void {
    this.shapes.push(shape);
    this.isEmpty = false;
  }
  
  /**
   * Remove a shape from this frame
   */
  removeShape(shapeId: UID): boolean {
    const index = this.shapes.findIndex(s => s.id === shapeId);
    if (index >= 0) {
      this.shapes.splice(index, 1);
      this.isEmpty = this.shapes.length === 0;
      return true;
    }
    return false;
  }
  
  /**
   * Get a shape by ID
   */
  getShape(shapeId: UID): Shape | undefined {
    return this.shapes.find(s => s.id === shapeId);
  }
  
  /**
   * Clear all shapes
   */
  clear(): void {
    this.shapes = [];
    this.isEmpty = true;
  }
  
  /**
   * Clone the frame
   */
  clone(): Frame {
    return new Frame({
      index: this.index,
      isKeyframe: this.isKeyframe,
      isEmpty: this.isEmpty,
      shapes: this.shapes.map(s => s.clone()),
      tweenType: this.tweenType,
      easing: this.easing ? { ...this.easing } : undefined,
      duration: this.duration,
    });
  }
  
  /**
   * Convert to keyframe
   */
  makeKeyframe(): void {
    this.isKeyframe = true;
  }
  
  /**
   * Convert to blank keyframe
   */
  makeBlankKeyframe(): void {
    this.isKeyframe = true;
    this.shapes = [];
    this.isEmpty = true;
    this.tweenType = 'none';
  }
  
  /**
   * Clear keyframe (becomes regular frame)
   */
  clearKeyframe(): void {
    this.isKeyframe = false;
    this.tweenType = 'none';
  }
  
  /**
   * Set motion tween
   */
  setMotionTween(easing?: EasingFunction): void {
    if (!this.isKeyframe) return;
    this.tweenType = 'motion';
    this.easing = easing ?? { type: 'linear' };
  }
  
  /**
   * Set shape tween
   */
  setShapeTween(easing?: EasingFunction): void {
    if (!this.isKeyframe) return;
    this.tweenType = 'shape';
    this.easing = easing ?? { type: 'linear' };
  }
  
  /**
   * Remove tween
   */
  removeTween(): void {
    this.tweenType = 'none';
    this.easing = undefined;
  }
  
  /**
   * Serialize to JSON
   */
  toJSON(): FrameData {
    return {
      id: this.id,
      index: this.index,
      isKeyframe: this.isKeyframe,
      isEmpty: this.isEmpty,
      shapes: this.shapes.map(s => s.toJSON()) as any,
      tweenType: this.tweenType,
      easing: this.easing,
      duration: this.duration,
    };
  }
}
