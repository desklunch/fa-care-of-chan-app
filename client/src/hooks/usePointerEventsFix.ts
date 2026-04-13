import { useEffect } from "react";

function PointerEventsFix() {
  useEffect(() => {
    const ANIMATION_GRACE_MS = 350;

    const observer = new MutationObserver(() => {
      if (document.body.style.pointerEvents === "none") {
        setTimeout(() => {
          if (document.body.style.pointerEvents !== "none") return;

          const OPEN_OVERLAY_SELECTOR = [
            "[data-state='open'][role='dialog']",
            "[data-state='open'][role='alertdialog']",
            "[data-state='open'][data-radix-popper-content-wrapper]",
            "[vaul-drawer][data-state='open']",
          ].join(", ");

          const hasOpenOverlay = document.querySelector(OPEN_OVERLAY_SELECTOR);

          if (!hasOpenOverlay) {
            document.body.style.removeProperty("pointer-events");
          }
        }, ANIMATION_GRACE_MS);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

export { PointerEventsFix };
