// Copyright 2018-2026 the Deno authors. MIT license.

import { once } from "node:events";
import { Worker as NodeWorker } from "node:worker_threads";
import { assert, assertEquals, loadTestLibrary } from "./common.js";

const lib = loadTestLibrary();
const version10 = loadTestLibrary("examples/napi_version_10");

async function waitForShutdown(finalizers, shutdowns, version10Finalizers) {
  const deadline = performance.now() + 5000;
  while (
    (lib.test_worker_finalizer_count() < finalizers ||
      lib.test_worker_shutdown_count() < shutdowns ||
      version10.count() < version10Finalizers) &&
    performance.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assertEquals(lib.test_worker_finalizer_count(), finalizers);
  assertEquals(lib.test_worker_shutdown_count(), shutdowns);
  assertEquals(version10.count(), version10Finalizers);
}

function messageFrom(worker) {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = (event) => {
      event.preventDefault();
      reject(new Error(event.message));
    };
  });
}

for (const mode of ["normal", "terminate", "error"]) {
  Deno.test(`napi Web Worker shutdown (${mode})`, async () => {
    let finalizers = lib.test_worker_finalizer_count();
    let shutdowns = lib.test_worker_shutdown_count();
    let version10Finalizers = version10.count();
    for (let i = 0; i < 3; i++) {
      const worker = new Worker(
        new URL("./worker_termination_worker.js", import.meta.url),
        { type: "module" },
      );
      try {
        assertEquals(await messageFrom(worker), "ready");
        const created = messageFrom(worker);
        worker.postMessage("create_finalizers");
        assertEquals(await created, "created");
        if (mode === "terminate") worker.terminate();
        else if (mode === "error") {
          const failed = new Promise((resolve) => {
            worker.onerror = (event) => {
              event.preventDefault();
              resolve(event.message);
            };
          });
          worker.postMessage("error");
          assert(String(await failed).includes("worker shutdown error"));
        } else worker.postMessage("close");
        finalizers += 3;
        shutdowns++;
        version10Finalizers++;
        await waitForShutdown(finalizers, shutdowns, version10Finalizers);
      } finally {
        worker.terminate();
      }
    }
  });
}

for (const mode of ["normal", "terminate", "error", "busy"]) {
  Deno.test(`napi Node worker shutdown (${mode})`, async () => {
    let finalizers = lib.test_worker_finalizer_count();
    let shutdowns = lib.test_worker_shutdown_count();
    let version10Finalizers = version10.count();
    for (let i = 0; i < 3; i++) {
      const worker = new NodeWorker(
        new URL("./node_worker_finalizer.js", import.meta.url),
        { workerData: { mode } },
      );
      const errors = [];
      worker.on("error", (error) => errors.push(error.message));
      const exited = new Promise((resolve) => worker.once("exit", resolve));
      try {
        assertEquals((await once(worker, "message"))[0], "ready");
        if (mode === "terminate" || mode === "busy") {
          const termination = worker.terminate();
          const repeatedTermination = worker.terminate();
          assertEquals(await termination, 1);
          assertEquals(await repeatedTermination, 1);
        }
        await exited;
        assertEquals(errors, mode === "error" ? ["worker shutdown error"] : []);
        finalizers += 3;
        shutdowns++;
        version10Finalizers++;
        assertEquals(lib.test_worker_finalizer_count(), finalizers);
        assertEquals(lib.test_worker_shutdown_count(), shutdowns);
        assertEquals(version10.count(), version10Finalizers);
      } finally {
        await worker.terminate();
      }
    }
  });
}
