import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
  : 'http://localhost:3000/api/auth/gmail/callback';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
      return NextResponse.json(
        { error: 'Credenciales de Gmail no configuradas. Configura GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET en las variables de entorno.' },
        { status: 500 }
      );
    }

    // Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      REDIRECT_URI
    );

    // Scopes necesarios para Gmail
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels'
    ];

    // Generar URL de autorización
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: Buffer.from(JSON.stringify({ email })).toString('base64')
    });

    return NextResponse.json({ authUrl });
  } catch (error: unknown) {
    console.error('Error al iniciar OAuth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al iniciar OAuth';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
