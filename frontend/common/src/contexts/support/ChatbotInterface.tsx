import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, TextField, Tabs, Tab, CircularProgress, Divider, Chip } from '@mui/material';
import { 
  Chat as ChatIcon, 
  QuestionAnswer as QuestionAnswerIcon,
  Article as ArticleIcon,
  Search as SearchIcon,
  Send as SendIcon
} from '@mui/icons-material';

const ChatbotInterface = ({ restaurantId, userId }) => {
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [suggestedArticles, setSuggestedArticles] = useState([]);
  const [knowledgeArticles, setKnowledgeArticles] = useState([]);

  // Simular carregamento de artigos populares
  useEffect(() => {
    // Em produção, isso seria uma chamada de API
    setKnowledgeArticles([
      {
        id: 'article-1',
        title: 'Como configurar uma impressora',
        summary: 'Guia passo a passo para configurar diferentes modelos de impressoras com o POS Modern.',
        category: 'hardware',
        view_count: 245
      },
      {
        id: 'article-2',
        title: 'Resolução de problemas comuns',
        summary: 'Soluções para os problemas mais frequentes reportados pelos usuários.',
        category: 'troubleshooting',
        view_count: 189
      },
      {
        id: 'article-3',
        title: 'Guia de início rápido',
        summary: 'Como começar a usar o POS Modern em menos de 10 minutos.',
        category: 'getting-started',
        view_count: 312
      }
    ]);
  }, []);

  // Iniciar chat
  const startNewChat = async () => {
    setLoading(true);
    
    try {
      // Em produção, isso seria uma chamada de API
      // const response = await api.post('/api/support/chats', { restaurant_id: restaurantId });
      // setActiveChat(response.data);
      
      // Simulação de resposta
      setTimeout(() => {
        setActiveChat({
          id: 'chat-' + Date.now(),
          status: 'active',
          messages: [
            {
              id: 'msg-1',
              content: 'Olá! Bem-vindo ao suporte do POS Modern. Como posso ajudar você hoje?',
              sender_type: 'bot',
              created_at: new Date().toISOString()
            }
          ]
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao iniciar chat:', error);
      setLoading(false);
    }
  };

  // Enviar mensagem
  const sendMessage = async () => {
    if (!message.trim() || !activeChat) return;
    
    // Adicionar mensagem do usuário localmente para feedback imediato
    const userMessage = {
      id: 'msg-' + Date.now(),
      content: message,
      sender_type: 'user',
      created_at: new Date().toISOString()
    };
    
    setActiveChat(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));
    
    setMessage('');
    setLoading(true);
    
    try {
      // Em produção, isso seria uma chamada de API
      // const response = await api.post(`/api/support/chats/${activeChat.id}/messages`, {
      //   content: message,
      //   sender_type: 'user'
      // });
      
      // Simulação de resposta do bot
      setTimeout(() => {
        // Gerar resposta baseada na mensagem do usuário
        let botResponse = '';
        let articles = [];
        
        const userMessageLower = message.toLowerCase();
        
        if (userMessageLower.includes('impressora') || userMessageLower.includes('imprimir')) {
          botResponse = 'Problemas com impressora são comuns. Verifique se a impressora está conectada corretamente e se os drivers estão atualizados. Também recomendo verificar nosso artigo sobre configuração de impressoras.';
          articles = [knowledgeArticles[0]];
        } else if (userMessageLower.includes('erro') || userMessageLower.includes('problema') || userMessageLower.includes('não funciona')) {
          botResponse = 'Sinto muito que você esteja enfrentando problemas. Poderia fornecer mais detalhes sobre o erro específico? Enquanto isso, recomendo verificar nosso guia de resolução de problemas comuns.';
          articles = [knowledgeArticles[1]];
        } else if (userMessageLower.includes('começar') || userMessageLower.includes('iniciar') || userMessageLower.includes('novo')) {
          botResponse = 'Para começar a usar o POS Modern, recomendo nosso guia de início rápido que explica as funcionalidades básicas em poucos passos.';
          articles = [knowledgeArticles[2]];
        } else {
          botResponse = 'Entendi sua pergunta. Posso ajudar com informações sobre configuração, uso diário, relatórios, ou solução de problemas do POS Modern. Poderia especificar mais o que você precisa?';
        }
        
        const botMessage = {
          id: 'msg-bot-' + Date.now(),
          content: botResponse,
          sender_type: 'bot',
          created_at: new Date().toISOString()
        };
        
        setActiveChat(prev => ({
          ...prev,
          messages: [...prev.messages, botMessage]
        }));
        
        setSuggestedArticles(articles);
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setLoading(false);
    }
  };

  // Pesquisar na base de conhecimento
  const searchKnowledge = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    
    try {
      // Em produção, isso seria uma chamada de API
      // const response = await api.get(`/api/support/search?query=${searchQuery}&restaurant_id=${restaurantId}`);
      // setSearchResults(response.data);
      
      // Simulação de resultados de pesquisa
      setTimeout(() => {
        setSearchResults({
          articles: knowledgeArticles.filter(article => 
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.summary.toLowerCase().includes(searchQuery.toLowerCase())
          ),
          tickets: [
            {
              id: 'ticket-1',
              subject: 'Problema com integração de pagamento',
              status: 'open',
              created_at: '2025-05-20T14:30:00Z'
            }
          ]
        });
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao pesquisar:', error);
      setLoading(false);
    }
  };

  // Visualizar artigo
  const viewArticle = (articleId) => {
    // Em produção, isso navegaria para a página do artigo
    console.log('Visualizando artigo:', articleId);
  };

  // Renderizar mensagens do chat
  const renderChatMessages = () => {
    if (!activeChat) return null;
    
    return (
      <Box sx={{ mb: 2, maxHeight: '400px', overflowY: 'auto', p: 2 }}>
        {activeChat.messages.map((msg) => (
          <Box 
            key={msg.id}
            sx={{
              display: 'flex',
              justifyContent: msg.sender_type === 'user' ? 'flex-end' : 'flex-start',
              mb: 2
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: '80%',
                backgroundColor: msg.sender_type === 'user' ? '#e3f2fd' : '#f5f5f5',
                borderRadius: 2
              }}
            >
              <Typography variant="body1">{msg.content}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {new Date(msg.created_at).toLocaleTimeString()}
              </Typography>
            </Paper>
          </Box>
        ))}
      </Box>
    );
  };

  // Renderizar artigos sugeridos
  const renderSuggestedArticles = () => {
    if (suggestedArticles.length === 0) return null;
    
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Artigos recomendados:
        </Typography>
        {suggestedArticles.map((article) => (
          <Paper 
            key={article.id}
            sx={{ p: 2, mb: 1, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
            onClick={() => viewArticle(article.id)}
          >
            <Typography variant="subtitle1">{article.title}</Typography>
            <Typography variant="body2" color="text.secondary">{article.summary}</Typography>
          </Paper>
        ))}
      </Box>
    );
  };

  // Renderizar resultados de pesquisa
  const renderSearchResults = () => {
    if (!searchResults) return null;
    
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resultados da pesquisa
        </Typography>
        
        {searchResults.articles.length > 0 ? (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Artigos ({searchResults.articles.length})
            </Typography>
            {searchResults.articles.map((article) => (
              <Paper 
                key={article.id}
                sx={{ p: 2, mb: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
                onClick={() => viewArticle(article.id)}
              >
                <Typography variant="subtitle1">{article.title}</Typography>
                <Typography variant="body2" color="text.secondary">{article.summary}</Typography>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip label={article.category} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {article.view_count} visualizações
                  </Typography>
                </Box>
              </Paper>
            ))}
          </>
        ) : (
          <Typography variant="body1" color="text.secondary">
            Nenhum artigo encontrado para "{searchQuery}"
          </Typography>
        )}
        
        {searchResults.tickets.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
              Tickets relacionados ({searchResults.tickets.length})
            </Typography>
            {searchResults.tickets.map((ticket) => (
              <Paper key={ticket.id} sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle1">{ticket.subject}</Typography>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip 
                    label={ticket.status} 
                    size="small"
                    color={ticket.status === 'open' ? 'primary' : 'default'}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Criado em {new Date(ticket.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </>
        )}
      </Box>
    );
  };

  // Renderizar lista de artigos populares
  const renderKnowledgeArticles = () => {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Artigos populares
        </Typography>
        
        {knowledgeArticles.map((article) => (
          <Paper 
            key={article.id}
            sx={{ p: 2, mb: 2, cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5' } }}
            onClick={() => viewArticle(article.id)}
          >
            <Typography variant="subtitle1">{article.title}</Typography>
            <Typography variant="body2" color="text.secondary">{article.summary}</Typography>
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Chip label={article.category} size="small" />
              <Typography variant="caption" color="text.secondary">
                {article.view_count} visualizações
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Central de Suporte
      </Typography>
      
      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 3 }}
      >
        <Tab icon={<ChatIcon />} label="Chat" />
        <Tab icon={<ArticleIcon />} label="Base de Conhecimento" />
        <Tab icon={<SearchIcon />} label="Pesquisar" />
      </Tabs>
      
      {/* Tab de Chat */}
      {tabValue === 0 && (
        <Box>
          {!activeChat ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <QuestionAnswerIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Precisa de ajuda?
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Inicie uma conversa com nosso assistente virtual para obter suporte.
              </Typography>
              <Button
                variant="contained"
                onClick={startNewChat}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <ChatIcon />}
              >
                Iniciar conversa
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Conversa com Assistente
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {renderChatMessages()}
                  
                  <Box sx={{ display: 'flex', mt: 2 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Digite sua mensagem..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={loading}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      sx={{ ml: 1 }}
                      onClick={sendMessage}
                      disabled={!message.trim() || loading}
                    >
                      {loading ? <CircularProgress size={24} /> : <SendIcon />}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Recursos
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  {renderSuggestedArticles()}
                  
                  <Box sx={{ mt: suggestedArticles.length > 0 ? 4 : 0 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Precisa de mais ajuda?
                    </Typography>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mb: 1 }}
                      onClick={() => {
                        // Em produção, isso criaria um ticket
                        console.log('Criar ticket');
                      }}
                    >
                      Criar ticket de suporte
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        // Em produção, isso transferiria para um atendente humano
                        console.log('Transferir para humano');
                      }}
                    >
                      Falar com atendente
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}
      
      {/* Tab de Base de Conhecimento */}
      {tabValue === 1 && (
        <Box>
          {renderKnowledgeArticles()}
        </Box>
      )}
      
      {/* Tab de Pesquisa */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: 'flex', mb: 3 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Pesquisar na base de conhecimento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchKnowledge()}
            />
            <Button
              variant="contained"
              sx={{ ml: 1 }}
              onClick={searchKnowledge}
              disabled={!searchQuery.trim() || loading}
            >
              {loading ? <CircularProgress size={24} /> : <SearchIcon />}
            </Button>
          </Box>
          
          {renderSearchResults()}
        </Box>
      )}
    </Box>
  );
};

export default ChatbotInterface;
