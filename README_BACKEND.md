
# Sukoon AI Backend - Final Implementation

This folder contains the SQL scripts required to set up the complete backend on Supabase.

## Instructions

1.  **Open Supabase**: Go to your project dashboard.
2.  **SQL Editor**: Navigate to the SQL Editor tab.
3.  **Run Schema (Core)**: Copy `supabase/schema.sql` (if you haven't already) and run it. This sets up the core users and chat.
4.  **Run Schema (Finance & Ops)**: **CRITICAL**: Run `supabase/finance_schema.sql`. This creates the `marketing_expenses`, `wallet_transactions`, and other missing tables that were causing 404 errors in the Admin Dashboard.
5.  **Run Seed**: Copy `supabase/seed.sql` and run it to populate test data.
6.  **Restart App**: The frontend is already wired to use these tables in `services/dataService.ts`.

## Key Features
*   **Guest Handling**: Guests IDs are handled gracefully; data is stored with `NULL` `user_id` or separate tracking.
*   **Admin API**: `get_admin_overview` RPC function provides fast analytics.
*   **Security**: RLS policies ensure data privacy.
