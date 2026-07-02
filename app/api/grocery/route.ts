import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { AppNotification, GroceryItem, PostRequestBody } from '@/types/grocery'

const sql = neon(process.env.DATABASE_URL || '')

/**
 * Reusable notification helper
 */
async function notifyHousehold (
  householdId: number,
  senderId: number,
  message: string
) {
  const roomiesRows = await sql`
    SELECT user_id 
    FROM household_members 
    WHERE household_id = ${householdId} 
      AND user_id != ${senderId}
  `

  for (const roomie of roomiesRows) {
    await sql`
      INSERT INTO app_notifications (target_role, message)
      VALUES (${roomie.user_id}, ${message})
    `
  }
}

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
    const memberRows = await sql`
      SELECT household_id 
      FROM household_members 
      WHERE user_id = ${userId}
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
    notes,
    status // ✅ FIXED (was missing before)
  } = body

  try {
    const memberRows = await sql`
      SELECT household_id 
      FROM household_members 
      WHERE user_id = ${userId}
    `

    if (memberRows.length === 0) {
      return NextResponse.json(
        { error: 'User does not belong to any household' },
        { status: 403 }
      )
    }

    const householdId = memberRows[0].household_id as number
    const emoji = userRole === 'wife' ? '👩 Wife' : '👨 Husband'

    /**
     * ADD ITEM
     */
    if (action === 'add' && name && quantityNeeded && unit) {
      const insertedItemRows = await sql`
        INSERT INTO grocery_items (
          name,
          quantity_needed,
          unit,
          status,
          created_by_user_id,
          created_by_role,
          household_id,
          priority,
          notes,
          current_stock
        )
        VALUES (
          ${name},
          ${quantityNeeded},
          ${unit},
          'pending',
          ${userId},
          ${userRole},
          ${householdId},
          ${priority},
          ${notes},
          ${currentStock}
        )
        RETURNING *
      `

      await notifyHousehold(
        householdId,
        userId,
        `${emoji} added "${name}" (${quantityNeeded} ${unit}) to the list!`
      )

      return NextResponse.json({
        success: true,
        item: insertedItemRows[0] as GroceryItem
      })
    }

    /**
     * UPDATE ITEM (includes bought / not bought)
     */
    if (action === 'update' && body.id) {
      const updatedRows = await sql`
        UPDATE grocery_items
        SET
          name = COALESCE(${name}, name),
          quantity_needed = COALESCE(${quantityNeeded}, quantity_needed),
          unit = COALESCE(${unit}, unit),
          status = COALESCE(${status}, status),
          priority = COALESCE(${priority}, priority),
          notes = COALESCE(${notes}, notes),
          current_stock = COALESCE(${currentStock}, current_stock)
        WHERE id = ${body.id}
          AND household_id = ${householdId}
        RETURNING *
      `

      const updated = updatedRows[0]

      if (updated) {
        let message = `${emoji} updated "${updated.name}"`

        if (status === 'bought') {
          message = `${emoji} marked "${updated.name}" as BOUGHT ✅`
        }

        if (status === 'unavailable') {
          message = `${emoji} marked "${updated.name}" as NOT BOUGHT ❌`
        }

        await notifyHousehold(householdId, userId, message)
      }

      return NextResponse.json({
        success: true,
        item: updated
      })
    }

    /**
     * CLEAR NOTIFICATIONS
     */
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
