# Chess Project

A React and TypeScript chess web application powered by Vite.

## Getting started

Install the project dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will print the local URL in the terminal. Open that URL in your browser.

## Other commands

```bash
npm run build
npm test
```

The current app includes:

- Local two-player chess with legal move validation, captures, check and game-over status, reset support, and move history.
- Optional Stockfish 19 AI games running in a browser Web Worker.
- White, Black, and Random side selection with Easy, Medium, and Hard search-depth settings.
- Unlimited, 1-minute, 3-minute, 5-minute, and 10-minute chess clocks.