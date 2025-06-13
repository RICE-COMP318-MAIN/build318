import "should";
import { __test__ } from "../src/loadenv.ts";

const { parseEnvString } = __test__;

describe("parseEnvString", () => {
  const testCases = [
    {
      description: "empty string returns empty object",
      input: "",
      expected: {},
    },
    {
      description: "simple key=value",
      input: "FOO=bar\nBAZ=qux",
      expected: { FOO: "bar", BAZ: "qux" },
    },
    {
      description: "windows line endings",
      input: "FOO=bar\r\nBAZ=qux",
      expected: { FOO: "bar", BAZ: "qux" },
    },
    {
      description: "trims whitespace around keys and values",
      input: "  FOO  =   bar  ",
      expected: { FOO: "bar" },
    },
    {
      description: "ignores comments and blank lines",
      input: `
# Comment
FOO=bar

# Another comment
BAZ=qux
`,
      expected: { FOO: "bar", BAZ: "qux" },
    },
    {
      description: "handles export keyword",
      input: "export FOO=bar\nexport BAZ=qux",
      expected: { FOO: "bar", BAZ: "qux" },
    },
    {
      description: "ignores malformed lines",
      input: "FOO=bar\nINVALID_LINE\nBAZ=qux",
      expected: { FOO: "bar", BAZ: "qux" },
    },
    {
      description: "parses single-quoted values",
      input: "FOO='hello world'\nBAR='123'",
      expected: { FOO: "hello world", BAR: "123" },
    },
    {
      description: "parses double-quoted values with escape characters",
      input: 'FOO="hello\\nworld"\nBAR="escaped \\"quote\\""',
      expected: { FOO: "hello\nworld", BAR: 'escaped "quote"' },
    },
    {
      description: "does NOT parse escape sequences in single-quoted values",
      input: "FOO='hello\\nworld'\nBAR='escaped \\'quote\\''",
      expected: {
        FOO: "hello\\nworld",
        BAR: "escaped \\'quote\\'",
      },
    },
    {
      description: "handles unterminated quotes",
      input: 'FOO="unterminated\\',
      expected: { FOO: '"unterminated\\' },
    },
    {
      description: "falls back to raw value if JSON.parse throws",
      input: 'FOO="invalid\\x escape"',
      expected: { FOO: "invalid\\x escape" },
    },
    {
      description: "mix of export, quotes, comments, malformed",
      input: `
# Comment
export FOO='single quoted'
export BAR="double \\"quoted\\" value"
BAZ=plain
MALFORMED_LINE
`,
      expected: {
        FOO: "single quoted",
        BAR: 'double "quoted" value',
        BAZ: "plain",
      },
    },
  ];

  for (const { description, input, expected } of testCases) {
    it(description, () => {
      const result = parseEnvString(input);
      result.should.deepEqual(expected);
    });
  }
});
