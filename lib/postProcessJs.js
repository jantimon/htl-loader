module.exports = function postProcessJs(code) {
  const processedCode = code
    // Hack into slyResource and inject a webpack require call
    .replace(/\$\.slyResource\("([^"]+)"\)/g, (match, slyResource) => {
      const requireCall = 'require("' + slyResource + '")(htl)';
      return requireCall;
    });
  return processedCode;
};
