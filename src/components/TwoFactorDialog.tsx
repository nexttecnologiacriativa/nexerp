import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield } from 'lucide-react';
import * as OTPAuth from 'otpauth';

interface TwoFactorDialogProps {
  isOpen: boolean;
  onVerify: (code: string) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

export const TwoFactorDialog = ({ isOpen, onVerify, onCancel, loading = false }: TwoFactorDialogProps) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;
    
    setIsVerifying(true);
    const success = await onVerify(verificationCode);
    if (!success) {
      setVerificationCode('');
    }
    setIsVerifying(false);
  };

  const handleCancel = () => {
    setVerificationCode('');
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !loading && handleCancel()}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => loading && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verificação de Dois Fatores
          </DialogTitle>
          <DialogDescription>
            Digite o código de 6 dígitos do seu aplicativo autenticador
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
                disabled={loading || isVerifying}
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
              onClick={handleCancel}
              disabled={loading || isVerifying}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleVerify}
              disabled={loading || isVerifying || verificationCode.length !== 6}
              className="flex-1"
            >
              {isVerifying ? 'Verificando...' : 'Verificar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};