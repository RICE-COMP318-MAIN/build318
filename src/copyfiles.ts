import { cp } from "node:fs/promises";

// Source and destination files/directories for copying assets.
export type CopyPair = {
  from: string; // Source directory for assets
  to: string; // Destination directory for assets
};

/**
 * Recursively copies all pairs of files/directories from source to destination.
 *
 * @param resolvedPairs - Array of copy pairs with absolute paths.
 * @returns Promise that resolves when all assets have been copied.
 */
export async function copyAllAssets(
  resolvedPairs: Array<CopyPair>,
): Promise<void> {
  // Recursively copy all assets from source to destination
  for (const pair of resolvedPairs) {
    await cp(pair.from, pair.to, {
      recursive: true,
      force: true,
    });
  }
}
