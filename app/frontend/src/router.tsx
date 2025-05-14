import { createHashRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import AddPatient from './pages/AddPatient'; // Import the new AddPatient component
import MedicalReports from './pages/MedicalReports';
import MedicalReportView from './pages/MedicalReportView'; // Import the new MedicalReportView component
import CreateReport from './pages/CreateReport'; // Import the new CreateReport component
import UploadMedicalFile from './pages/UploadMedicalFile'; // Import the new UploadMedicalFile component
import Appointments from './pages/Appointments';
import AppointmentDetail from './pages/AppointmentDetail';
import Schedule from './pages/Schedule';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFoundPage from './pages/NotFoundPage';
import Login from './pages/Login';
import ECGAnalyze from './pages/ecg_analyze';
import MammographyAnalyze from './pages/mammography_analyze';
import AIModels from './pages/AIModels';
import ReportFormats from './pages/ReportFormats'; // Import the new ReportFormats component



// PatientEdit component removed
import Signup from './pages/Signup';

const appRoutes = [
  // Routes accessible only when logged in, wrapped by Layout and ProtectedRoute
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    errorElement: <NotFoundPage />, // Apply error element to the wrapper
    children: [
      {
        path: '/app',
        index: true, // Make dashboard the default for /app
        element: <Dashboard />,
      },
      {
        path: '/app/patients',
        element: <Patients />,
      },
      {
        path: '/app/patients/add',
        element: <AddPatient />,
      },
      {
        path: '/app/patients/:id',
        element: <PatientDetail />,
      },
      // Route for editing patient removed
      {
        path: '/app/medical-reports',
        element: <MedicalReports />,
      },
      {
        path: '/app/medical-reports/formats',
        element: <ReportFormats />,
      },
      {
        path: '/app/medical-reports/create',
        element: <CreateReport />,
      },
      {
        path: '/app/upload-medical-file',
        element: <UploadMedicalFile />,
      },
      {
        path: '/app/medical-reports/:id',
        element: <MedicalReportView />,
      },
      // Routes for specific report types
      {
        path: '/app/medical-reports/medical-image/:id',
        element: <MedicalReportView />,
      },
      {
        path: '/app/medical-reports/scan/:id',
        element: <MedicalReportView />,
      },
      {
        path: '/app/medical-reports/lab-result/:id',
        element: <MedicalReportView />,
      },
      {
        path: '/app/medical-reports/prescription/:id',
        element: <MedicalReportView />,
      },
      {
        path: '/app/medical-reports/report/:id',
        element: <MedicalReportView />,
      },
      {
        path: '/app/medical-reports/other/:id',
        element: <MedicalReportView />,
      },

      {
        path: '/app/appointments',
        element: <Appointments />,
      },
      {
        path: '/app/appointments/:id',
        element: <AppointmentDetail />,
      },
      {
        path: '/app/schedule',
        element: <Schedule />,
      },
      {
        path: '/app/analytics',
        element: <Analytics />,
      },
      {
        path: '/app/profile',
        element: <Profile />,
      },
      {
        path: '/app/settings',
        element: <Settings />,
      },
      {
        path: '/app/ecg_analyze',
        element: <ECGAnalyze />,
      },
      {
        path: '/app/mammography_analyze',
        element: <MammographyAnalyze />,
      },
      {
        path: '/app/ai_models',
        element: <AIModels />,
      },

      // Add other protected routes here
    ],
  },
];

const publicRoutes = [
  // Public routes like Login and Signup
  {
    path: '/', // Redirect base path to login
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },

];

const router = createHashRouter([
  ...publicRoutes,
  ...appRoutes,
  // Catch-all 404 route - must be last
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;
