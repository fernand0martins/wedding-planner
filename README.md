# Wedding Planner

Interactive, client-side wedding planning application for Joana Coutinho and Fernando Martins.

## Features

- Drag-and-drop seating plan with household rules and table locking
- Floor planner with room dimensions, blocked spaces, draggable tables, and 45° rotation
- Guest markers aligned to rotated table edges
- Overnight agenda extending into the following day
- Separate Bride & Groom, Events, and Music planning columns
- Spotify links for music moments
- JSON import/export, CSV export, browser autosave, undo, and redo

## Base configuration

The application loads `base-config.json` before it starts. The file may contain either a raw wedding plan or an exported configuration with the plan under the `plan` property.

If the JSON file cannot be loaded, the application falls back to the base plan embedded in the compressed application.

## Run

Serve the repository through a local or hosted HTTP server and open `index.html`. For example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.
