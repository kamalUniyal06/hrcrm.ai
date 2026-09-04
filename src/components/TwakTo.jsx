import { useEffect } from "react";

export default function TawkChat() {
  useEffect(() => {
    const script = document.createElement("script");

    script.async = true;
    script.src =
      "https://embed.tawk.to/6a27e12d5e6f4c1c1f7b5ee9/1jqlsf7pf";

    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return null;
}