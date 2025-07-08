import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { build, type BuildOptions, build as esbuildBuild } from "esbuild";
import {
  type CompilerOptions,
  ModuleKind,
  ModuleResolutionKind,
  createProgram,
} from "typescript";

// Build inputs and outputs
const outDir = "dist";
const buildEntry = "src/build.ts";
const buildOutput = `${outDir}/build318`;
const loadenvEntry = "src/loadenv.ts";
const loadenvOutput = `${outDir}/loadenv.js`;

async function runBuild(): Promise<void> {
  // Remove the output directory
  if (existsSync(outDir)) {
    await rm(outDir, { recursive: true, force: true });
  }

  // Create the output directory
  await mkdir(outDir, { recursive: true });

  try {
    // Build build318
    const buildOpts: BuildOptions = {
      entryPoints: [buildEntry],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: buildOutput,
      external: [
        "esbuild",
        "chokidar",
        "istanbul-lib-instrument",
        "node:*",
      ],
    };
    await esbuildBuild(buildOpts);

    // Build loadenv
    const loadenvOpts: BuildOptions = {
      entryPoints: [loadenvEntry],
      bundle: true,
      platform: "node",
      format: "cjs",
      outfile: loadenvOutput,
    };
    await esbuildBuild(loadenvOpts);

    // Build loadenv TypeScript declarations
    const compilerOptions: CompilerOptions = {
      emitDeclarationOnly: true,
      declaration: true,
      noEmitOnError: true,
      moduleResolution: ModuleResolutionKind.Bundler,
      module: ModuleKind.ES2022,
      outDir: outDir,
    };

    const program = createProgram([loadenvEntry], compilerOptions);
    const emitResult = program.emit();

    if (emitResult.emitSkipped) {
      throw new Error("TypeScript declaration build skipped due to errors.");
    }

    console.log("Build completed successfully.");
  } catch (error) {
    console.error(
      "Build failed:",
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

runBuild();
