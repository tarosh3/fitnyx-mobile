# FitNyx exercise thumbnails

The fourteen mint movement icons and their generation prompts are documented in [PROMPTS.md](PROMPTS.md). Exercise tiles use video poster → movement icon → generic body-part icon priority, including timed exercises. Catalog mannequin stills are skipped.

The seven generic body-part PNGs below remain as fallbacks. Generated with the built-in image_gen tool; originals/ contains 1024×1024 deliverables. The top-level PNGs are 512×512 runtime copies, compressed with sips and pngquant. Tile colors and borders come from the theme.

## Files

- [chest — 1024px](originals/thumb-chest.png) · [512px](thumb-chest.png) · #4FD1C5
- [back — 1024px](originals/thumb-back.png) · [512px](thumb-back.png) · #8AAEFF
- [legs — 1024px](originals/thumb-legs.png) · [512px](thumb-legs.png) · #B9A0FF
- [shoulders — 1024px](originals/thumb-shoulders.png) · [512px](thumb-shoulders.png) · #F2C94C
- [arms — 1024px](originals/thumb-arms.png) · [512px](thumb-arms.png) · #FF9466
- [core — 1024px](originals/thumb-core.png) · [512px](thumb-core.png) · #5FC793
- [cardio — 1024px](originals/thumb-cardio.png) · [512px](thumb-cardio.png) · #FF7A95

## Shared prompt

Use case: logo-brand. Asset: a single exercise-thumbnail icon for FitNyx, a premium dark-mode fitness app. Output exactly 1024x1024 PNG with a TRUE transparent background. Centered square 1:1 composition, approximately 18% clear margin on every side. Bold minimal single-subject line icon, confident uniform 40px rounded outlines, rounded caps and joins. Small flat dark-forest-green (#103D2C) filled accents ONLY. All other space including interior negative space is transparent. Simple vector-like silhouette, few strokes, one clear subject, no fine detail. Sophisticated, friendly, softly organic. Crisp and legible at 56px. Absolutely no glow, no shadow, no gradient, no texture, no background scene, no text/letters/numbers, no UI, no watermark. NOT detailed illustration, NOT 3D render, NOT photography, NOT anatomical muscle diagram, NOT mannequin, NOT neon/cyberpunk. Match identical stroke weight, corner rounding, optical scale, and visual density across this seven-icon family.

## Subjects and colors

- chest: #4FD1C5. A barbell bench-press bar with two round plates, seen head-on. Simple straight horizontal bar connecting two round outlined plates, one at each end; no person, no bench, no extra apparatus.
- back: #8AAEFF. A pull-up bar with two hands gripping it. Just one horizontal bar and two simple rounded mitten-like hands wrapped over it, short wrist ends pointing downward. No person or body, no individual fingernail detail.
- legs: #B9A0FF. One bent leg mid-squat beside a small barbell plate. A single simple angular-but-rounded bent leg contour and foot; one round plate beside it. No full person, no anatomical detail.
- shoulders: #F2C94C. A single dumbbell pressed overhead by one arm. One simple bent arm rising upward with its fist holding a small horizontal dumbbell above it. No torso, no head, no anatomical detail.
- arms: #FF9466. A flexed arm doing a bicep curl with one dumbbell. A single simple flexed arm contour, forearm upright and hand gripping one small dumbbell at shoulder height; no torso or head, no anatomical detail.
- core: #5FC793. A clean plank silhouette with one confident curve: one minimal side-view body in plank, straight back flowing to extended legs and a short supporting forearm; tiny round head. Pictographic, no muscle or abs diagram.
- cardio: #FF7A95. A bold heartbeat/pulse line rising into a small running-shoe outline. One connected graphic with one clear pulse peak and one simple shoe contour, no laces or fine shoe detail.

## Consistency instruction (remaining six icons)

Input image: final chest icon, style reference only. Generate a new distinct icon; replace the barbell subject entirely. Match its flat line thickness, rounded caps and simple dark-green fill accents, but use the specified line color instead of turquoise. Keep the entire subject within the central 64% of the 1024x1024 square canvas. Do not copy the reference barbell where it is not part of the new subject.

## Chest revision prompt

Use case: logo-brand. Asset: a single exercise-thumbnail icon for FitNyx, a premium dark-mode fitness app. Output exactly 1024x1024 PNG with a TRUE transparent background. Centered square 1:1 composition, approximately 18% clear margin on every side. Bold minimal single-subject line icon, confident uniform 40px rounded outlines, rounded caps and joins. Small flat dark-forest-green (#103D2C) filled accents ONLY. All other space including interior negative space is transparent. Simple vector-like silhouette, few strokes, one clear subject, no fine detail. Sophisticated, friendly, softly organic. Crisp and legible at 56px. Absolutely no glow, no shadow, no gradient, no texture, no background scene, no text/letters/numbers, no UI, no watermark. NOT detailed illustration, NOT 3D render, NOT photography, NOT anatomical muscle diagram, NOT mannequin, NOT neon/cyberpunk. Match identical stroke weight, corner rounding, optical scale, and visual density across this seven-icon family.
Revise this icon into a STRICTLY FLAT 2D front-view line symbol. Line color #4FD1C5. Two perfectly circular flat weight plates, each drawn as a thick simple circular ring with one small #103D2C fill accent; a horizontal straight bar joining their centers. Remove all perspective ellipses, side faces, bevels and shading. Subject bounds must fit within the middle 64% of canvas width (18% empty margin each side). Preserve centered square transparent composition and consistent rounded 40px stroke. 1024x1024.

## Validation

Generated square PNGs were normalized to 1024×1024 with sips; transparent alpha is preserved. Inspected the full family at 56px and at 46px inside 56px tiles (the component's 82% sizing). Runtime compression:

```sh
for f in *.png; do sips -Z 512 "$f"; done
pngquant --quality=65-90 --skip-if-larger --force --ext .png *.png
```

