/**
 * Flare - Main Application Entry Point
 * Open source Flash animation tool
 */

import { Document } from './core/Document';
import { Renderer } from './render/Renderer';
import { Tool, ToolContext } from './tools/Tool';
import { SelectionTool } from './tools/SelectionTool';
import { RectangleTool, OvalTool, LineTool } from './tools/ShapeTool';
import { BrushTool, PenTool } from './tools/BrushTool';
import { TimelineUI } from './ui/Timeline';
import { LibraryUI } from './ui/Library';
import { ToolType } from './core/types';

class FlareApp {
  private document: Document;
  private renderer: Renderer;
  private timeline: TimelineUI;
  private library: LibraryUI;
  
  private tools: Map<ToolType, Tool> = new Map();
  private currentTool: Tool | null = null;
  
  private strokeColor = '#000000';
  private fillColor = '#ff6b35';
  private strokeWidth = 2;
  
  private canvas: HTMLCanvasElement;
  private animationFrame: number | null = null;
  
  constructor() {
    // Create document
    this.document = new Document({
      name: 'Untitled Animation',
      settings: {
        width: 800,
        height: 600,
        frameRate: 24,
        backgroundColor: { r: 255, g: 255, b: 255, a: 1 },
      },
    });
    
    // Get canvas
    this.canvas = document.getElementById('stage') as HTMLCanvasElement;
    
    // Create renderer
    this.renderer = new Renderer(this.canvas, this.document);
    
    // Create UI
    this.timeline = new TimelineUI(this.document, this.renderer);
    this.library = new LibraryUI(this.document);
    
    // Setup tools
    this.setupTools();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Subscribe to document events
    this.document.on('render', () => this.render());
    this.document.on('frameChange', () => this.render());
    
    // Initial render
    this.render();
    
    // Select default tool
    this.selectTool('selection');
    
    console.log('🔥 Flare initialized');
  }
  
  private setupTools(): void {
    const context: ToolContext = {
      document: this.document,
      renderer: this.renderer,
      strokeColor: this.strokeColor,
      fillColor: this.fillColor,
      strokeWidth: this.strokeWidth,
    };
    
    // Create all tools
    this.tools.set('selection', new SelectionTool(context));
    this.tools.set('pen', new PenTool(context));
    this.tools.set('brush', new BrushTool(context));
    this.tools.set('line', new LineTool(context));
    this.tools.set('rectangle', new RectangleTool(context));
    this.tools.set('oval', new OvalTool(context));
  }
  
  private setupEventListeners(): void {
    // Toolbar buttons
    document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = (btn as HTMLElement).dataset.tool as ToolType;
        this.selectTool(tool);
      });
    });
    
    // Color pickers
    const strokeColorInput = document.getElementById('stroke-color') as HTMLInputElement;
    const fillColorInput = document.getElementById('fill-color') as HTMLInputElement;
    
    strokeColorInput?.addEventListener('input', () => {
      this.strokeColor = strokeColorInput.value;
      this.updateToolContext();
    });
    
    fillColorInput?.addEventListener('input', () => {
      this.fillColor = fillColorInput.value;
      this.updateToolContext();
    });
    
    // Canvas events
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handlePointerUp(e));
    
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Window resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
    
    // Prevent context menu on canvas
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Mouse wheel for zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      // this.renderer.setZoom(this.renderer.zoom * delta);
      this.render();
    });
  }
  
  private selectTool(type: ToolType): void {
    // Deactivate current tool
    this.currentTool?.onDeactivate();
    
    // Update toolbar UI
    document.querySelectorAll('.toolbar-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tool === type);
    });
    
    // Activate new tool
    const tool = this.tools.get(type);
    if (tool) {
      this.currentTool = tool;
      this.currentTool.onActivate();
      this.canvas.style.cursor = this.currentTool.getCursor();
    }
  }
  
  private updateToolContext(): void {
    const context: ToolContext = {
      document: this.document,
      renderer: this.renderer,
      strokeColor: this.strokeColor,
      fillColor: this.fillColor,
      strokeWidth: this.strokeWidth,
    };
    
    // Recreate tools with new context
    // (In production, we'd update context in place)
    this.setupTools();
    if (this.currentTool) {
      const newTool = this.tools.get(this.currentTool.type);
      if (newTool) {
        this.currentTool = newTool;
      }
    }
  }
  
  private handlePointerDown(e: MouseEvent): void {
    if (!this.currentTool) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.currentTool.onPointerDown({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: 1,
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
    });
    
    this.canvas.style.cursor = this.currentTool.getCursor();
  }
  
  private handlePointerMove(e: MouseEvent): void {
    if (!this.currentTool) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.currentTool.onPointerMove({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: 1,
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
    });
  }
  
  private handlePointerUp(e: MouseEvent): void {
    if (!this.currentTool) return;
    
    const rect = this.canvas.getBoundingClientRect();
    this.currentTool.onPointerUp({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: 0,
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
    });
    
    this.canvas.style.cursor = this.currentTool.getCursor();
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    // Tool shortcuts
    const shortcuts: Record<string, ToolType> = {
      'v': 'selection',
      'p': 'pen',
      'b': 'brush',
      'n': 'line',
      'r': 'rectangle',
      'o': 'oval',
    };
    
    const key = e.key.toLowerCase();
    
    // Don't trigger shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    if (shortcuts[key]) {
      this.selectTool(shortcuts[key]);
      return;
    }
    
    // Pass to current tool
    this.currentTool?.onKeyDown(e.key, e);
    
    // Global shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (key) {
        case 's':
          e.preventDefault();
          this.save();
          break;
        case 'z':
          e.preventDefault();
          // TODO: Undo
          break;
        case 'y':
          e.preventDefault();
          // TODO: Redo
          break;
      }
    }
    
    // Frame navigation
    if (key === ',') {
      this.document.prevFrame();
    } else if (key === '.') {
      this.document.nextFrame();
    }
    
    // Spacebar for play/pause
    if (key === ' ') {
      e.preventDefault();
      this.timeline.togglePlay();
    }
  }
  
  private handleKeyUp(e: KeyboardEvent): void {
    this.currentTool?.onKeyUp(e.key, e);
  }
  
  private handleResize(): void {
    const container = document.getElementById('stage-container');
    if (!container) return;
    
    // Update canvas size to match container
    // (Stage size stays fixed, canvas is the viewport)
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    this.renderer.centerStage();
    this.render();
  }
  
  private render(): void {
    // Cancel any pending frame
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    // Request new frame
    this.animationFrame = requestAnimationFrame(() => {
      this.renderer.render();
      
      // Draw tool preview
      if (this.currentTool) {
        const ctx = this.canvas.getContext('2d')!;
        ctx.save();
        // Apply same transform as renderer
        // (would need to expose pan/zoom from renderer)
        this.currentTool.drawPreview(ctx);
        ctx.restore();
      }
    });
  }
  
  private save(): void {
    const data = JSON.stringify(this.document.toJSON(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.document.name}.flare`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('💾 Project saved');
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new FlareApp());
} else {
  new FlareApp();
}
