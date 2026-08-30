import type { PillTone } from '@/components/ui'

export const STATUS_TONE: Record<string, PillTone> = {
  active: 'green',
  probation: 'amber',
  suspended: 'orange',
  exited: 'slate',
}

export const REASON_TONE: Record<string, PillTone> = {
  hire: 'blue',
  confirmation: 'green',
  promotion: 'violet',
  transfer: 'cyan',
  demotion: 'orange',
  redesignation: 'slate',
  exit: 'red',
}

export const EVENT_TONE: Record<string, PillTone> = {
  hired: 'blue',
  confirmed: 'green',
  assigned: 'cyan',
  suspended: 'orange',
  reinstated: 'violet',
  exited: 'red',
}
