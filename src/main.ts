import "./style.css";
import { TeleprompterApp } from "./TeleprompterApp";

// Initialize the app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const appElement = document.querySelector<HTMLDivElement>("#app");
  if (appElement) {
    new TeleprompterApp(appElement);
  }
});
