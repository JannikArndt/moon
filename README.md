# Moon Lab

An in-browser instrument for seeing what the Moon actually does: where it sits in your sky,
what colour it turns near the horizon, how big it really is tonight, and why any of that
happens. Two panels, one timeline, no server.

**Live:** `https://<user>.github.io/moon-lab/` · **Offline:** open `dist/moon-lab.html`

---

## The question it started from

> *"I just learned that the moon looks larger in July."*

It doesn't — not in the sense of angular size. What is special about July in the northern
hemisphere is that the full moon sits opposite a high summer sun, so it crawls along the
southern horizon. A low moon triggers the moon illusion and reddens through a long slant of
atmosphere. Its actual width follows the perigee cycle, which ignores the calendar entirely:
in 2026 the July full moon is **29.6′** across, one of the smallest of the year, while
December's is **34.0′**.

The "every full moon this year" chart in the **more** drawer shows both curves at once. The
ember line — height in the sky — collapses in June and July. The blue bars — real angular
size — do not care.

---

## What it shows

**Sky panel.** Your whole horizon flattened into a fixed 360° panorama. The Moon is drawn with
the correct phase, the correct orientation of its bright limb and disc, and a colour computed
from atmospheric extinction at its current air mass. Sun and Moon tracks run as ribbons that
fade in a day before and out a day after. Bright stars sit at their catalogue positions and
turn with the Earth. The ground is translucent, so you can watch both bodies continue below
the horizon.

**Orrery panel.** Sun, Earth and Moon from outside the ecliptic. Sunlight streams past as
dashed parallel rays. Earth turns under a sun-locked terminator with coastlines and a
graticule, poles marked, and a pin at your own position — which is the thing that ties the two
panels together: when your pin rotates into the night side, the sky above goes dark.

**Timeline.** A year, with the surrounding fortnight magnified so dates are readable. Moon
phases along the top: one glyph per day inside the lens, new and full moons outside.

**Interaction.** Swipe sideways anywhere to move time. Tap or hover anything — including the
dotted lines — to have it name itself. Tap the date to jump anywhere.

---

## Honesty

Every position is computed live from series expansions; nothing is fetched or pre-tabulated.
The **more** drawer carries a full audit of what is calculated, what is approximated and what
is simply drawn. The short version:

| | |
|---|---|
| Moon | Meeus ch. 47, full 60-term tables. ~10″ longitude. Reproduces worked example 47.a to all digits. |
| Sun | Meeus ch. 25 low-precision, ~0.01°, best 1950–2050. |
| Time | ΔT applied (Espenak & Meeus). Full/new moon instants match NASA's 2026 supermoon times to the minute. |
| Not modelled | Nutation, solar aberration, light-time, equation of the equinoxes. Each ~20″. |
| Observer | Topocentric parallax on the 1976 ellipsoid; Bennett refraction at standard conditions. |
| Colour | Kasten–Young air mass; extinction coefficients are a typical-site *convention*, not a standard. Hue is right; dimming is not shown. |
| Orrery scale | Moon:Earth diameter ratio is correct. Nothing else is. Distance swing exaggerated ~5×. |
| Coastlines | Hand-drawn, tens of km out. |

Not suitable for occultation timing, grazing eclipses, or navigation.

---

## Running it

```bash
git clone https://github.com/<user>/moon-lab.git
cd moon-lab
python3 -m http.server 8000     # ES modules need a server, not file://
```

**GitHub Pages:** push to `main`, then Settings → Pages → deploy from `main`, folder `/`.
`.nojekyll` is included so the `src/` directory is served as-is. Nothing to build for the
hosted version.

**Single file:**

```bash
node build.mjs        # -> dist/moon-lab.html, ~76 kB, no dependencies
```

`build.mjs` concatenates the modules in dependency order and strips the import/export
keywords. That works only because the modules use static top-level imports and unique names;
if you add a module, add it to `ORDER`.

Serving it standalone also makes *Add to Home Screen* work properly — the file already carries
`apple-mobile-web-app-title`, `apple-mobile-web-app-capable` and an inline SVG icon. Inside an
iframe those tags are ignored, which is why the shortcut is named after the host page there.

---

## Layout

```
index.html        shell, controls, and the accuracy audit in the drawer
styles.css
build.mjs         zero-dependency single-file bundler
src/
  astro.js        ephemeris and observing geometry — the only file with real physics
  data.js         star catalogue, coastlines, city list
  state.js        shared state, caches, calendar and timezone helpers
  draw.js         canvas helpers and the hover-target registry
  sky.js          the horizon panorama
  orrery.js       Sun–Earth–Moon, and the globe
  timeline.js     the magnified year
  charts.js       the two drawer diagrams
  main.js         input handling and wiring
dist/moon-lab.html
```

---

## Bugs found while building this

Kept because each one was invisible until it was measured.

1. **The observer dot moved at a varying rate.** It was placed using only its ecliptic
   longitude, flattening a tilted circle onto a flat one. Now driven by the Sun's hour angle:
   15.0003–15.0006° per hour over three days.
2. **The Moon's path drew half an arc.** Sampling used a fixed ±16 h window, but a winter moon
   at 53°N stays up longer than that, so the tail fell outside and appeared later. Replaced by
   an outward search for the true rise and set: 21 truncated frames out of 151 became 0 of 154.
   Later replaced again by the fading ±24 h ribbon.
3. **The stars did not move.** They were a fixed screen pattern. Now real coordinates
   converted to alt-azimuth each frame — Polaris lands at 54.2° for latitude 53.55°.
4. **The eclipse diagram used the wrong branch.** It rebuilt the argument of latitude from the
   ecliptic latitude with `asin`, which cannot distinguish the two halves of the orbit and was
   wrong by up to 33°. The theory already computes `F`; it now returns it.
5. **Universal Time was fed to formulas expecting Terrestrial Time.** Worth 34″ of lunar
   longitude and about a minute in phase instants. ΔT is now applied.
6. **43 ms per frame.** `Intl.DateTimeFormat` was being constructed fresh for every one of
   ~290 track samples per frame. Memoising the formatters took it to 1.5 ms — a 29× difference
   and the single largest performance mistake in the file.
7. **A fix silently reverted.** A precomputed star field was overwritten by a later rebuild
   from stale sources and went unnoticed for two revisions. Found only by re-auditing.

---

## Licence

MIT — see `LICENSE`. The astronomical algorithms are from Jean Meeus,
*Astronomical Algorithms* (2nd ed., Willmann-Bell); the implementation here is original.
