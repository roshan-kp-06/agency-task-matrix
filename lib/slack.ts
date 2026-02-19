export type SlackTask = {
  title: string
  description: string
  source_id: string
  context_url: string
}

export async function fetchSlackTasks(): Promise<SlackTask[]> {
  const token = process.env.SLACK_BOT_TOKEN || process.env.SLACK_USER_TOKEN
  if (!token) throw new Error('SLACK_BOT_TOKEN or SLACK_USER_TOKEN not set')

  // Fetch channels the bot is in
  const channelsRes = await fetch(
    'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const channelsData = await channelsRes.json()
  if (!channelsData.ok) throw new Error(`Slack channels error: ${channelsData.error}`)

  const tasks: SlackTask[] = []
  const cutoff = Date.now() / 1000 - 7 * 24 * 60 * 60 // 7 days ago

  for (const channel of channelsData.channels || []) {
    if (!channel.is_member) continue

    // Fetch recent messages
    const historyRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${cutoff}&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const historyData = await historyRes.json()
    if (!historyData.ok) continue

    for (const msg of historyData.messages || []) {
      // Skip bot messages and empty messages
      if (msg.bot_id || !msg.text || msg.subtype) continue
      // Only messages with action words
      const text = msg.text.toLowerCase()
      const isActionable = ['?', 'can you', 'please', 'could you', 'need', 'asap', 'urgent', 'todo', 'follow up'].some(
        (word) => text.includes(word)
      )
      if (!isActionable) continue

      const msgUrl = `https://slack.com/archives/${channel.id}/p${msg.ts.replace('.', '')}`
      tasks.push({
        title: msg.text.slice(0, 120).replace(/\n/g, ' '),
        description: msg.text.length > 120 ? msg.text : '',
        source_id: `slack_${msg.ts}`,
        context_url: msgUrl,
      })
    }
  }

  return tasks
}
