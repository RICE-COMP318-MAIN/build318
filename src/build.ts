#!/usr/bin/env node

/**
 * This module provides a build script for an application using esbuild. It
 * supports three modes of operation:
 *
 * - `build`: Bundles the application for production.
 * - `serve`: Serves the application with live reload for development.
 * - `profile`: Serves the application with Istanbul code coverage
 *   instrumentation.
 *
 * The script handles environment variable loading, static asset copying, and
 * output directory management. It uses esbuild plugins for asset copying and
 * code coverage instrumentation, and supports live reload during development.
 *
 * Use -h or --help to see the available options.
 */
import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type BuildContext, type BuildOptions, build, context } from "esbuild";
import { type Options, parseArgs } from "./cli";
import { type CopyPair, copyAllAssets } from "./copyfiles";
import { IstanbulPlugin } from "./instrument";
import { loadEnv } from "./loadenv";
import { serve } from "./serve";

/**
 * Resolves the paths in the copy pairs relative to the current working
 * directory and the distribution directory.
 *
 * @param copyPairs - Array of copy pairs with "from" and "to" properties.
 * @param cwd - Current working directory.
 * @param dist - Distribution directory.
 * @returns Array of resolved copy pairs with absolute paths.
 */
function resolvePairs(
  copyPairs: Array<CopyPair>,
  cwd: string,
  dist: string,
): Array<CopyPair> {
  return copyPairs.map((pair: CopyPair): CopyPair => {
    if (pair.from === "")
      throw new Error('Each copy entry must have a "from" property.');
    const srcDir: string = resolve(cwd, pair.from);
    const destDir: string = resolve(dist, pair.to);
    return { from: srcDir, to: destDir };
  });
}

/**
 * Handles the build, serve, and profile modes for the application. Cleans and
 * prepares the output directory, loads environment variables, resolves asset
 * copy pairs, and invokes esbuild with the appropriate configuration.
 *
 * @param {Options} options - The build options parsed from the CLI.
 * @returns {Promise<void>} A promise that resolves when the build or serve
 * process completes.
 */
async function builder(options: Options): Promise<void> {
  // Remove the dist directory.
  if (existsSync(options.dist)) {
    await rm(options.dist, { recursive: true, force: true });
  }

  // Create the dist directory.
  await mkdir(options.dist, { recursive: true });

  // Setup environment variables.
  const config = loadEnv(options.testing);

  // Add all environment variables to the define object.
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    define[`process.env.${key}`] = `"${value}"`;
  }

  // Base esbuild configuration.
  const esbuildConfig: BuildOptions = {
    entryPoints: [options.entry],
    bundle: true,
    sourcemap: "inline",
    outfile: join(options.dist, options.output),
    define,
  };

  // Resolve copy pairs paths.
  const cwd = process.cwd();
  const dist = resolve(cwd, options.dist);
  const resolvedCopyPairs = resolvePairs(options.copy || [], cwd, dist);

  // Setup profiling.
  if (options.profile) {
    // Need to remove previous profiling information.
    const nycDir = resolve(process.cwd(), ".nyc_output");
    if (existsSync(nycDir)) {
      await rm(nycDir, { recursive: true, force: true });
    }
    const covDir = resolve(process.cwd(), "coverage");
    if (existsSync(covDir)) {
      await rm(covDir, { recursive: true, force: true });
    }

    // Add Istanbul plugin for code coverage instrumentation.
    esbuildConfig.plugins = [IstanbulPlugin];
  }

  switch (options.mode) {
    case "build": {
      await copyAllAssets(resolvedCopyPairs);
      await build(esbuildConfig);
      console.log("Build complete");
      break;
    }

    case "serve": {
      const ctx: BuildContext = await context(esbuildConfig);
      serve(dist, options.port, ctx, resolvedCopyPairs, options.watch);
      break;
    }
  }
}

/**
 * Runs the build script by parsing command-line arguments and invoking the
 * appropriate build mode (build, serve, or profile) with the provided options.
 *
 * Sets up the CLI using Commander, validates options, and dispatches to the
 * builder.
 *
 * @returns {Promise<void>} A promise that resolves when the build process
 * completes.
 */
async function run(): Promise<void> {
  const options = parseArgs(process.argv);
  await builder(options);
}

run().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
