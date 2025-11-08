import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { Restaurant } from '@/types'

const UpgradePage = () => {
  const { user } = useAuth()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (user) {
        setLoading(true)
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (error && error.code !== 'PGRST116') { // PGRST116: single row not found
          console.error('Error fetching restaurant:', error)
          toast.error('Erro ao carregar dados do restaurante.')
        } else {
          setRestaurant(data)
        }
        setLoading(false)
      }
    }

    fetchRestaurant()
  }, [user])

  const handleUpgrade = async () => {
    // Logic to handle upgrade
    toast.success('Upgrade iniciado!')
  }

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary mb-2">Faça um Upgrade para Premium</h1>
        <p className="text-lg text-gray-600">Desbloqueie todo o potencial do seu restaurante.</p>
      </header>

      <main className="space-y-12">
        {/* Seção de preços pode ser adicionada aqui */}

        {/* 2. Comparativo Free vs Premium */}
        <Card className="p-6 shadow-soft-xl border-none rounded-2xl bg-white">
          <h2 className="text-lg font-bold text-primary text-center mb-6">
            Veja como seu restaurante aparece hoje (Free) e como pode brilhar (Premium)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Free Preview */}
            <div className="text-center">
              <h3 className="font-bold mb-4 text-gray-600">Plano Free</h3>
              <img 
                src="https://i.imgur.com/A2o9d8A.png" 
                alt="Exemplo de perfil no plano Free" 
                className="rounded-lg shadow-md border mx-auto"
              />
            </div>
            {/* Premium Preview */}
            <div className="text-center">
              <h3 className="font-bold mb-4 text-primary">Plano Premium</h3>
              <img 
                src="https://i.imgur.com/sC7aB4c.png" 
                alt="Exemplo de perfil no plano Premium" 
                className="rounded-lg shadow-lg border-2 border-primary mx-auto"
              />
            </div>
          </div>
        </Card>

        {/* Seção de features pode ser adicionada aqui */}

        {/* 4. Call to Action */}
        <section className="text-center mt-12">
          <Button size="lg" onClick={handleUpgrade}>
            Quero ser Premium agora!
          </Button>
        </section>
      </main>
    </div>
  )
}

export default UpgradePage