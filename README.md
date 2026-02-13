# Pokemon & Moemon Sprite Viewer

A side-by-side sprite viewer for Radical Red Pokemon and Moemon sprites, organized by Pokedex ID.

🔗 **[Live Demo](https://[your-username].github.io/[your-repo-name]/)**

## Features

- 🎮 **Split View**: Compare Pokemon and Moemon sprites side by side
- 🔍 **Zoom View**: Click any sprite to see it enlarged (8x scale, crisp pixel art)
- 🔎 **Search**: Find Pokemon by name, key, or Dex ID
- 📊 **Filter Options**:
  - Show all / Has both / Pokemon only / Moemon only
  - Toggle shiny and back sprites
- ⭐ **Smart Naming**: Canonical forms marked with ★
- 📱 **Responsive**: Works on desktop and mobile

## Stats

- **1,343** Pokemon forms (Radical Red)
- **1,848** Moemon forms
- **975** unique Pokedex IDs with Moemon sprites
- **949** canonical Moemon forms

## Moemon Naming Rules

The viewer applies consistent naming conventions:
- **Canonical forms**: Highest version number (or female forms when available)
- **Versions**: `-v1`, `-v2` for non-canonical variants
- **Megas**: `-Mega`, `-Mega-X`, `-Mega-Y`
- **Gender**: `-Male` for male variants (female is default)
- **Custom forms**: Capitalized prefix from filename

## Project Structure

```
├── index.html                           # Main viewer page
├── sprite-viewer.html                   # Pokemon-only viewer
├── dex-to-rr-mapping.json              # Pokemon mapping
├── dex-to-moemon-mapping.json          # Moemon raw mapping
├── dex-to-moemon-mapping-processed.json # Moemon processed mapping
├── Radical-Red-Pokedex-master/         # Pokemon sprites & data
│   └── graphics/species/
│       ├── front/
│       ├── front shiny/
│       ├── back/
│       └── back shiny/
├── moemon-sprites-split/               # Moemon sprites
│   ├── front/
│   ├── front shiny/
│   ├── back/
│   └── back shiny/
└── scripts/
    ├── format-js.js                    # JS formatter
    ├── map-dex-to-rr.js               # Generate Pokemon mapping
    ├── map-dex-to-moemon.js           # Generate Moemon mapping
    ├── process-moemon-mapping.js      # Process naming rules
    └── split-moemon-sprites.js        # Split sprite sheets

```

## Scripts

### Generate Mappings
```bash
# Generate Pokemon mapping
node map-dex-to-rr.js

# Generate Moemon mapping
node map-dex-to-moemon.js

# Process Moemon names
node process-moemon-mapping.js
```

### Split Moemon Sprites
```bash
# Split sprite sheets (4-in-1) into individual sprites
node split-moemon-sprites.js
```

## Local Development

1. Clone the repository
2. Open `index.html` in a web browser via a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```
3. Navigate to `http://localhost:8000`

> **Note**: Opening `index.html` directly (file://) won't work due to CORS restrictions on loading JSON files.

## Credits

- **Pokemon Sprites**: Radical Red Pokedex
- **Moemon Sprites**: Moemon Community
- **Data Processing**: Custom scripts for mapping and organization

## License

This project is for educational and archival purposes. All Pokemon sprites and related content are property of their respective owners.
