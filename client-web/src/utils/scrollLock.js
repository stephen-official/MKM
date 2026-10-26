/** Keeps the page from scrolling while a sheet or dialog is open. Counted, so layers that open and close in any order
 *  (the review panel over the item builder's ticket sheet) leave the page scrollable again only when the last one closes. */
let locks = 0;
export const lockBodyScroll = () => {
  if (locks === 0) document.body.style.overflow = "hidden";
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.body.style.overflow = "";
  };
};
