import { BrowserRouter, Route, Routes } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Landing from "./pages/Landing/Landing";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import RegisterPage from "./pages/RegisterPage";
import AddPlant from "./pages/AddPlant";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                <Route path="/addPlant" element={<AddPlant />} />

                <Route path="/" element={<Landing />} />

                <Route path="/login" element={<LoginPage />} />

                <Route path="/register" element={<RegisterPage />} />

                <Route path="/garden" element={<Dashboard />} />

                <Route path="*" element={<NotFound />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;