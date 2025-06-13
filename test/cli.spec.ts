import "should";
import sinon from "sinon";
import { type Options, parseArgs } from "../src/cli.ts";

describe("parseArgs", () => {
  let exitStub: sinon.SinonStub;
  let consoleLogStub: sinon.SinonStub;

  beforeEach(() => {
    exitStub = sinon.stub(process, "exit");
    consoleLogStub = sinon.stub(console, "log");
  });

  afterEach(() => {
    exitStub.restore();
    consoleLogStub.restore();
  });

  const defaultOpts: Options = {
    mode: "build",
    port: 1234,
    dist: "dist",
    entry: "src/main.ts",
    output: "main.js",
    testing: false,
    watch: false,
    profile: false,
    copy: [],
  };

  const tableTests = [
    {
      description: "default options with no args",
      argv: ["node", "build318"],
      expected: defaultOpts,
    },
    {
      description: "set mode to serve",
      argv: ["node", "build318", "serve"],
      expected: { ...defaultOpts, mode: "serve" },
    },
    {
      description: "set port with -p",
      argv: ["node", "build318", "-p", "8080"],
      expected: { ...defaultOpts, port: 8080 },
    },
    {
      description: "set dist with --dist",
      argv: ["node", "build318", "--dist", "build"],
      expected: { ...defaultOpts, dist: "build" },
    },
    {
      description: "set entry with -e",
      argv: ["node", "build318", "-e", "src/app.ts"],
      expected: { ...defaultOpts, entry: "src/app.ts" },
    },
    {
      description: "set output with --output",
      argv: ["node", "build318", "--output", "bundle.js"],
      expected: { ...defaultOpts, output: "bundle.js" },
    },
    {
      description: "set testing flag with -t",
      argv: ["node", "build318", "-t"],
      expected: { ...defaultOpts, testing: true },
    },
    {
      description: "set watch flag with -w",
      argv: ["node", "build318", "-w"],
      expected: { ...defaultOpts, watch: true },
    },
    {
      description: "set profile flag with --profile",
      argv: ["node", "build318", "--profile"],
      expected: { ...defaultOpts, profile: true },
    },
    {
      description: "set single copy pair",
      argv: ["node", "build318", "-c", "src:dest"],
      expected: {
        ...defaultOpts,
        copy: [{ from: "src", to: "dest" }],
      },
    },
    {
      description: "handle copy pair with empty destination",
      argv: ["node", "build318", "-c", "src:"],
      expected: {
        ...defaultOpts,
        copy: [{ from: "src", to: "" }],
      },
    },
    {
      description: "set multiple copy pairs",
      argv: ["node", "build318", "-c", "src:dest", "-c", "assets:public"],
      expected: {
        ...defaultOpts,
        copy: [
          { from: "src", to: "dest" },
          { from: "assets", to: "public" },
        ],
      },
    },
    {
      description: "mode plus port and testing",
      argv: ["node", "build318", "serve", "-p", "3000", "-t"],
      expected: { ...defaultOpts, mode: "serve", port: 3000, testing: true },
    },
  ];

  tableTests.forEach(({ description, argv, expected }) => {
    it(description, () => {
      const opts = parseArgs(argv);
      opts.should.deepEqual(expected);
      exitStub.called.should.be.false();
      consoleLogStub.called.should.be.false();
    });
  });

  // Error cases with process.exit
  const errorTests = [
    {
      description: "unknown mode argument triggers exit",
      argv: ["node", "build318", "invalidmode"],
      exitCode: 1,
      errorMsg: "Invalid mode",
    },
    {
      description: "unexpected second mode argument triggers exit",
      argv: ["node", "build318", "serve", "build"],
      exitCode: 1,
      errorMsg: "Unexpected argument",
    },
    {
      description: "missing port value triggers exit",
      argv: ["node", "build318", "-p"],
      exitCode: 1,
      errorMsg: "Invalid port number",
    },
    {
      description: "invalid port value triggers exit",
      argv: ["node", "build318", "-p", "abc"],
      exitCode: 1,
      errorMsg: "Invalid port number",
    },
    {
      description: "port out of range triggers exit",
      argv: ["node", "build318", "-p", "70000"],
      exitCode: 1,
      errorMsg: "Invalid port number",
    },
    {
      description: "missing value for --dist triggers exit",
      argv: ["node", "build318", "--dist"],
      exitCode: 1,
      errorMsg: "Missing value for --dist",
    },
    {
      description: "invalid copy pair triggers exit",
      argv: ["node", "build318", "-c", "invalidpair"],
      exitCode: 1,
      errorMsg: "Invalid copy pair",
    },
    {
      description: "unknown option triggers exit",
      argv: ["node", "build318", "--unknown"],
      exitCode: 1,
      errorMsg: "Unknown option",
    },
  ];

  errorTests.forEach(({ description, argv, exitCode, errorMsg }) => {
    it(description, () => {
      parseArgs(argv);
      exitStub.calledOnce.should.be.true();
      exitStub.firstCall.args[0].should.equal(exitCode);
      consoleLogStub.called.should.be.true();

      // Check the error message was printed (console.log called with string containing errorMsg)
      const logged = consoleLogStub.args.flat().join(" ");
      logged.should.containEql(errorMsg);
    });
  });

  it("help option triggers usage and exit 0", () => {
    parseArgs(["node", "build318", "-h"]);
    exitStub.calledOnce.should.be.true();
    exitStub.firstCall.args[0].should.equal(0);
    consoleLogStub.called.should.be.true();
    const logged = consoleLogStub.args.flat().join(" ");
    logged.should.containEql("Usage:");
  });
});
