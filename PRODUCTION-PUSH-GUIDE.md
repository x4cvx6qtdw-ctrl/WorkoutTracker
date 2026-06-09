# 🦾 Training Tracker — Production Push Guide

## Data Protection Rules

These rules are **non-negotiable**. Breaking them will corrupt or orphan user data.

### Rule 1: Never change workout IDs for programs with logged data
- Production data is keyed to workout IDs: `back`, `quads`, `chest`, `rest`, `hams`, `shoulders`, `arms`
- The `workout_sets` table stores: `user_id + workout_id + exercise_index + set_index + week`
- Changing a workout ID means all logged weights become invisible
- **If you need a new program structure, create a new program** — don't modify the existing one

### Rule 2: Never reorder exercises in a program with logged data
- Exercises are stored by `exercise_index` (position number 0, 1, 2, ...)
- Swapping exercise order moves logged weights to the wrong exercise
- **If you need a different order, create a new program and assign it to users**

### Rule 3: Never reduce the week count below what users have logged
- Body weights and workout sets reference `week` by number (0-11)
- Reducing weeks hides data beyond the new limit

### Rule 4: Always backup before pushing
- Run `backup_production.py` before every push
- Verify the backup file has the expected row counts
- Keep backups for at least 30 days

### Rule 5: Never drop or rename database columns
- Use `ALTER TABLE ... ADD COLUMN` only
- If a column is no longer needed, leave it — don't drop it

---

## Pre-Push Checklist

Run through this checklist **every time** before pushing to production.

### Before You Start
- [ ] Run `backup_production.py` and verify output
- [ ] Note current user count and data row counts
- [ ] Test the change on dev environment first
- [ ] Confirm dev is stable (no console errors)

### Code Review
- [ ] No workout IDs changed for existing programs
- [ ] No exercise reordering in programs with logged data
- [ ] No hardcoded dev Supabase URLs or keys in the file
- [ ] Admin UID matches production: `f815eed6-f723-4658-81af-77528378361b`
- [ ] Supabase URL matches production: `uvbwwtbznowfhasqfbld.supabase.co`
- [ ] Supabase anon key matches production (starts with `eyJ...YmxkIiwi...`)
- [ ] Version number updated in the footer
- [ ] Title does NOT contain `[DEV]`

### Database (if SQL changes are needed)
- [ ] SQL uses `CREATE TABLE IF NOT EXISTS` (not bare `CREATE TABLE`)
- [ ] SQL uses `ADD COLUMN IF NOT EXISTS` (not bare `ADD COLUMN`)
- [ ] SQL uses `CREATE POLICY ... ON ... FOR ...` with unique names
- [ ] RLS policies reference production admin UID
- [ ] Grants include `authenticated`, `anon`, and `service_role`
- [ ] Test SQL on dev first before running on production

### After Push
- [ ] Hard refresh the production site and verify login works
- [ ] Check browser console for errors (should be zero)
- [ ] Log in as admin — verify dashboard loads
- [ ] Log in as a test user — verify their data still shows
- [ ] Verify version footer shows correct version
- [ ] Spot-check: open a workout, confirm exercise order and logged weights are correct

---

## Version History

| Version | Description | Date | Status |
|---------|------------|------|--------|
| v1.0.0 | Initial release — full workout tracker | — | ✅ Live |
| v1.1.0 | Exercise images for all 37 exercises | — | 📦 Ready to push |
| v1.2.0 | Dynamic programs + user assignment | — | 🧪 Dev only |
| v1.3.0 | Program builder + image URLs in builder | — | 🧪 Dev only |

---

## Push Order (Recommended)

### Push 1: v1.1.0 — Exercise Images ✅ Safe
- **Changes:** Exercise thumbnails, version footer
- **DB changes:** None
- **Data risk:** None — purely visual, no data flow changes
- **Rollback:** Remove image_url from exercises, revert card template

### Push 2: v1.2.0 — Dynamic Programs ⚠️ Medium Risk
- **Changes:** `const WORKOUTS` → `let WORKOUTS`, loadUserProgram(), program assignment dropdown
- **DB changes:** New tables (workout_programs, program_days, program_exercises), program_id column on profiles
- **Data risk:** LOW if done correctly:
  - Users without a `program_id` keep using hardcoded WORKOUTS with string IDs
  - Their data is untouched — same workout_id keys
  - Only users explicitly assigned a DB program switch to UUID-based IDs
  - Existing data stays under old IDs (not lost, just separate from new program)
- **Critical:** Do NOT auto-assign the DB program to existing users. Let them keep the default until you're ready to migrate.
- **Rollback:** Remove loadUserProgram(), revert WORKOUTS to const

### Push 3: v1.3.0 — Program Builder ⚠️ Medium Risk
- **Changes:** Full program builder UI, exercise image URL editor
- **DB changes:** image_url column on program_exercises
- **Data risk:** LOW — admin-only feature, doesn't touch user workout data
- **Rollback:** Remove builder overlay and JS functions

---

## Supabase Credentials

### Production
- URL: `https://uvbwwtbznowfhasqfbld.supabase.co`
- Admin UID: `f815eed6-f723-4658-81af-77528378361b`

### Dev
- URL: `https://gsxnvhnmbaicszvfgxnl.supabase.co`
- Admin UID: `2ae20d9d-bb13-4f41-ad23-e9ceccb5496d`

---

## Quick Verification Commands

Check production data counts (run in any terminal with curl):

```bash
SERVICE_KEY="YOUR_SERVICE_ROLE_KEY"
URL="https://uvbwwtbznowfhasqfbld.supabase.co"

echo "Profiles:"
curl -s "$URL/rest/v1/profiles?select=count" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Prefer: count=exact" -I | grep content-range

echo "Workout sets:"
curl -s "$URL/rest/v1/workout_sets?select=count" -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" -H "Prefer: count=exact" -I | grep content-range
```
