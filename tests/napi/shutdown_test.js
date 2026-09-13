// Copyright 2018-2026 the Deno authors. MIT license.

import { assert, assertEquals, fromFileUrl } from "./common.js";

for (const command of ["run", "test", "bench"]) {
  for (const phase of command === "run" ? ["load"] : ["load", "unload"]) {
    Deno.test(`napi cleanup after ${command} ${phase} error`, async () => {
      const result = await new Deno.Command(Deno.execPath(), {
        args: [
          command,
          "-A",
          "--config",
          fromFileUrl(new URL("../config/deno.json", import.meta.url)),
          "--no-lock",
          fromFileUrl(new URL("./shutdown.js", import.meta.url)),
          ...(command === "run" ? [] : ["--"]),
          phase,
          command,
        ],
      }).output();
      const output = new TextDecoder().decode(result.stdout) +
        new TextDecoder().decode(result.stderr);
      assertEquals(result.code, 1, output);
      assert(output.includes(`addon host failed during ${phase}`), output);
      assert(output.includes("pointers released on shutdown"), output);
    });
  }
}
