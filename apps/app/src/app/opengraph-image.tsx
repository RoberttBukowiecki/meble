import { ImageResponse } from 'next/og';
import { APP_NAME } from '@meble/constants';

export const runtime = 'edge';

export const alt = `${APP_NAME} - Konfigurator Mebli 3D`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        {/* Logo container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 40,
            padding: 40,
            borderRadius: 24,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: '#1a1a2e',
              display: 'flex',
              gap: '8px',
            }}
          >
            <span style={{ color: '#667eea' }}>e</span>
            <span>-meble</span>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 600,
            color: 'white',
            marginBottom: 20,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          Konfigurator Mebli 3D
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '80%',
            textAlign: 'center',
            textShadow: '0 1px 5px rgba(0,0,0,0.2)',
          }}
        >
          Projektuj meble na wymiar • Eksportuj listy cięć • Oszczędź do 50%
        </div>

        {/* CTA Button */}
        <div
          style={{
            marginTop: 40,
            padding: '16px 40px',
            backgroundColor: 'white',
            color: '#667eea',
            borderRadius: 50,
            fontSize: 24,
            fontWeight: 700,
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          }}
        >
          Zacznij za darmo
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
