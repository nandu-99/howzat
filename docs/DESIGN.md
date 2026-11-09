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

The source editor keeps a native textarea for editing, with a separate highlighted
layer and line-number gutter. The example picker uses a custom Radix Select menu.
Compilation, source selection, diagnostics, and navigation keep their existing
behavior.

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

## Editor and language reference

The source editor uses a native textarea over a presentation-only highlighted
layer, with synchronized line numbers and scrolling. Text editing, source-error
selection, and Ctrl/Cmd+Enter compilation keep their original behavior. The
backend lexer remains the authority; highlighting does not validate programs.

The language guide uses a sticky section sidebar on desktop and a stacked layout
on smaller screens. It documents token regex and keyword meanings, deliveries,
cricket rules, grammar, examples, derivations, and the compiler phases. Example
tabs support arrow keys, Home, and End. Source examples share the editor's
highlighter, with colors adapted to the light reference panels.

## Syntax views and selection controls

Playground examples and syntax deliveries use the shared Radix Select component.
Grouped options, selected checks, keyboard navigation, Escape dismissal, focus
restoration, and portaled menus preserve usable controls within narrow panels.

AST and parse-tree canvases use the light theme, with distinct nonterminal,
terminal, and empty-production colors. Token transitions use light surfaces,
readable labels, directed arrows, and a double-ring accepting state. Each syntax
view has unique tab and delivery IDs so the guide and playground cannot redirect
keyboard focus into one another.

## Semantic results and diagnostics

Semantic results start with a checked-rules summary and counts of teams, overs,
and deliveries. The existing tables retain every validated value and original
source position. Light headers, row hover states, and source-link controls match
the application palette; wide tables scroll within their panels.

Compiler diagnostics separate the failed phase, source location, message,
suggested correction, and recovery actions. Line numbers appear only when an
original source location is available. Runtime errors do not suggest that a
generated Python line is an original Howzat line. Error content is rendered as
text, and the existing editor selection and corrected-example actions are kept.

## Code and optimization views

Intermediate scoring instructions and generated Python use labeled light code
panels with the shared monospace font. Long listings scroll within the panel;
keyboard users can focus the code area to scroll without moving page focus.

The optimization view preserves aligned before/after rows, instruction counts,
folding explanations, and the unchanged-output state. A text legend explains
minus and plus prefixes, so color is not the only way to identify changed lines.
Comparisons stack on narrower screens. Output remains escaped text, and no
compiler or execution behavior changes.
