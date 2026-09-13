// Copyright 2018-2026 the Deno authors. MIT license.

export { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
export { fromFileUrl } from "@std/path";
import process from "node:process";
import { basename, dirname } from "@std/path";

const targetDir = Deno.execPath().replace(/[^\/\\]+$/, "");
export const [libPrefix, libSuffix] = {
  darwin: ["lib", "dylib"],
  linux: ["lib", "so"],
  windows: ["", "dll"],
}[Deno.build.os];

export function loadTestLibrary(name = "test_napi") {
  const specifier = `${targetDir}/${dirname(name)}/${libPrefix}${
    basename(name)
  }.${libSuffix}`;

  // Internal, used in ext/node
  const module = {};
  // Pass some flag, it should be ignored, but make sure it doesn't print
  // warnings.
  process.dlopen(module, specifier, 0);
  return module.exports;
}
