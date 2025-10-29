import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Testimonial {
  id: number;
  quote: string;
  author: string;
  role: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    quote: "O NexERP transformou completamente a gestão financeira da nossa empresa. Agora temos controle total sobre receitas e despesas.",
    author: "Maria Silva",
    role: "Diretora Financeira",
    initials: "MS"
  },
  {
    id: 2,
    quote: "Sistema intuitivo e completo. A equipe conseguiu se adaptar rapidamente e os resultados apareceram logo no primeiro mês.",
    author: "João Santos",
    role: "Gerente Comercial",
    initials: "JS"
  },
  {
    id: 3,
    quote: "Excelente custo-benefício. Não precisamos mais de várias ferramentas, o NexERP centraliza tudo que precisamos.",
    author: "Ana Costa",
    role: "CEO",
    initials: "AC"
  }
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-white">
      <div className="max-w-md space-y-6">
        <Quote className="w-12 h-12 opacity-50" />
        
        <p className="text-xl leading-relaxed">
          "{currentTestimonial.quote}"
        </p>
        
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 bg-white/20">
            <AvatarFallback className="bg-white/30 text-white font-semibold">
              {currentTestimonial.initials}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="font-semibold">{currentTestimonial.author}</div>
            <div className="text-sm opacity-80">{currentTestimonial.role}</div>
          </div>
        </div>

        <div className="flex gap-2 justify-center pt-4">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
              }`}
              aria-label={`Ver testemunho ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
