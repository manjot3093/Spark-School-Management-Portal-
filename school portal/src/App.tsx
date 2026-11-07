import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import TeacherLogin from './pages/TeacherLogin';
import StaffCheckIn from './pages/StaffAttendance/StaffCheckIn';
import StaffAttendanceAdmin from './pages/StaffAttendance/StaffAttendanceAdmin';
import Dashboard from './pages/Dashboard/Dashboard';
import Assistant from './pages/Assistant/Assistant';
import Classes from './pages/Classes/Classes';
import Library from './pages/Library/Library';
import Students from './pages/Students/Students';
import Employees from './pages/Employees/Employees';
import RoleBasedAccess from './pages/RoleBasedAccess/RoleBasedAccess';
import Attendance from './pages/Attendance/Attendance';
import ImportantDates from './pages/ImportantDates/ImportantDates';
import StudentProgressActivity from './pages/StudentProgressActivity/StudentProgressActivity';
import StudentAppTasks from './pages/StudentAppTasks/StudentAppTasks';
import Reports from './pages/Reports/Reports';
import Transport from './pages/Transport/Transport';
import Exams from './pages/Exams/Exams';
import LiveClass from './pages/LiveClass/LiveClass';
import Fees from './pages/Fees/Fees';
import Salary from './pages/Salary/Salary';
import FeeSalaryManager from './pages/FeeSalaryManager/FeeSalaryManager';
import Accounts from './pages/Accounts/Accounts';
import Shop from './pages/SchoolProducts/Shop';
import Timetable from './pages/Timetable/Timetable';
import Syllabus from './pages/Syllabus/Syllabus';
import Announcements from './pages/Announcements/Announcements';
import Admissions from './pages/Admissions/Admissions';
import Inventory from './pages/Inventory/Inventory';
import IDCardGenerator from './pages/IDCardGenerator/IDCardGenerator';
import Houses from './pages/Houses/Houses';
import WhatsAppWebSMSIntegration from './pages/Communication/WhatsAppWebSMSIntegration';
import NewEnrollment from './pages/Enrollment/NewEnrollment';
import Settings from './pages/Settings/Settings';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';

// Component to handle root redirect based on user role
const RootRedirect = () => {
  const { state } = useAuth();
  const userRole = state?.user?.role;

  if (userRole === 'librarian') {
    return <Navigate to="/library" replace />;
  } else if (userRole === 'accountant') {
    return <Navigate to="/accounts" replace />;
  } else if (userRole === 'teacher') {
    return <Navigate to="/exams" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

// Component to handle dashboard redirect - block librarian and accountant
const DashboardRedirect = () => {
  const { state } = useAuth();
  const userRole = state?.user?.role;

  if (userRole === 'librarian') {
    return <Navigate to="/library" replace />;
  } else if (userRole === 'accountant') {
    return <Navigate to="/accounts" replace />;
  } else if (userRole === 'teacher') {
    return <Navigate to="/exams" replace />;
  } else {
    return (
      <Layout>
        <Dashboard />
      </Layout>
    );
  }
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <div className="App">
            <Toaster position="top-right" />
            <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/teacher-login" element={<TeacherLogin />} />
                      <Route path="/staff-checkin" element={<StaffCheckIn />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <RootRedirect />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              } />
              <Route path="/assistant" element={<ProtectedRoute><Layout><Assistant /></Layout></ProtectedRoute>} />
              
              <Route path="/new-enrollment" element={
                <ProtectedRoute>
                  <Layout>
                    <NewEnrollment />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/classes" element={
                <ProtectedRoute>
                  <Layout>
                    <Classes />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/library" element={
                <ProtectedRoute>
                  <Layout>
                    <Library />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/students" element={
                <ProtectedRoute>
                  <Layout>
                    <Students />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/houses" element={
                <ProtectedRoute>
                  <Layout>
                    <Houses />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/employees" element={
                <ProtectedRoute>
                  <Layout>
                    <Employees />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/role-based-access" element={
                <ProtectedRoute>
                  <Layout>
                    <RoleBasedAccess />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/attendance" element={
                <ProtectedRoute>
                  <Layout>
                    <Attendance />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/staff-attendance" element={
                <ProtectedRoute requiredRole="school_admin"><Layout><StaffAttendanceAdmin /></Layout></ProtectedRoute>
              } />
              
              <Route path="/important-dates" element={
                <ProtectedRoute>
                  <Layout>
                    <ImportantDates />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/student-progress" element={
                <ProtectedRoute>
                  <Layout>
                    <StudentProgressActivity />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/student-app-tasks" element={
                <ProtectedRoute>
                  <Layout>
                    <StudentAppTasks />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/transport" element={
                <ProtectedRoute>
                  <Layout>
                    <Transport />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/exams" element={
                <ProtectedRoute>
                  <Layout>
                    <Exams />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/live-class" element={
                <ProtectedRoute>
                  <Layout>
                    <LiveClass />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/fees" element={
                <ProtectedRoute>
                  <Layout>
                    <Fees />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/salary" element={
                <ProtectedRoute>
                  <Layout>
                    <Salary />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/fee-salary-manager" element={
                <ProtectedRoute>
                  <Layout>
                    <FeeSalaryManager />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/accounts" element={
                <ProtectedRoute>
                  <Layout>
                    <Accounts />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/shop" element={
                <ProtectedRoute>
                  <Layout>
                    <Shop />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/timetable" element={
                <ProtectedRoute>
                  <Layout>
                    <Timetable />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/syllabus" element={
                <ProtectedRoute>
                  <Layout>
                    <Syllabus />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* /homework and /calendar routes removed */}
              
              <Route path="/announcements" element={
                <ProtectedRoute>
                  <Layout>
                    <Announcements />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/whatsapp-sms-integration" element={
                <ProtectedRoute>
                  <Layout>
                    <WhatsAppWebSMSIntegration />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/admissions" element={
                <ProtectedRoute>
                  <Layout>
                    <Admissions />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* /id-card-generator and /question-bank routes removed */}

              <Route path="/id-card-generator" element={
                <ProtectedRoute>
                  <Layout>
                    <IDCardGenerator />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute>
                  <Layout>
                    <Inventory />
                  </Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              } />
              
            </Routes>
          </div>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App; 
