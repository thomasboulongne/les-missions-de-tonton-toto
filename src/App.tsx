import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import { Home } from "./routes/Home";
import { Archives } from "./routes/Archives";
import { Admin } from "./routes/Admin";
import "@radix-ui/themes/styles.css";
import "./styles/global.css";

export function App() {
  return (
    <Theme accentColor="cyan" grayColor="slate" radius="large" scaling="110%">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/missions" element={<Archives />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    </Theme>
  );
}

export default App;
