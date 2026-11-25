// node:module for the browser build: createRequire() hands out the one CommonJS dependency Levni loads that way.
import * as fontkit from 'fontkit';

export function createRequire() {
  const req = (id) => {
    if (id === 'fontkit') return fontkit;
    throw new Error(`levni (browser): cannot require ${id}`);
  };
  req.resolve = (id) => { throw new Error(`levni (browser): cannot resolve ${id}`); };
  return req;
}
export default { createRequire };
