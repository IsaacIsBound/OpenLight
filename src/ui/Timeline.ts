/**
 * Timeline UI - Manages the timeline panel
 */

import { Document } from '../core/Document';
import { Renderer } from '../render/Renderer';
import { UID } from '../core/types';

export class TimelineUI {
  private document: Document;
  private renderer: Renderer | null = null;
  private layersPanel: HTMLElement;
  private framesContainer: HTMLElement;
  private framesGrid: HTMLElement;
  private frameRuler: HTMLElement;
  private playhead: HTMLElement;
  private currentFrameDisplay: HTMLElement;
  private totalFramesDisplay: HTMLElement;
  private onionSkinBtn: HTMLButtonElement | null = null;
  
  private visibleFrames = 120;  // Number of frames to show
  private isPlaying = false;
  private playInterval: number | null = null;
  
  constructor(document: Document, renderer?: Renderer) {
    this.document = document;
    this.renderer = renderer ?? null;
    
    // Get DOM elements
    this.layersPanel = window.document.getElementById('layers-panel') as HTMLElement;
    this.framesContainer = window.document.getElementById('frames-container') as HTMLElement;
    this.framesGrid = window.document.getElementById('frames-grid') as HTMLElement;
    this.frameRuler = window.document.getElementById('frame-ruler') as HTMLElement;
    this.playhead = window.document.getElementById('playhead') as HTMLElement;
    this.currentFrameDisplay = window.document.getElementById('current-frame') as HTMLElement;
    this.totalFramesDisplay = window.document.getElementById('total-frames') as HTMLElement;
    
    this.setupEventListeners();
    this.render();
    
    // Subscribe to document events
    this.document.on('frameChange', () => this.updatePlayhead());
    this.document.on('layerAdd', () => this.render());
    this.document.on('layerRemove', () => this.render());
    this.document.on('keyframeInsert', () => this.renderFrames());
    this.document.on('keyframeClear', () => this.renderFrames());
  }
  
  /**
   * Set the renderer reference (for onion skinning controls)
   */
  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }
  
  private setupEventListeners(): void {
    // Playback controls
    const btnPlay = window.document.getElementById('btn-play');
    const btnFirst = window.document.getElementById('btn-first');
    const btnPrev = window.document.getElementById('btn-prev');
    const btnNext = window.document.getElementById('btn-next');
    const btnLast = window.document.getElementById('btn-last');
    
    btnPlay?.addEventListener('click', () => this.togglePlay());
    btnFirst?.addEventListener('click', () => this.document.firstFrame());
    btnPrev?.addEventListener('click', () => this.document.prevFrame());
    btnNext?.addEventListener('click', () => this.document.nextFrame());
    btnLast?.addEventListener('click', () => this.document.lastFrame());
    
    // Add layer button
    const addLayerBtn = window.document.getElementById('add-layer-btn');
    addLayerBtn?.addEventListener('click', () => {
      this.document.addLayer();
      this.render();
    });
    
    // Keyframe buttons
    const addKeyframeBtn = window.document.getElementById('add-keyframe-btn');
    const addBlankKeyframeBtn = window.document.getElementById('add-blank-keyframe-btn');
    
    addKeyframeBtn?.addEventListener('click', () => {
      this.document.insertKeyframe();
      this.renderFrames();
    });
    
    addBlankKeyframeBtn?.addEventListener('click', () => {
      this.document.insertBlankKeyframe();
      this.renderFrames();
    });
    
    // FPS input
    const fpsInput = window.document.getElementById('fps-input') as HTMLInputElement;
    fpsInput?.addEventListener('change', () => {
      const fps = parseInt(fpsInput.value, 10);
      if (fps > 0 && fps <= 120) {
        this.document.settings.frameRate = fps;
        if (this.isPlaying) {
          this.stopPlay();
          this.startPlay();
        }
      }
    });
    
    // Frame ruler click
    this.frameRuler.addEventListener('click', (e) => {
      const rect = this.frameRuler.getBoundingClientRect();
      const x = e.clientX - rect.left + this.framesContainer.scrollLeft;
      const frame = Math.floor(x / 12) + 1;
      this.document.currentFrame = frame;
    });
    
    // Onion skinning toggle
    this.onionSkinBtn = window.document.getElementById('onion-skin-btn') as HTMLButtonElement;
    this.onionSkinBtn?.addEventListener('click', () => {
      if (this.renderer) {
        const enabled = this.renderer.toggleOnionSkin();
        this.updateOnionSkinButton(enabled);
        this.document.emit('render');
      }
    });
    
    // Onion skin settings inputs
    const onionBeforeInput = window.document.getElementById('onion-before') as HTMLInputElement;
    const onionAfterInput = window.document.getElementById('onion-after') as HTMLInputElement;
    
    onionBeforeInput?.addEventListener('change', () => {
      if (this.renderer) {
        const value = Math.max(0, Math.min(10, parseInt(onionBeforeInput.value, 10) || 2));
        onionBeforeInput.value = String(value);
        this.renderer.setOnionSkinSettings({ framesBefore: value });
        this.document.emit('render');
      }
    });
    
    onionAfterInput?.addEventListener('change', () => {
      if (this.renderer) {
        const value = Math.max(0, Math.min(10, parseInt(onionAfterInput.value, 10) || 2));
        onionAfterInput.value = String(value);
        this.renderer.setOnionSkinSettings({ framesAfter: value });
        this.document.emit('render');
      }
    });
  }
  
  /**
   * Update onion skin button visual state
   */
  private updateOnionSkinButton(enabled: boolean): void {
    if (this.onionSkinBtn) {
      this.onionSkinBtn.classList.toggle('active', enabled);
      this.onionSkinBtn.title = enabled ? 'Onion Skin: ON' : 'Onion Skin: OFF';
    }
  }
  
  /**
   * Create a motion tween starting from the specified frame
   */
  private createMotionTween(layerId: UID, frameIndex: number): void {
    const layer = this.document.getLayer(layerId);
    if (!layer || layer.locked) return;
    
    // Get the keyframe at this position
    const keyframe = layer.getFrame(frameIndex);
    if (!keyframe?.isKeyframe) {
      // Need to be on a keyframe to create a tween
      console.warn('Motion tween must start from a keyframe');
      return;
    }
    
    // Check if there's a next keyframe to tween to
    const nextKeyframe = layer.getNextKeyframe(frameIndex);
    if (!nextKeyframe) {
      console.warn('No next keyframe to tween to');
      return;
    }
    
    // Set the motion tween
    keyframe.setMotionTween({ type: 'easeInOut' });
    
    this.renderFrames();
    this.document.emit('render');
  }
  
  /**
   * Remove motion tween from the specified frame
   */
  private removeMotionTween(layerId: UID, frameIndex: number): void {
    const layer = this.document.getLayer(layerId);
    if (!layer || layer.locked) return;
    
    // Get the keyframe at or before this position
    let keyframe = layer.getFrame(frameIndex);
    
    // If not on a keyframe, find the keyframe this frame belongs to
    if (!keyframe?.isKeyframe) {
      keyframe = layer.getKeyframeAt(frameIndex);
    }
    
    if (keyframe && keyframe.tweenType !== 'none') {
      keyframe.removeTween();
      this.renderFrames();
      this.document.emit('render');
    }
  }
  
  /**
   * Set the easing type for a motion tween
   */
  private setTweenEasing(layerId: UID, frameIndex: number, easingType: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut'): void {
    const layer = this.document.getLayer(layerId);
    if (!layer || layer.locked) return;
    
    // Get the keyframe at or before this position
    let keyframe = layer.getFrame(frameIndex);
    
    // If not on a keyframe, find the keyframe this frame belongs to
    if (!keyframe?.isKeyframe) {
      keyframe = layer.getKeyframeAt(frameIndex);
    }
    
    if (keyframe) {
      // If no tween exists yet, create one
      if (keyframe.tweenType === 'none') {
        const nextKeyframe = layer.getNextKeyframe(keyframe.index);
        if (!nextKeyframe) {
          console.warn('No next keyframe to tween to');
          return;
        }
        keyframe.setMotionTween({ type: easingType });
      } else {
        // Update existing tween's easing
        keyframe.easing = { type: easingType };
      }
      
      this.renderFrames();
      this.document.emit('render');
    }
  }
  
  /**
   * Render the entire timeline
   */
  render(): void {
    this.renderLayers();
    this.renderFrameRuler();
    this.renderFrames();
    this.updatePlayhead();
  }
  
  /**
   * Render layers panel
   */
  private renderLayers(): void {
    this.layersPanel.innerHTML = '';
    
    for (const layer of this.document.layers) {
      const layerEl = window.document.createElement('div');
      layerEl.className = 'layer';
      if (layer.id === this.document.selectedLayerId) {
        layerEl.classList.add('selected');
      }
      
      layerEl.innerHTML = `
        <span class="layer-visibility" data-layer="${layer.id}">${layer.visible ? '👁' : '○'}</span>
        <span class="layer-lock" data-layer="${layer.id}">${layer.locked ? '🔒' : '○'}</span>
        <span class="layer-name">${layer.name}</span>
      `;
      
      // Click to select layer
      layerEl.addEventListener('click', () => {
        this.document.selectLayer(layer.id);
        this.renderLayers();
      });
      
      // Double click to rename
      const nameEl = layerEl.querySelector('.layer-name');
      nameEl?.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = window.document.createElement('input');
        input.type = 'text';
        input.value = layer.name;
        input.style.cssText = 'width: 100%; background: var(--bg-tertiary); border: none; color: var(--text-primary);';
        
        input.addEventListener('blur', () => {
          layer.name = input.value || layer.name;
          this.renderLayers();
        });
        
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') {
            input.value = layer.name;
            input.blur();
          }
        });
        
        nameEl.replaceWith(input);
        input.focus();
        input.select();
      });
      
      // Visibility toggle
      const visibilityEl = layerEl.querySelector('.layer-visibility');
      visibilityEl?.addEventListener('click', (e) => {
        e.stopPropagation();
        layer.toggleVisibility();
        this.renderLayers();
        this.document.emit('render');
      });
      
      // Lock toggle
      const lockEl = layerEl.querySelector('.layer-lock');
      lockEl?.addEventListener('click', (e) => {
        e.stopPropagation();
        layer.toggleLock();
        this.renderLayers();
      });
      
      this.layersPanel.appendChild(layerEl);
    }
  }
  
  /**
   * Render frame number ruler
   */
  private renderFrameRuler(): void {
    this.frameRuler.innerHTML = '';
    
    for (let i = 1; i <= this.visibleFrames; i++) {
      const frameNum = window.document.createElement('div');
      frameNum.className = 'frame-number';
      frameNum.textContent = i % 5 === 0 ? String(i) : '';
      this.frameRuler.appendChild(frameNum);
    }
  }
  
  /**
   * Render frame cells for all layers
   */
  private renderFrames(): void {
    this.framesGrid.innerHTML = '';
    
    for (const layer of this.document.layers) {
      const layerFrames = window.document.createElement('div');
      layerFrames.className = 'layer-frames';
      
      for (let i = 1; i <= this.visibleFrames; i++) {
        const frameEl = window.document.createElement('div');
        frameEl.className = 'frame';
        frameEl.dataset.layer = layer.id;
        frameEl.dataset.frame = String(i);
        
        // Check frame state
        const frame = layer.getFrame(i);
        const keyframe = layer.getKeyframeAt(i);
        
        if (frame?.isKeyframe) {
          if (frame.isEmpty) {
            frameEl.classList.add('empty-keyframe');
          } else {
            frameEl.classList.add('keyframe');
          }
          
          // Show tween indicator if this keyframe has a tween
          if (frame.tweenType === 'motion') {
            frameEl.classList.add('tween-start');
          }
        } else if (keyframe && !keyframe.isEmpty) {
          // Frame is filled (extends from previous keyframe)
          if (keyframe.tweenType === 'motion') {
            // This frame is in a motion tween
            const nextKeyframe = layer.getNextKeyframe(keyframe.index);
            if (nextKeyframe && i < nextKeyframe.index) {
              frameEl.classList.add('tween-motion');
            }
          } else {
            frameEl.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
          }
        }
        
        // Current frame highlight
        if (i === this.document.currentFrame) {
          frameEl.classList.add('selected');
        }
        
        // Click to navigate to frame
        frameEl.addEventListener('click', () => {
          this.document.selectLayer(layer.id);
          this.document.currentFrame = i;
          this.renderLayers();
          this.renderFrames();
        });
        
        // Right click for context menu
        frameEl.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.showContextMenu(e, layer.id, i);
        });
        
        layerFrames.appendChild(frameEl);
      }
      
      this.framesGrid.appendChild(layerFrames);
    }
  }
  
  /**
   * Update playhead position
   */
  private updatePlayhead(): void {
    const frame = this.document.currentFrame;
    this.playhead.style.left = `${(frame - 1) * 12}px`;
    this.currentFrameDisplay.textContent = String(frame);
    this.totalFramesDisplay.textContent = String(Math.max(this.visibleFrames, this.document.totalFrames));
    
    // Scroll playhead into view
    const scrollLeft = this.framesContainer.scrollLeft;
    const containerWidth = this.framesContainer.clientWidth - 200;
    const playheadPos = (frame - 1) * 12;
    
    if (playheadPos < scrollLeft) {
      this.framesContainer.scrollLeft = playheadPos;
    } else if (playheadPos > scrollLeft + containerWidth) {
      this.framesContainer.scrollLeft = playheadPos - containerWidth + 50;
    }
    
    // Highlight current frame
    this.renderFrames();
  }
  
  /**
   * Toggle play/pause
   */
  togglePlay(): void {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }
  
  private startPlay(): void {
    this.isPlaying = true;
    const fps = this.document.settings.frameRate;
    const btnPlay = window.document.getElementById('btn-play');
    if (btnPlay) btnPlay.textContent = '⏸';
    
    this.playInterval = window.setInterval(() => {
      this.document.nextFrame();
      
      // Loop back to beginning
      if (this.document.currentFrame >= this.document.totalFrames) {
        this.document.firstFrame();
      }
      
      this.document.emit('render');
    }, 1000 / fps);
  }
  
  private stopPlay(): void {
    this.isPlaying = false;
    const btnPlay = window.document.getElementById('btn-play');
    if (btnPlay) btnPlay.textContent = '▶';
    
    if (this.playInterval !== null) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }
  
  /**
   * Show context menu
   */
  private showContextMenu(e: MouseEvent, layerId: UID, frameIndex: number): void {
    const menu = window.document.getElementById('context-menu');
    if (!menu) return;
    
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.classList.add('visible');
    
    // Handle menu item clicks
    const handleClick = (action: string) => {
      menu.classList.remove('visible');
      
      switch (action) {
        case 'insert-keyframe':
          this.document.insertKeyframe(layerId, frameIndex);
          break;
        case 'insert-blank-keyframe':
          this.document.insertBlankKeyframe(layerId, frameIndex);
          break;
        case 'clear-keyframe':
          this.document.clearKeyframe(layerId, frameIndex);
          break;
        case 'create-tween':
          this.createMotionTween(layerId, frameIndex);
          break;
        case 'remove-tween':
          this.removeMotionTween(layerId, frameIndex);
          break;
        case 'easing-linear':
          this.setTweenEasing(layerId, frameIndex, 'linear');
          break;
        case 'easing-easein':
          this.setTweenEasing(layerId, frameIndex, 'easeIn');
          break;
        case 'easing-easeout':
          this.setTweenEasing(layerId, frameIndex, 'easeOut');
          break;
        case 'easing-easeinout':
          this.setTweenEasing(layerId, frameIndex, 'easeInOut');
          break;
      }
      
      this.renderFrames();
      this.document.emit('render');
    };
    
    // Add click handlers
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      const action = (item as HTMLElement).dataset.action;
      if (action) {
        const newItem = item.cloneNode(true);
        item.parentNode?.replaceChild(newItem, item);
        newItem.addEventListener('click', () => handleClick(action));
      }
    });
    
    // Close menu on click outside
    const closeMenu = () => {
      menu.classList.remove('visible');
      window.document.removeEventListener('click', closeMenu);
    };
    
    setTimeout(() => {
      window.document.addEventListener('click', closeMenu);
    }, 0);
  }
}
