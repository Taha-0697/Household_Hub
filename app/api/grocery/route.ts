import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { AppNotification, GroceryItem, PostRequestBody } from '@/types/grocery'

const sql = neon(process.env.DATABASE_URL || '')

export async function GET (request: Request) {
  const { searchParams } = new URL(request.url)
  const userIdStr = searchParams.get('userId')

  if (!userIdStr) {
    return NextResponse.json(
      { error: 'Missing authorized user identifier' },
      { status: 400 }
    )
  }
  const userId = parseInt(userIdStr, 10)

  try {
    // -- Find the unique household ID mapped to this user session
    const memberRows = await sql`
      SELECT household_id FROM household_members WHERE user_id = ${userId}
    `

    if (memberRows.length === 0) {
      return NextResponse.json({ items: [], notifications: [] })
    }

    const householdId = memberRows[0].household_id as number
    const dbItems = await sql`
    SELECT
      id,
      name,
      current_stock AS "currentStock",
      quantity_needed AS "quantityNeeded",
      unit,
      status,
      priority,
      notes,
      created_by_user_id AS "createdByUserId",
      created_by_role AS "createdBy"
    FROM grocery_items
    WHERE household_id = ${householdId}
    ORDER BY id DESC
  `
    // -- Fetch active unread system alerts targeting this exact user ID
    const dbNotifications = await sql`
      SELECT id, message 
      FROM app_notifications 
      WHERE target_role = ${userId}
      ORDER BY id DESC
    `

    return NextResponse.json({
      items: dbItems as GroceryItem[],
      notifications: dbNotifications as AppNotification[]
    })
  } catch (dbError) {
    console.error('Neon DB Fetch Error:', dbError)
    return NextResponse.json(
      { error: 'Database execution failure' },
      { status: 500 }
    )
  }
}

export async function POST (request: Request) {
  const body: PostRequestBody = await request.json()
  const {
    action,
    userId,
    userRole,
    name,
    currentStock,
    quantityNeeded,
    unit,
    priority,
    notes
  } = body

  try {
    // -- Fetch the household mapping for the current user
    const memberRows = await sql`
      SELECT household_id FROM household_members WHERE user_id = ${userId}
    `

    if (memberRows.length === 0) {
      return NextResponse.json(
        { error: 'User does not belong to any household' },
        { status: 403 }
      )
    }

    const householdId = memberRows[0].household_id as number

    // -- ACTION: ADD NEW GROCERY ITEM
    if (action === 'add' && name && quantityNeeded && unit) {
      // -- 1. Store item tagged directly with the target household ID context
      const insertedItemRows = await sql`
        INSERT INTO grocery_items (name, quantity_needed, unit, status, created_by_user_id, created_by_role, household_id, priority, notes, current_stock)
        VALUES (${name}, ${quantityNeeded}, ${unit}, 'pending', ${userId}, ${userRole}, ${householdId}, ${priority}, ${notes}, ${currentStock})
        RETURNING id, name, quantity_needed AS "quantityNeeded", unit, status, created_by_user_id AS "createdByUserId", created_by_role AS "createdBy", priority, notes, current_stock AS "currentStock"
      `

      // -- 2. Find all OTHER members in this same house to send them the alert
      const roomiesRows = await sql`
        SELECT user_id FROM household_members 
        WHERE household_id = ${householdId} AND user_id != ${userId}
      `

      if (roomiesRows.length > 0) {
        const emoji = userRole === 'wife' ? '👩 Wife' : '👨 Husband'
        const notificationMessage = `${emoji} added "${name}" (${quantityNeeded} ${unit}) to the list!`

        // -- Create a notification for each roommate/spouse found
        for (const roomie of roomiesRows) {
          const targetRoomieId = roomie.user_id as number
          await sql`
            INSERT INTO app_notifications (target_role, message)
            VALUES (${targetRoomieId}, ${notificationMessage})
          `
        }
      }

      return NextResponse.json({
        success: true,
        item: insertedItemRows[0] as GroceryItem
      })
    }

    // -- ACTION: CLEAR NOTIFICATIONS FOR CURRENT USER ONLY
    if (action === 'clearNotifications') {
      await sql`
        DELETE FROM app_notifications 
        WHERE target_role = ${userId}
      `
      return NextResponse.json({ success: true })
    }
  } catch (dbError) {
    console.error('Neon DB Write Error:', dbError)
    return NextResponse.json(
      { error: 'Database mutation failure' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { error: 'Invalid action or payload' },
    { status: 400 }
  )
}
