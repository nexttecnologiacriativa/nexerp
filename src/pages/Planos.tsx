import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Building2 } from 'lucide-react';

const Planos = () => {
  const planos = [
    {
      nome: "Básico",
      preco: "R$ 29",
      periodo: "/mês",
      descricao: "Ideal para pequenas empresas",
      icon: Building2,
      popular: false,
      recursos: [
        "Até 5 usuários",
        "Gestão financeira básica",
        "Controle de estoque",
        "Relatórios simples",
        "Suporte por email"
      ]
    },
    {
      nome: "Profissional",
      preco: "R$ 79",
      periodo: "/mês",
      descricao: "Para empresas em crescimento",
      icon: Star,
      popular: true,
      recursos: [
        "Até 15 usuários",
        "Gestão financeira completa",
        "Controle de estoque avançado",
        "Relatórios avançados",
        "Nota fiscal eletrônica",
        "Suporte prioritário"
      ]
    },
    {
      nome: "Enterprise",
      preco: "R$ 149",
      periodo: "/mês",
      descricao: "Para grandes empresas",
      icon: Zap,
      popular: false,
      recursos: [
        "Usuários ilimitados",
        "Todas as funcionalidades",
        "API completa",
        "Relatórios personalizados",
        "Integrações avançadas",
        "Suporte 24/7",
        "Backup diário"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Planos e Preços</h1>
        <p className="text-muted-foreground">Escolha o plano ideal para sua empresa</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planos.map((plano) => {
          const IconComponent = plano.icon;
          return (
            <Card key={plano.nome} className={`relative ${plano.popular ? 'border-primary shadow-lg' : ''}`}>
              {plano.popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                  Mais Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plano.nome}</CardTitle>
                <CardDescription>{plano.descricao}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plano.preco}</span>
                  <span className="text-muted-foreground">{plano.periodo}</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plano.recursos.map((recurso, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{recurso}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={plano.popular ? "default" : "outline"}
                >
                  Escolher Plano
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center pt-8">
        <p className="text-sm text-muted-foreground">
          Todos os planos incluem 30 dias de teste grátis. Cancele a qualquer momento.
        </p>
      </div>
    </div>
  );
};

export default Planos;