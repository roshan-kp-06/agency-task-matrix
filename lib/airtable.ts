export type AirtableTask = {
  title: string
  description: string
  source_id: string
  context_url: string
}

export async function fetchAirtableTasks(): Promise<AirtableTask[]> {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Tasks'
  const assigneeField = process.env.AIRTABLE_ASSIGNEE_FIELD || 'Assignee'
  const assigneeValue = process.env.AIRTABLE_ASSIGNEE_VALUE || 'Roshan'

  if (!apiKey || !baseId) throw new Error('AIRTABLE_API_KEY or AIRTABLE_BASE_ID not set')

  const filterFormula = encodeURIComponent(`SEARCH("${assigneeValue}", {${assigneeField}}) > 0`)
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${filterFormula}&maxRecords=100`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Airtable fetch failed: ${err}`)
  }

  const data = await res.json()
  const tasks: AirtableTask[] = []

  for (const record of data.records || []) {
    const fields = record.fields
    // Try common task title field names
    const title =
      fields['Name'] ||
      fields['Task'] ||
      fields['Title'] ||
      fields['Task Name'] ||
      fields['Summary'] ||
      Object.values(fields)[0] ||
      'Untitled task'

    // Skip if no meaningful title
    if (!title || typeof title !== 'string') continue

    const description =
      fields['Description'] || fields['Notes'] || fields['Details'] || ''

    tasks.push({
      title: String(title).slice(0, 200),
      description: String(description).slice(0, 500),
      source_id: `airtable_${record.id}`,
      context_url: `https://airtable.com/${baseId}`,
    })
  }

  return tasks
}
