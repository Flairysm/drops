import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { method, url } = req
    const urlPath = new URL(url).pathname

    // Route handling
    if (method === 'GET' && (urlPath === '/health' || urlPath === '/api/health')) {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          message: 'Supabase Edge Function is running!'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (method === 'POST' && (urlPath === '/auth/login' || urlPath === '/api/auth/login')) {
      const { email, password } = await req.json()
      
      // Authenticate with Supabase
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: data.user,
          session: data.session 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (method === 'POST' && (urlPath === '/auth/register' || urlPath === '/api/auth/register')) {
      const { email, password, username } = await req.json()
      
      // Register with Supabase
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username
          }
        }
      })

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: data.user 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Get user endpoint - Handle both authenticated and unauthenticated requests
    if (method === 'GET' && (urlPath === '/auth/user' || urlPath === '/api/auth/user')) {
      const authHeader = req.headers.get('authorization')
      
      // If no authorization header, return null (user not authenticated)
      if (!authHeader) {
        return new Response(
          JSON.stringify(null),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      // Create Supabase client with service role key for user verification
      const supabaseServiceClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )

      const { data, error } = await supabaseServiceClient.auth.getUser(authHeader.replace('Bearer ', ''))
      
      if (error) {
        return new Response(
          JSON.stringify(null),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          id: data.user.id,
          email: data.user.email,
          username: data.user.user_metadata?.username || data.user.email
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Default response
    return new Response(
      JSON.stringify({ error: 'Not found', path: urlPath }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
