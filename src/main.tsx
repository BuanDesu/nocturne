import { createRoot } from "react-dom/client";
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import App from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Root element missing");

createRoot(container).render(<App />);
