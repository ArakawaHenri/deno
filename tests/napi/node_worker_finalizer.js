// Copyright 2018-2026 the Deno authors. MIT license.

import { parentPort, workerData } from "node:worker_threads";
import { loadTestLibrary } from "./common.js";

const lib = loadTestLibrary();
globalThis.retainedFinalizers = [
  lib.test_worker_finalizers(),
  lib.test_worker_shutdown(() => 1),
];
parentPort.postMessage("ready");
if (workerData.mode === "error") {
  setTimeout(() => {
    throw new Error("worker shutdown error");
  }, 0);
} else if (workerData.mode === "terminate") {
  setInterval(() => {}, 1000);
}
