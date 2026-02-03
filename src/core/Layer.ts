/**
 * Layer - A timeline layer containing frames
 */

import { UID, generateUID } from './types';
import { Frame } from './Frame';
import { Shape } from './Shape';

export interface LayerData {
  id: UID;
  name: string;
  visible: boolean;
  locked: boolean;
  frames: Frame[];
  color: string;  // Layer color for UI
}

export class Layer {
  public id: UID;
  public name: string;
  public visible: boolean = true;
  public locked: boolean = false;
  public frames: Frame[] = [];
  public color: string;
  
  private static layerCount = 0;
  private static readonly LAYER_COLORS = [
    '#4fc3f7', '#81c784', '#ffb74d', '#f06292', 
    '#ba68c8', '#4dd0e1', '#aed581', '#ff8a65',
  ];
  
  constructor(data?: Partial<LayerData>) {
    Layer.layerCount++;
    this.id = data?.id ?? generateUID();
    this.name = data?.name ?? `Layer ${Layer.layerCount}`;
    this.visible = data?.visible ?? true;
    this.locked = data?.locked ?? false;
    this.color = data?.color ?? Layer.LAYER_COLORS[Layer.layerCount % Layer.LAYER_COLORS.length];
    
    if (data?.frames) {
      this.frames = data.frames;
    } else {
      // Initialize with a keyframe at frame 1
      this.frames.push(new Frame({ index: 1, isKeyframe: true }));
    }
  }
  
  /**
   * Get frame at index
   */
  getFrame(index: number): Frame | undefined {
    return this.frames.find(f => f.index === index);
  }
  
  /**
   * Get the keyframe that applies at a given frame index
   * (the nearest keyframe at or before the index)
   */
  getKeyframeAt(index: number): Frame | undefined {
    // Find keyframes at or before this index
    const keyframes = this.frames
      .filter(f => f.isKeyframe && f.index <= index)
      .sort((a, b) => b.index - a.index);
    return keyframes[0];
  }
  
  /**
   * Get the next keyframe after the given index
   */
  getNextKeyframe(index: number): Frame | undefined {
    const keyframes = this.frames
      .filter(f => f.isKeyframe && f.index > index)
      .sort((a, b) => a.index - b.index);
    return keyframes[0];
  }
  
  /**
   * Insert a keyframe at index
   */
  insertKeyframe(index: number): Frame {
    let frame = this.getFrame(index);
    
    if (frame) {
      // Frame exists, make it a keyframe
      frame.makeKeyframe();
      
      // Copy content from previous keyframe if this was empty
      if (frame.isEmpty) {
        const prevKeyframe = this.getKeyframeAt(index - 1);
        if (prevKeyframe && !prevKeyframe.isEmpty) {
          frame.shapes = prevKeyframe.shapes.map(s => s.clone());
          frame.isEmpty = false;
        }
      }
    } else {
      // Create new frame
      const prevKeyframe = this.getKeyframeAt(index);
      frame = new Frame({
        index,
        isKeyframe: true,
        shapes: prevKeyframe && !prevKeyframe.isEmpty 
          ? prevKeyframe.shapes.map(s => s.clone()) 
          : [],
        isEmpty: !prevKeyframe || prevKeyframe.isEmpty,
      });
      this.frames.push(frame);
      this.frames.sort((a, b) => a.index - b.index);
    }
    
    return frame;
  }
  
  /**
   * Insert a blank keyframe at index
   */
  insertBlankKeyframe(index: number): Frame {
    let frame = this.getFrame(index);
    
    if (frame) {
      frame.makeBlankKeyframe();
    } else {
      frame = new Frame({
        index,
        isKeyframe: true,
        isEmpty: true,
      });
      this.frames.push(frame);
      this.frames.sort((a, b) => a.index - b.index);
    }
    
    return frame;
  }
  
  /**
   * Clear keyframe at index
   */
  clearKeyframe(index: number): void {
    const frame = this.getFrame(index);
    if (frame && frame.isKeyframe) {
      // Don't remove the first keyframe
      if (index === 1) {
        frame.clear();
        return;
      }
      
      // Remove the frame
      const frameIndex = this.frames.indexOf(frame);
      if (frameIndex >= 0) {
        this.frames.splice(frameIndex, 1);
      }
    }
  }
  
  /**
   * Add shape to the current keyframe at index
   */
  addShapeAtFrame(index: number, shape: Shape): void {
    let keyframe = this.getKeyframeAt(index);
    
    if (!keyframe) {
      keyframe = this.insertKeyframe(index);
    } else if (keyframe.index !== index) {
      // We're on a frame between keyframes, create new keyframe
      keyframe = this.insertKeyframe(index);
    }
    
    keyframe.addShape(shape);
  }
  
  /**
   * Get all shapes visible at frame index
   */
  getShapesAtFrame(index: number): Shape[] {
    const keyframe = this.getKeyframeAt(index);
    return keyframe?.shapes ?? [];
  }
  
  /**
   * Get the total number of frames (span)
   */
  getFrameCount(): number {
    if (this.frames.length === 0) return 1;
    return Math.max(...this.frames.map(f => f.index));
  }
  
  /**
   * Extend layer to frame count
   */
  extendTo(frameCount: number): void {
    // Just ensure we have at least one keyframe, frames in between are implicit
    if (this.frames.length === 0) {
      this.frames.push(new Frame({ index: 1, isKeyframe: true }));
    }
  }
  
  /**
   * Toggle visibility
   */
  toggleVisibility(): void {
    this.visible = !this.visible;
  }
  
  /**
   * Toggle lock
   */
  toggleLock(): void {
    this.locked = !this.locked;
  }
  
  /**
   * Clone the layer
   */
  clone(): Layer {
    return new Layer({
      name: this.name + ' Copy',
      visible: this.visible,
      locked: this.locked,
      frames: this.frames.map(f => f.clone()),
      color: this.color,
    });
  }
  
  /**
   * Serialize to JSON
   */
  toJSON(): LayerData {
    return {
      id: this.id,
      name: this.name,
      visible: this.visible,
      locked: this.locked,
      frames: this.frames.map(f => f.toJSON()) as any,
      color: this.color,
    };
  }
}
