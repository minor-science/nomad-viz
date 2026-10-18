// Node loader hook for the headless runner: resolve the app's extensionless relative imports to
// their .ts files, as Vite does in the browser build.
import { existsSync } from 'node:fs';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(spec, ctx, next) {
  if ((spec.startsWith('./') || spec.startsWith('../')) && !/\.[a-z]+$/.test(spec) && ctx.parentURL) {
    const url = new URL(spec + '.ts', ctx.parentURL);
    if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
  }
  return next(spec, ctx);
}

if (!globalThis.__resolveRegistered) {
  globalThis.__resolveRegistered = true;
  register(import.meta.url, pathToFileURL('./'));
}
