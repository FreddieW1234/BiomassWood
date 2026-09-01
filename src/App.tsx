import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ConnectionProvider } from './context/ConnectionContext'
import { SoldBoilersProvider } from './context/SoldBoilersContext'
import { Boilers } from './pages/Boilers'
import { Cleaning } from './pages/Cleaning'
import { Dashboard } from './pages/Dashboard'
import { Containers } from './pages/Containers'
import { Defects } from './pages/Defects'
import { Documents } from './pages/Documents'
import { Earnings } from './pages/Earnings'
import { FuelBatches } from './pages/FuelBatches'
import { FuelConsumptionPage } from './pages/FuelConsumption'
import { FuelDeliveries } from './pages/FuelDeliveries'
import { FuelStores } from './pages/FuelStores'
import { FuelSuppliers } from './pages/FuelSuppliers'
import { Hoppers } from './pages/Hoppers'
import { HsInspections } from './pages/HsInspections'
import { Maintenance } from './pages/Maintenance'
import { MaintenanceTasks } from './pages/MaintenanceTasks'
import { MaintenanceTemplates } from './pages/MaintenanceTemplates'
import { MeterReadings } from './pages/MeterReadings'
import { RhiUsagePage } from './pages/RhiUsage'
import { SignIn } from './pages/SignIn'
import { Sites } from './pages/Sites'
import { Users } from './pages/Users'
import { Solar } from './pages/Solar'

export default function App() {
  return (
    <AuthProvider>
      <ConnectionProvider>
        <SoldBoilersProvider>
          <Gate />
        </SoldBoilersProvider>
      </ConnectionProvider>
    </AuthProvider>
  )
}

function Gate() {
  const { user, ready, isAdmin } = useAuth()

  if (!ready) return <div className="signin-page"><p className="muted">Loading…</p></div>
  if (!user) return <SignIn />

  return (
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/cleaning" element={<Cleaning />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/fuel-consumption" element={<FuelConsumptionPage />} />
            {isAdmin && (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/meter-readings" element={<MeterReadings />} />
                <Route path="/boilers" element={<Boilers />} />
                <Route path="/sites" element={<Sites />} />
                <Route path="/rhi-usage" element={<RhiUsagePage />} />
                <Route path="/earnings" element={<Earnings />} />
                <Route path="/solar" element={<Solar />} />
                <Route path="/fuel-suppliers" element={<FuelSuppliers />} />
                <Route path="/fuel-batches" element={<FuelBatches />} />
                <Route path="/fuel-deliveries" element={<FuelDeliveries />} />
                <Route path="/fuel-stores" element={<FuelStores />} />
                <Route path="/hoppers" element={<Hoppers />} />
                <Route path="/containers" element={<Containers />} />
                <Route path="/maintenance-templates" element={<MaintenanceTemplates />} />
                <Route path="/maintenance-tasks" element={<MaintenanceTasks />} />
                <Route path="/defects" element={<Defects />} />
                <Route path="/hs-inspections" element={<HsInspections />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/users" element={<Users />} />
              </>
            )}
            {/* Staff have no dashboard, so their home is the cleaning log. */}
            <Route path="*" element={<Navigate to={isAdmin ? '/' : '/cleaning'} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
  )
}