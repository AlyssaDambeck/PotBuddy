import { BrowserRouter, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import EmailVerifiedPage from "./pages/EmailVerifiedPage";
import Journal from "./pages/Journal";
import Landing from "./pages/Landing/Landing";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import PlantDetail from "./pages/PlantDetail";
import PlantInventory from "./pages/PlantInventory";
import RegisterPage from "./pages/RegisterPage";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/" element={<Landing />} />

                <Route path="/login" element={<LoginPage />} />

                <Route path="/register" element={<RegisterPage />} />

                <Route path="/verified" element={<EmailVerifiedPage />} />

                <Route path="/garden" element={<Dashboard />} />

                <Route path="/journal" element={<Journal />} />

                <Route path="/plants/:plantId" element={<PlantDetail />} />

                <Route path="/plants" element={<PlantInventory />} />

                <Route path="*" element={<NotFound />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
