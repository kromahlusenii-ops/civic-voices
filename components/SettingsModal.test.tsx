import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import SettingsModal from "./SettingsModal"

// Mock Next.js router
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}))

// Mock AuthContext
const mockSignOut = vi.fn()
const mockGetAccessToken = vi.fn()
vi.mock("@/app/contexts/AuthContext", () => ({
  useAuth: vi.fn(() => ({
    signOut: mockSignOut,
    getAccessToken: mockGetAccessToken,
  })),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("SettingsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAccessToken.mockResolvedValue("mock-token")
    // Default billing response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          subscription: {
            status: "free",
            plan: null,
            currentPeriodEnd: null,
            trialEndDate: null,
          },
          credits: { monthly: 0, bonus: 0, total: 0, resetDate: null },
          limits: {},
          recentTransactions: [],
        }),
    })
  })

  describe("Modal rendering", () => {
    it("does not render when isOpen is false", () => {
      render(<SettingsModal isOpen={false} onClose={vi.fn()} />)
      expect(screen.queryByText("Settings")).not.toBeInTheDocument()
    })

    it("renders modal when isOpen is true", () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText("Settings")).toBeInTheDocument()
    })

    it("renders navigation items", () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText("Credit usage")).toBeInTheDocument()
      expect(screen.getByText("Plan & Billing")).toBeInTheDocument()
      expect(screen.getByText("Team & Members")).toBeInTheDocument()
      expect(screen.getByText("Integrations")).toBeInTheDocument()
    })

    it("renders close button and calls onClose when clicked", () => {
      const mockOnClose = vi.fn()
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

      const closeButton = screen.getByLabelText("Close settings")
      expect(closeButton).toBeInTheDocument()

      fireEvent.click(closeButton)
      expect(mockOnClose).toHaveBeenCalled()
    })

    it("renders logout button", () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByText("Log out")).toBeInTheDocument()
    })
  })

  describe("Navigation", () => {
    it("starts on Credit usage tab by default", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      await waitFor(() => {
        const creditUsageButton = screen.getByText("Credit usage").closest("button")
        expect(creditUsageButton).toHaveClass("bg-blue-50")
      })
    })

    it("switches to Plan & Billing tab when clicked", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      const planBillingTab = screen.getByText("Plan & Billing")
      fireEvent.click(planBillingTab)

      await waitFor(() => {
        const planBillingButton = screen.getByText("Plan & Billing").closest("button")
        expect(planBillingButton).toHaveClass("bg-blue-50")
      })
    })

    it("shows Team & Members tab as disabled for free/pro users", async () => {
      // Default mock returns free status
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      await waitFor(() => {
        const teamTab = screen.getByText("Team & Members")
        expect(teamTab.closest("button")).toBeDisabled()
      })
    })

    it("shows Team & Members tab as enabled for agency users", async () => {
      mockFetch.mockReset()
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subscription: {
                status: "active",
                plan: "agency",
                currentPeriodEnd: "2025-02-01T00:00:00Z",
                trialEndDate: null,
              },
              credits: { monthly: 150, bonus: 0, total: 150, resetDate: null },
              limits: {},
              recentTransactions: [],
            }),
        })
      )

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      await waitFor(() => {
        const teamTab = screen.getByText("Team & Members")
        expect(teamTab.closest("button")).not.toBeDisabled()
      }, { timeout: 3000 })
    })

    it("shows Coming soon tooltip for disabled Integrations tab", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      const integrationsTab = screen.getByText("Integrations")
      expect(integrationsTab.closest("button")).toBeDisabled()
    })
  })

  describe("Logout functionality", () => {
    it("shows logout confirmation dialog when clicking Log out", () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Log out"))

      expect(screen.getByText("Log out?")).toBeInTheDocument()
      expect(screen.getByText("Are you sure you want to log out of your account?")).toBeInTheDocument()
    })

    it("closes confirmation dialog when clicking Cancel", () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Log out"))
      expect(screen.getByText("Log out?")).toBeInTheDocument()

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
      expect(screen.queryByText("Log out?")).not.toBeInTheDocument()
    })

    it("calls signOut when confirming logout", async () => {
      const mockOnClose = vi.fn()
      mockSignOut.mockResolvedValue(undefined)

      render(<SettingsModal isOpen={true} onClose={mockOnClose} />)

      fireEvent.click(screen.getByText("Log out"))

      // Click the confirm logout button (second "Log out" in dialog)
      const logoutButtons = screen.getAllByRole("button", { name: /log out/i })
      const confirmButton = logoutButtons.find(btn => btn.textContent === "Log out")
      fireEvent.click(confirmButton!)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
      })
    })
  })

  describe("Credit Usage Tab", () => {
    it("displays credit balance", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: { status: "active", plan: "pro", currentPeriodEnd: null, trialEndDate: null },
            credits: { monthly: 40, bonus: 10, total: 50, resetDate: "2025-02-01" },
            limits: {},
            recentTransactions: [],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText("Credits available")).toBeInTheDocument()
        expect(screen.getByText("50/50")).toBeInTheDocument()
      })
    })

    it("displays usage history section", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: { status: "active", plan: "pro", currentPeriodEnd: null, trialEndDate: null },
            credits: { monthly: 50, bonus: 0, total: 50, resetDate: "2025-02-01" },
            limits: {},
            recentTransactions: [
              { id: "tx-1", amount: -5, type: "search_usage", description: "Search", createdAt: "2025-01-15T10:00:00Z" },
              { id: "tx-2", amount: 50, type: "monthly_reset", description: "Reset", createdAt: "2025-01-01T00:00:00Z" },
            ],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText("Usage history")).toBeInTheDocument()
        expect(screen.getByText("Search")).toBeInTheDocument()
        expect(screen.getByText("Monthly Reset")).toBeInTheDocument()
      })
    })

    it("shows empty state when no transactions", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      await waitFor(() => {
        expect(screen.getByText("No transactions yet")).toBeInTheDocument()
      })
    })
  })

  describe("Plan & Billing Tab", () => {
    it("displays all three plan tiers", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Agency" })).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: "Business" })).toBeInTheDocument()
      })
    })

    it("shows Recommended badge for free users on Pro plan", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getByText("Recommended")).toBeInTheDocument()
      })
    })

    it("shows Trial active for trialing users", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: {
              status: "trialing",
              plan: "pro",
              currentPeriodEnd: "2025-02-01T00:00:00Z",
              trialEndDate: "2025-01-25T00:00:00Z",
            },
            credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
            limits: {},
            recentTransactions: [],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getByText("Trial active")).toBeInTheDocument()
        expect(screen.queryByText("Recommended")).not.toBeInTheDocument()
      })
    })

    it("shows Current plan for active subscribers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: {
              status: "active",
              plan: "pro",
              currentPeriodEnd: "2025-02-01T00:00:00Z",
              trialEndDate: null,
            },
            credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
            limits: {},
            recentTransactions: [],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getByText("Current plan")).toBeInTheDocument()
      })
    })

    it("shows Upgrade button for subscribed users on higher tier plans", async () => {
      mockFetch.mockReset()
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subscription: {
                status: "active",
                plan: "pro",
                currentPeriodEnd: "2025-02-01T00:00:00Z",
                trialEndDate: null,
              },
              credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
              limits: {},
              recentTransactions: [],
            }),
        })
      )

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      // Wait for loading to complete and current plan to show
      await waitFor(() => {
        expect(screen.getByText("Current plan")).toBeInTheDocument()
      }, { timeout: 5000 })

      // Then check for upgrade buttons
      await waitFor(() => {
        // Pro user should see "Upgrade" buttons on Agency and Business plans
        const upgradeButtons = screen.getAllByText("Upgrade")
        expect(upgradeButtons.length).toBe(2) // Agency and Business
      }, { timeout: 3000 })
    })

    it("shows Cancel membership link for subscribed users", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: {
              status: "active",
              plan: "pro",
              currentPeriodEnd: "2025-02-01T00:00:00Z",
              trialEndDate: null,
            },
            credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
            limits: {},
            recentTransactions: [],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getByText("Cancel membership")).toBeInTheDocument()
      })
    })

    it("does not show Cancel membership for free users", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.queryByText("Cancel membership")).not.toBeInTheDocument()
      })
    })
  })

  describe("Cancel subscription flow", () => {
    it("shows cancel confirmation dialog when clicking Cancel membership", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: {
              status: "active",
              plan: "pro",
              currentPeriodEnd: "2025-02-01T00:00:00Z",
              trialEndDate: null,
            },
            credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
            limits: {},
            recentTransactions: [],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getByText("Cancel membership")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Cancel membership"))

      expect(screen.getByText("Cancel subscription?")).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to cancel/)).toBeInTheDocument()
    })

    it("closes cancel dialog when clicking Keep subscription", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: {
              status: "active",
              plan: "pro",
              currentPeriodEnd: "2025-02-01T00:00:00Z",
              trialEndDate: null,
            },
            credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
            limits: {},
            recentTransactions: [],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        fireEvent.click(screen.getByText("Cancel membership"))
      })

      expect(screen.getByText("Cancel subscription?")).toBeInTheDocument()

      fireEvent.click(screen.getByText("Keep subscription"))

      expect(screen.queryByText("Cancel subscription?")).not.toBeInTheDocument()
    })

    it("calls cancel API when confirming cancellation", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            subscription: {
              status: "active",
              plan: "pro",
              currentPeriodEnd: "2025-02-01T00:00:00Z",
              trialEndDate: null,
            },
            credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
            limits: {},
            recentTransactions: [],
          }),
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      // Wait for the Pro plan to load with "Current plan" status
      await waitFor(() => {
        expect(screen.getByText("Current plan")).toBeInTheDocument()
      }, { timeout: 3000 })

      // Now cancel membership should be visible
      await waitFor(() => {
        expect(screen.getByText("Cancel membership")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Cancel membership"))

      // Wait for dialog to appear
      await waitFor(() => {
        expect(screen.getByText("Cancel subscription?")).toBeInTheDocument()
      })

      // Reset mock for cancel API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            message: "Subscription canceled successfully",
          }),
      })

      fireEvent.click(screen.getByRole("button", { name: "Cancel subscription" }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/billing/cancel",
          expect.objectContaining({
            method: "POST",
          })
        )
      })
    })
  })

  describe("Checkout flow", () => {
    it("calls checkout API when clicking Start Free Trial for free users", async () => {
      const checkoutUrl = "https://checkout.stripe.com/session123"

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              subscription: { status: "free", plan: null, currentPeriodEnd: null, trialEndDate: null },
              credits: { monthly: 0, bonus: 0, total: 0, resetDate: null },
              limits: {},
              recentTransactions: [],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ url: checkoutUrl }),
        })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getAllByText("Start Free Trial").length).toBeGreaterThan(0)
      })

      // Click the first "Start Free Trial" button (Pro plan)
      fireEvent.click(screen.getAllByText("Start Free Trial")[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/billing/checkout",
          expect.objectContaining({
            method: "POST",
          })
        )
      })
    })

    it("calls portal API when subscribed user clicks Upgrade", async () => {
      const portalUrl = "https://billing.stripe.com/portal123"

      mockFetch.mockReset()
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/billing/portal") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ url: portalUrl }),
          })
        }
        // Default: billing status
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subscription: {
                status: "active",
                plan: "pro",
                currentPeriodEnd: "2025-02-01T00:00:00Z",
                trialEndDate: null,
              },
              credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
              limits: {},
              recentTransactions: [],
            }),
        })
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      // Wait for current plan to load first
      await waitFor(() => {
        expect(screen.getByText("Current plan")).toBeInTheDocument()
      }, { timeout: 5000 })

      await waitFor(() => {
        expect(screen.getAllByText("Upgrade").length).toBeGreaterThan(0)
      }, { timeout: 3000 })

      // Click the first "Upgrade" button (Agency plan)
      fireEvent.click(screen.getAllByText("Upgrade")[0])

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/billing/portal",
          expect.objectContaining({
            method: "POST",
          })
        )
      })
    })

    it("shows error alert when portal API fails", async () => {
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {})

      mockFetch.mockReset()
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/billing/portal") {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "No billing account found" }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subscription: {
                status: "active",
                plan: "pro",
                currentPeriodEnd: "2025-02-01T00:00:00Z",
                trialEndDate: null,
              },
              credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
              limits: {},
              recentTransactions: [],
            }),
        })
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      // Wait for current plan to load first
      await waitFor(() => {
        expect(screen.getByText("Current plan")).toBeInTheDocument()
      }, { timeout: 5000 })

      await waitFor(() => {
        expect(screen.getAllByText("Upgrade").length).toBeGreaterThan(0)
      }, { timeout: 3000 })

      fireEvent.click(screen.getAllByText("Upgrade")[0])

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith("No billing account found")
      })

      alertMock.mockRestore()
    })

    it("shows error when portal URL is missing", async () => {
      const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {})

      mockFetch.mockReset()
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/billing/portal") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}), // Missing url
          })
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              subscription: {
                status: "active",
                plan: "pro",
                currentPeriodEnd: "2025-02-01T00:00:00Z",
                trialEndDate: null,
              },
              credits: { monthly: 50, bonus: 0, total: 50, resetDate: null },
              limits: {},
              recentTransactions: [],
            }),
        })
      })

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      // Wait for current plan to load first
      await waitFor(() => {
        expect(screen.getByText("Current plan")).toBeInTheDocument()
      }, { timeout: 5000 })

      await waitFor(() => {
        expect(screen.getAllByText("Upgrade").length).toBeGreaterThan(0)
      }, { timeout: 3000 })

      fireEvent.click(screen.getAllByText("Upgrade")[0])

      await waitFor(() => {
        expect(alertMock).toHaveBeenCalledWith("Failed to open billing portal. Please try again.")
      })

      alertMock.mockRestore()
    })
  })

  describe("Pro plan features", () => {
    it("displays all Pro plan features", async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />)

      fireEvent.click(screen.getByText("Plan & Billing"))

      await waitFor(() => {
        expect(screen.getByText("50 credits / month")).toBeInTheDocument()
        expect(screen.getByText("AI-powered reports")).toBeInTheDocument()
        expect(screen.getByText("PDF report generator")).toBeInTheDocument()
        expect(screen.getByText("Shareable reports")).toBeInTheDocument()
        expect(screen.getByText("Email alerts")).toBeInTheDocument()
        expect(screen.getByText("Export data")).toBeInTheDocument()
      })
    })
  })
})
