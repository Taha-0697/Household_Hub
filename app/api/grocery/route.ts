import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { AppNotification, GroceryItem, PostRequestBody } from '@/types/grocery'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable')
}

const sql = neon(databaseUrl)

/**
 * Reusable notification helper
 */
async function notifyHousehold (
  householdId: number,
  senderId: number,
  message: string
) {
  const roomiesRows = (await sql`
    SELECT user_id
    FROM household_members
    WHERE household_id = ${householdId}
      AND user_id != ${senderId}
  `) as { user_id: number }[]

  for (const roomie of roomiesRows) {
    await sql`
      INSERT INTO app_notifications (target_role, message)
      VALUES (${roomie.user_id}, ${message})
    `
  }
}

/**
 * GET ITEMS + NOTIFICATIONS
 */
export async function GET (request: Request) {
  const { searchParams } = new URL(request.url)
  const userIdStr = searchParams.get('userId')

  if (!userIdStr) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const userId = Number(userIdStr)

  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 })
  }

  try {
    const memberRows = (await sql`
      SELECT household_id
      FROM household_members
      WHERE user_id = ${userId}
    `) as { household_id: number }[]

    if (memberRows.length === 0) {
      return NextResponse.json({ items: [], notifications: [] })
    }

    const householdId = memberRows[0].household_id

    const dbItems = (await sql`
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
    `) as GroceryItem[]

    const dbNotifications = (await sql`
      SELECT id, message
      FROM app_notifications
      WHERE target_role = ${userId}
      ORDER BY id DESC
    `) as AppNotification[]

    return NextResponse.json({
      items: dbItems,
      notifications: dbNotifications
    })
  } catch (err) {
    console.error('GET error:', err)
    return NextResponse.json(
      { error: 'Database fetch failure' },
      { status: 500 }
    )
  }
}

/**
 * POST ACTIONS
 */
export async function POST (request: Request) {
  let body: PostRequestBody

  try {
    body = (await request.json()) as PostRequestBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

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
    status
  } = body

  if (!action || !userId || !userRole) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  try {
    const memberRows = (await sql`
      SELECT household_id
      FROM household_members
      WHERE user_id = ${userId}
    `) as { household_id: number }[]

    if (memberRows.length === 0) {
      return NextResponse.json(
        { error: 'User not in household' },
        { status: 403 }
      )
    }

    const householdId = memberRows[0].household_id
    const emoji = userRole === 'wife' ? '👩 Wife' : '👨 Husband'

    /**
     * ADD ITEM
     */
    if (action === 'add') {
      if (!name || !quantityNeeded || !unit) {
        return NextResponse.json(
          { error: 'Missing item fields' },
          { status: 400 }
        )
      }

      const inserted = (await sql`
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
          ${priority ?? null},
          ${notes ?? null},
          ${currentStock ?? 0}
        )
        RETURNING *
      `) as GroceryItem[]

      await notifyHousehold(
        householdId,
        userId,
        `${emoji} added "${name}" (${quantityNeeded} ${unit})`
      )

      return NextResponse.json({
        success: true,
        item: inserted[0]
      })
    }

    /**
     * UPDATE ITEM
     */
    if (action === 'update') {
      if (!body.id) {
        return NextResponse.json({ error: 'Missing item id' }, { status: 400 })
      }

      const updated = (await sql`
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
      `) as GroceryItem[]

      const item = updated[0]

      if (item) {
        let message = `${emoji} updated "${item.name}"`

        if (status === 'bought') {
          message = `${emoji} marked "${item.name}" as BOUGHT ✅`
        }

        if (status === 'unavailable') {
          message = `${emoji} marked "${item.name}" as NOT AVAILABLE ❌`
        }

        await notifyHousehold(householdId, userId, message)
      }

      return NextResponse.json({
        success: true,
        item
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

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    console.error('POST error:', err)
    return NextResponse.json(
      { error: 'Database mutation failure' },
      { status: 500 }
    )
  }
}
