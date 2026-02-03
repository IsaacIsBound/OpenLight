# 💡 OpenLight

**The open source Flash animation tool the industry deserves.**

OpenLight is a modern, web-based animation editor that preserves the classic Flash/Animate workflow that animators love. Built for the browser, ready for Electron, designed for professionals.

## Why OpenLight?

Adobe Flash shaped an entire generation of animators. Its timeline-based workflow, symbol/library system, and intuitive tweening tools became the industry standard. When Flash died, nothing truly replaced it.

Existing alternatives fall short:
- **OpenToonz** — Powerful but complex UI, steep learning curve
- **Synfig** — Node-based, confusing for frame-by-frame work  
- **Pencil2D** — Good for traditional animation, weak on symbols/tweening
- **Adobe Animate** — Expensive, subscription-only, increasingly bloated

**OpenLight brings back what made Flash great:**
- 🎬 **Classic timeline** — Layers, keyframes, onion skinning
- 🎨 **Vector drawing tools** — Pen, brush, shapes with smooth curves
- 📚 **Symbol/Library system** — MovieClips, Graphics, nested timelines
- ✨ **Tweening** — Classic motion/shape tweens, easing curves
- 🖥️ **Modern tech** — HTML5 Canvas, WebGL, TypeScript

## Features

### Core (In Progress)
- [x] Project scaffolding
- [x] Canvas rendering engine
- [x] Timeline UI with layers
- [x] Basic vector drawing (pen, brush, shapes)
- [x] Keyframe system
- [ ] Onion skinning
- [ ] Symbol library panel
- [ ] Nested symbol timelines
- [ ] Motion tweening
- [ ] Shape tweening

### Planned
- [ ] Bone/IK rigging
- [ ] Audio sync
- [ ] Export to video/GIF/sprite sheets
- [ ] SWF import (legacy file support)
- [ ] Collaboration features
- [ ] Plugin system

## Quick Start

```bash
# Clone the repo
git clone https://github.com/IsaacBinding/OpenLight.git
cd openlight

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Tech Stack

- **TypeScript** — Type-safe, maintainable code
- **Vite** — Fast dev server and builds
- **HTML5 Canvas / WebGL** — Hardware-accelerated rendering
- **Modular architecture** — Easy to extend and contribute

## Project Structure

```
openlight/
├── src/
│   ├── core/           # Core engine (Document, Timeline, Symbol)
│   ├── render/         # Canvas/WebGL rendering
│   ├── tools/          # Drawing tools (Pen, Brush, Selection)
│   ├── ui/             # Timeline, Library, Stage components
│   ├── utils/          # Math, color, geometry helpers
│   └── main.ts         # Entry point
├── public/             # Static assets
└── index.html          # App shell
```

## Philosophy

1. **Familiar is good** — If Flash animators feel at home, we've succeeded
2. **Performance matters** — 60fps timeline scrubbing, smooth drawing
3. **Open by default** — MIT license, open file formats, no lock-in
4. **Progressive complexity** — Simple tasks simple, complex tasks possible

## Contributing

Contributions welcome! This is a community project to preserve animation workflows.

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

MIT License — Use it, fork it, ship it.

## Acknowledgments

Dedicated to every animator who misses Flash. Let's build something worthy.

---

*"Animation is not the art of drawings that move but the art of movements that are drawn."* — Norman McLaren
