import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add error boundary for initialization
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  root.render(<App />);
} catch (error) {
  console.error("Failed to initialize app:", error);
  
  // Fallback: try to render a basic error message
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #0f172a 0%, #7c3aed 50%, #0f172a 100%);
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 2rem;
      ">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">DROPS</h1>
        <p style="margin-bottom: 2rem; opacity: 0.8;">Something went wrong loading the app</p>
        <button 
          onclick="window.location.reload()" 
          style="
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
          "
          onmouseover="this.style.transform='scale(1.05)'"
          onmouseout="this.style.transform='scale(1)'"
        >
          Refresh Page
        </button>
      </div>
    `;
  }
}
