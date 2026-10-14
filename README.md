# ExamForge

ExamForge is a browser-based practice test builder. Create a question bank, run timed or untimed sessions, and review every answer. It is a static site that can be published directly from GitHub Pages.

## Features

- Eight clearly labeled starter questions about web fundamentals.
- Add, edit, search, and delete four-option multiple-choice questions.
- Practice with a shuffled selection of 5, 10, or all questions.
- Optional 5, 10, or 20 minute timer. An expired test submits automatically.
- Keep a saved session if you leave the test view or refresh the page.
- Score review with correct answers and explanations; retry missed questions from the latest result.
- View the last 100 completed sessions and export/import the question bank as JSON.

## Run locally

Use any static server from the repository root, for example:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. The app uses JavaScript modules, so opening `index.html` with `file://` is not supported.

## Test

Node.js 20 or later is required. No dependencies need to be installed.

```sh
npm test
npm run check
```

## Data and privacy

Questions, active session, and result history are stored in browser `localStorage` under `examforge:v1`. No data leaves the browser; there is no account, analytics, API key, or external service. Export your bank before clearing browser data. JSON imports are capped at 2 MB and validated before being added.

## Deployment

Publish the root of the `main` branch through GitHub Pages. No build step or backend is needed.

## License

MIT — see [LICENSE](LICENSE).
