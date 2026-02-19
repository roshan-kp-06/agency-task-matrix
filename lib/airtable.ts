export type AirtableTask = {
  title: string
  description: string
  source_id: string
  context_url: string
}

export async function fetchAirtableTasks(): Promise<AirtableTask[]> {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID || 'appyNh9YMfuKcudXq'
  const tableName = process.env.AIRTABLE_TABLE_NAME || 'Task Hub'

  if (!apiKey) throw new Error('AIRTABLE_API_KEY not set')

  // Filter: incomplete tasks where Deliverable Title contains "Roshan"
  // (Roshan Prakash is the assignee — Task Hub uses "Owner Name" in the title)
  const filterFormula = encodeURIComponent(
    `AND({Complete?} = FALSE(), SEARCH("Roshan", {Deliverable Title}) > 0)`
  )

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${filterFormula}&maxRecords=100`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Airtable fetch failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const tasks: AirtableTask[] = []

  for (const record of data.records || []) {
    const fields = record.fields

    // Use the specific Task field, fall back to Deliverable Title
    const taskText = fields['Task'] || fields['Deliverable Title'] || 'Untitled task'
    const title = String(taskText).slice(0, 200)

    // Parse client name from Deliverable Title: "Client | Task | Owner"
    const deliverableTitle = String(fields['Deliverable Title'] || '')
    const parts = deliverableTitle.split(' | ')
    const clientName = parts.length >= 2 ? parts[0].trim() : ''

    const notes = fields['Notes'] || ''
    const dueDate = fields['Due Date'] ? `Due: ${fields['Due Date']}` : ''
    const description = [clientName && `Client: ${clientName}`, dueDate, notes]
      .filter(Boolean)
      .join(' · ')

    tasks.push({
      title,
      description: description.slice(0, 500),
      source_id: `airtable_${record.id}`,
      context_url: `https://airtable.com/${baseId}/${tableName.replace(/ /g, '%20')}/${record.id}`,
    })
  }

  return tasks
}
