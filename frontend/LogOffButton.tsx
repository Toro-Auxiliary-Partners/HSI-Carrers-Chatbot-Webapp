import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppStateContext } from '../state/AppProvider';
import { LogOffManager } from '../utils/LogOffManager';

/**
 * LogOffButton component renders a button for logging off the user.
 * It uses the LogOffManager class to handle log-off functionality.
 * Created on: June 11, 2025
 */
const LogOffButton: React.FC = () => {
  const navigate = useNavigate();
  const appStateContext = React.useContext(AppStateContext);

  // Initialize LogOffManager
  const logOffManager = new LogOffManager(navigate, appStateContext);

  const handleLogOff = () => {
    logOffManager.logOffUser();
  };

  return (
    <button onClick={handleLogOff} style={{ padding: '10px 20px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
      Log Off
    </button>
  );
};

export default LogOffButton;
