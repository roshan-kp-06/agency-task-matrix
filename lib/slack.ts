export type SlackTask = {
  title: string
  description: string
  source_id: string
  context_url: string
  sender_name: string
  channel_name: string
  context_text: string
}

export async function fetchSlackTasks(): Promise<SlackTask[]> {
  const token = process.env.SLACK_BOT_TOKEN || process.env.SLACK_USER_TOKEN
  if (!token) throw new Error('SLACK_BOT_TOKEN or SLACK_USER_TOKEN not set')

  // Verify workspace is Airr Digital
  const authRes = await fetch('https://slack.com/api/auth.test', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const authData = await authRes.json()
  if (!authData.ok) throw new Error(`Slack auth failed: ${authData.error}`)

  const workspaceName: string = authData.team || ''
  if (!workspaceName.toLowerCase().includes('airr')) {
    console.warn(`[Slack] Connected to "${workspaceName}" — expected Airr Digital workspace`)
  }

  // Build user ID → display name map
  const usersRes = await fetch('https://slack.com/api/users.list?limit=200', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const usersData = await usersRes.json()
  const userMap: Record<string, string> = {}
  if (usersData.ok) {
    for (const member of usersData.members || []) {
      userMap[member.id] = member.profile?.display_name || member.real_name || member.name || member.id
    }
  }

  // Fetch channels the user is in
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

    const channelName: string = channel.name || channel.id

    // Fetch recent messages
    const historyRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${cutoff}&limit=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const historyData = await historyRes.json()
    if (!historyData.ok) continue

    const messages: { ts: string; text: string; user?: string; bot_id?: string; subtype?: string }[] =
      historyData.messages || []

    for (const msg of messages) {
      // Skip bot messages and empty messages
      if (msg.bot_id || !msg.text || msg.subtype) continue

      // Only actionable messages
      const text = msg.text.toLowerCase()
      const isActionable = ['?', 'can you', 'please', 'could you', 'need', 'asap', 'urgent', 'todo', 'follow up'].some(
        (word) => text.includes(word)
      )
      if (!isActionable) continue

      const senderName = msg.user ? (userMap[msg.user] || msg.user) : 'Unknown'

      // Gather 3 surrounding messages for context (before + the message itself)
      const msgTs = parseFloat(msg.ts)
      const contextMsgs = messages
        .filter((m) => {
          const t = parseFloat(m.ts)
          return t >= msgTs - 120 && t <= msgTs + 30 && !m.bot_id && m.text
        })
        .slice(0, 4)
        .map((m) => {
          const name = m.user ? (userMap[m.user] || m.user) : 'Unknown'
          return `${name}: ${m.text}`
        })
        .join('\n')

      const msgUrl = `https://slack.com/archives/${channel.id}/p${msg.ts.replace('.', '')}`

      tasks.push({
        title: msg.text.slice(0, 120).replace(/\n/g, ' '),
        description: msg.text.length > 120 ? msg.text : '',
        source_id: `slack_${msg.ts}`,
        context_url: msgUrl,
        sender_name: senderName,
        channel_name: channelName,
        context_text: contextMsgs || msg.text,
      })
    }
  }

  return tasks
}
