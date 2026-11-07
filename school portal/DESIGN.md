# Spark portal design context

Spark is a school operations workspace for administrators and staff. Preserve the established navy, pale blue, and orange identity across the portal.

- **Color:** Navy `#1d3568` for primary text and actions, campus blue `#235b88` for the map boundary, pale blue `#edf3ff` for calm surfaces, orange `#ee742b` for attention and check-in snapshots, green `#17a57a` for fresh live presence, white `#ffffff` for content surfaces.
- **Type:** Manrope for display headings; the existing application sans-serif for forms, tables, and labels. Use tabular numerals for times and counts where available.
- **Layout:** The login's one signature scene is the animated school campus beneath a fixed sky. Its compact paired panels fit a typical laptop viewport with clear margins, then stack on mobile. The transparent Spark mark floats over the scene without a tile. Theme controls sit in the form column and remain in the page flow. Attendance places the live campus map beside a roster on laptop screens, then stacks them on narrow screens.
- **Motion:** Ambient model motion may run only while visible. The supplied sun and moon GLBs and star field are camera anchored so they stay fixed when the campus turns. The sun has a restrained corona to distinguish it in the day scene. Shooting stars cross the story panel; faint stars sit behind the form. Reduced-motion users receive a stable scene without shooting stars. Interface transitions should never delay a form or obscure status.
- **Content:** Show observed attendance and location data only. Empty states explain the next action. Label location freshness and accuracy; never imply that a check-in snapshot is a live position.

Runtime colors for the new map and attendance layout live in `src/index.css`. Existing global theme styles in `src/theme.css` remain the theme owner.
