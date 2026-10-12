/* Runs synchronously in <head>, before first paint.
   Marks the document as JS-capable so progressive-enhancement styles apply. */
(function () {
  document.documentElement.classList.add("js");
})();
