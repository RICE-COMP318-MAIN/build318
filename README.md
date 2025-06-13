# build318

**build318** is a CLI build tool for the COMP 318 course. It helps streamline
development by handling builds, output configuration, asset copying, and serving
through a customizable port.

## Installation

```
npm install -D RICE-COMP318-MAIN/build318
```

## Usage

Add a script to your `package.json` file that runs `build318`:

```
build318 [mode] [options]
```

### Arguments

- `[mode]` — _optional_: The build mode (`build`, `serve`, or `profile`).
  **Default:** `"build"`

### Options

- `-p, --port <number>`  
  Port number for serving the application.  
  Must be an integer between `1` and `65535`.  
  **Default:** `1234`

- `-d, --dist <path>`  
  Output directory for build artifacts.  
  **Default:** `dist`

- `-e, --entry <path>`  
  Entry file for the application.  
  **Default:** `src/main.ts`

- `-o, --output <file>`  
  Output file name (relative to the output directory).  
  **Default:** `main.js`

- `-c, --copy <from:to>`  
  Specify file copy operations in the format `"from:to"`.  
  Can be used multiple times for multiple copy pairs.
  The `from` file/directory is resolved relative to the
  current working directory.
  The `to` file/directory is resolved relative to the
  `dist` directory.

### Example

```
build318 serve -p 8080 -d build -e src/main.ts -o app.js -c assets/logo.png:logo.png
```

## Modes

There are three "modes" you can specify: `build`, `serve`, and `profile`.

The `build` mode simply builds the application in the specified `dist`
directory.

The `serve` mode builds and serves the application on the specifed `port`. The
server supports live reload if there are any changes to the input files.

The `profile` mode instruments the application with Istanbul and serves it on
the specified port. In `profile` mode, changes do *not* trigger a live reload.