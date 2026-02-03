# 💡 OpenLight Development Roadmap

## Current Status: v0.1.0 - Foundation

### ✅ Completed (Feb 3, 2024)

#### Core Data Model
- [x] `Document` - Main project container with settings
- [x] `Layer` - Timeline layers with visibility/lock
- [x] `Frame` - Keyframe and regular frame support
- [x] `Shape` - Vector shapes with paths, fill, stroke
- [x] `Symbol` - Reusable MovieClip/Graphic/Button types
- [x] `Library` - Symbol management

#### Rendering
- [x] Canvas-based renderer
- [x] Stage background with shadow
- [x] Vector path rendering (MoveTo, LineTo, CurveTo, QuadTo)
- [x] Fill and stroke support
- [x] Transform application (position, rotation, scale, alpha)
- [x] Selection handles display
- [x] Pan and zoom infrastructure

#### Tools
- [x] **Selection Tool** - Click to select, marquee selection, move shapes, keyboard nudge
- [x] **Pen Tool** - Click to add anchor points, drag for bezier handles, close paths
- [x] **Brush Tool** - Freehand drawing with Catmull-Rom smoothing
- [x] **Rectangle Tool** - Draw rectangles, Shift for squares
- [x] **Oval Tool** - Draw ovals, Shift for circles
- [x] **Line Tool** - Draw lines, Shift for 45° angles

#### Timeline UI
- [x] Layer panel with visibility/lock toggles
- [x] Frame grid with keyframe indicators
- [x] Playhead with frame navigation
- [x] Playback controls (play/pause, first/prev/next/last)
- [x] FPS control
- [x] Add layer button
- [x] Insert keyframe / blank keyframe
- [x] Context menu for frame operations
- [x] Layer selection and renaming

#### Library UI
- [x] Symbol list grouped by type
- [x] Create symbol (MovieClip, Graphic, Button)
- [x] Duplicate and delete symbols
- [x] Context menu

#### Application
- [x] Tool switching with keyboard shortcuts
- [x] Color pickers for stroke/fill
- [x] Window resize handling
- [x] Save to JSON file (.openlight format)
- [x] Frame navigation with `,` and `.` keys
- [x] Spacebar for play/pause

---

## ✅ Completed - v0.2.0

### v0.2.0 - Animation Essentials (Feb 3, 2024)

#### Onion Skinning
- [x] Show previous frames (red/pink tint)
- [x] Show next frames (green tint)
- [x] Configurable frame range (before/after inputs)
- [x] Toggle button in timeline (🧅)

#### Motion Tweening
- [x] Detect tween-able keyframe pairs
- [x] Interpolate position, rotation, scale, alpha
- [x] Easing functions (linear, easeIn, easeOut, easeInOut, cubic, elastic, bounce)
- [x] Visual tween indicator in timeline (purple gradient)
- [x] Context menu to create/remove tweens and set easing

#### Undo/Redo System (moved from v0.4.0)
- [x] Command pattern implementation (HistoryManager)
- [x] Track all document mutations
- [x] Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y shortcuts
- [x] Toolbar buttons with state indication
- [x] Commands: AddShape, RemoveShapes, MoveShapes, TransformShapes,
      InsertKeyframe, ClearKeyframe, AddLayer, RemoveLayer, SetTween

---

## 🚧 In Progress

### v0.2.1 - Animation Essentials (continued)

#### Shape Tweening
- [ ] Path morphing between shapes
- [ ] Hint points for complex shapes

---

## 📋 Planned

### v0.3.0 - Symbol Editing

- [ ] Double-click to enter symbol edit mode
- [ ] Breadcrumb navigation
- [ ] Symbol instance properties (first frame, loop)
- [ ] Drag symbols from library to stage

### v0.4.0 - Professional Tools

- [ ] **Copy/Paste** - Shapes and frames
- [ ] **Transform Tool** - Free transform with handles
- [ ] **Subselection Tool** - Edit bezier points
- [ ] **Text Tool** - Basic text objects
- [ ] **Eraser Tool** - Erase parts of shapes

### v0.5.0 - Export

- [ ] **Video Export** - MP4, WebM via MediaRecorder
- [ ] **GIF Export** - Animated GIF
- [ ] **Sprite Sheet** - PNG atlas with JSON metadata
- [ ] **SVG Sequence** - Frame-by-frame SVG
- [ ] **HTML5 Player** - Standalone player export

### v0.6.0 - Advanced Animation

- [ ] **Bone/IK Rigging** - Character skeleton system
- [ ] **Motion Paths** - Curved motion guides
- [ ] **Audio Sync** - Import audio, scrub with playhead
- [ ] **Markers** - Named timeline markers

### v0.7.0 - Collaboration

- [ ] **Cloud Save** - Save to cloud storage
- [ ] **Real-time Collaboration** - Multiple editors
- [ ] **Version History** - Track changes
- [ ] **Comments** - Frame annotations

### v0.8.0 - Platform

- [ ] **Electron App** - Desktop application
- [ ] **Plugin System** - Extend with custom tools
- [ ] **Keyboard Customization** - Rebind shortcuts
- [ ] **Themes** - Light/dark modes

### Future

- [ ] **SWF Import** - Parse legacy Flash files
- [ ] **After Effects Import** - Basic AE project import
- [ ] **Lottie Export** - Web animation format
- [ ] **AI Assist** - Auto in-betweening, style transfer

---

## Architecture Notes

### File Format (.openlight)

JSON-based for readability and git-friendliness:

```json
{
  "version": "0.1.0",
  "name": "My Animation",
  "settings": {
    "width": 800,
    "height": 600,
    "frameRate": 24,
    "backgroundColor": { "r": 255, "g": 255, "b": 255, "a": 1 }
  },
  "layers": [...],
  "library": [...]
}
```

### Key Design Decisions

1. **Web-first** - Browser-based for accessibility, Electron-ready for desktop
2. **TypeScript** - Type safety for complex animation data
3. **Canvas over SVG** - Better performance for complex scenes
4. **Symbol system** - Like Flash, enables reusable animated components
5. **Modular architecture** - Tools, renderers, UI components are pluggable

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to help!

Priority areas:
1. Onion skinning implementation
2. Motion tween interpolation
3. Undo/redo system
4. Test coverage
