import { getCurrentCurrency } from '../i18n/i18n'


export const usePrice = () => {
  const staticRates: Record<string, number> = {
    huf: 328,     
    eur: 0.85,    
    usd: 1,
  }

  const convertPrice = (basePrice: number, targetCurrency?: string): number => {
    const currency = (targetCurrency || getCurrentCurrency()).toLowerCase()
    if (currency === 'huf' && basePrice > 10000) {
      return Math.round(basePrice) 
    }
    const rate = staticRates[currency] || 328
    return Math.round(basePrice * rate)
  }

  return { convertPrice }
}