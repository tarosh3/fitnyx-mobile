# Completion artwork and publishing

Vector-style raster PNGs with real alpha transparency, generated with the built-in imagegen tool. Native text and metrics remain accessible; artwork is decorative.

## Bundled assets

- `workout-celebration.png`: 768 × 768; workout hero.
- `roam-journey.png`: 768 × 768; Roam hero.
- `achievement.png`: 384 × 384; reward illustration.

Images use contain sizing: hero up to 148 logical pixels, accent 42 × 48. Artwork cannot overlap text. Bundled PNGs work in both themes; remote entries may use separate theme files.

## Remote additions

1. Apply backend `migration_completion_artwork.sql`, then deploy backend and admin changes.
2. Ship the mobile renderer once. Later artwork additions need **no mobile build or OTA update**.
3. Host a transparent PNG at a public, immutable/versioned HTTPS URL. Recommended: 768 × 768, 8–10% safe padding, under 500 KB. Allowed: 256–2048 px, aspect ratio 3:4 through 3:2.
4. Admin → App Config → Completion artwork: add an illustration, select Workout/Roam and Hero/Accent, enter dimensions and light/dark URLs, review both previews, save. The same URL may serve both themes.
5. Apps refresh config on launch/foreground; backend cache is 30 seconds. Selection is stable per activity. Invalid entries are ignored; empty catalogs or failed downloads show bundled art.

Config is cached offline. Remote images follow the OS image cache; bundled fallbacks are always available. The admin accepts hosted PNG URLs and does not upload files. No personal activity data is sent to the image host.

```json
{
  "version": 1,
  "items": [{
    "id": "celebration-v2", "screen": "workout", "slot": "hero",
    "lightUrl": "https://cdn.example.com/celebration-v2-light.png",
    "darkUrl": "https://cdn.example.com/celebration-v2-dark.png",
    "width": 768, "height": 768, "enabled": true
  }]
}
```

## Screen hierarchy

- Identity/status → primary result → supporting metrics.
- Workout: rewards → personal bests/comparison when present → exercise details → expandable Grit calculation → save-as-routine. Share/Done stay pinned.
- Roam review: editable identity → distance/time/speed → real route → vehicle warning if relevant → secondary details and splits. Save/discard stay pinned.
- Saved Roam: identity → result → route/replay → rewards → details/splits → delete last. Share/Done stay pinned.
- Colors use app theme tokens. No artwork backgrounds, overlapping text, cropped figures or fabricated progress indicators.

## Exact generation prompts

### Workout

Use case: stylized-concept
Asset type: transparent PNG spot illustration, vector-art style, for a premium fitness mobile app in both light and dark themes.
Primary request: an art-directed flat vector-style illustration of a confident athletic woman and man celebrating the end of training with a high-five, full bodies visible, one small dumbbell and a small four-point sparkle near their feet. Dynamic natural poses, elegant stylized proportions, refined contemporary editorial illustration, smooth deliberate outlines and clean geometric color shapes, very restrained texture. Sportswear in sage green, rich emerald, soft lavender and warm cream, natural warm brown skin tones. Use medium-to-dark colored contour lines and solid fills so silhouettes read on both off-white and near-black app surfaces.
Composition: compact centered square 1:1, all figures and objects completely inside canvas, balanced airy composition, 10 percent transparent padding on every side. Intended display about 160 to 200 logical pixels wide.
Constraints: genuinely transparent alpha background; NO background rectangle, NO scenic backdrop, NO glow, NO photorealism, NO 3D, NO gradient-filled background, NO shadows extending beyond subjects, NO words, NO UI, NO letters, NO logo, NO watermark. Only the beautiful isolated illustration.

### Roam

Use case: stylized-concept
Asset type: transparent PNG spot illustration, vector-art style, for a premium fitness mobile app in both light and dark themes.
Primary request: a beautiful stylized winding trail with a joyful small athletic walker in sage green sportswear and a warm lavender backpack taking a confident step toward a tiny summit pennant. Just two minimal leafy sprigs and a warm golden sun disc as isolated supporting shapes. Refined contemporary editorial flat vector illustration, smooth deliberate outlines, clean geometric filled shapes, elegant stylized proportions, very restrained texture. Palette: sage green, rich emerald, soft lavender, warm cream, muted golden yellow, natural warm brown skin. Medium-to-dark colored contour lines and solid fills for readability on off-white and near-black.
Composition: compact centered square 1:1, entire illustration fully inside frame, 10 percent transparent padding on all sides, designed for 160 to 200 logical pixels wide. It is an evocative journey emblem, not a rectangular landscape or a real route map.
Constraints: genuinely transparent alpha background. NO background rectangle, NO scenic backdrop, NO glow, NO photorealism, NO 3D, NO gradient-filled background, NO words, NO UI, NO letters, NO logo, NO watermark. Only isolated vector-style artwork.

### Achievement accent

Use case: stylized-concept. Asset type: small transparent PNG spot illustration for a premium fitness app, matching editorial flat vector artwork in sage green, deep emerald, warm cream, muted gold and soft lavender. Create one elegant five-point golden achievement star with a soft lavender ribbon below it, framed by two small curved sage-green laurel sprigs. Clean deliberate dark-green contour lines, crisp flat filled color shapes, very restrained hand-drawn character, balanced compact square 1:1 composition with 12 percent transparent padding. Must read clearly at 64 logical pixels on both off-white and near-black backgrounds. Genuinely transparent alpha background. No text, no digits, no logos, no background shape, no scene, no glow, no 3D, no metallic reflections, no photorealism, no gradients. Isolated refined vector-style illustration only.

