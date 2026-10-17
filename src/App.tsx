import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Logo } from './components/Shell'
import Shell from './components/Shell'
import { AuthProvider, useAuth } from './lib/auth'
import { DataProvider } from './lib/data'
import AuthPage from './pages/Auth'
import Categories from './pages/Categories'
import Daily from './pages/Daily'
import Cards from './pages/Cards'
import Dashboard from './pages/Dashboard'
import Incomes from './pages/Incomes'
import Installments from './pages/Installments'
import Gantt from './pages/Gantt'
import Timeline from './pages/Timeline'

function Gate() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Logo size={56} />
      </div>
    )
  }
  if (!user) return <AuthPage />
  return (
    <DataProvider key={user.id}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="incomes" element={<Incomes />} />
          <Route path="installments" element={<Installments />} />
          <Route path="daily" element={<Daily />} />
          <Route path="categories" element={<Categories />} />
          <Route path="cards" element={<Cards />} />
          <Route path="chart" element={<Gantt />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
