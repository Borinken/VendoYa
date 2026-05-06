import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
  : 'http://localhost:3000/api/auth/gmail/callback';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head><title>Error - Gmail OAuth</title></head>
          <body>
            <h1>Error al conectar Gmail</h1>
            <p>${error}</p>
            <script>
              window.opener?.postMessage({ type: 'gmail-auth-error', error: '${error}' }, '*');
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
        `,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Código o estado inválido' },
        { status: 400 }
      );
    }

    // Decodificar state para obtener el email
    const { email } = JSON.parse(Buffer.from(state, 'base64').toString());

    // Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      REDIRECT_URI
    );

    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(code);

    // Guardar en Supabase
    const credentials = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
      scope: tokens.scope
    };

    const { error: dbError } = await supabase
      .from('email_accounts')
      .upsert({
        email,
        provider: 'gmail',
        credentials,
        active: true,
        last_check: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Error al guardar en base de datos: ${dbError.message}`);
    }

    // Página de éxito con cierre automático
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Gmail Conectado</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
              max-width: 400px;
            }
            .success-icon {
              width: 80px;
              height: 80px;
              margin: 0 auto 1.5rem;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 3rem;
            }
            h1 { color: #1f2937; margin: 0 0 1rem; font-size: 1.5rem; }
            p { color: #6b7280; margin: 0 0 0.5rem; }
            .email { font-weight: 600; color: #667eea; }
            .countdown { color: #9ca3af; font-size: 0.875rem; margin-top: 1.5rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✓</div>
            <h1>¡Gmail Conectado!</h1>
            <p>La cuenta <span class="email">${email}</span> se conectó exitosamente.</p>
            <p>Ya puedes recibir leads automáticamente.</p>
            <p class="countdown">Esta ventana se cerrará en <span id="counter">3</span> segundos...</p>
          </div>
          <script>
            let counter = 3;
            const counterEl = document.getElementById('counter');
            const interval = setInterval(() => {
              counter--;
              counterEl.textContent = counter;
              if (counter <= 0) {
                clearInterval(interval);
                window.opener?.postMessage({ type: 'gmail-auth-success', email: '${email}' }, '*');
                window.close();
              }
            }, 1000);
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error: unknown) {
    console.error('Error en callback OAuth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head><title>Error - Gmail OAuth</title></head>
        <body>
          <h1>Error al conectar Gmail</h1>
          <p>${errorMessage}</p>
          <script>
            window.opener?.postMessage({ type: 'gmail-auth-error', error: '${errorMessage}' }, '*');
            setTimeout(() => window.close(), 5000);
          </script>
        </body>
      </html>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
