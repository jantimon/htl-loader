const assert = require("assert");
const { compile } = require("./utils");

describe("Build Tests", () => {
  it("Compiles and evaluates simple htl with data.", async () => {
    const [bundleResult] = await compile("simple", {
      data: {
        title: "Hello"
      }
    });
    assert.equal(await bundleResult(), "<h1>Hello</h1>");
  });

  it("ignores element with data-ui-ignore", async () => {
    const [bundleResult] = await compile("ignore", {
      data: {
        title: "Hello"
      }
    });
    assert.equal(
      await bundleResult(),
      "<!-- REMOVED becasue of data-ui-ignore -->"
    );
  });

  it("Loads resources", async () => {
    const [bundleResult] = await compile("resource");
    assert.equal(await bundleResult(), "<h1>Sub Resource</h1>");
  });
});
