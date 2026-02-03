/**
 * Symbol - Reusable animation component (like Flash MovieClip, Graphic, Button)
 */

import { UID, SymbolType, Transform, generateUID, createDefaultTransform } from './types';
import { Layer } from './Layer';

export interface SymbolData {
  id: UID;
  name: string;
  type: SymbolType;
  layers: Layer[];
  frameCount: number;
}

export interface SymbolInstance {
  id: UID;
  symbolId: UID;       // Reference to Symbol
  transform: Transform;
  firstFrame: number;  // For graphics: which frame to display
  loop: boolean;       // For movieclips: whether to loop
}

/**
 * Symbol - The master definition in the library
 */
export class Symbol {
  public id: UID;
  public name: string;
  public type: SymbolType;
  public layers: Layer[] = [];
  public frameCount: number = 60;  // Default timeline length
  
  private static symbolCount = 0;
  
  constructor(data?: Partial<SymbolData>) {
    Symbol.symbolCount++;
    this.id = data?.id ?? generateUID();
    this.name = data?.name ?? `Symbol ${Symbol.symbolCount}`;
    this.type = data?.type ?? 'graphic';
    this.frameCount = data?.frameCount ?? 60;
    
    if (data?.layers) {
      this.layers = data.layers;
    } else {
      // Initialize with one layer
      this.layers.push(new Layer({ name: 'Layer 1' }));
    }
  }
  
  /**
   * Get layer by ID
   */
  getLayer(layerId: UID): Layer | undefined {
    return this.layers.find(l => l.id === layerId);
  }
  
  /**
   * Get layer by index
   */
  getLayerByIndex(index: number): Layer | undefined {
    return this.layers[index];
  }
  
  /**
   * Add a new layer
   */
  addLayer(name?: string): Layer {
    const layer = new Layer({ name });
    layer.extendTo(this.frameCount);
    this.layers.unshift(layer);  // Add to top
    return layer;
  }
  
  /**
   * Remove a layer
   */
  removeLayer(layerId: UID): boolean {
    // Must have at least one layer
    if (this.layers.length <= 1) return false;
    
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index >= 0) {
      this.layers.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Move layer up (towards top)
   */
  moveLayerUp(layerId: UID): boolean {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index > 0) {
      const layer = this.layers.splice(index, 1)[0];
      this.layers.splice(index - 1, 0, layer);
      return true;
    }
    return false;
  }
  
  /**
   * Move layer down (towards bottom)
   */
  moveLayerDown(layerId: UID): boolean {
    const index = this.layers.findIndex(l => l.id === layerId);
    if (index >= 0 && index < this.layers.length - 1) {
      const layer = this.layers.splice(index, 1)[0];
      this.layers.splice(index + 1, 0, layer);
      return true;
    }
    return false;
  }
  
  /**
   * Extend timeline
   */
  setFrameCount(count: number): void {
    this.frameCount = Math.max(1, count);
    for (const layer of this.layers) {
      layer.extendTo(this.frameCount);
    }
  }
  
  /**
   * Create an instance of this symbol
   */
  createInstance(transform?: Partial<Transform>): SymbolInstance {
    return {
      id: generateUID(),
      symbolId: this.id,
      transform: { ...createDefaultTransform(), ...transform },
      firstFrame: 1,
      loop: this.type === 'movieclip',
    };
  }
  
  /**
   * Get actual frame count based on content
   */
  getActualFrameCount(): number {
    let maxFrame = 1;
    for (const layer of this.layers) {
      maxFrame = Math.max(maxFrame, layer.getFrameCount());
    }
    return maxFrame;
  }
  
  /**
   * Duplicate symbol
   */
  duplicate(): Symbol {
    return new Symbol({
      name: this.name + ' Copy',
      type: this.type,
      layers: this.layers.map(l => l.clone()),
      frameCount: this.frameCount,
    });
  }
  
  /**
   * Serialize to JSON
   */
  toJSON(): SymbolData {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      layers: this.layers.map(l => l.toJSON()) as any,
      frameCount: this.frameCount,
    };
  }
}

/**
 * Library - Container for all symbols in a document
 */
export class Library {
  public symbols: Map<UID, Symbol> = new Map();
  
  /**
   * Add symbol to library
   */
  addSymbol(symbol: Symbol): void {
    this.symbols.set(symbol.id, symbol);
  }
  
  /**
   * Get symbol by ID
   */
  getSymbol(id: UID): Symbol | undefined {
    return this.symbols.get(id);
  }
  
  /**
   * Get symbol by name
   */
  getSymbolByName(name: string): Symbol | undefined {
    for (const symbol of this.symbols.values()) {
      if (symbol.name === name) return symbol;
    }
    return undefined;
  }
  
  /**
   * Remove symbol from library
   */
  removeSymbol(id: UID): boolean {
    return this.symbols.delete(id);
  }
  
  /**
   * Get all symbols
   */
  getAllSymbols(): Symbol[] {
    return Array.from(this.symbols.values());
  }
  
  /**
   * Get symbols by type
   */
  getSymbolsByType(type: SymbolType): Symbol[] {
    return this.getAllSymbols().filter(s => s.type === type);
  }
  
  /**
   * Create a new symbol and add to library
   */
  createSymbol(name: string, type: SymbolType = 'graphic'): Symbol {
    const symbol = new Symbol({ name, type });
    this.addSymbol(symbol);
    return symbol;
  }
  
  /**
   * Serialize to JSON
   */
  toJSON(): SymbolData[] {
    return this.getAllSymbols().map(s => s.toJSON());
  }
}
