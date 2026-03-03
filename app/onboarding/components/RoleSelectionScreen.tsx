/**
 * Onboarding Role Selection Screen
 * Editorial newspaper aesthetic matching home page
 */

'use client'

interface RoleSelectionScreenProps {
  selectedRole: string | null
  onSelectRole: (role: string) => void
  onContinue: () => void
}

const ROLES = [
  {
    id: 'govt-comms',
    title: 'Government',
    subtitle: 'Public sector officials and staff',
    icon: '🏛️',
  },
  {
    id: 'journalist',
    title: 'Media',
    subtitle: 'Journalists and content creators',
    icon: '📰',
  },
  {
    id: 'nonprofit',
    title: 'Nonprofit',
    subtitle: 'Advocacy and community organizations',
    icon: '🤝',
  },
  {
    id: 'researcher',
    title: 'Research',
    subtitle: 'Academics and policy analysts',
    icon: '🔬',
  },
  {
    id: 'brand-marketer',
    title: 'Business',
    subtitle: 'Marketing and communications professionals',
    icon: '📊',
  },
  {
    id: 'exploring',
    title: 'Exploring',
    subtitle: 'Just browsing civic intelligence',
    icon: '🔍',
  },
]

export default function RoleSelectionScreen({
  selectedRole,
  onSelectRole,
  onContinue,
}: RoleSelectionScreenProps) {
  return (
    <div className="min-h-screen bg-stone-50 grain relative">
      {/* Newspaper-style header */}
      <div className="relative z-10 border-b-4 border-stone-900 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="text-center border-b-2 border-stone-300 pb-6 mb-6">
            <h1 className="font-display text-5xl md:text-6xl text-stone-900 mb-2 tracking-tight">
              CIVIC VOICES
            </h1>
            <p className="font-mono text-[10px] text-stone-500 tracking-[0.2em] uppercase">
              Est. 2026 • Real-Time Social Intelligence
            </p>
          </div>
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl text-stone-900 mb-3">
              Welcome Aboard
            </h2>
            <p className="font-mono text-xs text-stone-600 tracking-wide uppercase">
              Select Your Role to Begin
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        {/* Simple instruction */}
        <p className="text-center font-mono text-xs text-stone-600 mb-8 tracking-wide">
          SELECT ONE OPTION TO CONTINUE
        </p>

        {/* Role Grid - Clean 2-column layout */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.id

            return (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                className={`relative p-6 border-2 transition-all text-left ${
                  isSelected
                    ? 'border-red-600 bg-red-50 shadow-lg'
                    : 'border-stone-900 bg-white hover:bg-stone-50 hover:shadow-md'
                }`}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <span className="text-4xl">{role.icon}</span>
                  <div>
                    <h4 className="font-mono text-base font-bold text-stone-900 tracking-wide mb-2">
                      {role.title.toUpperCase()}
                    </h4>
                    <p className="font-mono text-[11px] text-stone-600 leading-relaxed">
                      {role.subtitle}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Continue Button - Editorial CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={onContinue}
            disabled={!selectedRole}
            className="px-12 py-4 bg-stone-900 hover:bg-red-600 disabled:bg-stone-300 text-white font-mono text-sm font-bold tracking-[0.15em] uppercase transition-colors disabled:cursor-not-allowed"
          >
            {selectedRole ? 'Continue →' : 'Select Role First'}
          </button>
        </div>
      </div>
    </div>
  )
}
