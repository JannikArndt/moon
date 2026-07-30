# CLAUDE.md

Browser instrument showing the Moon's real position, size, colour and geometry.
No dependencies, no build step for hosting, no network calls at runtime.
Product context and the bug log are in `README.md`; do not duplicate them here.

## Commands

```bash
python3 -m http.server 8000   # ES modules need a server, not file://
node build.mjs                # -> dist/moon-lab.html (single file, ~80 kB)
```

`src/astro.js` is DOM-free and dependency-free, so it can be imported directly in Node.
That is the fastest way to check physics changes:

```bash
node --input-type=module -e "import('./src/astro.js').then(a=>{ /* ... */ })"
```

## Module graph

Dependency order, which is also `ORDER` in `build.mjs`:

```
astro → data → state → draw → sky, orrery, timeline, charts → main
```

| file | owns |
|---|---|
| `astro.js` | the only physics. Series, time scales, coordinate transforms, extinction. |
| `data.js` | star catalogue, coastlines, city list. Pure data. |
| `state.js` | `S`, `T`, caches, timezone and calendar helpers, `phaseName`. |
| `draw.js` | canvas fit/colour/disc helpers, hover-target registry. |
| `sky.js` `orrery.js` `timeline.js` `charts.js` | one render function each, no state mutation. |
| `main.js` | `setT`, `draw`, all event wiring, geolocation, the idle animation loop. |

Do not add cross-imports between the four render modules. If two need something, it goes in
`draw.js` or `state.js`.

## Invariants

Each of these was a bug once. Breaking one is silent — nothing throws.

**Time scales.** `sunPos`/`moonPos` take **UT**; `sunPosTT`/`moonPosTT` take **TT**. The
wrappers apply ΔT. `gmst()` takes **UT**. Meeus's worked examples are stated in TT, so
validate against `moonPosTT`. Never pass a JD from `jd(ms)` into a `*TT` function.

**Argument of latitude.** Use `moonPos().F`. Do not reconstruct it from `bet` with `asin` —
that cannot separate the ascending and descending halves of the orbit and is wrong by up to
~33°.

**Live bindings.** `T`, `yearStart`, `yearEnd`, `anim`, `frame` are exported `let`. Mutate
them only through `_setT`, `_setYear`, `bumpAnim`, `clearFrame`. Assigning to an imported
binding is a TypeError in modules and silently diverges once bundled.

**No `Intl.DateTimeFormat` construction inside a render path.** Go through `dtf()`, `fmt()`
or `tzOff()`, which memoise. Constructing them per sample cost 43 ms/frame; memoised it is
~1.5 ms. Budget: a full `draw()` stays under ~3 ms.

**The panorama frame is closed-form, never sampled.** `buildFrame()` derives the altitude
ceiling from `90 − |lat| + 28.6°`. Any sampling reintroduces per-frame drift, which reads as
the horizon breathing during playback.

**Tracks are a rolling ±24 h ribbon** (`trackPts`), faded by `1 − |t−T|/THALF`, cached on an
absolute 10-minute grid. Do not reintroduce per-arc selection; that is what made the path
jump and truncate.

**Cache invalidation.** A location change must call `clearFrame()`, `clearTracks()` and
`clearFullCache()` together.

**Panorama wrap.** Azimuth spans a fixed 360°. Anything positional draws at x offsets
`[-w, 0, w]` and skips chunks whose endpoints jump more than `w/2`.

**Draw order in `sky.js`.** Sun and Moon are drawn *before* the translucent ground, so they
remain visible below the horizon. Moving them after it breaks that deliberately.

**No browser storage.** `localStorage` and `sessionStorage` are unavailable in the sandboxed
iframe this also runs in. Keep all state in memory.

## Reference values

Any change to `astro.js` must keep these:

| check | expected |
|---|---|
| `moonPosTT(2448724.5)` | λ 133.162655°, β −3.229126°, Δ 368409.7 km (Meeus 47.a, exact) |
| `deltaT(2026.5)` | 75.4 s |
| 2026 full moons, Nov / Dec | 24 Nov 14:53, 24 Dec 01:28 UT — within 1 min of NASA's published supermoon times |
| Polaris altitude, any instant | within 0.74° of the observer's latitude (its pole distance) |
| `draw()` cost | ≤ ~3 ms per frame |

There is no test harness checked in. Verifying render code without a browser needs a stubbed
`document`/canvas; if you build one, put it in `test/` and wire it to these values.

## Build constraint

`build.mjs` strips `import`/`export` textually and concatenates. That is only safe because
every module uses static top-level imports and top-level names are globally unique. If you
add a module, add it to `ORDER`. If you add a name, check it does not already exist elsewhere
— a collision will not error, it will shadow.

## Conventions

- Vanilla ES modules and Canvas 2D. No framework, no bundler beyond `build.mjs`, no packages.
- Colour tokens live in `:root` in `styles.css`. Canvas code uses literal hex matching those
  tokens — CSS variables do not resolve in canvas contexts.
- Metric units, en-GB date formatting, degrees not radians at API boundaries (`astro.js`
  exports degree-taking `sin`/`cos`/`tan`).
- Comments explain *why*, especially where something is an approximation.
- Respect `prefers-reduced-motion`: it gates the idle ray animation.

## Deliberate omissions

Do not "fix" these without asking. Each is a decision, not an oversight.

- **Nutation, solar aberration, light-time, equation of the equinoxes.** Each ~20″, together
  comparable to the truncation error. Adding one without the others is not an improvement.
- **Eclipse prediction.** The strip shows geometry only. Node proximity is necessary but not
  sufficient, and a half-right prediction is worse than none.
- **External geocoding.** Naming a located position uses the embedded `CITIES` list so
  coordinates never leave the browser. A gazetteer lookup means sending someone's position to
  a third party; that needs explicit consent, not a silent fetch.
- **Exaggerated orrery scales.** Earth is ~27× oversized against the Moon's orbit and the
  distance swing is stretched ~5×. Intentional, and disclosed.

## The honesty rule

The accuracy audit in the `more` drawer of `index.html` is part of the product, not
documentation about it. **Any change to the physics, the scales or the drawing must update
the matching section of that audit in the same commit.** If a change makes something less
accurate, say so there in plain language rather than leaving the old claim standing.
