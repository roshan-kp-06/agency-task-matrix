import { NextResponse } from 'next/server'
import postgres from 'postgres'

export const dynamic = 'force-dynamic'

export async function POST() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL
  if (!url) {
    return NextResponse.json(
      { error: 'No POSTGRES_URL configured' },
      { status: 500 }
    )
  }

  const sql = postgres(url, { ssl: 'require' })

  try {
    // Add urgency column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tasks' AND column_name = 'urgency'
        ) THEN
          ALTER TABLE tasks ADD COLUMN urgency text DEFAULT 'whenever';
          ALTER TABLE tasks ADD CONSTRAINT tasks_urgency_check
            CHECK (urgency IN ('today', 'this_week', 'whenever'));
        END IF;
      END $$;
    `

    // Add category column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tasks' AND column_name = 'category'
        ) THEN
          ALTER TABLE tasks ADD COLUMN category text DEFAULT NULL;
        END IF;
      END $$;
    `

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS tasks_urgency_idx ON tasks (urgency)`
    await sql`CREATE INDEX IF NOT EXISTS tasks_category_idx ON tasks (category)`

    // Verify columns exist
    const result = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'tasks' AND column_name IN ('urgency', 'category')
      ORDER BY column_name
    `

    await sql.end()

    return NextResponse.json({
      success: true,
      message: 'Migration complete',
      columns: result,
    })
  } catch (err) {
    await sql.end()
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
