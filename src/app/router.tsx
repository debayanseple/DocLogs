import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Dashboard } from '../features/dashboard/Dashboard'
import { Patients } from '../features/patients/Patients'
import { PatientDetails } from '../features/patients/PatientDetails'
import { FollowUps } from '../features/follow-ups/FollowUps'
import { Reports } from '../features/reports/Reports'
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
      { path: 'reports', element: <Reports /> },
      { path: 'profile', element: <Settings /> },
      { path: 'settings', element: <Navigate to="/profile" replace /> },
      // merged: OPD, OT, Cancer & Facilities now live inside Patients/Profile —
      // keep the legacy URLs working by redirecting
      { path: 'opd', element: <Navigate to="/patients" replace /> },
      { path: 'ot', element: <Navigate to="/patients" replace /> },
      { path: 'cancer-registry', element: <Navigate to="/patients" replace /> },
      { path: 'facilities', element: <Navigate to="/profile" replace /> },
    ],
  },
])
