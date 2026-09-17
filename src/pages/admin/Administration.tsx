import React from 'react';
import { Outlet } from 'react-router';

export default function Administration() {
  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0B0F19]">
      <Outlet />
    </div>
  );
}
