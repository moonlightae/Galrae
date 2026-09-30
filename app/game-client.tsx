"use client";

import { useEffect } from "react";
import { gameMarkup } from "./game-markup";

declare global {
  interface Window { __galraeBooted?: boolean; }
}


function loadScript(src: string, module = false) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    if (module) script.type = "module";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}`));
    document.body.appendChild(script);
  });
}

export default function GameClient() {
  useEffect(() => {
    if (window.__galraeBooted) return;
    window.__galraeBooted = true;
    loadScript("/game-logic.js").then(() => loadScript("/app.js", true)).catch(console.error);
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: gameMarkup }} />;
}
