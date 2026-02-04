// Suppress SES_UNCAUGHT_EXCEPTION errors from browser extensions
(function() {
  var originalError = console.error;
  console.error = function() {
    if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].indexOf('SES_UNCAUGHT_EXCEPTION') !== -1) {
      return;
    }
    originalError.apply(console, arguments);
  };
})();
