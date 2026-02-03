/**
 * Core types for Flare animation editor
 */

// Unique identifiers
export type UID = string;

// Basic geometry
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;  // degrees
  skewX: number;
  skewY: number;
  alpha: number;     // 0-1
}

// Colors
export interface Color {
  r: number;  // 0-255
  g: number;
  b: number;
  a: number;  // 0-1
}

export interface StrokeStyle {
  color: Color;
  width: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'miter' | 'round' | 'bevel';
}

export interface FillStyle {
  type: 'solid' | 'gradient' | 'pattern';
  color?: Color;
  gradient?: Gradient;
}

export interface Gradient {
  type: 'linear' | 'radial';
  stops: GradientStop[];
  angle?: number;  // for linear
  radius?: number; // for radial
}

export interface GradientStop {
  offset: number; // 0-1
  color: Color;
}

// Vector path data
export interface PathCommand {
  type: 'M' | 'L' | 'C' | 'Q' | 'Z';  // MoveTo, LineTo, CurveTo (cubic), QuadTo, Close
  points: Point[];
}

export interface VectorPath {
  commands: PathCommand[];
  closed: boolean;
}

// Symbol types (like Flash)
export type SymbolType = 'graphic' | 'movieclip' | 'button';

// Tween types
export type TweenType = 'none' | 'motion' | 'shape';

export interface EasingFunction {
  type: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'custom';
  strength?: number;  // 1-100
  customCurve?: Point[];  // for bezier easing
}

// Tool types
export type ToolType = 
  | 'selection'
  | 'pen'
  | 'brush'
  | 'line'
  | 'rectangle'
  | 'oval'
  | 'fill'
  | 'eyedropper'
  | 'eraser'
  | 'hand'
  | 'zoom';

// Events
export interface FlareEvent {
  type: string;
  target?: any;
  data?: any;
}

// Generate unique IDs
export function generateUID(): UID {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

// Default transform
export function createDefaultTransform(): Transform {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    alpha: 1,
  };
}

// Color utilities
export function colorToHex(color: Color): string {
  const r = Math.round(color.r).toString(16).padStart(2, '0');
  const g = Math.round(color.g).toString(16).padStart(2, '0');
  const b = Math.round(color.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function hexToColor(hex: string, alpha = 1): Color {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0, a: alpha };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: alpha,
  };
}

export function colorToRGBA(color: Color): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}
