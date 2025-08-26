import { useEffect, useState, useCallback, useRef } from 'react';

interface VoiceCommand {
  phrases: string[];
  action: (_transcript: string) => void;
  description?: string;
}

interface UseVoiceCommandsOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoStart?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error) => void;
  onResult?: (_transcript: string) => void;
}

// Check if browser supports speech recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

export const useVoiceCommands = (
  commands: VoiceCommand[],
  options: UseVoiceCommandsOptions = {}
) => {
  const {
    language = 'pt-BR',
    continuous = false,
    interimResults = false,
    autoStart = false,
    onStart,
    onEnd,
    onError,
    onResult
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(isSpeechRecognitionSupported);
  
  const recognition = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize speech recognition
  useEffect(() => {
    if (!isSpeechRecognitionSupported) {
// console.warn('Speech recognition is not supported in this browser');
      setIsSupported(false);
      return;
    }

    recognition.current = new SpeechRecognition();
    recognition.current.lang = language;
    recognition.current.continuous = continuous;
    recognition.current.interimResults = interimResults;

    // Handle results
    recognition.current.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        setInterimTranscript('');
        processCommand(finalTranscript);
        onResult?.(finalTranscript);
        
        // Clear transcript after processing
        timeoutRef.current = setTimeout(() => {
          setTranscript('');
        }, 3000);
      }
    };

    // Handle start
    recognition.current.onstart = () => {
      setIsListening(true);
      onStart?.();
    };

    // Handle end
    recognition.current.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      onEnd?.();
      
      // Auto restart if continuous mode
      if (continuous && isListening) {
        recognition.current.start();
      }
    };

    // Handle errors
    recognition.current.onerror = (event) => {
// console.error('Speech recognition error:', event.error);
      setIsListening(false);
      onError?.(event.error);
      
      // Handle specific errors
      switch (event.error) {
        case 'not-allowed':
// console.error('Microphone permission denied');
          break;
        case 'no-speech':
// console.log('No speech detected');
          break;
        case 'network':
// console.error('Network error');
          break;
      }
    };

    // Auto start if enabled
    if (autoStart) {
      startListening();
    }

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, continuous, interimResults, autoStart, onStart, onEnd, onError, onResult]);

  // Process voice command
  const processCommand = useCallback((transcript: string) => {
    const normalizedTranscript = transcript.toLowerCase().trim();
    
    for (const command of commands) {
      for (const phrase of command.phrases) {
        const normalizedPhrase = phrase.toLowerCase();
        
        // Check for exact match or contains
        if (normalizedTranscript === normalizedPhrase || 
            normalizedTranscript.includes(normalizedPhrase)) {
          command.action(transcript);
          return;
        }
        
        // Check for fuzzy match (basic implementation)
        if (fuzzyMatch(normalizedTranscript, normalizedPhrase)) {
          command.action(transcript);
          return;
        }
      }
    }
  }, [commands]);

  // Start listening
  const startListening = useCallback(() => {
    if (!isSupported || !recognition.current) {
// console.warn('Speech recognition not available');
      return;
    }

    try {
      recognition.current.start();
    } catch {
// console.error('Failed to start speech recognition:', error);
    }
  }, [isSupported]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognition.current && isListening) {
      recognition.current.stop();
    }
  }, [isListening]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    toggleListening
  };
};

// Basic fuzzy matching for voice commands
const fuzzyMatch = (str1: string, str2: string, threshold = 0.8): boolean => {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || levenshteinSimilarity(word1, word2) > threshold) {
        matches++;
        break;
      }
    }
  }
  
  return matches / Math.max(words1.length, words2.length) > threshold;
};

// Levenshtein distance for word similarity
const levenshteinSimilarity = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[str2.length][str1.length];
  const maxLength = Math.max(str1.length, str2.length);
  
  return 1 - distance / maxLength;
};

// Predefined POS voice commands in Portuguese
export const posVoiceCommands = {
  navigation: [
    { phrases: ['abrir pedidos', 'mostrar pedidos'], description: 'Abrir tela de pedidos' },
    { phrases: ['abrir caixa', 'mostrar caixa'], description: 'Abrir tela do caixa' },
    { phrases: ['abrir produtos', 'mostrar produtos'], description: 'Abrir catálogo de produtos' },
    { phrases: ['voltar', 'anterior'], description: 'Voltar para tela anterior' }
  ],
  
  order: [
    { phrases: ['novo pedido', 'criar pedido'], description: 'Criar novo pedido' },
    { phrases: ['adicionar', 'mais um'], description: 'Adicionar item ao pedido' },
    { phrases: ['remover', 'tirar'], description: 'Remover item do pedido' },
    { phrases: ['finalizar pedido', 'fechar pedido'], description: 'Finalizar pedido atual' },
    { phrases: ['cancelar pedido'], description: 'Cancelar pedido atual' }
  ],
  
  payment: [
    { phrases: ['pagar', 'pagamento'], description: 'Ir para pagamento' },
    { phrases: ['dinheiro', 'pagar em dinheiro'], description: 'Pagamento em dinheiro' },
    { phrases: ['cartão', 'pagar com cartão'], description: 'Pagamento com cartão' },
    { phrases: ['pix', 'pagar com pix'], description: 'Pagamento via PIX' }
  ],
  
  search: [
    { phrases: ['buscar', 'procurar', 'pesquisar'], description: 'Ativar busca' },
    { phrases: ['limpar busca', 'limpar pesquisa'], description: 'Limpar campo de busca' }
  ],
  
  help: [
    { phrases: ['ajuda', 'comandos', 'o que posso dizer'], description: 'Mostrar comandos disponíveis' },
    { phrases: ['parar', 'parar de ouvir'], description: 'Parar reconhecimento de voz' }
  ]
};