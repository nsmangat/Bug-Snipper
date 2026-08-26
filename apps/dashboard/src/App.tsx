import { Route, Routes } from 'react-router-dom';
import WorkspaceSelector from './components/WorkspaceSelector';
import ReportList from './components/ReportList';

function App() {
  return (
    <div>
      <h1>Reports Dashboard</h1>
      <WorkspaceSelector />
      <Routes>
        <Route path="/workspaces/:workspaceId" element={<ReportList />} />
        <Route
          path="*"
          element={<p>Select a workspace from the dropdown menu above</p>}
        />
      </Routes>
    </div>
  );
}

export default App;
