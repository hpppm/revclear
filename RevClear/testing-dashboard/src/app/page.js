"use client";

import AuthWrapper from '@/components/AuthWrapper';
import Dashboard from '@/components/Dashboard';
import "./dashboard.css";

export default function DashboardPage() {
  return (
    <main>
      {/* 
        AuthWrapper will now handle all the logic for checking if a user
        is logged in. If they are, it will show the Dashboard component.
        If not, it will show the Login component.
      */}
      <AuthWrapper>
        <Dashboard />
      </AuthWrapper>
    </main>
  );
}
