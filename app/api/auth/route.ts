import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// 1. STRICT INTERFACE DEFINITIONS
interface AuthRequestBody {
  action: 'register' | 'login'
  username?: string
  password?: string
  role?: 'husband' | 'wife'
  householdId?: string // Passed from frontend registration component
}

interface UserRow {
  id: number
  username: string
  role: 'husband' | 'wife'
}

interface HouseholdRow {
  id: number
}

export async function POST (request: Request) {
  try {
    const body: AuthRequestBody = await request.json()
    const { action, username, password, role, householdId } = body

    // Fast-fail validation on core credentials
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }

    const cleanUsername = username.trim().toLowerCase()

    // ==========================================
    // ACTION: ACCOUNT REGISTRATION FLOW
    // ==========================================
    if (action === 'register') {
      if (!householdId || !role) {
        return NextResponse.json(
          {
            error:
              'Household code and profile role are required for registration'
          },
          { status: 400 }
        )
      }

      const cleanHouseholdCode = householdId.trim().toLowerCase()

      // Check if the username is already taken
      const existing = (await sql`
        SELECT id FROM app_users WHERE username = ${cleanUsername}
      `) as UserRow[]

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 400 }
        )
      }

      // Step 1: Create the user profile row
      const userResult = (await sql`
        INSERT INTO app_users (username, password, role)
        VALUES (${cleanUsername}, ${password}, ${role})
        RETURNING id, username, role;
      `) as UserRow[]
      const newUser = userResult[0]

      // Step 2: Create or retrieve the target shared household index slot
      const houseResult = (await sql`
        INSERT INTO households (household_code)
        VALUES (${cleanHouseholdCode})
        ON CONFLICT (household_code) 
        DO UPDATE SET household_code = EXCLUDED.household_code
        RETURNING id;
      `) as HouseholdRow[]
      const houseId = houseResult[0].id

      // Step 3: Map the new user explicitly to the household group in the junction table
      await sql`
        INSERT INTO household_members (household_id, user_id)
        VALUES (${houseId}, ${newUser.id});
      `

      return NextResponse.json(
        { success: true, user: newUser },
        { status: 201 }
      )
    }

    // ==========================================
    // ACTION: USER AUTHENTICATION / LOGIN FLOW
    // ==========================================
    if (action === 'login') {
      // Validate credentials directly against app_users table (No household code needed)
      const result = (await sql`
        SELECT id, username, role FROM app_users 
        WHERE username = ${cleanUsername} AND password = ${password}
      `) as UserRow[]

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        )
      }

      // Return user payload directly for front-end browser mapping (stored in localStorage)
      return NextResponse.json({ success: true, user: result[0] })
    }

    return NextResponse.json(
      { error: 'Invalid action configuration' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Authentication engine exception triggered:', error)
    return NextResponse.json(
      { error: 'Authentication engine failure' },
      { status: 500 }
    )
  }
}
