import { useState, useCallback } from 'react';

interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseConfirmDialogOptions>({
    title: "",
    description: "",
  });
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  const confirm = useCallback((
    confirmOptions: UseConfirmDialogOptions,
    callback: () => void
  ) => {
    return new Promise<boolean>((resolve) => {
      setOptions(confirmOptions);
      setOnConfirmCallback(() => () => {
        callback();
        resolve(true);
      });
      setIsOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setOnConfirmCallback(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (onConfirmCallback) {
      onConfirmCallback();
    }
    handleClose();
  }, [onConfirmCallback, handleClose]);

  return {
    isOpen,
    options,
    handleClose,
    handleConfirm,
    confirm,
  };
}