import { BrowserRouter, Route, Routes } from "react-router";
import { lazy, Suspense } from "react";
import RequireAdmin from "../components/RequireAdmin";

const UserLayout = lazy(() => import("../layout/user-layout"));
const AdminLayout = lazy(() => import("../layout/admin-layout"));

const HomePage = lazy(() => import("../pages/user/home-page"));
const TablePage = lazy(() => import("../pages/user/table-page"));
const AuthPage = lazy(() => import("../pages/auth-page"));
const WithdrawPage = lazy(() => import("../pages/admin/withdraw-page"));
const UserPage = lazy(() => import("../pages/admin/user-page"));
const DepositPage = lazy(() => import("../pages/admin/deposit-page"));
const AdminSettingsPage = lazy(() => import("../pages/admin/admin-settings-page"));
const AdminTable = lazy(() => import("../pages/admin/admin-table"));
const AdminGameSession = lazy(() => import("../features/admin/admin-game-session"));
const AdminDataPage = lazy(() => import("../pages/admin/admin-data-page"));

function Router() {
  return (
    <BrowserRouter>
      <Suspense>
        <Routes>
          {/* Table page */}
          <Route
            path="/table/:id"
            element={
              <Suspense>
                <TablePage />
              </Suspense>
            }
          />

          {/* Admin routes */}
          <Route path="/admin">
            <Route
              path="user/*"
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <UserPage />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route
              path="withdraw/*"
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <WithdrawPage />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route
              path="deposit/*"
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <DepositPage />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route
              path="data/*"
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <AdminDataPage />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route
              path="settings/*"
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <AdminSettingsPage />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route
              path="table/:id"
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <AdminGameSession />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route
              path="table/*"
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <AdminTable />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
            <Route
              index
              element={
                <RequireAdmin>
                  <Suspense>
                    <AdminLayout>
                      <UserPage />
                    </AdminLayout>
                  </Suspense>
                </RequireAdmin>
              }
            />
          </Route>

          {/* Auth routes - No layout wrapper, full-screen modals */}
          <Route path="/auth">
            <Route
              path="login"
              element={
                <Suspense>
                  <AuthPage type="login" />
                </Suspense>
              }
            />
            <Route
              path="register"
              element={
                <Suspense>
                  <AuthPage type="register" />
                </Suspense>
              }
            />
            <Route
              path="forgot-password"
              element={
                <Suspense>
                  <AuthPage type="forgot-password" />
                </Suspense>
              }
            />
          </Route>

          {/* Default user route */}
          <Route
            index
            element={
              <Suspense>
                <UserLayout>
                  <HomePage />
                </UserLayout>
              </Suspense>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default Router;
