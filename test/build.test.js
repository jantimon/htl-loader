const assert = require("assert");
const {compile} = require('./utils');

describe("Build Tests", () => {

  it("Compiles and evaluates simple htl with data.", async () => {
    const [bundleResult] = await compile("simple", {
      data: {
        title: "Hello"
      }
    });
    assert.equal(bundleResult, "<h1>Hello</h1>");
  });

});
