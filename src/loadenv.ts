import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Environment variable files.
const defaultEnvFile = ".env";
const localEnvFile = ".env.local";
const testingEnvFile = ".env.test";

/**
 * Parse the contents of an environment file.
 *
 * @param envString - The contents of an environment file as a string.
 * @returns an object containing the environment variables and their values.
 */
function parseEnvString(envString: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = envString.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines or comments.
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Remove export keyword if present.
    const keyValue = trimmed.replace(/^export\s+/, "");

    const eqIndex = keyValue.indexOf("=");
    if (eqIndex === -1) {
      continue; // malformed line
    }

    const key = keyValue.slice(0, eqIndex).trim();
    let value = keyValue.slice(eqIndex + 1).trim();

    // Remove surrounding quotes if present.
    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    } else if (value.startsWith('"') && value.endsWith('"')) {
      // Handle escape sequences in double quotes.
      const raw = value.slice(1, -1);
      try {
        // Parse to handle escaped characters.
        value = JSON.parse(`"${raw}"`);
      } catch {
        // If parsing fails, keep the raw value.
        value = raw;
      }
    }

    env[key] = value;
  }

  return env;
}

/**
 * Load environment variables from a specified .env file.
 *
 * Does not support variable expansion or multiline values.
 *
 * @param filePath - The path to the .env file to load.
 * @returns an object containing the environment variables and their values.
 */
function loadEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};

  const absolutePath = resolve(filePath);

  if (!existsSync(absolutePath)) {
    return env;
  }

  const fileContents = readFileSync(absolutePath, { encoding: "utf8" });

  return parseEnvString(fileContents);
}

/**
 * Load environment variables from .env files and return them as an object.
 *
 * This function loads environment variables from a default .env file, and
 * overrides the defaults from an optional local .env.local file or an optional
 * testing .env.test file.
 *
 * @param testing - If true, loads the testing override environment file instead
 * of the local one.
 * @return an object containing the environment variables and their values.
 * If a variable is defined in both files, the value from the override file will
 * take precedence.
 */
export function loadEnv(testing = false): Record<string, string> {
  const override = testing ? testingEnvFile : localEnvFile;

  // Default environment variables
  const env = loadEnvFile(defaultEnvFile);

  // Overrides
  const overrideEnv = loadEnvFile(override);

  return { ...env, ...overrideEnv };
}

export const __test__ = { parseEnvString };
