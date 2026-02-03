/**
 * Tween - Motion and shape interpolation utilities
 */

import { Transform, EasingFunction, createDefaultTransform } from './types';
import { Shape } from './Shape';

/**
 * Easing functions for smooth animations
 */
export const Easing = {
  /**
   * Linear interpolation - constant speed
   */
  linear: (t: number): number => t,
  
  /**
   * Ease In - starts slow, ends fast (quadratic)
   */
  easeIn: (t: number): number => t * t,
  
  /**
   * Ease Out - starts fast, ends slow (quadratic)
   */
  easeOut: (t: number): number => t * (2 - t),
  
  /**
   * Ease In Out - slow start and end, fast middle (quadratic)
   */
  easeInOut: (t: number): number => {
    return t < 0.5 
      ? 2 * t * t 
      : -1 + (4 - 2 * t) * t;
  },
  
  /**
   * Ease In Cubic - starts slower, ends faster
   */
  easeInCubic: (t: number): number => t * t * t,
  
  /**
   * Ease Out Cubic - starts faster, ends slower  
   */
  easeOutCubic: (t: number): number => {
    const t1 = t - 1;
    return t1 * t1 * t1 + 1;
  },
  
  /**
   * Ease In Out Cubic
   */
  easeInOutCubic: (t: number): number => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },
  
  /**
   * Elastic ease out - bouncy overshoot
   */
  elasticOut: (t: number): number => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  
  /**
   * Bounce ease out
   */
  bounceOut: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/**
 * Get easing function from type
 */
export function getEasingFunction(easing?: EasingFunction): (t: number) => number {
  if (!easing) return Easing.linear;
  
  switch (easing.type) {
    case 'linear': return Easing.linear;
    case 'easeIn': return Easing.easeIn;
    case 'easeOut': return Easing.easeOut;
    case 'easeInOut': return Easing.easeInOut;
    default: return Easing.linear;
  }
}

/**
 * Interpolate between two numbers
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolate between two transforms
 */
export function lerpTransform(start: Transform, end: Transform, t: number): Transform {
  return {
    x: lerp(start.x, end.x, t),
    y: lerp(start.y, end.y, t),
    scaleX: lerp(start.scaleX, end.scaleX, t),
    scaleY: lerp(start.scaleY, end.scaleY, t),
    rotation: lerpAngle(start.rotation, end.rotation, t),
    skewX: lerp(start.skewX, end.skewX, t),
    skewY: lerp(start.skewY, end.skewY, t),
    alpha: lerp(start.alpha, end.alpha, t),
  };
}

/**
 * Interpolate angles (handles wrap-around)
 */
export function lerpAngle(a: number, b: number, t: number): number {
  // Find shortest rotation direction
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

/**
 * Result of calculating a tweened frame
 */
export interface TweenedShape {
  originalShape: Shape;
  tweenedTransform: Transform;
  progress: number;  // 0-1 progress through the tween
}

/**
 * Calculate tweened shapes for a given frame
 */
export function calculateTweenedShapes(
  startShapes: Shape[],
  endShapes: Shape[],
  progress: number,
  easing?: EasingFunction
): TweenedShape[] {
  const easingFn = getEasingFunction(easing);
  const easedProgress = easingFn(progress);
  
  const results: TweenedShape[] = [];
  
  // Match shapes by ID between keyframes
  for (const startShape of startShapes) {
    const endShape = endShapes.find(s => s.id === startShape.id);
    
    if (endShape) {
      // Interpolate transform
      const tweenedTransform = lerpTransform(
        startShape.transform,
        endShape.transform,
        easedProgress
      );
      
      results.push({
        originalShape: startShape,
        tweenedTransform,
        progress: easedProgress,
      });
    } else {
      // No matching end shape, use start shape as-is
      // (shape exists in start but not end - could fade out)
      results.push({
        originalShape: startShape,
        tweenedTransform: { ...startShape.transform },
        progress: 0,
      });
    }
  }
  
  // Handle shapes that exist only in end frame (fade in)
  for (const endShape of endShapes) {
    const startShape = startShapes.find(s => s.id === endShape.id);
    if (!startShape) {
      // Shape doesn't exist in start, create with fading alpha
      const tweenedTransform = { ...endShape.transform };
      tweenedTransform.alpha *= easedProgress;
      
      results.push({
        originalShape: endShape,
        tweenedTransform,
        progress: easedProgress,
      });
    }
  }
  
  return results;
}

/**
 * Check if motion tweening can be applied between two keyframes
 * Returns true if both frames have content and at least one matching shape
 */
export function canMotionTween(startShapes: Shape[], endShapes: Shape[]): boolean {
  if (startShapes.length === 0 || endShapes.length === 0) {
    return false;
  }
  
  // Check if any shapes have matching IDs
  for (const startShape of startShapes) {
    if (endShapes.some(s => s.id === startShape.id)) {
      return true;
    }
  }
  
  // If no matching IDs, we can still tween if there's exactly one shape in each
  return startShapes.length === 1 && endShapes.length === 1;
}

/**
 * Create matched shape pairs for tweening when IDs don't match
 * (e.g., user drew separate shapes on each keyframe)
 */
export function createTweenPairs(
  startShapes: Shape[],
  endShapes: Shape[]
): Array<{ start: Shape; end: Shape }> {
  const pairs: Array<{ start: Shape; end: Shape }> = [];
  const usedEndIndices = new Set<number>();
  
  // First pass: match by ID
  for (const startShape of startShapes) {
    const endIndex = endShapes.findIndex(s => s.id === startShape.id);
    if (endIndex !== -1) {
      pairs.push({ start: startShape, end: endShapes[endIndex] });
      usedEndIndices.add(endIndex);
    }
  }
  
  // Second pass: pair remaining shapes by order
  const unpairedStart = startShapes.filter(s => !pairs.some(p => p.start.id === s.id));
  const unpairedEnd = endShapes.filter((_, i) => !usedEndIndices.has(i));
  
  const minUnpaired = Math.min(unpairedStart.length, unpairedEnd.length);
  for (let i = 0; i < minUnpaired; i++) {
    pairs.push({ start: unpairedStart[i], end: unpairedEnd[i] });
  }
  
  return pairs;
}
