#!/usr/bin/env python3
"""
After running the Supabase SQL migration, run this script to set
the correct urgency and category on every task.

Usage: python3 patch_urgency.py
"""

import json
import urllib.request
import time

API_BASE = "https://agency-task-matrix.vercel.app/api/tasks"

# Ground truth: title → (urgency, category)
TASK_META = {
    "Remove Andre from ListKit flows → switch to support.listkit.io": ("today", "Client Work > ListKit"),
    "Send ListKit KPI report (this week + next week agenda)": ("today", "Client Work > ListKit"),
    "Resume ListKit daily email broadcasts": ("today", "Client Work > ListKit"),
    "Send ListKit free trial flow weekly analytics": ("today", "Client Work > ListKit"),
    "Remove false social proof claims from Atlas emails": ("today", "Client Work > Atlas"),
    "Send Atlas weekly report + revised campaigns": ("today", "Client Work > Atlas"),
    "Fix first two Atlas email flows (copy + flow logic)": ("today", "Client Work > Atlas"),
    "Follow up with all past sales calls (last month)": ("today", "Sales"),
    "Set up hiring meetings with Shimon and Mojo (Editor roles)": ("today", "Hiring"),
    "Respond to all past cold email replies": ("today", "Marketing > Cold Email"),
    "Scrub email lists for ListKit": ("this_week", "Client Work > ListKit"),
    "Write ListKit 30-email broadcast": ("this_week", "Client Work > ListKit"),
    "Launch ListKit win-back campaign with A/B test": ("this_week", "Client Work > ListKit"),
    "Reschedule ListKit recurring call to Tuesdays 4pm UK": ("this_week", "Client Work > ListKit"),
    "Book onboarding call with Mohammed at Tunzilla": ("this_week", "Client Work > Tunzilla"),
    "Go through Tunzilla onboarding form": ("this_week", "Client Work > Tunzilla"),
    "Put together timeline and delivery plan for Tunzilla": ("this_week", "Client Work > Tunzilla"),
    "Create new third email flow for Atlas": ("this_week", "Client Work > Atlas"),
    "Improve design across all Atlas email flows": ("this_week", "Client Work > Atlas"),
    "Fix dead links in Atlas emails (Discord links)": ("this_week", "Client Work > Atlas"),
    "Update CRM pipeline for all active leads": ("this_week", "Sales"),
    "Send meeting follow-up emails to all prospects": ("this_week", "Sales"),
    "Review Contra applications for landing page designer": ("this_week", "Hiring"),
    "Send copywriter test tasks to two candidates": ("this_week", "Hiring"),
    "Plan ListKit email engine launch campaign": ("whenever", "Client Work > ListKit"),
    "Script confirmation page videos for ads funnel": ("whenever", "Marketing > Funnel"),
    "Script VSL for the funnel": ("whenever", "Marketing > Funnel"),
    "Build confirmation page in ClickFunnels": ("whenever", "Marketing > Funnel"),
    "Set up Facebook pixel standard event code in ClickFunnels": ("whenever", "Marketing > Funnel"),
    "Scrape and set up cold email campaign for Airr Digital agency prospects": ("whenever", "Marketing > Cold Email"),
    "Scrape and set up cold email campaign for Airr Digital SaaS prospects": ("whenever", "Marketing > Cold Email"),
    "Buy inboxes from Scaled Mail and set up Haven.io outreach": ("whenever", "Marketing > Cold Email"),
    "Vibe-code a landing page/website for Haven.io": ("whenever", "Marketing > Cold Email"),
    "Map out full client delivery process for paid ads offer": ("whenever", "Systems"),
    "Set up onboarding system for agency paid ads clients": ("whenever", "Systems"),
    "Update Airtable to support paid ads client tracking": ("whenever", "Systems"),
    "Map out weekly marketing metrics dashboard": ("whenever", "Systems"),
    "Create sales process + pitch deck for agency clients": ("whenever", "Sales"),
    "Create sales process + pitch deck for SaaS clients": ("whenever", "Sales"),
    "Set up daily Twitter posting system": ("whenever", "Content"),
    "Book call with Starborn.ai about LinkedIn content management": ("whenever", "Content"),
    "Book calls with other LinkedIn content agencies": ("whenever", "Content"),
    "Launch YouTube channel (3 videos/week — SaaS GTM content)": ("whenever", "Content"),
    "Film new video for STR application (LinkedIn recruitment)": ("whenever", "Hiring"),
    "Update Gamma doc with LinkedIn applicant tracking": ("whenever", "Hiring"),
}


def fetch_tasks():
    req = urllib.request.Request(f"{API_BASE}?status=active")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def patch_task(task_id: str, urgency: str, category: str):
    payload = json.dumps({"urgency": urgency, "category": category}).encode()
    req = urllib.request.Request(
        f"{API_BASE}/{task_id}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="PUT",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main():
    print("Fetching tasks from API...")
    tasks = fetch_tasks()
    print(f"Found {len(tasks)} active tasks\n")

    matched = 0
    skipped = 0
    failed = []

    for task in tasks:
        title = task.get("title", "")
        if title not in TASK_META:
            skipped += 1
            continue

        urgency, category = TASK_META[title]
        current_urgency = task.get("urgency", "whenever")
        current_category = task.get("category")

        if current_urgency == urgency and current_category == category:
            print(f"  ✓ Already correct: {title[:55]}")
            matched += 1
            continue

        try:
            patch_task(task["id"], urgency, category)
            icon = {"today": "🔴", "this_week": "🟡", "whenever": "⚪"}.get(urgency, "⚪")
            print(f"  {icon} Patched [{urgency:9}] {title[:50]}")
            matched += 1
            time.sleep(0.2)
        except Exception as e:
            print(f"  ❌ FAILED: {title[:50]} — {e}")
            failed.append(title)

    print(f"\n✅ {matched} patched | {skipped} skipped (not our tasks) | {len(failed)} failed")
    if failed:
        print("\nFailed:")
        for t in failed: print(f"  - {t}")


if __name__ == "__main__":
    main()
