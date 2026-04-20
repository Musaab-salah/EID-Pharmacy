import React from 'react'
import CheckoutWizard from '../components/checkout/CheckoutWizard'
import AppHeader from '../components/header/AppHeader'
import LowStockModal from '../components/low-stock/LowStockModal'
import useLowStock from '../components/low-stock/useLowStock'
import { CheckoutProvider } from '../context/CheckoutContext'
import ShiftGate from '../components/shifts/ShiftGate'

/** @param {{ children?: import('react').ReactNode }} props */
const AppShell = ({ children }) => {
  const lowStock = useLowStock()

  return (
    <CheckoutProvider>
      <div className="min-h-screen bg-[#f5f5f5]">
        <AppHeader />
        <main className="max-w-6xl mx-auto p-4 pb-24">
          {children ? (
            children
          ) : (
            <ShiftGate>
              <CheckoutWizard />
            </ShiftGate>
          )}
        </main>
        <LowStockModal
          open={lowStock.show}
          items={lowStock.items}
          onClose={lowStock.close}
          onHideToday={lowStock.hideForToday}
        />
      </div>
    </CheckoutProvider>
  )
}

export default AppShell
