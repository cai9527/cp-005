import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import Monitor from "@/pages/Monitor";
import Cranes from "@/pages/Cranes";
import CraneDetail from "@/pages/CraneDetail";
import History from "@/pages/History";
import Alerts from "@/pages/Alerts";
import Analysis from "@/pages/Analysis";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Monitor />} />
          <Route path="cranes" element={<Cranes />} />
          <Route path="cranes/:id" element={<CraneDetail />} />
          <Route path="history" element={<History />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="analysis" element={<Analysis />} />
        </Route>
      </Routes>
    </Router>
  );
}
