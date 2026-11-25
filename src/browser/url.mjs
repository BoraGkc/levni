// node:url for the browser build.
export const fileURLToPath = (u) => decodeURIComponent(new URL(String(u)).pathname);
export const pathToFileURL = (p) => new URL(`file://${p}`);
export default { fileURLToPath, pathToFileURL };
