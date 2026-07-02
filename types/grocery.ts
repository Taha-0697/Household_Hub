// Core Identity Models
export interface AuthUser {
  id: number
  username: string
  role: 'husband' | 'wife'
}

export const AVAILABLE_UNITS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'lbs', label: 'Pounds (lbs)' },
  { value: 'l', label: 'Liters (L)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'pack', label: 'Pack/Box' }
]

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High'] as const

// Relational Household Schema Models
export interface Household {
  id: number
  householdCode: string
}

export interface HouseholdMember {
  householdId: number
  userId: number
}

// Domain Data Models
export interface GroceryItem {
  id: number
  name: string
  quantityNeeded: number
  unit: string
  status: 'pending' | 'bought' | 'unavailable'
  priority?: 'Low' | 'Medium' | 'High'
  notes?: string
  currentStock?: number
  createdByUserId: number
  createdBy: 'husband' | 'wife'
}

export interface AppNotification {
  id: number
  message: string
}

// API Network Schema Definitions
export interface PostRequestBody {
  action: 'add' | 'update' | 'clearNotifications'
  userId: number
  userRole: 'husband' | 'wife'
  id?: number
  name?: string
  currentStock?: number
  quantityNeeded?: number
  unit?: string
  priority?: 'Low' | 'Medium' | 'High'
  notes?: string
  status?: 'pending' | 'bought' | 'unavailable'
}

export interface GroceryApiResponse {
  items: GroceryItem[]
  notifications: AppNotification[]
  error?: string
}
