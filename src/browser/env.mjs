// Levni reads a few environment variables at import time and decodes one base64 bitmap with Buffer;
// give the browser an empty process and the one Buffer call it needs.
globalThis.process ??= { env: {}, cwd: () => '/' };
globalThis.Buffer ??= {
  from(data, enc) {
    if (typeof data !== 'string') return Uint8Array.from(data);
    if (enc === 'base64') return Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    return new TextEncoder().encode(data);
  },
};
