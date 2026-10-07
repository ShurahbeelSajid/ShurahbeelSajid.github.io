/* Runs synchronously in <head>, before first paint.
   Marks the document as JS-capable so progressive-enhancement styles apply.
   (The colour theme follows the visitor's OS setting via CSS; there is no manual toggle.) */
(function () {
  document.documentElement.classList.add("js");
})();
