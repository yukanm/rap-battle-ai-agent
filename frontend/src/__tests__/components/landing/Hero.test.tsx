import { render, screen, fireEvent } from '@testing-library/react'
import { Hero } from '@/components/landing/Hero'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('Hero Component', () => {
  const mockOnStartBattle = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders hero content correctly', () => {
    render(<Hero onStartBattle={mockOnStartBattle} />)

    expect(screen.getByText('AI RAP BATTLE')).toBeInTheDocument()
    expect(screen.getByText('ARENA')).toBeInTheDocument()
    expect(screen.getByText(/Experience the future of entertainment/)).toBeInTheDocument()
  })

  it('displays feature cards', () => {
    render(<Hero onStartBattle={mockOnStartBattle} />)

    expect(screen.getByText('Real-time Generation')).toBeInTheDocument()
    expect(screen.getByText('Voice Synthesis')).toBeInTheDocument()
    expect(screen.getByText('Live Voting')).toBeInTheDocument()
  })

  it('calls onStartBattle when Start Battle button is clicked', () => {
    render(<Hero onStartBattle={mockOnStartBattle} />)

    const startButton = screen.getByRole('button', { name: /Start Battle Now/i })
    fireEvent.click(startButton)

    expect(mockOnStartBattle).toHaveBeenCalledTimes(1)
  })

  it('renders Watch Demo button', () => {
    render(<Hero onStartBattle={mockOnStartBattle} />)

    expect(screen.getByRole('button', { name: /Watch Demo/i })).toBeInTheDocument()
  })

  it('displays performance metrics', () => {
    render(<Hero onStartBattle={mockOnStartBattle} />)

    expect(screen.getByText(/Lightning-fast AI responses/)).toBeInTheDocument()
    expect(screen.getByText(/Natural rap-style voice/)).toBeInTheDocument()
    expect(screen.getByText(/Audience decides the winner/)).toBeInTheDocument()
  })
})