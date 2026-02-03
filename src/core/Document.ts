/**
 * Document - The main Flare project container
 */

import { UID, generateUID, Color, hexToColor } from './types';
import { Layer } from './Layer';
import { Frame } from './Frame';
import { Shape } from './Shape';
import { Symbol, Library } from './Symbol';

export interface DocumentSettings {
  width: number;
  height: number;
  frameRate: number;
  backgroundColor: Color;
}

export interface DocumentData {
  id: UID;
  name: string;
  settings: DocumentSettings;
  layers: Layer[];
  library: Symbol[];
  version: string;
}

export class Document {
  public id: UID;
  public name: string;
  public settings: DocumentSettings;
  public layers: Layer[] = [];
  public library: Library;
  public version: string = '0.1.0';
  
  // Current state
  private _currentFrame: number = 1;
  private _selectedLayerId: UID | null = null;
  private _selectedShapeIds: Set<UID> = new Set();
  
  // Event callbacks
  private listeners: Map<string, Function[]> = new Map();
  
  constructor(data?: Partial<DocumentData>) {
    this.id = data?.id ?? generateUID();
    this.name = data?.name ?? 'Untitled';
    this.settings = data?.settings ?? {
      width: 800,
      height: 600,
      frameRate: 24,
      backgroundColor: hexToColor('#ffffff'),
    };
    this.library = new Library();
    
    if (data?.layers) {
      this.layers = data.layers.map(l => 
        l instanceof Layer ? l : new Layer(l as any)
      );
    } else {
      // Start with one layer
      const initialLayer = new Layer({ name: 'Layer 1' });
      this.layers.push(initialLayer);
      this._selectedLayerId = initialLayer.id;
    }
    
    // Load library
    if (data?.library) {
      for (const symbolData of data.library) {
        this.library.addSymbol(new Symbol(symbolData as any));
      }
    }
  }
  
  // ============ Frame Navigation ============
  
  get currentFrame(): number {
    return this._currentFrame;
  }
  
  set currentFrame(frame: number) {
    const newFrame = Math.max(1, frame);
    if (newFrame !== this._currentFrame) {
      this._currentFrame = newFrame;
      this.emit('frameChange', { frame: newFrame });
    }
  }
  
  get totalFrames(): number {
    let max = 60;  // Minimum visible frames
    for (const layer of this.layers) {
      max = Math.max(max, layer.getFrameCount());
    }
    return max;
  }
  
  nextFrame(): void {
    this.currentFrame++;
  }
  
  prevFrame(): void {
    this.currentFrame--;
  }
  
  firstFrame(): void {
    this.currentFrame = 1;
  }
  
  lastFrame(): void {
    this.currentFrame = this.totalFrames;
  }
  
  // ============ Layer Management ============
  
  get selectedLayer(): Layer | null {
    if (!this._selectedLayerId) return null;
    return this.layers.find(l => l.id === this._selectedLayerId) ?? null;
  }
  
  get selectedLayerId(): UID | null {
    return this._selectedLayerId;
  }
  
  selectLayer(layerId: UID): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      this._selectedLayerId = layerId;
      this.emit('layerSelect', { layerId });
    }
  }
  
  addLayer(name?: string): Layer {
    const layer = new Layer({ name });
    this.layers.unshift(layer);  // Add to top
    this._selectedLayerId = layer.id;
    this.emit('layerAdd', { layer });
    return layer;
  }
  
  removeLayer(layerId: UID): boolean {
    if (this.layers.length <= 1) return false;
    
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index >= 0) {
      this.layers.splice(index, 1);
      
      // Select another layer
      if (this._selectedLayerId === layerId) {
        this._selectedLayerId = this.layers[0]?.id ?? null;
      }
      
      this.emit('layerRemove', { layerId });
      return true;
    }
    return false;
  }
  
  moveLayerUp(layerId: UID): boolean {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index > 0) {
      const layer = this.layers.splice(index, 1)[0];
      this.layers.splice(index - 1, 0, layer);
      this.emit('layerMove', { layerId, direction: 'up' });
      return true;
    }
    return false;
  }
  
  moveLayerDown(layerId: UID): boolean {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index >= 0 && index < this.layers.length - 1) {
      const layer = this.layers.splice(index, 1)[0];
      this.layers.splice(index + 1, 0, layer);
      this.emit('layerMove', { layerId, direction: 'down' });
      return true;
    }
    return false;
  }
  
  getLayer(layerId: UID): Layer | undefined {
    return this.layers.find(l => l.id === layerId);
  }
  
  // ============ Keyframe Operations ============
  
  insertKeyframe(layerId?: UID, frameIndex?: number): Frame | null {
    const layer = layerId 
      ? this.getLayer(layerId) 
      : this.selectedLayer;
    
    if (!layer || layer.locked) return null;
    
    const index = frameIndex ?? this._currentFrame;
    const frame = layer.insertKeyframe(index);
    this.emit('keyframeInsert', { layerId: layer.id, frameIndex: index });
    return frame;
  }
  
  insertBlankKeyframe(layerId?: UID, frameIndex?: number): Frame | null {
    const layer = layerId 
      ? this.getLayer(layerId) 
      : this.selectedLayer;
    
    if (!layer || layer.locked) return null;
    
    const index = frameIndex ?? this._currentFrame;
    const frame = layer.insertBlankKeyframe(index);
    this.emit('keyframeInsert', { layerId: layer.id, frameIndex: index, blank: true });
    return frame;
  }
  
  clearKeyframe(layerId?: UID, frameIndex?: number): void {
    const layer = layerId 
      ? this.getLayer(layerId) 
      : this.selectedLayer;
    
    if (!layer || layer.locked) return;
    
    const index = frameIndex ?? this._currentFrame;
    layer.clearKeyframe(index);
    this.emit('keyframeClear', { layerId: layer.id, frameIndex: index });
  }
  
  // ============ Shape Operations ============
  
  get selectedShapeIds(): UID[] {
    return Array.from(this._selectedShapeIds);
  }
  
  selectShape(shapeId: UID, addToSelection = false): void {
    if (!addToSelection) {
      this._selectedShapeIds.clear();
    }
    this._selectedShapeIds.add(shapeId);
    this.emit('selectionChange', { selectedIds: this.selectedShapeIds });
  }
  
  deselectShape(shapeId: UID): void {
    this._selectedShapeIds.delete(shapeId);
    this.emit('selectionChange', { selectedIds: this.selectedShapeIds });
  }
  
  clearSelection(): void {
    this._selectedShapeIds.clear();
    this.emit('selectionChange', { selectedIds: [] });
  }
  
  addShape(shape: Shape): void {
    const layer = this.selectedLayer;
    if (!layer || layer.locked) return;
    
    layer.addShapeAtFrame(this._currentFrame, shape);
    this._selectedShapeIds.clear();
    this._selectedShapeIds.add(shape.id);
    this.emit('shapeAdd', { shape, layerId: layer.id, frame: this._currentFrame });
  }
  
  removeSelectedShapes(): void {
    const layer = this.selectedLayer;
    if (!layer || layer.locked) return;
    
    const keyframe = layer.getKeyframeAt(this._currentFrame);
    if (!keyframe) return;
    
    for (const shapeId of this._selectedShapeIds) {
      keyframe.removeShape(shapeId);
    }
    
    this._selectedShapeIds.clear();
    this.emit('shapesRemove', { layerId: layer.id, frame: this._currentFrame });
  }
  
  /**
   * Get all shapes visible at current frame
   */
  getVisibleShapes(): Array<{ shape: Shape; layerId: UID }> {
    const result: Array<{ shape: Shape; layerId: UID }> = [];
    
    // Iterate from bottom to top (last layer is bottom)
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      
      const shapes = layer.getShapesAtFrame(this._currentFrame);
      for (const shape of shapes) {
        result.push({ shape, layerId: layer.id });
      }
    }
    
    return result;
  }
  
  // ============ Event System ============
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }
  
  // ============ Serialization ============
  
  toJSON(): DocumentData {
    return {
      id: this.id,
      name: this.name,
      settings: this.settings,
      layers: this.layers.map(l => l.toJSON()) as any,
      library: this.library.toJSON(),
      version: this.version,
    };
  }
  
  static fromJSON(json: string | DocumentData): Document {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return new Document(data);
  }
  
  /**
   * Save to local storage
   */
  saveToLocalStorage(): void {
    localStorage.setItem(`flare-doc-${this.id}`, JSON.stringify(this.toJSON()));
  }
  
  /**
   * Load from local storage
   */
  static loadFromLocalStorage(id: UID): Document | null {
    const data = localStorage.getItem(`flare-doc-${id}`);
    if (data) {
      return Document.fromJSON(data);
    }
    return null;
  }
}
