import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ConnectionProvider } from './context/ConnectionContext'
import { Boilers } from './pages/Boilers'
import { Cleaning } from './pages/Cleaning'
import { Dashboard } from './pages/Dashboard'
import { Defects } from './pages/Defects'
import { Documents } from './pages/Documents'
import { Earnings } from './pages/Earnings'
import { FuelBatches } from './pages/FuelBatches'
import { FuelConsumptionPage } from './pages/FuelConsumption'
import { FuelDeliveries } from './pages/FuelDeliveries'
import { FuelStores } from './pages/FuelStores'
import { FuelSuppliers } from './pages/FuelSuppliers'
import { HsInspections } from './pages/HsInspections'
import { Maintenance } from './pages/Maintenance'
import { MaintenanceTasks } from './pages/MaintenanceTasks'
import { MaintenanceTemplates } from './pages/MaintenanceTemplates'
import { MeterReadings } from './pages/MeterReadings'
import { RhiUsagePage } from './pages/RhiUsage'
import { Sites } from './pages/Sites'
import { Solar } from './pages/Solar'

export default function App() {
  return (
    <ConnectionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/boilers" element={<Boilers />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/cleaning" element={<Cleaning />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/meter-readings" element={<MeterReadings />} />
            <Route path="/rhi-usage" element={<RhiUsagePage />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="/solar" element={<Solar />} />
            <Route path="/fuel-suppliers" element={<FuelSuppliers />} />
            <Route path="/fuel-batches" element={<FuelBatches />} />
            <Route path="/fuel-deliveries" element={<FuelDeliveries />} />
            <Route path="/fuel-consumption" element={<FuelConsumptionPage />} />
            <Route path="/fuel-stores" element={<FuelStores />} />
            <Route path="/maintenance-templates" element={<MaintenanceTemplates />} />
            <Route path="/maintenance-tasks" element={<MaintenanceTasks />} />
            <Route path="/defects" element={<Defects />} />
            <Route path="/hs-inspections" element={<HsInspections />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConnectionProvider>
  )
}