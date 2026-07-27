import {
  lazy,
  Suspense,
} from "react";

import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

/*
 * Dashboard stays eager because /garden is
 * the performance-critical route.
 */
import Dashboard from "./pages/Dashboard";

/*
 * Pages that are not required to render the
 * Dashboard are downloaded only when visited.
 */
const EmailVerifiedPage = lazy(
  () =>
    import(
      "./pages/EmailVerifiedPage"
    ),
);

const Journal = lazy(
  () =>
    import(
      "./pages/Journal"
    ),
);

const Landing = lazy(
  () =>
    import(
      "./pages/Landing/Landing"
    ),
);

const LoginPage = lazy(
  () =>
    import(
      "./pages/LoginPage"
    ),
);

const NotFound = lazy(
  () =>
    import(
      "./pages/NotFound"
    ),
);

const PlantDetail = lazy(
  () =>
    import(
      "./pages/PlantDetail"
    ),
);

const PlantInventory = lazy(
  () =>
    import(
      "./pages/PlantInventory"
    ),
);

const RegisterPage = lazy(
  () =>
    import(
      "./pages/RegisterPage"
    ),
);

function PageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "grid",
        minHeight: "100vh",
        padding: "2rem",
        placeItems: "center",
        color: "#ece8de",
        background: "#1f241e",
        fontFamily:
          "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            marginBottom: "0.65rem",
            fontSize: "3rem",
          }}
        >
          🌱
        </div>

        <strong>
          Loading PotBuddy…
        </strong>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <PageLoader />
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              <Landing />
            }
          />

          <Route
            path="/login"
            element={
              <LoginPage />
            }
          />

          <Route
            path="/register"
            element={
              <RegisterPage />
            }
          />

          <Route
            path="/verified"
            element={
              <EmailVerifiedPage />
            }
          />

          <Route
            path="/garden"
            element={
              <Dashboard />
            }
          />

          <Route
            path="/journal"
            element={
              <Journal />
            }
          />

          <Route
            path="/plants"
            element={
              <PlantInventory />
            }
          />

          <Route
            path="/plants/:plantId"
            element={
              <PlantDetail />
            }
          />

          <Route
            path="*"
            element={
              <NotFound />
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
