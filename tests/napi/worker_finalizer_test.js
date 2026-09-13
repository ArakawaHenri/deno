// Copyright 2018-2026 the Deno authors. MIT license.

import { once } from "node:events";
import { Worker as NodeWorker } from "node:worker_threads";
import { assertEquals, loadTestLibrary } from "./common.js";

const lib = loadTestLibrary();

async function assertFinalizerCount(expected) {
  const deadline = performance.now() + 5000;
  while (
    lib.test_worker_finalizer_count() < expected &&
    performance.now() < deadline
  ) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assertEquals(lib.test_worker_finalizer_count(), expected);
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

for (const terminate of [false, true]) {
  Deno.test(`napi finalizers run once when a Web Worker ${terminate ? "terminates" : "closes"}`, async () => {
    let expected = lib.test_worker_finalizer_count();
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
        if (terminate) worker.terminate();
        else worker.postMessage("close");
        expected += 3;
        await assertFinalizerCount(expected);
      } finally {
        worker.terminate();
      }
    }
  });

  Deno.test(`napi finalizers run once when a Node worker ${terminate ? "terminates" : "exits"}`, async () => {
    let expected = lib.test_worker_finalizer_count();
    for (let i = 0; i < 3; i++) {
      const worker = new NodeWorker(
        new URL("./node_worker_finalizer.js", import.meta.url),
        { workerData: { hold: terminate } },
      );
      const exited = once(worker, "exit");
      try {
        assertEquals((await once(worker, "message"))[0], "ready");
        if (terminate) await worker.terminate();
        await exited;
        expected += 3;
        await assertFinalizerCount(expected);
      } finally {
        await worker.terminate();
      }
    }
  });
}
