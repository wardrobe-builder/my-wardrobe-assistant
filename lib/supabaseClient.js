// lib/supabaseClient.js
'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()

export default supabase