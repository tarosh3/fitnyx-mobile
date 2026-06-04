---
name: Kinetic Precision
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bdcabf'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#87948a'
  outline-variant: '#3e4942'
  surface-tint: '#73daa5'
  primary: '#7ce3ad'
  on-primary: '#003822'
  primary-container: '#5fc793'
  on-primary-container: '#005033'
  inverse-primary: '#006c46'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffc0bb'
  on-tertiary: '#5c1818'
  tertiary-container: '#ff9791'
  on-tertiary-container: '#782d2b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#8ff7c0'
  primary-fixed-dim: '#73daa5'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005234'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ae'
  on-tertiary-fixed: '#3f0306'
  on-tertiary-fixed-variant: '#7a2e2c'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '800'
    lineHeight: 80px
    letterSpacing: -0.04em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 52px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  eyebrow-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The design system is engineered for elite performance tracking, blending the data-density of professional developer tools with the refined wellness aesthetic of premium health platforms. It prioritizes clarity, focus, and surgical precision.

The style is **Modern Minimalist with Technical Nuance**. It utilizes a dark-mode first architecture to reduce visual fatigue during workouts and highlight critical biometric data. High-contrast typography and a singular, vibrant accent color create a clear visual hierarchy. The interface avoids unnecessary decorative elements, relying instead on meticulous spacing, hairline borders, and subtle inner glows to denote depth and interactivity.

## Colors

The palette is strictly functional. The **#0A0A0A** background provides a deep, infinite canvas that makes the **#5FC793** Mint Green primary accent pop with high energy. 

- **Primary Accent:** Reserved exclusively for progress indicators, primary actions (CTAs), and active toggle states.
- **Surface Tiers:** Depth is communicated through color value rather than shadows. The base is the darkest, with cards and elevated surfaces stepping up in subtle increments to provide structure.
- **Borders:** Use the hairline border color (#2A2A2A) for all structural dividers to maintain a technical, "Linear-inspired" feel without adding visual weight.

## Typography

This design system utilizes **Inter** across all levels to ensure a systematic and utilitarian feel. 

- **Numeric Readouts:** Use `display-hero` for primary metrics (e.g., Heart Rate, Pace). The ExtraBold weight and negative letter-spacing emphasize the "data-first" priority.
- **Eyebrows:** Use `eyebrow-caps` for section headers and small labels above metrics. These must always be in uppercase with a 10% tracking (letter-spacing) to ensure legibility at small scales.
- **Body Text:** Keep body copy concise. Use `text-muted` for secondary descriptions to maintain focus on the primary data points.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop and a **Fluid Grid** on mobile. 

- **Spacing Rhythm:** Based on an 8px baseline. Use generous negative space between card groups to prevent the dark UI from feeling cramped.
- **Grid:** A 12-column grid for desktop. Metrics should typically span 3 or 4 columns to allow for large numeric displays.
- **Mobile:** On mobile devices, margins reduce to 16px, and multi-column card layouts collapse into a single vertical stack to prioritize readability and thumb-reachability.

## Elevation & Depth

Depth is achieved through **Tonal Layering** and **Hairline Outlines** rather than traditional shadows. 

- **Surfaces:** Use `#1B1B1B` for the main content cards. These should have a `1px` solid border of `#2A2A2A`.
- **Inner Glows:** For specialized elements like water tracking or active progress rings, apply a subtle, soft inner glow using the primary accent color at 10-20% opacity. This creates a "glass-filled" effect without breaking the minimalist aesthetic.
- **Shadows:** Avoid drop shadows. If necessary for extreme elevation (e.g., a floating modal), use a very large (64px) blur with 40% opacity of the background color (#000000) to create a subtle "lift" from the dark canvas.

## Shapes

The shape language is a mix of architectural structure and ergonomic softness.

- **Cards:** Use a 24px corner radius (`rounded-xl`) for all main metric containers and dashboard cards. This creates a sophisticated, premium feel.
- **Interactive Elements:** Buttons and tags must be **Pill-shaped** (full radius). This clearly distinguishes clickable elements from informational containers.
- **Inner Elements:** Small elements inside cards (like progress bars or mini-charts) should use a smaller 4px or 8px radius to maintain internal alignment.

## Components

- **Buttons:** Primary buttons are pill-shaped, filled with the Mint Green accent (#5FC793), and use dark text (#0A0A0A) for maximum contrast. Secondary buttons are outlined with a hairline stroke.
- **Cards:** All cards use the `#1B1B1B` background with a `#2A2A2A` hairline border and 24px radius. Content within cards should have a minimum of 24px internal padding.
- **Progress Indicators:** Use the primary accent color for active progress. For background tracks (incomplete progress), use the border-hairline color (#2A2A2A).
- **Input Fields:** Flat styling. Use the surface-elevated color (#141414) for the field background with a hairline border that turns Mint Green on focus.
- **Biometric Charts:** Line charts should use a thin 2px stroke of the primary accent with a very subtle gradient fill (accent to transparent) beneath the line.
