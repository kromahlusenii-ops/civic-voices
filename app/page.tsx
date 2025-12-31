import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col justify-center">
              <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Turn community insight chaos{" "}
                <span className="text-coral-500">into clarity</span>
              </h1>
              <p className="mt-6 text-xl text-gray-300">
                Get real-time insights from civic conversations across social
                platforms and community forums.
              </p>
              <p className="mt-4 text-lg text-gray-400">
                Is your community actually for or against your initiative?
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="rounded-md bg-white px-8 py-3 text-center text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
                  data-testid="hero-cta-signup"
                >
                  Try for free
                </Link>
                <Link
                  href="/login"
                  className="rounded-md border-2 border-white px-8 py-3 text-center text-base font-semibold text-white hover:bg-white hover:text-gray-900"
                >
                  Log in
                </Link>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute right-0 top-0 h-96 w-96 rounded-2xl bg-gradient-to-br from-coral-500 to-teal-500 opacity-20 blur-3xl" />
              <div className="relative space-y-4">
                <div className="rounded-xl bg-gray-800 p-6 shadow-2xl">
                  <div className="h-48 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-32 rounded-xl bg-gray-800" />
                  <div className="h-32 rounded-xl bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Credibility */}
      <section className="border-b bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-500">
            Used by founders, marketers, and civic leaders from
          </p>
          <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-4">
            {[
              "Civic Org",
              "Tech Nonprofit",
              "Policy Lab",
              "Community Fund",
              "Product Hunt",
              "Civic Tech",
              "Partner",
              "StartupHub",
            ].map((name) => (
              <div
                key={name}
                className="col-span-1 flex justify-center rounded-lg bg-gray-50 p-4"
              >
                <div className="text-center text-sm font-medium text-gray-400">
                  {name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-50 py-24" data-testid="use-cases-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Build insights that resonate with your community
            </h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Startup Founders",
                subtitle: "Market Validation",
                description:
                  "Understand if your civic product or idea resonates before launch.",
                metric: "304k conversations analyzed",
              },
              {
                title: "Marketers",
                subtitle: "Audience Intelligence",
                description:
                  "Segment civic-minded audiences by values, interests, and engagement.",
                metric: "16.7k engagements tracked",
              },
              {
                title: "Civic Leaders",
                subtitle: "Policy Sensing",
                description:
                  "Identify community needs and sentiment around initiatives.",
                metric: "89% sentiment accuracy",
              },
            ].map((useCase) => (
              <div
                key={useCase.title}
                className="rounded-2xl bg-white p-8 shadow-lg"
                data-testid="use-case-card"
              >
                <h3 className="text-xl font-bold text-gray-900">
                  {useCase.title}
                </h3>
                <p className="mt-1 text-sm font-medium text-coral-600">
                  {useCase.subtitle}
                </p>
                <p className="mt-4 text-gray-600">{useCase.description}</p>
                <div className="mt-6 h-32 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50" />
                <p className="mt-4 text-sm font-medium text-gray-500">
                  {useCase.metric}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2">
            {[
              {
                title: "Market Insights & Needs Detection",
                subtitle: "Analyze what people are actually saying",
                description:
                  "Uncover pain points and unmet needs from real conversations.",
              },
              {
                title: "Audience Segmentation",
                subtitle: "Understand who cares about what",
                description:
                  "Segment audiences by demographics, interests, and engagement patterns.",
              },
              {
                title: "Sentiment & Emotion Analysis",
                subtitle: "Go beyond positive vs negative",
                description:
                  "Track nuanced emotions like fear, surprise, and hope in community discourse.",
              },
              {
                title: "Narrative Tracking",
                subtitle: "Monitor stories that matter",
                description:
                  "Follow evolving narratives and trending topics in real-time.",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex flex-col">
                <h3 className="text-2xl font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-lg font-medium text-teal-600">
                  {feature.subtitle}
                </p>
                <p className="mt-4 text-gray-600">{feature.description}</p>
                <div className="mt-6 h-48 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 shadow-inner" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              How It Works
            </h2>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Search a topic or community",
                description:
                  "Enter keywords, hashtags, or select specific communities to analyze.",
              },
              {
                step: "2",
                title: "Analyze conversations",
                description:
                  "Our AI processes thousands of discussions to extract meaningful patterns.",
              },
              {
                step: "3",
                title: "Get actionable insights",
                description:
                  "Receive clear reports with verified quotes and data-driven recommendations.",
              },
            ].map((step) => (
              <div key={step.step} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-coral-500 text-2xl font-bold text-white">
                  {step.step}
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-4 text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              People say
            </h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                quote:
                  "Civic Voices helped us validate our product direction before investing in development. The insights were invaluable.",
                name: "Sarah Chen",
                title: "Founder",
                org: "Community Platform",
              },
              {
                quote:
                  "We reduced our campaign research time by 70% and increased engagement by understanding what truly matters to our audience.",
                name: "Marcus Johnson",
                title: "Marketing Director",
                org: "Social Impact Org",
              },
              {
                quote:
                  "Finally, a tool that helps us understand community sentiment on policy initiatives in real-time.",
                name: "Dr. Aisha Patel",
                title: "Policy Director",
                org: "City Council",
              },
            ].map((testimonial, i) => (
              <div
                key={i}
                className="rounded-2xl bg-gray-800 p-8 shadow-xl"
              >
                <p className="text-lg text-gray-300">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="mt-6">
                  <p className="font-bold">{testimonial.name}</p>
                  <p className="text-sm text-gray-400">
                    {testimonial.title}, {testimonial.org}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                features: [
                  "100 conversations/month",
                  "Basic sentiment analysis",
                  "Community access",
                ],
              },
              {
                name: "Pro",
                price: "$49",
                features: [
                  "10k conversations/month",
                  "Advanced analytics",
                  "Export reports",
                  "API access",
                ],
                highlighted: true,
              },
              {
                name: "Team",
                price: "$199",
                features: [
                  "Unlimited conversations",
                  "Team collaboration",
                  "Priority support",
                  "Custom integrations",
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-gray-900 text-white shadow-2xl"
                    : "bg-white shadow-lg"
                }`}
              >
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-4 flex items-baseline">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="ml-2 text-gray-500">/month</span>
                </p>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <svg
                        className="h-5 w-5 text-teal-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block rounded-md px-6 py-3 text-center font-semibold ${
                    plan.highlighted
                      ? "bg-white text-gray-900 hover:bg-gray-100"
                      : "bg-gray-900 text-white hover:bg-gray-700"
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="bg-gray-900 py-24 text-white"
        data-testid="final-cta-section"
      >
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Ready to understand your community better?
          </h2>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-md bg-white px-8 py-3 text-center text-base font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
              data-testid="final-cta-signup"
            >
              Try for free
            </Link>
            <button className="rounded-md border-2 border-white px-8 py-3 text-base font-semibold text-white hover:bg-white hover:text-gray-900">
              Schedule a demo
            </button>
          </div>
          <p className="mt-6 text-sm text-gray-400">
            No credit card required. See results in minutes.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-lg font-bold text-white">Civic Voices</h3>
              <p className="mt-4 text-sm">
                Turn community insight chaos into clarity.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white">Product</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Docs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white">Company</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white">Legal</h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 Civic Voices. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
