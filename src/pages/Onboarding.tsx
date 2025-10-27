import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Utensils, MapPin, Heart } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Dados dos slides
const slides = [
  {
    icon: <Utensils className="w-16 h-16 text-primary" />,
    title: "Descubra Sabores Únicos",
    description: "Explore milhares de restaurantes e pratos perto de você. Sua próxima refeição favorita está a um toque de distância.",
  },
  {
    icon: <MapPin className="w-16 h-16 text-primary" />,
    title: "Localização Inteligente",
    description: "Encontre o que você procura com base na sua localização atual ou em um endereço salvo. Sempre as melhores opções por perto.",
  },
  {
    icon: <Heart className="w-16 h-16 text-primary" />,
    title: "Salve Seus Favoritos",
    description: "Marque restaurantes e pratos como favoritos para encontrá-los rapidamente sempre que a fome bater.",
  },
];

const Onboarding: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();
  const { completeOnboarding } = useOnboardingStatus();

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = () => {
    setIsCompleting(true);
    // Marca o onboarding como completo e redireciona para a home
    completeOnboarding();
    navigate('/home');
  };

  const skipOnboarding = () => {
    finishOnboarding();
  };

  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header/Skip Button */}
      <div className="p-4 flex justify-end">
        <button
          onClick={skipOnboarding}
          disabled={isCompleting}
          className="text-gray-600 text-sm font-medium hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          Pular
        </button>
      </div>

      {/* Content Area */}
      <div className="flex flex-col items-center justify-center flex-grow p-8 text-center">
        <div className="mb-8">
          {slide.icon}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{slide.title}</h1>
        <p className="text-lg text-gray-600 max-w-md">{slide.description}</p>
      </div>

      {/* Navigation/Footer */}
      <div className="p-6">
        {/* Dots Indicator */}
        <div className="flex justify-center space-x-2 mb-6">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-primary w-6' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <Button
          onClick={nextSlide}
          disabled={isCompleting}
          className="w-full py-6 text-lg font-semibold"
        >
          {currentSlide === slides.length - 1 ? 'Começar' : 'Próximo'}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;