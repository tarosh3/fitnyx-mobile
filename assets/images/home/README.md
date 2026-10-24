# Home artwork

`nutrition.png` is a custom transparent FitNyx food illustration: a sage bowl,
vegetables, grains, chickpeas and a fork. The 512 × 512 RGBA derivative is bundled
locally by `HomeShortcuts`, including offline. It has no baked-in UI or background.

The original SVG contour/trail illustration lives in
`src/features/dashboard/components/HomeShortcuts.tsx`. This is symbolic artwork,
not a user's recorded route. Its colors and ROAM's surface follow the app's light/dark theme. Nutrition
uses an open illustration-and-copy layout, with live plan targets directly below. ROAM and nutrition are the primary Home destinations
because neither has a dedicated dock tab.

`strength.png` is retained from the initial design iteration, but is no longer
referenced or bundled by Home. Workouts now use a compact, theme-aware row with
an icon; active sessions receive priority without a large illustration.
