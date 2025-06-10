import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  Button,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  CloudOff,
  CloudDone,
  Sync,
  SyncProblem,
  Refresh,
  Storage,
  Info,
  Warning,
  Error as ErrorIcon,
  CheckCircle
} from '@mui/icons-material';
import { syncManager } from '../services/SyncManager';
import { offlineStorage } from '../services/OfflineStorage';

interface OfflineStatusProps {
  terminalId: string;
}

interface SyncStatus {
  isOnline: boolean;
  syncInProgress: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
}

const OfflineStatusIndicator: React.FC<OfflineStatusProps> = ({ terminalId }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    syncInProgress: false,
    pendingCount: 0,
    lastSyncTime: null
  });
  const [showDetails, setShowDetails] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateSyncStatus = async () => {
      try {
        const status = await syncManager.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Failed to get sync status:', error);
      }
    };

    // Initial load
    updateSyncStatus();

    // Set up event listeners
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Update sync status periodically
    const interval = setInterval(updateSyncStatus, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    try {
      await syncManager.manualSync();
      const status = await syncManager.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const handleShowDetails = async () => {
    try {
      // Get storage information
      const orders = await offlineStorage.getAll('orders');
      const customers = await offlineStorage.getAll('customers');
      const queue = await offlineStorage.getPendingSyncItems();
      const logs = await offlineStorage.getAll('logs');

      setStorageInfo({
        orders: orders.length,
        customers: customers.length,
        pendingSync: queue.length,
        logs: logs.length,
        lastCleanup: await offlineStorage.getConfig('lastCleanup')
      });
      setShowDetails(true);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'error';
    if (syncStatus.pendingCount > 0) return 'warning';
    return 'success';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff />;
    if (syncStatus.syncInProgress) return <Sync className="rotating" />;
    if (syncStatus.pendingCount > 0) return <SyncProblem />;
    return <CloudDone />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Sincronizando...';
    if (syncStatus.pendingCount > 0) return `${syncStatus.pendingCount} pendentes`;
    return 'Online';
  };

  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <Chip
                icon={getStatusIcon()}
                label={getStatusText()}
                color={getStatusColor()}
                variant={isOnline ? 'filled' : 'outlined'}
                sx={{ mr: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                Terminal {terminalId}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title="Detalhes do armazenamento">
                <IconButton size="small" onClick={handleShowDetails}>
                  <Storage />
                </IconButton>
              </Tooltip>
              
              {isOnline && (
                <Tooltip title="Sincronizar agora">
                  <IconButton 
                    size="small" 
                    onClick={handleManualSync}
                    disabled={syncStatus.syncInProgress}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {syncStatus.syncInProgress && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary">
                Sincronizando dados com o servidor...
              </Typography>
            </Box>
          )}

          {!isOnline && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Você está trabalhando offline. Todas as operações serão sincronizadas quando a conexão for restaurada.
              </Typography>
            </Alert>
          )}

          {isOnline && syncStatus.pendingCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Existem {syncStatus.pendingCount} operações aguardando sincronização.
              </Typography>
            </Alert>
          )}

          {syncStatus.lastSyncTime && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Última sincronização: {new Date(syncStatus.lastSyncTime).toLocaleString()}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Storage Details Dialog */}
      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Storage sx={{ mr: 1 }} />
            Armazenamento Local - Terminal {terminalId}
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {storageInfo && (
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Pedidos Armazenados"
                  secondary={`${storageInfo.orders} pedidos salvos localmente`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Clientes Cadastrados"
                  secondary={`${storageInfo.customers} clientes no cache local`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  {storageInfo.pendingSync > 0 ? 
                    <Warning color="warning" /> : 
                    <CheckCircle color="success" />
                  }
                </ListItemIcon>
                <ListItemText
                  primary="Operações Pendentes"
                  secondary={`${storageInfo.pendingSync} operações aguardando sincronização`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Info color="info" />
                </ListItemIcon>
                <ListItemText
                  primary="Logs do Sistema"
                  secondary={`${storageInfo.logs} entradas de log armazenadas`}
                />
              </ListItem>

              {storageInfo.lastCleanup && (
                <ListItem>
                  <ListItemIcon>
                    <Info color="info" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Última Limpeza"
                    secondary={new Date(storageInfo.lastCleanup).toLocaleString()}
                  />
                </ListItem>
              )}
            </List>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              O sistema mantém dados locais para garantir funcionamento offline. 
              Os dados são sincronizados automaticamente quando online.
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .rotating {
          animation: rotate 1s linear infinite;
        }
      `}</style>
    </>
  );
};

export default OfflineStatusIndicator;

