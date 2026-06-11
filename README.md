# Modern Robotics — Visual Lab

An explorable-explanations companion to Lynch & Park, *Modern Robotics: Mechanics,
Planning, and Control*. Each concept is one scrollable article where prose and
interactive widgets alternate — every key claim is something you can grab and move.
Pages are self-contained (book notation, full rigor) and carry small "Try it"
challenges with live success detection; completed challenges persist and show as
checkmarks in the sidebar.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Design rules

- **Color encodes meaning, nothing else**: x̂ `#d9483f`, ŷ `#2f9e44`, ẑ `#3b6fd4`;
  space frame {s} gray, body frame {b} orange, interactive accents purple. Defined as
  CSS variables in `src/index.css`.
- 2-D concepts use SVG widgets; genuinely 3-D ones use react-three-fiber via
  `Scene3D` (which handles the z-up ↔ y-up conversion).
- All math goes through `src/lib/math` (pure TypeScript, MR conventions: row-major
  `Mat3`, twists `(ω, v)`, screws per §3.3). Widgets never hand-roll rotations.

## Adding a concept page

1. Create `src/content/chN/MyConcept.tsx`. Compose from:
   - `components/prose.tsx` — `PageHeader`, `M` (inline math), `Eq` (display math),
     `H2`, `KeyIdea`, `Aside`, `BookRef`
   - `components/widgets/` — `WidgetShell`, `ControlBar`, `LabeledSlider`,
     `WidgetButton`, `Readout`, `Challenge`, `Quiz`, `Mat3Display`
   - `components/three/Scene3D.tsx` — `Scene3D`, `Triad`, `Arrow`
2. Register it in `src/content/registry.ts` (status `"ready"`, list its challenge
   ids). Pages are lazy-loaded; the registry also drives the sidebar and prev/next.

Roadmap pages are registered with status `"soon"` and a `planned` list, so the
table of contents shows the whole arc of chapters 2–6.

`legacy/` holds the previous version of the app (reading-page + separate-lab
design), kept for reference while its remaining scenes are ported.
