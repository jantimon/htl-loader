const fs = require("fs");
const path = require("path");
const { getOptions, parseQuery } = require("loader-utils");
const { Compiler } = require("@adobe/htlengine");
const preProcessHTML = require("./lib/preProcessHTML");
const postProcessJs = require("./lib/postProcessJs");

module.exports = async function(source) {
  const options = getOptions(this);
  const query = this.resourceQuery ? parseQuery(this.resourceQuery) : null;
  const settings = Object.assign(
    {
      globalName: "htl",
      model: "default",
      useDir: null,
      transformSource: null,
      transformCompiled: null,
      includeRuntime: true,
      runtimeVars: [],
      moduleImportGenerator: null,
      data: {},
      resourceRoot: this.rootContext
    },
    options,
    query
  );

  // Get the webpack loader query prefix for this current loader
  const htlLoader = "!!" + this.request.replace(/![^!]+$/, "") + "!";
  /** Convert htl includes into webpack includes */
  const resolver = (resourcePath, type) => {
    if (type === "data-sly-resource") {
      const fileName = path.basename(resourcePath);
      return (
        htlLoader +
        [settings.resourceRoot, resourcePath, fileName + ".html"].join("/")
      );
    }
  };
  let input = await preProcessHTML(source, resolver);

  // Optionally transform source, e.g. remove directives `@adobe/htlengine` does not understand
  if (settings.transformSource) {
    input = settings.transformSource(input, settings);
  }

  // Set up compiler
  const compiler = new Compiler()
    .withDirectory(this.rootContext)
    .includeRuntime(settings.includeRuntime)
    .withRuntimeHTLEngine(require.resolve("./lib/htl-runtime"))
    .withRuntimeGlobalName(settings.globalName);

  settings.runtimeVars.forEach(name => {
    compiler.withRuntimeVar(name);
  });
  if (settings.moduleImportGenerator) {
    compiler.withModuleImportGenerator(settings.moduleImportGenerator);
  }

  // Compile
  let compiledCode = await compiler.compileToString(input, this.context);

  compiledCode = postProcessJs(compiledCode);

  // Specify location for data files from `use` directives
  if (settings.useDir) {
    // Remove files from cache
    fs.readdirSync(settings.useDir).forEach(file => {
      const filePath = path.join(settings.useDir, file);
      delete require.cache[filePath];
    });

    compiledCode = compiledCode.replace(
      /(runtime\.setGlobal\(resource\);)/,
      `$1\nruntime.withUseDirectory('${settings.useDir}');`
    );
  }

  // Optionally transform compiled, e.g. to customize runtime
  if (settings.transformCompiled) {
    compiledCode = settings.transformCompiled(compiledCode, settings);
  }

  // Provide a default function to excute the template
  return `module.exports = function(args) { return module.exports.main(args || ${JSON.stringify(
    settings.data
  )}); } ${compiledCode}`;
};
