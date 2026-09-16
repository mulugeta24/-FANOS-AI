import { useMutation } from '@tanstack/react-query'
import { startURIAssessment } from '@/lib/api'

export interface AssessmentResult {
  uri:           string
  scope:         string
  risk_score:    number
  findings:      number
  critical:      number
  high:          number
  medium:        number
  summary:       string
  scan_duration: number
}

export function useURIAssessment() {
  return useMutation<AssessmentResult, Error, { uri: string; scope: string }>({
    mutationFn: ({ uri, scope }) => startURIAssessment(uri, scope),
  })
}
