import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { HomePage, ExplorePage, LoginPage } from './pages';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/home",
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/explore",
    element: (
      <ProtectedRoute>
        <ExplorePage />
      </ProtectedRoute>
    ),
  },
]);

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <RouterProvider router={router} />
      </div>
    </AuthProvider>
  );
}

export default App; 