import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { type FSWatcher, watch } from "chokidar";
import type { BuildContext } from "esbuild";
import mime from "mime";
import { type CopyPair, copyAllAssets } from "./copyfiles";

// HTTP status codes
const STATUS_OK = 200;
const STATUS_NOT_FOUND = 404;

/**
 * Manages Server-Sent Events (SSE) clients for live reload.
 */
class SSEManager {
  private clients: http.ServerResponse[] = [];

  /**
   * Handles an incoming SSE connection and adds the client to the list.
   * @param req - The HTTP request.
   * @param res - The HTTP response.
   */
  handle(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(STATUS_OK, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write("\n");
    this.clients.push(res);
    req.on("close", () => {
      const idx = this.clients.indexOf(res);
      if (idx >= 0) this.clients.splice(idx, 1);
    });
  }

  /**
   * Sends a reload event to all connected SSE clients.
   */
  sendReload() {
    for (const client of this.clients) {
      client.write("data: reload\n\n");
    }
  }

  /**
   * Closes all SSE client connections.
   */
  closeAll() {
    this.clients.forEach((res) => res.end());
    this.clients = [];
  }
}

/**
 * Serves the application with live reload for development.
 *
 * Starts an HTTP server to serve static files from the given root directory,
 * watches for changes in source files and static assets, triggers rebuilds and
 * asset copying as needed, and notifies connected clients to reload via
 * Server-Sent Events (SSE).
 *
 * @param {string} root - The root directory to serve files from.
 * @param {number} port - The port on which to run the server.
 * @param {BuildContext} ctx - The esbuild build context for rebuilding on
 * changes.
 * @param {Array<CopyPair>} copyPairs - Array of asset copy pairs to watch and
 * copy.
 * @param {boolean} shouldWatch - Whether to enable live reload and file
 * watching.
 * @returns {Promise<void>} A promise that resolves when the server is running.
 */
export async function serve(
  root: string,
  port: number,
  ctx: BuildContext,
  copyPairs: Array<CopyPair>,
  shouldWatch: boolean,
): Promise<void> {
  // Initial copy of assets
  await copyAllAssets(copyPairs);

  // Initial build
  await ctx.rebuild();

  const sseManager = new SSEManager();

  // Start server
  const server = http.createServer((req, res) => {
    if (shouldWatch && req.url === "/__reload") {
      return sseManager.handle(req, res);
    }

    const url = req.url ?? "/";
    const filePath = path.join(
      root,
      url === "/" ? "/index.html" : decodeURIComponent(url),
    );

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(STATUS_NOT_FOUND);
        res.end("Not found");
        return;
      }

      const contentType = mime.getType(filePath) || "application/octet-stream";
      res.writeHead(STATUS_OK, { "Content-Type": contentType });

      if (shouldWatch && filePath.endsWith("index.html")) {
        // Inject reload script into HTML
        const script = `
        <script>
          const es = new EventSource('/__reload');
          es.onmessage = () => location.reload();
        </script>
        `;
        res.end(data.toString().replace("</body>", `${script}</body>`));
      } else {
        res.end(data);
      }
    });
  });

  server.listen(port, () => {
    console.log(
      `Serving${shouldWatch ? " (and watching) " : " "}at http://localhost:${port}`,
    );
  });

  let assetWatcher: FSWatcher | null = null;
  let sourceWatcher: FSWatcher | null = null;

  if (shouldWatch) {
    // Watch for static asset changes
    assetWatcher = watch(
      copyPairs.map((pair) => pair.from),
      { ignoreInitial: true },
    );

    assetWatcher.on("all", async () => {
      await copyAllAssets(copyPairs);
      console.log("Assets copied");
      sseManager.sendReload();
    });

    // Watch for source changes
    const rebuild = async () => {
      try {
        await ctx.rebuild();
        console.log("Rebuilt source");
        sseManager.sendReload();
      } catch (err) {
        console.error("Build error:", err);
      }
    };

    sourceWatcher = watch("src", {
      ignoreInitial: true,
    });

    sourceWatcher.on("all", rebuild);
  }

  // Handle server shutdown gracefully.
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    server.close(() => process.exit(0));
  });

  // Close watchers and clients on close and then resolve the returned promise.
  return new Promise((resolve) => {
    server.on("close", () => {
      assetWatcher?.close();
      sourceWatcher?.close();
      sseManager.closeAll();
      resolve();
    });
  });
}
