const path = require("path");
const posthtml = require("posthtml");

module.exports = async function preProcessHTML(content, resolver) {
  const handlers = {
    //
    // Transform
    // <sly data-ui-ignore />
    // to
    // <!-- REMOVED becasue of data-ui-ignore -->
    //
    "data-ui-ignore": (node, attrName) => {
      return node.attrs[attrName]
        ? {
            tag: "div",
            attrs: {
              style:
                "width: 100%, height: 100%; min-height: 20px; background: linear-gradient(to bottom, rgba(205,235,142,1) 0%,rgba(165,201,86,1) 100%)"
            },
            content: node.attrs[attrName]
          }
        : `<!-- REMOVED becasue of data-ui-ignore -->`;
    },
    //
    // Transform
    // <sly data-ui-mock="demo/components/demo/article-overview" />
    // to
    // <sly data-sly-resource="demo/components/demo/article-overview/article-overview.html" />
    //
    "data-ui-mock": (node, attrName) => {
      node.attrs["data-sly-resource"] = node.attrs[attrName];
      delete node.attrs[attrName];
      return handlers["data-sly-resource"](node, "data-sly-resource");
    },
    //
    // Transform
    // <sly data-sly-use="com.foo.bar" />
    // to
    // <sly data-sly-use="./com.foo.bar" />
    //
    "data-sly-use": (node, attrName) => {
      const resolvedPath = resolver(node.attrs[attrName], "data-sly-use");
      node.attrs[attrName] = resolvedPath;
      return node;
    },
    //
    // Transform
    // <sly data-sly-resource="${'article-overview' @ resourceType='demo/components/demo/article-overview'}" />
    // to
    // <sly data-sly-resource="demo/components/demo/article-overview/article-overview.html" />
    //
    "data-sly-resource": (node, attrName) => {
      // @htl/engine drops the resourceType which holds the path to the file
      // extract this file to be available during runtime
      // This should probably be done by @htl/engine instead
      const resourcePath = node.attrs[attrName].replace(
        /\$\{.+resourceType\s*=\s*'([^']+)'.+$/,
        (m, resourceType) => resourceType
      );
      // Resolve paths with the given resolver function
      if (
        resourcePath.indexOf("{") === -1 &&
        /\.(html?|htl)/.test(resourcePath) === false
      ) {
        node.attrs[attrName] = resolver(resourcePath, "data-sly-resource");
      }
      return node;
    },
    "data-sly-include": (node, attrName) => {
      node.attrs["data-sly-resource"] = "./" + node.attrs[attrName];
      delete node.attrs[attrName];
      return node;
    }
  };
  const postHtmlInstance = posthtml([
    function(tree) {
      tree.walk(node => {
        if (!node.tag || !node.attrs) {
          return node;
        }
        const attrNames = Object.keys(node.attrs);
        for (let i = 0; i < attrNames.length; i++) {
          const baseAttrName = attrNames[i].split(".")[0];
          if (handlers[baseAttrName]) {
            return handlers[baseAttrName](node, attrNames[i]);
          }
        }
        return node;
      });
    }
  ]);

  const postHtmlResult = await postHtmlInstance.process(content, {
    recognizeSelfClosing: true
  });
  return postHtmlResult.html;
};
