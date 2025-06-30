import React, { useState } from 'react'
import { ViolationInfo } from '@/types'
import { StreamingText } from '@/components/ui/streaming-text'

interface LyricWithViolationsProps {
  content: string
  violations?: ViolationInfo[]
  className?: string
  enableStreaming?: boolean
  streamingSpeed?: number
  isNewContent?: boolean
}

interface ViolationTooltipProps {
  violation: ViolationInfo
  isVisible: boolean
  position: { x: number; y: number }
}

const ViolationTooltip: React.FC<ViolationTooltipProps> = ({ violation, isVisible, position }) => {
  if (!isVisible) return null

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-600 bg-red-50'
      case 'high': return 'border-orange-500 bg-orange-50'
      case 'medium': return 'border-yellow-500 bg-yellow-50'
      case 'low': return 'border-blue-500 bg-blue-50'
      default: return 'border-gray-500 bg-gray-50'
    }
  }

  return (
    <div
      className={`absolute z-50 p-3 border-2 rounded-lg shadow-lg max-w-sm ${getSeverityColor(violation.severity)}`}
      style={{ 
        left: position.x, 
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">NG Word Detected</span>
          <span className={`text-xs px-2 py-1 rounded uppercase font-bold
            ${violation.severity === 'critical' ? 'bg-red-200 text-red-800' : ''}
            ${violation.severity === 'high' ? 'bg-orange-200 text-orange-800' : ''}
            ${violation.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' : ''}
            ${violation.severity === 'low' ? 'bg-blue-200 text-blue-800' : ''}
          `}>
            {violation.severity}
          </span>
        </div>
        
        <div className="text-sm">
          <p><strong>Term:</strong> &quot;{violation.term}&quot;</p>
          <p><strong>Category:</strong> {violation.category}</p>
          <p><strong>Penalty:</strong> {(violation.penalty * 100).toFixed(0)}%</p>
        </div>
        
        {violation.recommendation && (
          <div className="text-sm bg-white p-2 rounded border">
            <strong>Suggested replacement:</strong> &quot;{violation.recommendation}&quot;
          </div>
        )}
        
        {violation.note && (
          <div className="text-xs text-gray-600 italic">
            {violation.note}
          </div>
        )}
      </div>
    </div>
  )
}

export const LyricWithViolations: React.FC<LyricWithViolationsProps> = ({ 
  content, 
  violations = [], 
  className = '',
  enableStreaming = false,
  streamingSpeed = 15,
  isNewContent = false
}) => {
  const [hoveredViolation, setHoveredViolation] = useState<ViolationInfo | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const handleViolationHover = (violation: ViolationInfo, event: React.MouseEvent) => {
    setHoveredViolation(violation)
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  const handleViolationLeave = () => {
    setHoveredViolation(null)
  }

  const getSeverityHighlight = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-200 text-red-900 border-b-2 border-red-600'
      case 'high': return 'bg-orange-200 text-orange-900 border-b-2 border-orange-600'
      case 'medium': return 'bg-yellow-200 text-yellow-900 border-b-2 border-yellow-600'
      case 'low': return 'bg-blue-200 text-blue-900 border-b-2 border-blue-600'
      default: return 'bg-gray-200 text-gray-900 border-b-2 border-gray-600'
    }
  }

  const renderHighlightedContent = () => {
    if (!violations || violations.length === 0) {
      return <span className="whitespace-pre-line">{content}</span>
    }

    // Sort violations by start index to process them in order
    const sortedViolations = [...violations].sort((a, b) => a.startIndex - b.startIndex)
    
    const segments: JSX.Element[] = []
    let lastIndex = 0

    sortedViolations.forEach((violation, index) => {
      // Add text before violation
      if (violation.startIndex > lastIndex) {
        segments.push(
          <span key={`text-${index}`} className="whitespace-pre-line">
            {content.slice(lastIndex, violation.startIndex)}
          </span>
        )
      }

      // Add highlighted violation
      segments.push(
        <span
          key={`violation-${index}`}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md px-1 rounded ${getSeverityHighlight(violation.severity)}`}
          onMouseEnter={(e) => handleViolationHover(violation, e)}
          onMouseLeave={handleViolationLeave}
          title={`NG Word: ${violation.term} (${violation.category})`}
        >
          {content.slice(violation.startIndex, violation.endIndex)}
        </span>
      )

      lastIndex = violation.endIndex
    })

    // Add remaining text after last violation
    if (lastIndex < content.length) {
      segments.push(
        <span key="text-end" className="whitespace-pre-line">
          {content.slice(lastIndex)}
        </span>
      )
    }

    return <>{segments}</>
  }

  return (
    <div className={`relative ${className}`}>
      <div className="text-white leading-relaxed">
        {enableStreaming && isNewContent ? (
          <StreamingText 
            text={content}
            speed={streamingSpeed}
            className="whitespace-pre-line"
          />
        ) : (
          renderHighlightedContent()
        )}
      </div>
      
      {/* Violation count indicator */}
      {violations && violations.length > 0 && (
        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
          <div className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold">
            {violations.length}
          </div>
        </div>
      )}
      
      {/* Tooltip */}
      {hoveredViolation && (
        <ViolationTooltip
          violation={hoveredViolation}
          isVisible={!!hoveredViolation}
          position={tooltipPosition}
        />
      )}
    </div>
  )
}

export default LyricWithViolations