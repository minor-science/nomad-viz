# Contributing

Corrections and suggestions are welcome, especially from readers of *A Thousand Plateaus* and from physicists.

## Reporting an error

Please open an issue for any of these:

- **A misquotation or a wrong page.** Give the passage and the page in the Minnesota translation (1987).
- **A misreading.** Say which model, which caption or label, and how you read the passage instead.
- **Physics that is wrong,** or a divergence the Sources panel does not admit. A reference helps.
- **A bug,** with the address from the address bar (it records the model, the mode, and every setting), the browser, and the device.

## Proposing a change

1. Fork the repository and create a branch.
2. Run it locally (`npm install`, then `npm run dev`).
3. Make the change. For a change to a model’s physics, measure the model before and after with `npm run sim`, and keep its processes in balance (see [docs/METHOD.md](docs/METHOD.md)).
4. Run `npm run check` (type-check and build). If you have a plain-text copy of the book, also run `npm run check:atp` (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).
5. Open a pull request that says what changed and why, and for a model change, what the measurements showed.

## Writing

Text in the models and the Sources follows a few conventions, set out in [docs/METHOD.md](docs/METHOD.md). Quote the book exactly, and cite it as “(*Plateaus*: 363)” at the first citation in a paragraph and by page alone after that. Write “cf. X” or “citing X” for a source. Keep the language plain, with no dashes or semicolons outside quotations.

## License

By contributing you agree that code is licensed under the Apache License 2.0 and text under CC BY 4.0, as described in the [README](README.md#license).
