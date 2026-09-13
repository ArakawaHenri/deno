// Copyright 2018-2026 the Deno authors. MIT license.

import { parentPort, workerData } from "node:worker_threads";
import { loadTestLibrary } from "./common.js";

const lib = loadTestLibrary();
globalThis.retainedFinalizers = lib.test_worker_finalizers();
parentPort.postMessage("ready");
if (workerData.hold) {
  setInterval(() => {}, 1000);
}
