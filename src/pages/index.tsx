// src/pages/index.tsx
import withAuth from '@/lib/withAuth'

export default withAuth(function Dashboard() {
  return <div>Welcome to the dashboard!</div>
})