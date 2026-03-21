/**
 * Pills unit conversion helpers.
 * Canonical unit = pill.
 */

/**
 * Convert strips to pills.
 * @param {number} strips - Number of strips
 * @param {number} pillsPerStrip - Pills per strip
 * @returns {number} Total pills
 */
export const stripsToPills = (strips, pillsPerStrip) => {
  const s = Number(strips) || 0
  const p = Number(pillsPerStrip) || 1
  return Math.floor(s * p)
}

/**
 * Convert boxes to pills.
 * @param {number} boxes - Number of boxes
 * @param {number} stripsPerBox - Strips per box
 * @param {number} pillsPerStrip - Pills per strip
 * @returns {number} Total pills
 */
export const boxesToPills = (boxes, stripsPerBox, pillsPerStrip) => {
  const b = Number(boxes) || 0
  const s = Number(stripsPerBox) || 1
  const p = Number(pillsPerStrip) || 1
  return Math.floor(b * s * p)
}

/**
 * Check if required pills are available in stock.
 * @param {number} requiredPills - Pills needed
 * @param {number} stockPills - Available pills
 * @returns {boolean}
 */
export const hasEnoughStock = (requiredPills, stockPills) => {
  return (requiredPills || 0) <= (stockPills || 0)
}

/**
 * Convert quantity to canonical (pill) units.
 * @param {number} qty - Quantity
 * @param {string} unit - pill | strip | box
 * @param {number} pillsPerStrip - Pills per strip
 * @param {number} stripsPerBox - Strips per box
 * @returns {number} Canonical quantity in pills
 */
export const toCanonicalQty = (qty, unit, pillsPerStrip = 1, stripsPerBox = 1) => {
  const n = Number(qty) || 0
  const pps = Math.max(1, Number(pillsPerStrip) || 1)
  const spb = Math.max(1, Number(stripsPerBox) || 1)
  const u = String(unit || 'pill').toLowerCase()
  if (u === 'pill') return Math.floor(n)
  if (u === 'strip') return Math.floor(n * pps)
  if (u === 'box') return Math.floor(n * spb * pps)
  return Math.floor(n)
}
