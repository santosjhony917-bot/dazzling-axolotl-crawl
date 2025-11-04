"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { DayScheduleEditor } from './DayScheduleEditor'

const orderedDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export function EditHoursDialog({ restaurant, onUpdate, open, onOpenChange }) {
  const [openingHours, setOpeningHours] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && restaurant?.opening_hours) {
      const hoursMap = new Map(restaurant.opening_hours.map(h => [h.day, h]))
      const fullWeekHours = orderedDays.map(day =>
        hoursMap.get(day) || { day, intervals: [], open: false }
      )
      setOpeningHours(fullWeekHours)
    } else if (open) {
      setOpeningHours(orderedDays.map(day => ({ day, intervals: [], open: false })))
    }
  }, [restaurant?.opening_hours, open])

  const handleScheduleChange = (day, newSchedule) => {
    setOpeningHours(prevHours =>
      prevHours.map(d => (d.day === day ? newSchedule : d))
    )
  }

  const handleSave = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('restaurants')
      .update({ opening_hours: openingHours.filter(h => h.open && h.intervals.length > 0) })
      .eq('id', restaurant.id)
      .select()
      .single()

    if (error) {
      toast.error('Erro ao salvar os horários. Tente novamente.')
      console.error(error)
    } else {
      toast.success('Horários de funcionamento atualizados com sucesso!')
      if (onUpdate) {
        onUpdate(data)
      }
      onOpenChange(false)
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Horários de Funcionamento</DialogTitle>
          <DialogDescription>
            Defina os horários em que seu restaurante estará aberto.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 -mx-6">
          <div className="space-y-4 px-6 py-4">
            {openingHours.map(schedule => (
              <DayScheduleEditor
                key={schedule.day}
                day={schedule.day}
                schedule={schedule}
                onScheduleChange={(newSchedule) => handleScheduleChange(schedule.day, newSchedule)}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Horários'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}