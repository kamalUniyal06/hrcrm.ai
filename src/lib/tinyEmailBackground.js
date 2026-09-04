const BACKGROUND_DATA_ATTRIBUTE = "data-email-background-url";

const getEditableEmailBody = (html) => {
  if (!/<(?:!doctype|html|head|body)\b/i.test(html)) return html;

  const documentNode = new DOMParser().parseFromString(html, "text/html");
  return documentNode.body.innerHTML;
};

const readBackgroundUrl = (element) => {
  const inlineStyle = element.getAttribute("style") || "";
  const cssMatch = inlineStyle.match(
    /background-image\s*:\s*url\(\s*(["']?)(.*?)\1\s*\)/i,
  );

  return (
    cssMatch?.[2]?.trim() ||
    element.getAttribute("background")?.trim() ||
    element.getAttribute(BACKGROUND_DATA_ATTRIBUTE)?.trim() ||
    ""
  );
};

const prepareBackgroundsForTinyMce = (html) => {
  const template = document.createElement("template");
  template.innerHTML = getEditableEmailBody(html);

  template.content.querySelectorAll("[style], [background]").forEach((element) => {
    const backgroundUrl = readBackgroundUrl(element);
    if (!backgroundUrl) return;

    element.setAttribute(BACKGROUND_DATA_ATTRIBUTE, backgroundUrl);
    element.setAttribute("background", backgroundUrl);
    element.style.removeProperty("background-image");
  });

  return template.innerHTML;
};

const restoreBackgroundsInOutput = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html;

  template.content
    .querySelectorAll(`[${BACKGROUND_DATA_ATTRIBUTE}]`)
    .forEach((element) => {
      const backgroundUrl = element.getAttribute(BACKGROUND_DATA_ATTRIBUTE);
      if (!backgroundUrl) return;

      const safeCssUrl = backgroundUrl
        .replaceAll("\\", "%5C")
        .replaceAll('"', "%22");
      const currentStyle = (element.getAttribute("style") || "")
        .trim()
        .replace(/;+$/, "");
      const backgroundStyle = `background-image: url("${safeCssUrl}")`;

      element.setAttribute(
        "style",
        currentStyle ? `${currentStyle}; ${backgroundStyle}` : backgroundStyle,
      );
      element.setAttribute("background", backgroundUrl);
      element.removeAttribute(BACKGROUND_DATA_ATTRIBUTE);
    });

  return template.innerHTML;
};

export const setupEmailBackgroundHandling = (editor) => {
  editor.on("BeforeSetContent", (event) => {
    if (typeof event.content === "string" && event.content) {
      event.content = prepareBackgroundsForTinyMce(event.content);
    }
  });

  editor.on("PostProcess", (event) => {
    if (event.get && typeof event.content === "string") {
      event.content = restoreBackgroundsInOutput(event.content);
    }
  });
};

