
# Sakoon AI Backend - Final Implementation

This folder contains the SQL scripts required to set up the complete backend on Supabase.

## Instructions

1.  **Open Supabase**: Go to your project dashboard.
2.  **SQL Editor**: Navigate to the SQL Editor tab.
3.  **Run Schema**: Copy the entire content of `supabase/schema.sql` and run it. This creates all tables (`users`, `therapists`, `feedback`, `emergencies` etc.) and policies.
    *   *Note*: The schema uses `public.users` to link to `auth.users` to avoid permission issues with system tables.
4.  **Run Seed**: Copy `supabase/seed.sql` and run it to populate test data.
5.  **Restart App**: The frontend is already wired to use these tables in `services/dataService.ts`.

## Key Features
*   **Guest Handling**: Guests IDs are handled gracefully; data is stored with `NULL` `user_id` or separate tracking.
*   **Admin API**: `get_admin_overview` RPC function provides fast analytics.
*   **Security**: RLS policies ensure data privacy.
