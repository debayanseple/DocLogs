import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Dashboard } from '../features/dashboard/Dashboard'
import { Patients } from '../features/patients/Patients'
import { PatientDetails } from '../features/patients/PatientDetails'
import { FollowUps } from '../features/follow-ups/FollowUps'
import { Settings } from '../features/settings/Settings'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'patients', element: <Patients /> },
      { path: 'patients/:id', element: <PatientDetails /> },
      { path: 'follow-ups', element: <FollowUps /> },
      { path: 'profile', element: <Settings /> },
      { path: 'settings', element: <Navigate to="/profile" replace /> },
      // merged: OPD, OT, Cancer, Reports & Facilities now inside Patients/Profile — keep legacy URLs redirected
      { path: 'opd', element: <Navigate to="/patients" replace /> },
      { path: 'ot', element: <Navigate to="/patients" replace /> },
      { path: 'cancer-registry', element: <Navigate to="/patients" replace /> },
      { path: 'reports', element: <Navigate to="/" replace /> },
      { path: 'facilities', element: <Navigate to="/profile" replace /> },
    ],
  },
])
