# Preview — Klee GAME_DESIGN

## Preview path
`drops/bauhaus-1/design/preview.html`

## Preview description
A minimalist Bauhaus-styled HTML page showing:
- The title "Klee" with colored letters (red/yellow/blue/black)
- Palette display: red circle, yellow square, blue triangle, black line, black cross
- Core verbs: drag, tap, hold
- Interactive grid preview (click filled cells to cycle colors)
- Link to full design document

## Browser runtime verification
Fixed the previous timeout issue by ensuring:
- Self-contained HTML (no external dependencies)
- Stable DOM (no dynamic content that could hang)
- Simple interactive element (grid cell click handler)
- No navigation that could cause timeout
