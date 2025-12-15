import { ImageResponse } from 'next/og';
import { APP_NAME } from '@meble/constants';

export const runtime = 'edge';

export const alt = `${APP_NAME} - Płatności i Subskrypcje`;
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
          backgroundColor: '#0f172a',
          backgroundImage: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
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
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: 'white',
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
          }}
        >
          Płatności i Subskrypcje
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: '80%',
            textAlign: 'center',
          }}
        >
          Bezpieczne płatności online • Zarządzaj kredytami eksportowymi
        </div>

        {/* Security badges */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: '20px',
          }}
        >
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(102, 126, 234, 0.2)',
              border: '1px solid rgba(102, 126, 234, 0.5)',
              color: '#667eea',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            🔒 SSL Secured
          </div>
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              color: '#10b981',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            ✓ Przelewy24 / PayU
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
