"use client"

import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Clock, Plus } from 'lucide-react'

export function DayScheduleEditor({ day, schedule, onScheduleChange }) {
  const { open, intervals } = schedule

  const handleToggleDay = () => {
    const newOpenState = !open
    if (newOpenState && intervals.length === 0) {
      onScheduleChange({ ...schedule, open: true, intervals: [{ open: '09:00', close: '18:00' }] })
    } else {
      onScheduleChange({ ...schedule, open: newOpenState })
    }
  }

  const handleAddTimeInterval = () => {
    onScheduleChange({ ...schedule, intervals: [...intervals, { open: '09:00', close: '18:00' }] })
  }

  const handleRemoveTimeInterval = (index) => {
    onScheduleChange({ ...schedule, intervals: intervals.filter((_, i) => i !== index) })
  }

  const handleTimeChange = (index, type, value) => {
    const newIntervals = [...intervals]
    newIntervals[index][type] = value
    onScheduleChange({ ...schedule, intervals: newIntervals })
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-800">{day}</h3>
        <Switch
          checked={open}
          onCheckedChange={handleToggleDay}
          aria-label={`Abrir/Fechar ${day}`}
        />
      </div>
      {open && (
        <div className="space-y-4">
          {intervals.map((interval, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Input
                  type="time"
                  value={interval.open}
                  onChange={(e) => handleTimeChange(index, 'open', e.target.value)}
                  className="pr-8"
                />
                <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <span className="text-gray-500">-</span>
              <div className="relative flex-1">
                <Input
                  type="time"
                  value={interval.close}
                  onChange={(e) => handleTimeChange(index, 'close', e.target.value)}
                  className="pr-8"
                />
                <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveTimeInterval(index)}
                disabled={intervals.length === 1}
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAddTimeInterval}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Horário
          </Button>
        </div>
      )}
    </div>
  )
}