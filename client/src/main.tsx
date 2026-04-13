import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const showUpdatePrompt = () =>
    window.dispatchEvent(new CustomEvent("sw-update-available"));

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdatePrompt();
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdatePrompt();
          }
        });
      });

      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "SW_UPDATE_AVAILABLE") {
          showUpdatePrompt();
        }
        if (event.data?.type === "NOTIFICATION_CLICK" && event.data.url) {
          window.location.href = event.data.url;
        }
      });

      if ("Notification" in window && Notification.permission === "default") {
        setTimeout(async () => {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            await registerPushSubscription(registration);
          }
        }, 5000);
      } else if ("Notification" in window && Notification.permission === "granted") {
        await registerPushSubscription(registration);
      }
    } catch (err) {
      console.error("Service worker registration failed:", err);
    }
  });
}

async function registerPushSubscription(registration: ServiceWorkerRegistration) {
  try {
    const response = await fetch("/api/push/vapid-key");
    if (!response.ok) return;

    const { publicKey } = await response.json();
    if (!publicKey) return;

    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  } catch (err) {
    console.error("Push subscription failed:", err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
