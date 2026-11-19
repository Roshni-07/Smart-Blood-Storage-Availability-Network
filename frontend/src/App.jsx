import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Alerts from './pages/Alerts'
import Availability from './pages/Availability'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import StorageMonitoring from './pages/StorageMonitoring'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="monitoring" element={<StorageMonitoring />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="availability" element={<Availability />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
