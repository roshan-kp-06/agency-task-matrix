#!/usr/bin/env python3
"""
Batch-add all tasks to the Task Matrix.
Run: python add_tasks.py
"""

import json
import urllib.request
import urllib.error
import time

API_URL = "https://agency-task-matrix.vercel.app/api/tasks"

tasks = [
    # ─── TODAY ───────────────────────────────────────────────────────────────

    # Client Work > ListKit
    {
        "title": "Remove Andre from ListKit flows → switch to support.listkit.io",
        "description": "Turn off any flows coming from Andre at ListKit. They should come from support.listkit.io instead.",
        "urgency": "today",
        "category": "Client Work > ListKit",
        "leverage": 8,
        "effort": 3,
    },
    {
        "title": "Send ListKit KPI report (this week + next week agenda)",
        "description": "Send weekly KPI report: what was worked on this week and what's on the agenda for next week.",
        "urgency": "today",
        "category": "Client Work > ListKit",
        "leverage": 8,
        "effort": 2,
    },
    {
        "title": "Resume ListKit daily email broadcasts",
        "description": "Resume sending daily broadcasts for ListKit.",
        "urgency": "today",
        "category": "Client Work > ListKit",
        "leverage": 7,
        "effort": 2,
    },
    {
        "title": "Send ListKit free trial flow weekly analytics",
        "description": "From Fathom PLG call with François: send weekly analytics report on free trial email flow.",
        "urgency": "today",
        "category": "Client Work > ListKit",
        "leverage": 7,
        "effort": 3,
    },

    # Client Work > Atlas
    {
        "title": "Remove false social proof claims from Atlas emails",
        "description": "Found in Atlas Slack: remove any false social proof claims from email flows.",
        "urgency": "today",
        "category": "Client Work > Atlas",
        "leverage": 8,
        "effort": 2,
    },
    {
        "title": "Send Atlas weekly report + revised campaigns",
        "description": "Send the weekly status report for Atlas and share revised campaign emails.",
        "urgency": "today",
        "category": "Client Work > Atlas",
        "leverage": 7,
        "effort": 2,
    },
    {
        "title": "Fix first two Atlas email flows (copy + flow logic)",
        "description": "Atlas requested fixes to the first two email flows — update copy and fix flow logic.",
        "urgency": "today",
        "category": "Client Work > Atlas",
        "leverage": 8,
        "effort": 5,
    },

    # Sales
    {
        "title": "Follow up with all past sales calls (last month)",
        "description": "Send follow-ups to everyone from sales calls over the past month. Update pipeline with where each lead stands.",
        "urgency": "today",
        "category": "Sales",
        "leverage": 9,
        "effort": 4,
    },

    # Hiring
    {
        "title": "Set up hiring meetings with Shimon and Mojo (Editor roles)",
        "description": "Book meetings with Shimon and Mojo for the Editor and Editor Plus Strategist roles at the agency.",
        "urgency": "today",
        "category": "Hiring",
        "leverage": 8,
        "effort": 2,
    },

    # Marketing > Cold Email
    {
        "title": "Respond to all past cold email replies",
        "description": "Reply to all outstanding cold email replies in inbox.",
        "urgency": "today",
        "category": "Marketing > Cold Email",
        "leverage": 8,
        "effort": 3,
    },

    # ─── THIS WEEK ────────────────────────────────────────────────────────────

    # Client Work > ListKit
    {
        "title": "Scrub email lists for ListKit",
        "description": "Find a way to scrub lists for ListKit to improve deliverability.",
        "urgency": "this_week",
        "category": "Client Work > ListKit",
        "leverage": 7,
        "effort": 4,
    },
    {
        "title": "Write ListKit 30-email broadcast",
        "description": "Write a 30-email broadcast sequence for ListKit.",
        "urgency": "this_week",
        "category": "Client Work > ListKit",
        "leverage": 7,
        "effort": 5,
    },
    {
        "title": "Launch ListKit win-back campaign with A/B test",
        "description": "From Fathom PLG call: launch win-back campaign. Set up A/B test on subject lines / content.",
        "urgency": "this_week",
        "category": "Client Work > ListKit",
        "leverage": 8,
        "effort": 5,
    },
    {
        "title": "Reschedule ListKit recurring call to Tuesdays 4pm UK",
        "description": "From Fathom PLG call: move recurring call to Tuesdays 4pm UK time starting in March.",
        "urgency": "this_week",
        "category": "Client Work > ListKit",
        "leverage": 4,
        "effort": 1,
    },

    # Client Work > Tunzilla
    {
        "title": "Book onboarding call with Mohammed at Tunzilla",
        "description": "Respond to Mohammed at Tunzilla and book their onboarding call.",
        "urgency": "this_week",
        "category": "Client Work > Tunzilla",
        "leverage": 9,
        "effort": 2,
    },
    {
        "title": "Go through Tunzilla onboarding form",
        "description": "Review and complete Tunzilla's onboarding form in preparation for the kickoff call.",
        "urgency": "this_week",
        "category": "Client Work > Tunzilla",
        "leverage": 8,
        "effort": 3,
    },
    {
        "title": "Put together timeline and delivery plan for Tunzilla",
        "description": "Map out a timeline and plan for Tunzilla's email marketing delivery.",
        "urgency": "this_week",
        "category": "Client Work > Tunzilla",
        "leverage": 8,
        "effort": 4,
    },

    # Client Work > Atlas
    {
        "title": "Create new third email flow for Atlas",
        "description": "Atlas requested a new third email flow. Design and build it.",
        "urgency": "this_week",
        "category": "Client Work > Atlas",
        "leverage": 7,
        "effort": 5,
    },
    {
        "title": "Improve design across all Atlas email flows",
        "description": "Atlas feedback: improve email design for all flows.",
        "urgency": "this_week",
        "category": "Client Work > Atlas",
        "leverage": 6,
        "effort": 4,
    },
    {
        "title": "Fix dead links in Atlas emails (Discord links)",
        "description": "Atlas Slack: fix dead links, particularly Discord links in emails.",
        "urgency": "this_week",
        "category": "Client Work > Atlas",
        "leverage": 6,
        "effort": 2,
    },

    # Sales
    {
        "title": "Update CRM pipeline for all active leads",
        "description": "Go through all leads, update pipeline stages and notes for each one.",
        "urgency": "this_week",
        "category": "Sales",
        "leverage": 7,
        "effort": 3,
    },
    {
        "title": "Send meeting follow-up emails to all prospects",
        "description": "Send tailored follow-up emails to all prospects from recent sales meetings.",
        "urgency": "this_week",
        "category": "Sales",
        "leverage": 8,
        "effort": 3,
    },

    # Hiring
    {
        "title": "Review Contra applications for landing page designer",
        "description": "Go through all Contra applications for the landing page designer role and start interviewing.",
        "urgency": "this_week",
        "category": "Hiring",
        "leverage": 7,
        "effort": 3,
    },
    {
        "title": "Send copywriter test tasks to two candidates",
        "description": "Two copywriters sent their info via email. Send them their test tasks.",
        "urgency": "this_week",
        "category": "Hiring",
        "leverage": 7,
        "effort": 2,
    },

    # ─── WHENEVER (backlog) ───────────────────────────────────────────────────

    # Client Work > ListKit
    {
        "title": "Plan ListKit email engine launch campaign",
        "description": "From Fathom PLG call: plan the campaign for launching the email engine.",
        "urgency": "whenever",
        "category": "Client Work > ListKit",
        "leverage": 8,
        "effort": 6,
    },

    # Marketing > Funnel
    {
        "title": "Script confirmation page videos for ads funnel",
        "description": "Write scripts for the confirmation page videos to use in the ads funnel.",
        "urgency": "whenever",
        "category": "Marketing > Funnel",
        "leverage": 7,
        "effort": 5,
    },
    {
        "title": "Script VSL for the funnel",
        "description": "Write the VSL (video sales letter) script for the main funnel.",
        "urgency": "whenever",
        "category": "Marketing > Funnel",
        "leverage": 9,
        "effort": 7,
    },
    {
        "title": "Build confirmation page in ClickFunnels",
        "description": "Set up and build the confirmation page in ClickFunnels.",
        "urgency": "whenever",
        "category": "Marketing > Funnel",
        "leverage": 8,
        "effort": 5,
    },
    {
        "title": "Set up Facebook pixel standard event code in ClickFunnels",
        "description": "Install and configure the Facebook pixel standard event tracking code on ClickFunnels pages.",
        "urgency": "whenever",
        "category": "Marketing > Funnel",
        "leverage": 7,
        "effort": 3,
    },

    # Marketing > Cold Email
    {
        "title": "Scrape and set up cold email campaign for Airr Digital agency prospects",
        "description": "Scrape a list of agency prospects and set up an outbound cold email campaign targeting them.",
        "urgency": "whenever",
        "category": "Marketing > Cold Email",
        "leverage": 8,
        "effort": 5,
    },
    {
        "title": "Scrape and set up cold email campaign for Airr Digital SaaS prospects",
        "description": "Scrape a list of SaaS prospects and set up an outbound cold email campaign.",
        "urgency": "whenever",
        "category": "Marketing > Cold Email",
        "leverage": 8,
        "effort": 5,
    },
    {
        "title": "Buy inboxes from Scaled Mail and set up Haven.io outreach",
        "description": "Buy inboxes from Scaled Mail, configure them, and launch cold outreach for Haven.io.",
        "urgency": "whenever",
        "category": "Marketing > Cold Email",
        "leverage": 7,
        "effort": 4,
    },
    {
        "title": "Vibe-code a landing page/website for Haven.io",
        "description": "Build a test website for Haven.io to use in cold email campaigns.",
        "urgency": "whenever",
        "category": "Marketing > Cold Email",
        "leverage": 6,
        "effort": 6,
    },

    # Systems
    {
        "title": "Map out full client delivery process for paid ads offer",
        "description": "Document the end-to-end client delivery process for the new paid ads service.",
        "urgency": "whenever",
        "category": "Systems",
        "leverage": 8,
        "effort": 6,
    },
    {
        "title": "Set up onboarding system for agency paid ads clients",
        "description": "Build out the full onboarding flow: welcome, forms, kickoff, delivery checklist.",
        "urgency": "whenever",
        "category": "Systems",
        "leverage": 8,
        "effort": 7,
    },
    {
        "title": "Update Airtable to support paid ads client tracking",
        "description": "Configure Airtable so we can offer and track paid ads deliverables for clients.",
        "urgency": "whenever",
        "category": "Systems",
        "leverage": 7,
        "effort": 4,
    },
    {
        "title": "Map out weekly marketing metrics dashboard",
        "description": "Define all the metrics to review every week across all marketing channels. Build a review system.",
        "urgency": "whenever",
        "category": "Systems",
        "leverage": 7,
        "effort": 4,
    },

    # Sales Process
    {
        "title": "Create sales process + pitch deck for agency clients",
        "description": "Build a structured sales process and pitch deck specifically for agency client sales calls.",
        "urgency": "whenever",
        "category": "Sales",
        "leverage": 9,
        "effort": 6,
    },
    {
        "title": "Create sales process + pitch deck for SaaS clients",
        "description": "Build a second version of the sales process and pitch deck tailored to SaaS client prospects.",
        "urgency": "whenever",
        "category": "Sales",
        "leverage": 9,
        "effort": 6,
    },

    # Content / Social
    {
        "title": "Set up daily Twitter posting system",
        "description": "Create a structure and workflow to post on Twitter every single day.",
        "urgency": "whenever",
        "category": "Content",
        "leverage": 6,
        "effort": 5,
    },
    {
        "title": "Book call with Starborn.ai about LinkedIn content management",
        "description": "Explore working with Starborn.ai to handle LinkedIn daily posting.",
        "urgency": "whenever",
        "category": "Content",
        "leverage": 7,
        "effort": 1,
    },
    {
        "title": "Book calls with other LinkedIn content agencies",
        "description": "Research and book discovery calls with 2-3 other LinkedIn content agencies.",
        "urgency": "whenever",
        "category": "Content",
        "leverage": 6,
        "effort": 2,
    },
    {
        "title": "Launch YouTube channel (3 videos/week — SaaS GTM content)",
        "description": "Start posting on YouTube every week. Minimum 3 videos/week focused on helping SaaS companies with their GTM strategy. Set up video production + editing workflow.",
        "urgency": "whenever",
        "category": "Content",
        "leverage": 7,
        "effort": 9,
    },

    # Hiring
    {
        "title": "Film new video for STR application (LinkedIn recruitment)",
        "description": "Film a new recruitment video for the STR application currently live on LinkedIn.",
        "urgency": "whenever",
        "category": "Hiring",
        "leverage": 5,
        "effort": 4,
    },
    {
        "title": "Update Gamma doc with LinkedIn applicant tracking",
        "description": "Update the Gamma paid doc to track where LinkedIn applicants are being sent in the funnel.",
        "urgency": "whenever",
        "category": "Hiring",
        "leverage": 5,
        "effort": 2,
    },
]


def post_task(task: dict) -> dict:
    payload = json.dumps({
        "title": task["title"],
        "description": task.get("description", ""),
        "source": "manual",
        "leverage": task.get("leverage", 5),
        "effort": task.get("effort", 5),
        "urgency": task.get("urgency", "whenever"),
        "category": task.get("category"),
    }).encode("utf-8")

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main():
    print(f"Adding {len(tasks)} tasks to Task Matrix...\n")
    success = 0
    failed = []

    for i, task in enumerate(tasks, 1):
        try:
            result = post_task(task)
            urgency_icon = {"today": "🔴", "this_week": "🟡", "whenever": "⚪"}.get(task["urgency"], "⚪")
            print(f"  {i:2}. {urgency_icon} {task['title'][:60]}")
            success += 1
            time.sleep(0.3)  # Be gentle on the API
        except Exception as e:
            print(f"  {i:2}. ❌ FAILED: {task['title'][:50]} — {e}")
            failed.append(task["title"])
            time.sleep(1)

    print(f"\n✅ {success}/{len(tasks)} tasks added successfully.")
    if failed:
        print(f"\n❌ Failed tasks ({len(failed)}):")
        for t in failed:
            print(f"   - {t}")


if __name__ == "__main__":
    main()
