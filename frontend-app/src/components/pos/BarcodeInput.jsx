import React from 'react'

const BarcodeInput = ({ value, onChange, onEnter, placeholder, disabled }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onEnter?.()
    }
  }

  return (
    <label className="min-w-[220px] bg-gray-50 border rounded-full px-3 py-2 flex items-center gap-2">
      <span className="text-gray-400">🏷️</span>
      <input
        className="bg-transparent w-full outline-none text-sm"
        placeholder={placeholder || 'باركود (Enter)'}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        dir="ltr"
        autoComplete="off"
      />
    </label>
  )
}

export default BarcodeInput
