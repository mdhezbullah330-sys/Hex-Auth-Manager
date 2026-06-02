import { createRoot } from "react-dom/client";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

document.documentElement.classList.add("dark");

setAuthTokenGetter(() => localStorage.getItem("hexauth_token"));

createRoot(document.getElementById("root")!).render(<App />);
