import React, { memo } from 'react';
import './App.css';
import TranscriberPage from './pages/TranscriberPage';

const App = () => {
  return (
    <div className="App">
      <TranscriberPage />
    </div>
  );
};

export default memo(App);
