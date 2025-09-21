import React, { useState } from "react";
import "./App.css";

function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  const validateLogin = () => {
    if (username.length < 5) {
      setPopupMessage("Error: Username must be at least 5 characters long.");
      setShowPopup(true);
      return;
    }
    if (password.length < 8 || !/\d/.test(password)) {
      setPopupMessage(
        "Error: Password must be at least 8 characters long and include a number."
      );
      setShowPopup(true);
      return;
    }
    setPopupMessage("Login Successful!");
    setShowPopup(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    validateLogin();
  };

  return (
    <div className="App">
      <div className="login-container">
        <h1>Login</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <button type="submit">Login</button>
        </form>
      </div>
      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            <p>{popupMessage}</p>
            <button onClick={() => setShowPopup(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;