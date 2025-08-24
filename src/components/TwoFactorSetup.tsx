import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, Smartphone, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';
import * as OTPAuth from 'otpauth';

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const TwoFactorSetup = ({ isEnabled, onToggle }: TwoFactorSetupProps) => {
  const [showSetup, setShowSetup] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateSecret = () => {
    const secret = new OTPAuth.Secret({ size: 32 });
    return secret.base32;
  };

  const generateQRCode = async (secret: string, userEmail: string) => {
    const totp = new OTPAuth.TOTP({
      issuer: 'NexERP',
      label: userEmail,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(totp.toString());
    return qrCodeDataUrl;
  };

  const verifyTOTP = (token: string, secret: string) => {
    const totp = new OTPAuth.TOTP({
      issuer: 'NexERP',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret,
    });

    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  };

  const handleEnable2FA = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Usuário não encontrado');

      const newSecret = generateSecret();
      setSecret(newSecret);
      
      const qrCode = await generateQRCode(newSecret, user.email);
      setQrCodeUrl(qrCode);
      setShowSetup(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao configurar 2FA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Erro",
        description: "Digite um código válido de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (!verifyTOTP(verificationCode, secret)) {
        throw new Error('Código inválido');
      }

      // Salvar o secret no metadata do usuário
      const { error } = await supabase.auth.updateUser({
        data: { 
          totp_secret: secret,
          two_factor_enabled: true 
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Autenticação de dois fatores ativada com sucesso",
      });

      onToggle(true);
      setShowSetup(false);
      setVerificationCode('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Código inválido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Erro",
        description: "Digite um código válido de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userSecret = user?.user_metadata?.totp_secret;

      if (!userSecret || !verifyTOTP(verificationCode, userSecret)) {
        throw new Error('Código inválido');
      }

      const { error } = await supabase.auth.updateUser({
        data: { 
          totp_secret: null,
          two_factor_enabled: false 
        }
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Autenticação de dois fatores desativada",
      });

      onToggle(false);
      setShowDisable(false);
      setVerificationCode('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Código inválido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Smartphone className={`h-4 w-4 ${isEnabled ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="font-medium">
                  {isEnabled ? 'Ativado' : 'Desativado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isEnabled 
                    ? 'Sua conta está protegida com 2FA' 
                    : 'Configure para maior segurança'
                  }
                </p>
              </div>
            </div>
            <Button
              variant={isEnabled ? "destructive" : "default"}
              onClick={isEnabled ? () => setShowDisable(true) : handleEnable2FA}
              disabled={loading}
            >
              {isEnabled ? 'Desativar' : 'Ativar 2FA'}
            </Button>
          </div>

          {isEnabled && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">2FA Ativo</p>
                  <p className="text-blue-700">
                    Use seu aplicativo autenticador para gerar códigos de acesso
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Autenticação de Dois Fatores</DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para ativar o 2FA
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                1. Escaneie o QR Code com seu aplicativo autenticador
              </p>
              {qrCodeUrl && (
                <div className="flex justify-center">
                  <img src={qrCodeUrl} alt="QR Code para 2FA" className="border rounded-lg" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>2. Digite o código gerado pelo aplicativo</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSetup(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleVerifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? 'Verificando...' : 'Ativar 2FA'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Desativar Autenticação de Dois Fatores</DialogTitle>
            <DialogDescription>
              Digite o código do seu aplicativo autenticador para confirmar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código de verificação</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDisable(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDisable2FA}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1"
              >
                {loading ? 'Verificando...' : 'Desativar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};