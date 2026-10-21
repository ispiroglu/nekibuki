# A3 — Interaction, Accessibility & Motion

Target: Nekibuki, impeccable/integration @ a9952f7, http://localhost:5190
Method: isolated design review (Assessment A3), 390×844 light (interactive), 390×844 dark (spot-checked on the shared evidence captures), 844×390 landscape, `prefers-reduced-motion: reduce`, keyboard-only (no pointer), Chrome fake camera (`--use-fake-ui-for-media-stream`), plus a separate context with camera permission withheld.
Layer score: 2/4
Nielsen: H1 Visibility of system status = 3/4, H3 User control and freedom = 3/4, H5 Error prevention = 3/4
Audit dimension: Accessibility = 2/4

Strengths:
- **Off-screen deck panels are genuinely inert.** Measured on the running app: the two inactive deck panels carry `inert` *and* `aria-hidden="true"`, so a screen reader never walks into a hidden screen. The deck container itself takes ArrowLeft/ArrowRight and moves the panel offset (−390 → −780 → −390). (`s6.log`, `43-deck-arrows.png`)
- **The destructive flow is well built.** "Delete this guide?" opens a Radix dialog whose focus lands on **Cancel** by default, traps Tab (measured cycle Delete → Close → Cancel → Delete), closes on Escape, and the body text names exactly what is removed. (`35-delete-dialog.png`, `s4.log` S3)
- **Reduced motion is honoured where it matters, and states survive it.** Under `prefers-reduced-motion: reduce` the scan line and breathing ring are not rendered (`.animate-scan` / `.animate-breathe` count = 0), yet the camera stream, the settings shelf and the chat sheet all still open and work — the state change is preserved, only the decoration is dropped. (`40-reduced-motion-camera.png`, `41-reduced-motion-settings.png`, `42-reduced-motion-chat-sheet.png`)

Findings:

### [P1] The "analysing" overlay claims `aria-modal` but lets focus walk behind it
- Location: `/` (camera panel) → shutter → `src/components/capture/analyzing-overlay.tsx:62` (`role="dialog" aria-modal="true"`), focus set at `:44`
- Evidence: pressed the shutter, then pressed Tab four times. Focus went `BUTTON "Cancel analysis"` → `DIV "Main screens"` → `BUTTON "Your profile"` → `BUTTON "Location on"`. The overlay is `aria-modal="true"` but nothing behind it is inert and there is no keydown trap, so the keyboard (and the screen-reader virtual cursor) walks into the live camera UI while the model is still thinking. `s6.log` "ANALYSING tab seq", `51-analyzing-overlay.png`
- Impact: Sam (screen reader / keyboard) gets the camera chrome interleaved with the modal; a VoiceOver user can end up in the shutter button with the modal still on screen. It also breaks WCAG 2.4.3 Focus Order for an explicitly modal dialog.
- Fix: make the background inert while the overlay is open (set `inert` on the deck/shell root, or trap Tab on the dialog like `src/components/ui/sheet.tsx` does) and keep `aria-modal="true"` honest.
- Suggested command: `/impeccable harden`

### [P1] The delete dialog's × has no visible focus indicator and is a 28×28 target
- Location: `/report/demo-eiffel` → Delete → `src/components/ui/dialog.tsx:41` (`focus-visible:outline-none`, `p-1.5` + 16px icon)
- Evidence: Tab into the dialog and land on the ×: computed `outline: rgb(107,106,99) none 2px` — the class explicitly removes the focus ring and no replacement ring exists. Measured box `28×28` (both `s2.log` line 229–231 and `s4.log` S3). Screenshot: `13-delete-dialog-close-focus.png`
- Impact: Sam cannot see where focus is in the dialog that is about to delete their guide; 28×28 is also under the product's own 44×44 floor (PRODUCT.md → Accessibility). WCAG 2.4.7 Focus Visible fails.
- Fix: drop `focus-visible:outline-none` and give the button `size-9`/`min-h-11 min-w-11` (or a 44px padded hit area) with `focus-visible:ring-2 focus-visible:ring-brand-ink`.
- Suggested command: `/impeccable harden`

### [P1] The camera's only keyboard path to viewfinder settings is invisible, unringed and covered by the toast
- Location: `/` (camera panel) → `src/screens/camera-screen.tsx:937-950` (`sr-only … focus:not-sr-only` trigger)
- Evidence: at rest the trigger measures **2×2 px** (`s8.log`, `s8` measurement of the You panel: `{"n":"Viewfinder settings","w":2,"h":2}`). On focus it becomes 168×44 but its computed `outline` is `none` — the class list carries no focus ring — and in the 844×390 landscape capture the focused pill is visibly **behind** the "Swipe between camera, you and your places" hint toast. Screenshots: `50-settings-trigger-focus.png`, `45-landscape-settings.png`. The pointer path (long-press) does work (`24-camera-longpress-shelf.png`), so the feature is reachable — just not visibly.
- Impact: A keyboard user tabbing the camera reaches a control they cannot see, with no focus indicator, and the one moment it becomes visible it is overlapped by the hint banner (WCAG 2.4.7 and 2.4.11 Focus Not Obscured). Casey using a switch or Bluetooth keyboard outdoors has no way to tell the shelf opened.
- Fix: give the trigger a real `focus-visible:ring-2 focus-visible:ring-white` ring, and place it in the top bar row (or hide the swipe hint while it holds focus) so the focused control is never underneath the toast.
- Suggested command: `/impeccable harden`

### [P2] Reduced motion does not stop the analysing progress bar
- Location: `/` (camera panel) → shutter → `src/components/capture/analyzing-overlay.tsx:136-138` (`animate={{ x: ['-120%','320%'] }}`, `repeat: Infinity`)
- Evidence: in a `reducedMotion: 'reduce'` context the bar's computed transform was `matrix(1,0,0,1,-27.64,0)` at t and `matrix(1,0,0,1,95.21,0)` 600 ms later — it is still animating. `src/index.css` has no `prefers-reduced-motion` block at all, so only React-side `useReducedMotion()` checks protect anything. (`s7.log`, `53-reduced-motion-analysing.png`)
- Impact: Users who set the OS "reduce motion" preference still get an infinite looping animation during every analysis — the one place in the app where motion is longest and most repeated.
- Fix: Gate the loop on `reduceMotion` (replace it with a static track + a `role="progressbar"` with `aria-valuetext` for "Analysing"), and add a global `@media (prefers-reduced-motion: reduce)` fallback in `src/index.css` for the CSS keyframe animations.
- Suggested command: `/impeccable animate`

### [P2] The analysing live region re-announces every 1.6 seconds, and the dialog has no description
- Location: `/` (camera panel) → shutter → `src/components/capture/analyzing-overlay.tsx:76` (`role="status" aria-live="polite" aria-atomic="true"`, message index advanced every 1600 ms)
- Evidence: sampled the live region twice: "Reading the frame…" → "Recognising the place…" 1.9 s later, cycling for the whole analysis. The dialog has `aria-labelledby` (an sr-only "Analyzing photo") but **no `aria-describedby`** (`s6.log`: `"describedby": null`). (`51-analyzing-overlay.png`)
- Impact: Because the region is `aria-atomic`, every rotation is a fresh, full announcement — a screen reader interrupts itself repeatedly for the duration of the analysis. The rotating copy is also `aria-hidden` visually, so a sighted-SR user hears two different "reasons" for the same wait.
- Fix: Announce the step list once (`aria-live="polite"` without `aria-atomic`, content written once on open) and keep the rotation purely visual; add `aria-describedby` pointing at the visible status line so the dialog has a description.
- Suggested command: `/impeccable harden`

### [P2] The Haptics switch has no accessible name
- Location: `/` → You panel → Haptics row → `src/screens/profile-screen.tsx:149` (`<Switch checked={hapticsEnabled} …/>`), rendered by `src/components/ui/switch.tsx`
- Evidence: the switch element has `aria-label: null`, `aria-labelledby: null`, empty text content, and no `<label for>` (the "Haptics" row title is a plain `Row` label, not programmatically associated). The measured control is 45×26. `s9.log` "switch raw", `54-profile-targets.png`
- Impact: A screen reader announces only "switch, on" with no indication of what it switches — WCAG 4.1.2 Name, Role, Value fails, in a settings panel the user reaches deliberately.
- Fix: `aria-label="Haptics"` on the switch (or wrap the row title in a `<label htmlFor>` with a generated id), and give the thumb a 44px hit area.
- Suggested command: `/impeccable harden`

### [P3] The swipe-deck's focusable group is invisible and unexplained
- Location: `/` → `src/components/layout/swipe-deck.tsx:290-298` (`role="group" aria-label="Main screens" tabIndex={0}`)
- Evidence: focusing the deck reports `outline: rgb(20,20,19) none 3px` — no visible focus indicator — while the element silently handles ArrowLeft/ArrowRight. `s5.log` "DECK focus".
- Impact: A keyboard user lands on an unlabelled "Main screens" group with no visual feedback and no instruction that arrow keys switch screens; the same group is announced to a screen reader with no hint of the shortcut.
- Fix: Add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-ink` and an accessible hint (`aria-describedby` on a visually hidden "Use the left and right arrow keys to change screen").
- Suggested command: `/impeccable polish`

Minor observations:
- The camera-denied overlay is the best-behaved error in the app: it takes focus on appearance (`active after onboarding: inDialog=true`, `s11-denied-focus.mjs`), its two buttons are the first Tab stops, and it explains recovery. It only lacks `aria-modal`, so after two Tabs focus escapes into the bottom nav (`35-camera-denied-focus.png`).
- Escape on the analysing overlay closes it but drops focus on `BUTTON "Location on"`, not on the shutter that was pressed — the user loses their place mid-flow (`s6.log`).
- Settings segmented options measure 34 px tall (`EN` 47×34, `TR` 46×34, `Auto` 57×34, `Light` 60×34, `Dark` 58×34) and "Open the camera" measures 42×42 — under the product's own 44 px floor, though still above the WCAG 2.5.8 24 px minimum (`s8.log`).
- The chat failure ("No answer — the guide could not reach the server." + "Try again") is a good recovery path, but the failure bubble has no `role="alert"` and is styled like a reply, so it is announced only as a `role="log"` addition (`34-chat-offline-error.png`).
- With Chrome's fake device the settings shelf exposes only "Grid" (no torch, no zoom presets), so the zoom controls and the zoom live-region notice could not be exercised here — recorded as a gap, not a defect.
- The report's annotation markers are 44×44 buttons with `aria-expanded`, and the annotation dialog traps focus, closes on Escape and restores focus to the marker that was opened (`s2.log` lines 206–212, `10-report-annotation.png`).

Persona red flags:
- **Sam (accessibility-dependent user):** tabbing through the delete dialog reaches the × button, which has no focus ring (P1) — Sam cannot tell what is focused and may press Enter, closing a dialog she was still reading. Second break: during analysis, Tab escapes the `aria-modal` overlay into the camera chrome behind it (P1).
- **Casey (distracted one-handed mobile user):** the only pointer path to the viewfinder shelf is a long-press hinted by the words "Hold for settings"; the keyboard path is a 2×2 px hidden button that, when focused, appears *under* the swipe hint toast (P1). Casey with a Bluetooth keyboard, a switch, or screen reader gets no visible, reliable way to open the settings.

Questions:
1. The camera-denied overlay takes focus but is not modal — is that deliberate (the nav must stay reachable) or an oversight? If deliberate, what tells a screen reader that the camera panel is currently blocked?
2. If the analysing overlay is `aria-modal`, where should focus land when the analysis ends — the shutter that was pressed, or the first element of the new report? Right now it lands on an unrelated camera chip.
3. Would you ship a settings control that is 2×2 px until focused, then renders underneath the onboarding toast, with no focus ring — in a product whose stated context is "one-handed, outdoors, in a hurry"?

SUMMARY: 2/4; 0 P0, 3 P1, 3 P2, 1 P3; the camera's keyboard-only settings trigger is invisible, unringed and hidden behind the swipe hint, and the `aria-modal` analysing overlay does not trap focus.
