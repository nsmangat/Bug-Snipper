import { Route, Routes } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import ReportList from './components/ReportList';
import ReportDetailPanel from './components/ReportDetailPanel';
import OrganizationsPage from './components/OrganizationsPage';
import WorkspacesPage from './components/WorkspacesPage';

function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* With these routes nested inside, have Outlet component in parent (<DashboardLayout />)
      means these will render depending on which route is called in place for the outlet
      i.e. first the "select a workspace..." <p> element will show initially, then when a workspace is selected,
      the path is now path="/workspaces/:workspaceId" so it renders that route and so on all in the place of <Outlet/>
      This is so :workspaceId param can be gotten by the 2 child routes inside the path="/workspaces/:workspaceId" route
      */}
        <Route
          path="/"
          element={<p>Select a workspace from the dropdown menu above</p>}
        />
        <Route path="/workspaces/:workspaceId">
          {/*2 child routes being referred to in above comment*/}
          <Route index element={<ReportList />} />
          <Route path="reports/:reportId" element={<ReportDetailPanel />} />
        </Route>
        <Route path="/organizations" element={<OrganizationsPage />} />
        <Route path="/workspaces" element={<WorkspacesPage />} />
      </Route>
    </Routes>
  );
}

export default App;
