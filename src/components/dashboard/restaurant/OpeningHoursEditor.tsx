"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { X, Clock, Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

const dayOfWeekMapping = {
  'Domingo': 0,
  'Segunda-feira': 1,
  'Terça-feira': 2,
  'Quarta-feira': 3,
  'Quinta-feira': 4,
  'Sexta-feira': 5,
  'Sábado': 6,
}

const orderedDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

export function OpeningHoursEditor({ restaurant, onUpdate, children }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openingHours, setOpeningHours] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (restaurant?.opening_hours) {
      const sortedHours = [...restaurant.opening_hours].sort((a, b) => {
        const dayA = orderedDays.find(day => day.toLowerCase().startsWith(a.day.toLowerCase()));
        const dayB = orderedDays.find(day => day.toLowerCase().startsWith(b.day.toLowerCase()));
        return orderedDays.indexOf(dayA) - orderedDays.indexOf(dayB);
      });
      setOpeningHours(sortedHours);
    } else {
      setOpeningHours(orderedDays.map(day => ({ day, intervals: [], open: false })))
    }
  }, [restaurant?.opening_hours])

  const handleToggleDay = (day) => {
    setOpeningHours(prevHours =>
      prevHours.map(d => {
        if (d.day === day) {
          const newOpenState = !d.open
          if (newOpenState && d.intervals.length === 0) {
            return { ...d, open: true, intervals: [{ open: '09:00', close: '18:00' }] }
          }
          return { ...d, open: newOpenState }
        }
        return d
      })
    )
  }

  const handleAddTimeInterval = (day) => {
    setOpeningHours(prevHours =>
      prevHours.map(d =>
        d.day === day
          ? { ...d, intervals: [...d.intervals, { open: '09:00', close: '18:00' }] }
          : d
      )
    )
  }

  const handleRemoveTimeInterval = (day, index) => {
    setOpeningHours(prevHours =>
      prevHours.map(d =>
        d.day === day
          ? { ...d, intervals: d.intervals.filter((_, i) => i !== index) }
          : d
      )
    )
  }

  const handleTimeChange = (day, index, type, value) => {
    setOpeningHours(prevHours =>
      prevHours.map(d => {
        if (d.day === day) {
          const newIntervals = [...d.intervals]
          newIntervals[index][type] = value
          return { ...d, intervals: newIntervals }
        }
        return d
      })
    )
  }

  const handleSave = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('restaurants')
      .update({ opening_hours: openingHours })
      .eq('id', restaurant.id)
      .select()
      .single()

    if (error) {
      toast.error('Erro ao salvar os horários. Tente novamente.')
      console.error(error)
    } else {
      toast.success('Horários de funcionamento atualizados com sucesso!')
      onUpdate(data)
      setIsOpen(false)
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Editar Horários
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Horários de Funcionamento</DialogTitle>
          <DialogDescription>
            Defina os horários em que seu restaurante estará aberto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4">
          <div className="space-y-4">
            {openingHours.map(({ day, intervals, open }) => (
              <div key={day} className="p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">{day}</h3>
                  <Switch
                    checked={open}
                    onCheckedChange={() => handleToggleDay(day)}
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
                            onChange={(e) => handleTimeChange(day, index, 'open', e.target.value)}
                            className="pr-8"
                          />
                          <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        <span className="text-gray-500">-</span>
                        <div className="relative flex-1">
                          <Input
                            type="time"
                            value={interval.close}
                            onChange={(e) => handleTimeChange(day, index, 'close', e.target.value)}
                            className="pr-8"
                          />
                          <Clock className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTimeInterval(day, index)}
                          disabled={intervals.length === 1}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleAddTimeInterval(day)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Horário
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t -mx-6 px-6 pb-6 bg-gray-50 rounded-b-lg">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
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