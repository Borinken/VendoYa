const readline = require('readline');
const { google } = require('googleapis');

// PASO 1: Configura tus credenciales de Google Cloud
console.log('🔑 CONFIGURACIÓN DE GMAIL OAUTH\n');
console.log('Necesitas Client ID y Client Secret de Google Cloud Console');
console.log('URL: https://console.cloud.google.com/apis/credentials\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function obtenerToken() {
  try {
    // Solicitar credenciales
    const clientId = await pregunta('Client ID: ');
    const clientSecret = await pregunta('Client Secret: ');
    
    // Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      clientId.trim(),
      clientSecret.trim(),
      'http://localhost:3000/api/auth/gmail/callback'
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
      prompt: 'consent'
    });
    
    console.log('\n📋 PASOS:\n');
    console.log('1. Abre esta URL en tu navegador:\n');
    console.log(authUrl);
    console.log('\n2. Inicia sesión con tu Gmail');
    console.log('3. Acepta los permisos');
    console.log('4. Copia el código que aparece\n');
    
    const code = await pregunta('Pega el código aquí: ');
    
    // Intercambiar código por tokens
    console.log('\n🔄 Obteniendo tokens...');
    const { tokens } = await oauth2Client.getToken(code.trim());
    
    console.log('\n✅ ¡Token obtenido exitosamente!\n');
    console.log('📋 GUARDA ESTOS VALORES:\n');
    console.log('Access Token:', tokens.access_token);
    if (tokens.refresh_token) {
      console.log('Refresh Token:', tokens.refresh_token);
    }
    console.log('Expira en:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'N/A');
    
    console.log('\n💾 Guardando en .env.local...');
    const fs = require('fs');
    const envPath = '/Users/LeslyHector/vendoya-crm/.env.local';
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Agregar o actualizar variables
    const newVars = [
      `GMAIL_CLIENT_ID="${clientId.trim()}"`,
      `GMAIL_CLIENT_SECRET="${clientSecret.trim()}"`,
      `GMAIL_ACCESS_TOKEN="${tokens.access_token}"`,
      tokens.refresh_token ? `GMAIL_REFRESH_TOKEN="${tokens.refresh_token}"` : null
    ].filter(Boolean);
    
    // Eliminar variables antiguas si existen
    envContent = envContent.split('\n')
      .filter(line => !line.startsWith('GMAIL_'))
      .join('\n');
    
    // Agregar nuevas variables
    envContent += '\n\n# Gmail OAuth\n' + newVars.join('\n') + '\n';
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Variables guardadas en .env.local\n');
    
    console.log('🎉 ¡Todo listo! Ahora puedes sincronizar emails automáticamente.\n');
    console.log('Prueba con:\n');
    console.log('curl -X POST http://localhost:3000/api/email/sync \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log(`  -d '{"accessToken": "${tokens.access_token}", "email": "tu@gmail.com"}'`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Verifica que:');
    console.log('  1. Client ID y Secret sean correctos');
    console.log('  2. Gmail API esté activada en Google Cloud');
    console.log('  3. OAuth Consent Screen esté configurado');
    console.log('  4. Tu email esté en la lista de Test Users');
  } finally {
    rl.close();
  }
}

// Verificar que googleapis esté instalado
try {
  require('googleapis');
  obtenerToken();
} catch (error) {
  console.log('⚠️  googleapis no está instalado\n');
  console.log('Instalando dependencias...\n');
  const { execSync } = require('child_process');
  execSync('npm install googleapis', { stdio: 'inherit' });
  console.log('\n✅ Dependencias instaladas. Ejecuta el script nuevamente:\n');
  console.log('node obtener-gmail-token.js\n');
  process.exit(0);
}
