import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export const alt = 'Civic Voices - Social listening for cities'
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
          backgroundColor: '#1c1917',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
            backgroundColor: '#292524',
            padding: '8px 16px',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#fafaf9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1c1917',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            CV
          </div>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#a8a29e',
              letterSpacing: '0.1em',
            }}
          >
            SOCIAL LISTENING FOR CITIES
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
              fontSize: '72px',
              fontWeight: 700,
              color: '#fafaf9',
              lineHeight: 1.1,
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Understand resident
          </h1>
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#fafaf9',
              lineHeight: 1.1,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            sentiment{' '}
            <span style={{ fontStyle: 'italic', color: '#a8a29e' }}>in real time</span>
            <span style={{ color: '#dc2626' }}>.</span>
          </h1>
        </div>

        {/* Platform Icons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginTop: '48px',
          }}
        >
          {/* X */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#44403c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          {/* TikTok */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#44403c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
            </svg>
          </div>
          {/* YouTube */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#44403c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          {/* Bluesky */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#44403c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 600 530" fill="white">
              <path d="m135.72 44.03c66.496 49.921 138.02 151.14 164.28 205.46 26.262-54.316 97.782-155.54 164.28-205.46 47.98-36.021 125.72-63.892 125.72 24.795 0 17.712-10.155 148.79-16.111 170.07-20.703 73.984-96.144 92.854-163.25 81.433 117.3 19.964 147.14 86.092 82.697 152.22-122.39 125.59-175.91-31.511-189.63-71.766-2.514-7.3797-3.6904-10.832-3.7077-7.8964-0.0174-2.9357-1.1937 0.51669-3.7077 7.8964-13.714 40.255-67.233 197.36-189.63 71.766-64.444-66.128-34.605-132.26 82.697-152.22-67.108 11.421-142.55-7.4491-163.25-81.433-5.9562-21.282-16.111-152.36-16.111-170.07 0-88.687 77.742-60.816 125.72-24.795z" />
            </svg>
          </div>
        </div>

        {/* Subtext */}
        <p
          style={{
            fontSize: '20px',
            color: '#78716c',
            marginTop: '40px',
            textAlign: 'center',
          }}
        >
          Search what residents are saying across X, TikTok, YouTube, and more.
        </p>
      </div>
    ),
    {
      ...size,
    }
  )
}
