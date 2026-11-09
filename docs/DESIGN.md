# Shared visual theme

Howzat uses warm white surfaces and forest-green controls, with the desktop
workspace split 30/70 between source/results and compiler output. Smaller screens
stack those columns and keep the six phase controls reachable horizontally.

## Typography

- Source Serif 4: page headings, editor/scorecard headings, and score totals.
- Geist: navigation, controls, body copy, and status labels.
- Geist Mono: source code, grammar, instruction output, and timing metadata.

These fonts are bundled WOFF2 assets through Fontsource. font-display swap and
system fallbacks keep text available while font assets load.

## Theme and layout

`frontend/src/styles.css` defines shared colors, typography, application layout,
header, navigation, source panel, phase strip, scorecards, focus, and hover states.
`theme-surfaces.css` applies shared surface colors to existing output views.

The source control remains a native textarea and the example picker a native
select. The application shell does not depend on separate highlighting or custom
selection components. Compilation, source selection, diagnostics, and navigation
keep their existing behavior.

Phase status includes accessible full names and state labels. Pass/fail is shown
with both icons and color. Selected controls retain readable hover colors.
The logo is accompanied by live wordmark text, and the stadium banner is purely
decorative. Reduced-motion preferences are preserved.

## Assets

`frontend/public/assets/cricket-stadium.jpg` is a subtle generated cricket-stadium
banner, used only behind the page heading. The logo master, header mark, and favicon
are local PNG assets; see [logo details](LOGO.md).

Stadium generation prompt:

> Create a production website decorative banner image, wide landscape aspect ratio about 3:1. Subject: an elegant traditional cricket stadium pavilion and seating terraces viewed from the boundary, two slender floodlight towers, empty quiet ground, pale misty morning. Architecture concentrated on the RIGHT HALF, left half almost entirely blank warm ivory sky (#faf9f5) with a delicate atmospheric fade. Very light desaturated sage green monochrome, restrained soft photographic engraving aesthetic, minimal fine detail, low contrast, high key, elegant cricket heritage mood. Upper sky pale cream. The entire image will sit behind a webpage headline so keep it extremely subtle and unobtrusive, no text, no letters, no logos, no people, no cricket players, no UI mockup, no frame, no watermark. Output one wide panorama asset.

## Checks

Run the frontend tests and production build. Application flow tests use real
compiler output and cover examples, corrections, scorecards, navigation, offline
recovery, and cancellation. Canvas renderers are substituted in those DOM tests;
actual diagram rendering requires browser visual review.
