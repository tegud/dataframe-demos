import React from 'react';

import DemoList from './components/demo-list';
import ElasticSearchStatus from './components/elasticsearch-status';

import './App.css';

function App() {
  return (
    <div className="App">
      <h2>Elasticsearch Demos</h2>

      <ElasticSearchStatus />
      <DemoList />
    </div>
  );
}

export default App;
