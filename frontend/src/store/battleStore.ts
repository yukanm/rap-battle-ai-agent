import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import type { Battle, Round, Lyric, Verse } from '@/types'

interface BattleState {
  battleId: string | null
  battleStatus: 'idle' | 'waiting' | 'active' | 'completed'
  battleTheme: string
  currentRound: number
  totalRounds: number
  rounds: Round[]
  votes: { ai1: number; ai2: number }
  isLoading: boolean
  error: string | null
  useAgentAPI: boolean
  battleResult: {
    winner: 'ai1' | 'ai2' | 'tie'
    scores: { ai1: number; ai2: number }
    analysis?: string
    breakdown?: {
      ai1: {
        rhyme: number
        flow: number
        answer: number
        punchline: number
        attitude: number
      }
      ai2: {
        rhyme: number
        flow: number
        answer: number
        punchline: number
        attitude: number
      }
    }
  } | null
  
  // Actions
  setBattleId: (id: string | null) => void
  setBattleStatus: (status: 'idle' | 'waiting' | 'active' | 'completed') => void
  setBattleTheme: (theme: string) => void
  startBattle: () => void
  endBattle: () => void
  updateBattle: (updates: Partial<Battle>) => void
  addRound: (round: Round) => void
  voteForAI: (aiId: 'ai1' | 'ai2') => void
  setError: (error: string | null) => void
  resetBattle: () => void
  setUseAgentAPI: (use: boolean) => void
  setBattleResult: (result: BattleState['battleResult']) => void
  setBattleEvaluation: (result: BattleState['battleResult']) => void
  addLyric: (roundNumber: number, participant: 'ai1' | 'ai2', lyric: Lyric) => void
  addVerse: (roundNumber: number, verse: Verse) => void
  setTotalRounds: (rounds: number) => void
}

export const useBattleStore = create<BattleState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      battleId: null,
      battleStatus: 'idle',
      battleTheme: '',
      currentRound: 0,
      totalRounds: 3,
      rounds: [],
      votes: { ai1: 0, ai2: 0 },
      isLoading: false,
      error: null,
      useAgentAPI: true,
      battleResult: null,

      setBattleId: (id: string | null) => set({ battleId: id }),
      
      setBattleStatus: (status: 'idle' | 'waiting' | 'active' | 'completed') => set({ battleStatus: status }),
      
      setBattleTheme: (theme: string) => set({ battleTheme: theme }),

      startBattle: () => {
        set({ 
          battleStatus: 'waiting',
          isLoading: true, 
          error: null,
          rounds: [],
          votes: { ai1: 0, ai2: 0 },
          currentRound: 0,
          battleResult: null
        })
      },

      endBattle: () => {
        set({
          battleStatus: 'completed',
          isLoading: false
        })
      },

      updateBattle: (updates: Partial<Battle>) => {
        if (updates.status === 'in_progress') {
          set({ battleStatus: 'active' })
        } else if (updates.status === 'completed') {
          set({ battleStatus: 'completed' })
        }
        if (updates.id) {
          set({ battleId: updates.id })
        }
      },

      addRound: (round: Round) => {
        const { rounds } = get()
        console.log('🔄 BattleStore addRound called:', {
          incomingRound: round,
          currentRounds: rounds,
          roundNumber: round.number,
          hasAI1Verses: !!round.verses?.filter(v => v.participantId === 'ai1').length,
          hasAI2Verses: !!round.verses?.filter(v => v.participantId === 'ai2').length,
          ai1VerseCount: round.verses?.filter(v => v.participantId === 'ai1').length || 0,
          ai2VerseCount: round.verses?.filter(v => v.participantId === 'ai2').length || 0
        })
        
        set({
          rounds: [...rounds, round],
          currentRound: round.number,
          isLoading: false
        })
        
        console.log('✅ BattleStore updated - new state:', {
          totalRounds: [...rounds, round].length,
          currentRound: round.number,
          newRounds: [...rounds, round]
        })
      },
      
      voteForAI: (aiId: 'ai1' | 'ai2') => {
        const { votes } = get()
        set({
          votes: {
            ...votes,
            [aiId]: votes[aiId] + 1
          }
        })
      },

      setError: (error: string | null) => set({ error }),
      
      resetBattle: () => set({
        battleId: null,
        battleStatus: 'idle',
        battleTheme: '',
        currentRound: 0,
        rounds: [],
        votes: { ai1: 0, ai2: 0 },
        isLoading: false,
        error: null,
        battleResult: null
      }),
      
      setUseAgentAPI: (use: boolean) => set({ useAgentAPI: use }),
      
      setBattleResult: (result: BattleState['battleResult']) => set({ battleResult: result }),
      
      setBattleEvaluation: (result: BattleState['battleResult']) => set({ battleResult: result }),
      
      addLyric: (roundNumber: number, participant: 'ai1' | 'ai2', lyric: Lyric) => {
        const { rounds } = get()
        const existingRoundIndex = rounds.findIndex(r => r.number === roundNumber)
        
        if (existingRoundIndex >= 0) {
          // Update existing round - convert to verse structure
          const updatedRounds = [...rounds]
          const existingRound = updatedRounds[existingRoundIndex]
          
          // Check if this participant already has a lyric for this round to avoid duplicates
          const existingVerse = existingRound.verses?.find(v => v.participantId === participant)
          if (existingVerse) {
            console.log('🚫 Duplicate lyric prevented for:', participant, 'round:', roundNumber)
            return // Prevent duplicate
          }
          
          // Calculate correct verse number based on participant
          // AI1 (先行) gets odd numbers: 1, 3, 5...
          // AI2 (後攻) gets even numbers: 2, 4, 6...
          const verseNumber = participant === 'ai1' 
            ? (existingRound.verses?.filter(v => v.participantId === 'ai1').length || 0) * 2 + 1
            : (existingRound.verses?.filter(v => v.participantId === 'ai2').length || 0) * 2 + 2
          
          // Create a verse from the lyric
          const verse: Verse = {
            number: verseNumber,
            participantId: participant,
            lyric
          }
          
          updatedRounds[existingRoundIndex] = {
            ...existingRound,
            verses: [...(existingRound.verses || []), verse].sort((a, b) => a.number - b.number)
          }
          
          set({ 
            rounds: updatedRounds,
            currentRound: roundNumber
          })
        } else {
          // Create new round with verse structure
          const verse: Verse = {
            number: participant === 'ai1' ? 1 : 2,
            participantId: participant,
            lyric
          }
          
          const newRound: Round = {
            number: roundNumber,
            verses: [verse],
            votes: { ai1: 0, ai2: 0 }
          }
          set({ 
            rounds: [...rounds, newRound],
            currentRound: roundNumber
          })
        }
      },

      addVerse: (roundNumber: number, verse: Verse) => {
        const { rounds } = get()
        const existingRoundIndex = rounds.findIndex(r => r.number === roundNumber)
        
        if (existingRoundIndex >= 0) {
          // Update existing round
          const updatedRounds = [...rounds]
          const existingRound = updatedRounds[existingRoundIndex]
          
          // Add verse to the verses array
          updatedRounds[existingRoundIndex] = {
            ...existingRound,
            verses: [...(existingRound.verses || []), verse].sort((a, b) => a.number - b.number)
          }
          
          set({ 
            rounds: updatedRounds,
            currentRound: roundNumber
          })
        } else {
          // Create new round with first verse
          const newRound: Round = {
            number: roundNumber,
            verses: [verse],
            votes: { ai1: 0, ai2: 0 }
          }
          set({ 
            rounds: [...rounds, newRound],
            currentRound: roundNumber
          })
        }
      },

      setTotalRounds: (rounds: number) => set({ totalRounds: rounds }),
    }))
  )
)