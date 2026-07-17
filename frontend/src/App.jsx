import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import Employees from './pages/Employees';
import Roles from './pages/Roles';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import AIWorkspace from './pages/AIWorkspace';
import PendingTasks from './pages/PendingTasks';
import IncidentReplay from './pages/IncidentReplay';
import AttackReplay from './pages/AttackReplay';
import PolicySimulator from './pages/PolicySimulator';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Layout Wrapper Component
const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-workspace"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AIWorkspace />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Customers />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Orders />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-tasks"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PendingTasks />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/incident-replay/:alert_id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <IncidentReplay />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attack-replay"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AttackReplay />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/policy-simulator"
          element={
            <ProtectedRoute>
              <MainLayout>
                <PolicySimulator />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Employees />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Roles />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <MainLayout>
                <NotFound />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
