import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wlawfnhyhtjlddzvflyz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsYXdmbmh5aHRqbGRkenZmbHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMDc0NjAsImV4cCI6MjA4MDc4MzQ2MH0.lMPKotIXdPDtMAIltSdcDPkEHVZ9Db3KsaeFYv1jt5c';

export const supabase = createClient(supabaseUrl, supabaseKey);