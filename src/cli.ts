import type { CopyPair } from "./copyfiles";

// Port range for the application server.
const PORT_RANGE = { min: 1, max: 65535 };

// Valid modes for the build process
//   build: Build the application
//   serve: Serve the application with live reload
//   profile: Serve the application with Istanbul code coverage
const validModes = ["build", "serve"] as const;
type BuildMode = (typeof validModes)[number];

// Command line options.
export type Options = {
  mode: BuildMode; // Mode of operation
  port: number; // Port for serving the application
  dist: string; // Output directory for the build
  entry: string; // Entry file for the application
  output: string; // Output file (relative to output directory)
  testing: boolean; // Whether to run in test mode (loads test environment)
  watch: boolean; // Whether to watch for changes and rebuild
  profile: boolean; // Whether to run in profile mode (for code coverage)
  copy?: Array<CopyPair>; // Array of copy pairs for static assets
};

// Default options.
const defaultOptions: Options = {
  mode: "build", // Default mode
  port: 1234, // Default port for serving
  dist: "dist", // Default output directory
  entry: "src/main.ts", // Default entry file
  output: "main.js", // Default output file
  testing: false, // Default to not running in test mode
  watch: false, // Default to not watching for changes
  profile: false, // Default to not running in profile mode
};

function usage(name: string) {
  console.log(`
Usage: ${name} [mode] [options]

Build script for COMP 318

Arguments:
  [mode]                  Build mode (choices: ${validModes.join(
    ", ",
  )}, default: ${defaultOptions.mode})

Options:
  -p, --port <number>     Port for serving the application (default: ${
    defaultOptions.port
  })
  -d, --dist <path>       Output directory (default: ${defaultOptions.dist})
  -e, --entry <path>      Entry file (default: ${defaultOptions.entry})
  -o, --output <file>     Output file (relative to output directory) (default: ${
    defaultOptions.output
  })
  -t, --testing           Run in test mode (loads test environment) (default: ${defaultOptions.testing})
  -w, --watch             Watch for changes and rebuild (default: ${defaultOptions.watch})
  --profile               Run in profile mode (for code coverage) (default: ${defaultOptions.profile})
  -c, --copy <from:to>    Copy pairs in the format 'from:to'. Can be specified multiple times.
  -h, --help              Show this help message
`);
}

export function parseArgs(argv: string[]): Options {
  const name = argv?.[1].split("/").pop() ?? "build318";
  const args = [...argv.slice(2)];
  const opts: Partial<Options> = {
    copy: [],
  };

  let mode: BuildMode | undefined;

  // Copy pair regex to validate the format "from:to".
  const copyRegex = /^[^:]+:[^:]*$/;

  while (args.length > 0) {
    const arg = args.shift();

    // Arg is guaranteed to be defined here since the loop condition is
    // args.length > 0, but TypeScript doesn't know that, as it thinks args
    // could have been mutated, so we assert !== undefined.
    if (arg !== undefined && !arg.startsWith("-")) {
      if (mode) {
        console.log(`Unexpected argument: ${arg}`);
        usage(name);
        process.exit(1);
      }

      if (!validModes.includes(arg as BuildMode)) {
        console.log(
          `Invalid mode: "${arg}". Valid modes: ${validModes.join(", ")}`,
        );
        usage(name);
        process.exit(1);
      }

      mode = arg as BuildMode;
      continue;
    }

    switch (arg) {
      case "-p":
      case "--port": {
        const val = args.shift();
        const port = Number(val);
        if (
          !val ||
          Number.isNaN(port) ||
          port < PORT_RANGE.min ||
          port > PORT_RANGE.max
        ) {
          console.log(
            `Invalid port number: "${val}". Must be a number between ${PORT_RANGE.min} and ${PORT_RANGE.max}.`,
          );
          usage(name);
          process.exit(1);
        }
        opts.port = port;
        break;
      }

      case "-d":
      case "--dist": {
        const val = args.shift();
        if (!val) {
          console.log(`Missing value for ${arg}`);
          usage(name);
          process.exit(1);
        }
        opts.dist = val;
        break;
      }

      case "-e":
      case "--entry": {
        const val = args.shift();
        if (!val) {
          console.log(`Missing value for ${arg}`);
          usage(name);
          process.exit(1);
        }
        opts.entry = val;
        break;
      }

      case "-o":
      case "--output": {
        const val = args.shift();
        if (!val) {
          console.log(`Missing value for ${arg}`);
          usage(name);
          process.exit(1);
        }
        opts.output = val;
        break;
      }

      case "-c":
      case "--copy": {
        const val = args.shift();
        if (!val || !copyRegex.test(val)) {
          console.log(
            `Invalid copy pair: "${val}". Expected format is "from:to"`,
          );
          usage(name);
          process.exit(1);
        }
        const [from, to] = val.split(":");
        (opts.copy as CopyPair[]).push({ from, to });
        break;
      }

      case "-t":
      case "--testing": {
        opts.testing = true;
        break;
      }

      case "-w":
      case "--watch": {
        opts.watch = true;
        break;
      }

      case "--profile": {
        opts.profile = true;
        break;
      }

      case "-h":
      case "--help": {
        usage(name);
        process.exit(0);
        break;
      }

      default:
        console.log(`Unknown option: ${arg}`);
        usage(name);
        process.exit(1);
    }
  }

  return {
    ...defaultOptions,
    ...opts,
    mode: mode ?? defaultOptions.mode,
  };
}
