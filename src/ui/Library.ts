/**
 * Library UI - Manages the symbol library panel
 */

import { Document } from '../core/Document';
import { Symbol } from '../core/Symbol';
import { UID, SymbolType } from '../core/types';

export class LibraryUI {
  private document: Document;
  private container: HTMLElement;
  private selectedSymbolId: UID | null = null;
  
  constructor(document: Document) {
    this.document = document;
    this.container = window.document.getElementById('library-items') as HTMLElement;
    
    this.setupEventListeners();
    this.render();
  }
  
  private setupEventListeners(): void {
    // Double click on empty area to create new symbol
    this.container.addEventListener('dblclick', (e) => {
      if (e.target === this.container) {
        this.createSymbol();
      }
    });
    
    // Right click context menu
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e as MouseEvent);
    });
  }
  
  /**
   * Render the library panel
   */
  render(): void {
    this.container.innerHTML = '';
    
    const symbols = this.document.library.getAllSymbols();
    
    if (symbols.length === 0) {
      const emptyMsg = window.document.createElement('div');
      emptyMsg.className = 'library-empty';
      emptyMsg.style.cssText = 'padding: 20px; text-align: center; color: var(--text-secondary); font-size: 12px;';
      emptyMsg.textContent = 'No symbols yet. Right-click to create.';
      this.container.appendChild(emptyMsg);
      return;
    }
    
    // Group by type
    const movieClips = symbols.filter(s => s.type === 'movieclip');
    const graphics = symbols.filter(s => s.type === 'graphic');
    const buttons = symbols.filter(s => s.type === 'button');
    
    if (movieClips.length > 0) {
      this.renderGroup('MovieClips', movieClips, '🎬');
    }
    if (graphics.length > 0) {
      this.renderGroup('Graphics', graphics, '🖼');
    }
    if (buttons.length > 0) {
      this.renderGroup('Buttons', buttons, '🔘');
    }
  }
  
  private renderGroup(title: string, symbols: Symbol[], _icon: string): void {
    const header = window.document.createElement('div');
    header.className = 'library-group-header';
    header.style.cssText = 'padding: 8px 10px; font-size: 11px; color: var(--text-secondary); text-transform: uppercase;';
    header.textContent = title;
    this.container.appendChild(header);
    
    for (const symbol of symbols) {
      const item = window.document.createElement('div');
      item.className = 'library-item';
      if (symbol.id === this.selectedSymbolId) {
        item.classList.add('selected');
      }
      
      item.innerHTML = `
        <span class="library-item-icon">${this.getSymbolIcon(symbol.type)}</span>
        <span class="library-item-name">${symbol.name}</span>
      `;
      
      // Click to select
      item.addEventListener('click', () => {
        this.selectedSymbolId = symbol.id;
        this.render();
      });
      
      // Double click to edit symbol
      item.addEventListener('dblclick', () => {
        // TODO: Enter symbol edit mode
        console.log('Edit symbol:', symbol.name);
      });
      
      // Drag to stage
      item.draggable = true;
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer?.setData('symbol-id', symbol.id);
      });
      
      this.container.appendChild(item);
    }
  }
  
  private getSymbolIcon(type: SymbolType): string {
    switch (type) {
      case 'movieclip': return '🎬';
      case 'graphic': return '🖼';
      case 'button': return '🔘';
      default: return '📦';
    }
  }
  
  /**
   * Create a new symbol
   */
  createSymbol(type: SymbolType = 'graphic'): Symbol {
    const name = `Symbol ${this.document.library.getAllSymbols().length + 1}`;
    const symbol = this.document.library.createSymbol(name, type);
    this.selectedSymbolId = symbol.id;
    this.render();
    return symbol;
  }
  
  /**
   * Convert selection to symbol
   */
  convertToSymbol(type: SymbolType = 'graphic'): Symbol | null {
    const selectedIds = this.document.selectedShapeIds;
    if (selectedIds.length === 0) return null;
    
    // Create new symbol
    const symbol = this.createSymbol(type);
    
    // Move shapes to symbol's first layer
    const shapes = this.document.getVisibleShapes();
    const symbolLayer = symbol.layers[0];
    
    for (const { shape } of shapes) {
      if (selectedIds.includes(shape.id)) {
        symbolLayer.addShapeAtFrame(1, shape.clone());
      }
    }
    
    // Remove shapes from stage
    this.document.removeSelectedShapes();
    
    // TODO: Add symbol instance to stage
    
    this.render();
    return symbol;
  }
  
  /**
   * Delete selected symbol
   */
  deleteSelectedSymbol(): void {
    if (!this.selectedSymbolId) return;
    
    this.document.library.removeSymbol(this.selectedSymbolId);
    this.selectedSymbolId = null;
    this.render();
  }
  
  /**
   * Duplicate selected symbol
   */
  duplicateSelectedSymbol(): void {
    if (!this.selectedSymbolId) return;
    
    const original = this.document.library.getSymbol(this.selectedSymbolId);
    if (!original) return;
    
    const duplicate = original.duplicate();
    this.document.library.addSymbol(duplicate);
    this.selectedSymbolId = duplicate.id;
    this.render();
  }
  
  /**
   * Show context menu
   */
  private showContextMenu(e: MouseEvent): void {
    // Create simple context menu
    const menu = window.document.createElement('div');
    menu.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      padding: 5px 0;
      min-width: 150px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    
    const items = [
      { label: 'New MovieClip', action: () => this.createSymbol('movieclip') },
      { label: 'New Graphic', action: () => this.createSymbol('graphic') },
      { label: 'New Button', action: () => this.createSymbol('button') },
      { label: '---' },
      { label: 'Duplicate', action: () => this.duplicateSelectedSymbol(), disabled: !this.selectedSymbolId },
      { label: 'Delete', action: () => this.deleteSelectedSymbol(), disabled: !this.selectedSymbolId },
    ];
    
    for (const item of items) {
      if (item.label === '---') {
        const sep = window.document.createElement('div');
        sep.style.cssText = 'height: 1px; background: var(--border-color); margin: 5px 0;';
        menu.appendChild(sep);
        continue;
      }
      
      const menuItem = window.document.createElement('div');
      menuItem.style.cssText = `
        padding: 8px 15px;
        cursor: ${item.disabled ? 'default' : 'pointer'};
        font-size: 13px;
        color: ${item.disabled ? 'var(--text-secondary)' : 'var(--text-primary)'};
      `;
      menuItem.textContent = item.label;
      
      if (!item.disabled) {
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = 'var(--bg-tertiary)';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', () => {
          menu.remove();
          item.action?.();
        });
      }
      
      menu.appendChild(menuItem);
    }
    
    window.document.body.appendChild(menu);
    
    // Close on click outside
    const close = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        window.document.removeEventListener('click', close);
      }
    };
    
    setTimeout(() => {
      window.document.addEventListener('click', close);
    }, 0);
  }
}
