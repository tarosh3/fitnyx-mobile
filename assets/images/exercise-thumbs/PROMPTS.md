# Movement-pattern exercise thumbnails

Generated using the built-in `image_gen` tool for exercise list tiles. Each movement was generated separately with the shared prompt and its subject below. The final thirteen prompts also specified: “Full color mint-green contour and dark-forest fill, no black or monochrome silhouette.”

## Shared prompt

Use case: logo-brand. Create a single movement-pattern exercise-thumbnail PNG for FitNyx. Exactly 1024x1024 square, TRUE transparent background. Warm minimal mint contour line-art, bold uniform rounded 40px strokes colored #5FC793, sparse flat dark-forest #103D2C fills. Simple pictographic subject, very few strokes, legible at 56px. Centered, entire subject within central 72% canvas. No text, no labels, no border, no panel, no watermark, no glow, no gradients, no shadows, no anatomy, no muscles, no 3D mannequin, no photorealism. All empty space transparent. 

Append `Subject: <subject> One coherent exercise pictogram.`

## Subjects

- **vertical-press**: One simple upright athlete pressing a horizontal dumbbell overhead, round head, straight raised arm, minimal torso.
- **horizontal-pull**: Side-view seated athlete pulling a short cable handle horizontally toward waist; bent elbow, upright back, feet forward. Simple horizontal cable line; no weight stack.
- **vertical-pull**: Front-view athlete hanging from one horizontal pull-up bar, hands wide, elbows bent, round head below bar. No upright posts.
- **squat**: Side-view athlete in a deep bodyweight squat: hips lowered, knees bent, feet flat, arms forward. Strong simple silhouette.
- **hinge**: Side-view athlete performing a deadlift hip hinge, back straight and inclined forward, slightly bent knees, arms hanging toward a simple barbell at shins.
- **lunge**: Side-view athlete in split stance lunge, front knee bent at right angle, rear knee lowered, upright torso, hands on hips.
- **core-anti-extension**: Side-view athlete holding a forearm plank, straight back and legs, elbows under shoulders, small round featureless head.
- **core-rotation**: Front three-quarter view of an athlete seated with bent knees, torso rotated to one side holding a single round medicine ball at hip. Minimal silhouette.
- **carry**: Front view of upright walking athlete carrying one simple dumbbell in each lowered hand, arms straight at sides, one leg stepping.
- **curl**: A single bent arm curling one small dumbbell toward shoulder, upright forearm, minimal rounded elbow contour. No head or torso.
- **triceps-extension**: Side-view upper torso and round head, one upper arm vertical beside head, elbow bent with forearm reaching backward holding small dumbbell behind head for overhead triceps extension.
- **calf**: A single lower leg and foot in side view performing a calf raise: heel lifted high, forefoot on small step. Clear ankle and heel silhouette.
- **cardio**: Side view of one minimal running athlete, round head, bent arms, one knee forward and opposite leg back. No scenery.
- **horizontal-press**: Minimal side-view athlete lying on a simple bench, holding a barbell upward above chest with extended arms. Round featureless head, clean dark-forest body silhouette outlined mint, simple barbell.

## Files and processing

`movement-<name>.png` contains the 512×512 runtime asset. `originals/movement-<name>.png` retains a 1024×1024 source. Generated canvases are fitted to 1024px with sips and padded to a transparent square when needed, preserving aspect ratio and alpha. Runtime copies are compressed with:

```sh
sips -Z 512 movement-*.png
pngquant --quality=65-90 --force --ext .png movement-*.png
```

## Selection

`movementOf` in `src/features/workouts/model.ts` uses cardio tracking, explicit movement categories, then known exercise names. Unknown movements use the existing generic body-part icons. `ExerciseThumb` prefers a Cloudinary video poster, then the movement illustration, then the generic body-part fallback. Catalog mannequin stills, muscle anatomy images, and related exercise images are not used. Failed video posters fall back to the illustration.

