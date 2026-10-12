// Reset both the document and any enclosing app-shell scroll container.
export function resetPageScroll(element) {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
    if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
      parent.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }
}
