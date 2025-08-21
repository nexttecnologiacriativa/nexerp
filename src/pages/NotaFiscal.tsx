import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, AlertTriangle } from 'lucide-react';

const NotaFiscal = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nota Fiscal</h1>
        <p className="text-muted-foreground">Gestão de notas fiscais eletrônicas</p>
      </div>

      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-2xl">Funcionalidade em Desenvolvimento</CardTitle>
            <CardDescription className="text-lg">
              O módulo de Nota Fiscal ainda não está disponível
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Badge variant="secondary" className="text-sm">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Em Breve
              </Badge>
            </div>
            
            <div className="bg-muted p-6 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center justify-center">
                <FileText className="h-4 w-4 mr-2" />
                Funcionalidades Planejadas:
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Emissão de NFe e NFCe</li>
                <li>• Cancelamento e carta de correção</li>
                <li>• Consulta de status na SEFAZ</li>
                <li>• Download de XML e PDF</li>
                <li>• Histórico completo de notas</li>
                <li>• Integração com vendas</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Esta funcionalidade estará disponível em uma próxima atualização do sistema.
              <br />
              Entre em contato com o suporte para mais informações.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotaFiscal;