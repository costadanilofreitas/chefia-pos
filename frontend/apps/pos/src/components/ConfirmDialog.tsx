import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box
} from '@mui/material';
import { Warning, Info, Error, CheckCircle } from '@mui/icons-material';

export type ConfirmDialogType = 'warning' | 'info' | 'error' | 'success';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  type?: ConfirmDialogType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <Warning sx={{ color: 'warning.main', fontSize: 40 }} />;
      case 'error':
        return <Error sx={{ color: 'error.main', fontSize: 40 }} />;
      case 'success':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 40 }} />;
      case 'info':
      default:
        return <Info sx={{ color: 'info.main', fontSize: 40 }} />;
    }
  };

  const getConfirmColor = () => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minWidth: 320
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getIcon()}
          <Box>{title}</Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: 'pre-wrap' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          color="inherit"
        >
          {cancelText}
        </Button>
        <Button
          onClick={() => {
            onConfirm();
            onCancel(); // Close dialog after confirm
          }}
          variant="contained"
          color={getConfirmColor()}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;

// Hook for easy usage
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    type?: ConfirmDialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    open: false,
    title: '',
    message: ''
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      type?: ConfirmDialogType;
      confirmText?: string;
      cancelText?: string;
    }
  ) => {
    setDialogState({
      open: true,
      title,
      message,
      onConfirm,
      ...options
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, open: false }));
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      open={dialogState.open}
      title={dialogState.title}
      message={dialogState.message}
      type={dialogState.type}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      onConfirm={() => {
        dialogState.onConfirm?.();
        closeDialog();
      }}
      onCancel={closeDialog}
    />
  );

  return {
    showConfirm,
    ConfirmDialogComponent
  };
};