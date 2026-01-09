import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Civic Voices - Insights from billions of public conversations'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

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
          backgroundColor: '#f9fafb',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '48px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '24px',
              fontWeight: 700,
            }}
          >
            CV
          </div>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: '#111827',
            }}
          >
            Civic Voices
          </span>
        </div>

        {/* Main Heading */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.1,
              margin: 0,
              marginBottom: '16px',
            }}
          >
            Insights from billions of
          </h1>
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: '#9ca3af',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            public conversations
          </h1>
        </div>

        {/* Platform Icons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginTop: '48px',
            marginBottom: '40px',
          }}
        >
          {/* X */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '20px',
              fontWeight: 700,
            }}
          >
            X
          </div>
          {/* TikTok */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            TT
          </div>
          {/* YouTube */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            YT
          </div>
          {/* Reddit */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#f97316',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            R
          </div>
          {/* LinkedIn */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            in
          </div>
        </div>

        {/* Search Input Mock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '16px 24px',
            width: '500px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <span
            style={{
              color: '#9ca3af',
              fontSize: '18px',
              flex: 1,
            }}
          >
            Search a topic or paste a URL
          </span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '18px',
            }}
          >
            →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
