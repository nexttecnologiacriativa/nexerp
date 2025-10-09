import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database } from "lucide-react";

export default function PopulateDemoData() {
  const [loading, setLoading] = useState(false);

  const handlePopulateData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      const response = await fetch(
        `https://aetsstbmwrdxfnygqwsv.supabase.co/functions/v1/populate-demo-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        toast.info(`Dados criados: ${JSON.stringify(result.summary)}`);
      } else {
        toast.error(result.error || "Erro ao popular dados");
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Erro ao popular dados de demonstração");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Popular Dados de Demonstração
          </CardTitle>
          <CardDescription>
            Clique no botão abaixo para adicionar dados de exemplo à sua empresa.
            Isso criará clientes, fornecedores, produtos, serviços, vendas e transações financeiras.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">O que será criado:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>4 categorias e 4 subcategorias</li>
                <li>3 centros de custo</li>
                <li>2 contas bancárias</li>
                <li>3 clientes</li>
                <li>3 fornecedores</li>
                <li>4 produtos</li>
                <li>3 serviços</li>
                <li>2 vendas com itens</li>
                <li>3 contas a receber</li>
                <li>3 contas a pagar</li>
              </ul>
            </div>
            
            <Button 
              onClick={handlePopulateData} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Populando dados...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Popular Dados de Demonstração
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
