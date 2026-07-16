import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Backend not running"));
  }, []);

  return (
    <div>
      <h1>PotBuddy</h1>

      <h2>{message}</h2>
    </div>
  );
}

export default App;