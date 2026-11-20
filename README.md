# Neon Coast Cover Studio

A free offline web app that turns your photos and a caption into a
multi-panel poster cover in the style of GTA 6's posters — bold title
lettering, a script subtitle, and a sunset / neon colour grade — exported
as a PNG to share. Everything runs in the browser from static files;
photos are read on your own machine and never uploaded.

## Use it

Serve `app/` with any static server and open `index.html` in desktop
Chrome, for example:

```sh
node serve.ts
# open http://localhost:8080
```

1. Add photos (or click **Use sample photos**).
2. Pick a layout: Hero + 3, Four grid, Three strip, or Full bleed.
3. Pick a colour grade: Sunset, Neon night, Teal dawn, or Magenta heat.
4. Type the title and subtitle.
5. Click a panel in the preview to select it, drag to move its photo,
   scroll to zoom it. **Fill all panels with one photo** spreads one
   photo across every panel.
6. Pick an export size (1080 × 1080, 1080 × 1350, or 1920 × 1080) and
   click **Export PNG**.

## Files

- `app/index.html` — the studio page
- `app/style.css` — editor styling
- `app/src/cover.js` — the cover engine (layouts, grades, lettering, grain)
- `app/src/main.js` — editor wiring, drag/zoom, export
- `app/src/shots.js` — fixed scenes for screenshots (`?shot=cover|editor`)
- `app/fonts/` — Archivo Black and Pacifico, SIL Open Font License
  (see `app/fonts/OFL.txt`); no Rockstar Games logo, artwork, or font
  is used anywhere
- `app/samples/` — two photos made with an image model for this entry
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` (run with
  `MAKEFUN_OUTPUT_DIR=out node main.ts`)
- `screenshots/` — the cover the app exported and the editor at work

## License

MIT — see `LICENSE`.
