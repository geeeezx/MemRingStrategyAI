import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage, ExplorePage } from './pages';
import './index.css';

const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/explore",
    element: <ExplorePage />,
  },
]);

function App() {
  return (
    <div className="min-h-screen bg-background">
      <RouterProvider router={router} />
    </div>
  );
}

export default App; 