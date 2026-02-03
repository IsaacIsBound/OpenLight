# Contributing to OpenLight

First off, thank you for considering contributing to OpenLight! 🔥

## Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/IsaacBinding/flare.git
   cd flare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the dev server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to `http://localhost:5173`

## Project Structure

```
flare/
├── src/
│   ├── core/           # Core data structures
│   │   ├── types.ts    # TypeScript types and utilities
│   │   ├── Shape.ts    # Vector shape objects
│   │   ├── Frame.ts    # Animation frames
│   │   ├── Layer.ts    # Timeline layers
│   │   ├── Symbol.ts   # Reusable symbols (like Flash MovieClips)
│   │   └── Document.ts # Main project container
│   │
│   ├── render/         # Rendering engine
│   │   └── Renderer.ts # Canvas/WebGL rendering
│   │
│   ├── tools/          # Drawing and editing tools
│   │   ├── Tool.ts     # Base tool class
│   │   ├── SelectionTool.ts
│   │   ├── ShapeTool.ts
│   │   └── BrushTool.ts
│   │
│   ├── ui/             # UI components
│   │   ├── Timeline.ts # Timeline panel
│   │   └── Library.ts  # Symbol library panel
│   │
│   └── main.ts         # Application entry point
│
├── public/             # Static assets
├── index.html          # App shell
└── package.json
```

## Code Style

- **TypeScript** is required for all new code
- Use **meaningful variable names**
- Add **JSDoc comments** for public methods
- Keep functions **small and focused**
- Write **tests** for new features (coming soon)

## Pull Request Process

1. **Fork** the repo and create a branch from `main`
2. **Make your changes** with clear, atomic commits
3. **Test** your changes thoroughly
4. **Update documentation** if needed
5. **Submit** a PR with a clear description

### Commit Messages

Use conventional commits:
- `feat: add shape tweening`
- `fix: timeline scroll issue`
- `docs: update README`
- `refactor: clean up renderer`
- `style: format code`

## What to Work On

Check the [Issues](https://github.com/IsaacBinding/flare/issues) page for:
- 🐛 Bug reports
- ✨ Feature requests
- 📝 Documentation improvements
- 🏷️ "good first issue" tags for newcomers

### Priority Features

1. **Onion skinning** - Show previous/next frames
2. **Motion tweening** - Interpolate between keyframes
3. **Symbol editing** - Edit symbols in place
4. **Undo/redo system** - Command pattern implementation
5. **Export options** - Video, GIF, sprite sheets

## Questions?

Open an issue or reach out to the maintainers.

---

By contributing, you agree that your contributions will be licensed under the MIT License.
