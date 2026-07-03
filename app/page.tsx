'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import AuthForm from '@/components/AuthForm'
import NotificationBanner from '@/components/NotificationBanner'
import GroceryForm from '@/components/GroceryForm'
import GroceryItemCard from '@/components/GroceryItemCard'
import { AppNotification, AuthUser, GroceryItem } from '@/types/grocery'

export default function Home () {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [items, setItems] = useState<GroceryItem[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  // ========================================================
  // 2. ISOLATED BACKEND API INTERACTION HANDLERS
  // ========================================================
  const fetchData = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`/api/grocery?userId=${user.id}`)
      const data = await res.json()
      setItems(data.items || [])

      // Check if a new notification has arrived for this user session
      if (
        data.notifications &&
        data.notifications.length > notifications.length
      ) {
        if (Notification.permission === 'granted') {
          new Notification('🏡 Household Update', {
            body: data.notifications[0].message
          })
        }
      }
      setNotifications(data.notifications || [])
    } catch (err) {
      console.error('Data layer synchronization failed:', err)
    }
  }, [user, notifications.length])

  const handleUpdateItem = useCallback(
    async (id: number, fields: Partial<GroceryItem>) => {
      if (!user?.id) return
      try {
        await fetch('/api/grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            id,
            userId: user.id,
            userRole: user.role,
            ...fields
          })
        })
        fetchData()
      } catch (err) {
        console.error('Update operation mutation failed:', err)
      }
    },
    [user, fetchData]
  )

  const clearNotifications = useCallback(async () => {
    if (!user?.id) return
    try {
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearNotifications',
          userId: user.id,
          userRole: user.role
        })
      })
      setNotifications([])
    } catch (err) {
      console.error('Clearing notification vectors failed:', err)
    }
  }, [user])

  const handleLogout = () => {
    localStorage.removeItem('household_user')
    setUser(null)
    setItems([])
    setNotifications([])
  }

  // ========================================================
  // 3. LIFECYCLE CONTROLLERS & POLLING LOOPS
  // ========================================================
  useEffect(() => {
    const savedUser = localStorage.getItem('household_user')
    if (savedUser) {
      const timer = setTimeout(() => {
        setUser(JSON.parse(savedUser) as AuthUser)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const initialFetchTimer = setTimeout(() => {
      fetchData()
    }, 0)

    const interval = setInterval(fetchData, 40000)

    return () => {
      clearTimeout(initialFetchTimer)
      clearInterval(interval)
    }
  }, [user?.id, fetchData])

  const notificationKey = notifications.map(n => n.id).join(',')
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        clearNotifications()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notificationKey, clearNotifications])

  // =========================
  // DERIVED STATE (OPTIMIZED)
  // =========================
  const pending = useMemo(
    () => items.filter(i => i.status === 'pending'),
    [items]
  )

  const unavailable = useMemo(
    () => items.filter(i => i.status === 'unavailable'),
    [items]
  )

  const bought = useMemo(
    () => items.filter(i => i.status === 'bought'),
    [items]
  )

  // ========================================================
  // RENDERING ROUTINES & COMPONENT VIEWS
  // ========================================================
  if (!user) {
    return (
      <AuthForm
        onAuthSuccess={authenticatedUser =>
          setUser(authenticatedUser as AuthUser)
        }
      />
    )
  }

  return (
    <main className='max-w-md mx-auto p-6 font-sans bg-white min-h-screen text-black shadow-lg'>
      {/* Dynamic Session Information Panel */}
      <div className='flex flex-col gap-1 bg-gray-50 p-3 rounded-xl border mb-6 text-xs text-gray-900'>
        <div className='flex justify-between items-center'>
          <div>
            <span className='text-gray-400'>Logged User:</span>{' '}
            <strong className='font-bold capitalize'>{user.username}</strong>
          </div>
          <button
            onClick={handleLogout}
            className='text-red-600 hover:underline font-bold'
          >
            Logout
          </button>
        </div>
        <div className='text-[11px] text-gray-500 border-t pt-1 border-gray-200 mt-1'>
          🔑 Household Identity Profile Context:{' '}
          <span className='font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border border-blue-100'>
            {user.role}
          </span>
        </div>
      </div>

      <NotificationBanner
        notifications={notifications}
        onClear={clearNotifications}
      />

      {/* Shared Item Input Form Injection */}
      <GroceryForm onItemAdded={fetchData} />

      {/* Main Requirement List */}
      <h2 className='text-lg font-bold mb-3 text-gray-800'>
        🛒 Shared List Rows 0023
      </h2>
      <ul className='space-y-3 mb-6'>
        {pending.map(item => (
          <GroceryItemCard
            key={item.id}
            item={item}
            onUpdateStatus={handleUpdateItem}
          />
        ))}

        {pending.length === 0 && (
          <li className='text-center text-gray-400 py-6'>No active items</li>
        )}
      </ul>

      {/* UNAVAILABLE */}
      {unavailable.length > 0 && (
        <div className='mb-6'>
          <h2 className='text-sm font-bold text-rose-500 mb-3'>
            ❌ Skipped Items
          </h2>

          <ul className='space-y-2'>
            {unavailable.map(item => (
              <li
                key={item.id}
                className='p-3 bg-rose-50 rounded-lg flex justify-between text-sm'
              >
                <span>
                  {item.name} ({item.quantityNeeded} {item.unit})
                </span>

                <button
                  onClick={() =>
                    handleUpdateItem(item.id, { status: 'pending' })
                  }
                  className='text-xs underline'
                >
                  Retry
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* BOUGHT */}
      <h2 className='text-sm font-bold mb-3 text-gray-400'>Recently Bought</h2>

      <ul className='space-y-2 opacity-60'>
        {bought.map(item => (
          <li
            key={item.id}
            className='p-3 bg-gray-50 rounded-lg flex justify-between line-through text-sm'
          >
            <span>
              {item.name} ({item.quantityNeeded} {item.unit})
            </span>

            <button
              onClick={() => handleUpdateItem(item.id, { status: 'pending' })}
              className='text-xs underline text-blue-600'
            >
              Re-add
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
