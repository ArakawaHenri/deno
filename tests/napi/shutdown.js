// Copyright 2018-2026 the Deno authors. MIT license.

import { loadTestLibrary } from "./common.js";

const lib = loadTestLibrary();
globalThis.retainedFinalizers = [
  lib.test_wrap_leak({}),
  lib.test_worker_shutdown(() => 1),
];

if (Deno.args[0] === "load") {
  throw new Error("addon host failed during load");
}
addEventListener("unload", () => {
  Promise.reject(new Error("addon host failed during unload"));
});
if (Deno.args[1] === "test") {
  Deno.test("addon host", () => {});
} else if (Deno.args[1] === "bench") {
  Deno.bench({ name: "addon host", n: 1, warmup: 1, fn() {} });
}
