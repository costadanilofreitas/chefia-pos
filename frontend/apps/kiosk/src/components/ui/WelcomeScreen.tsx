import { motion } from 'framer-motion';
import {
  ChevronRight,
  Clock,
  MapPin,
  Star
} from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTerminalConfig } from '../../contexts/TerminalConfigContext';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useHapticFeedback } from '../../hooks/useHapticFeedback';
import { offlineStorage } from '../../services/offlineStorage';
import { Text } from './Text';

interface WelcomeScreenProps {
  onStart: () => void;
  restaurantName?: string;
  welcomeMessage?: string;
  autoStartDelay?: number;
}

/**
 * Modern welcome screen with animated background and professional design
 */
export const WelcomeScreen = memo<WelcomeScreenProps>(({
  onStart,
  restaurantName,
  welcomeMessage,
  autoStartDelay
}) => {
  const haptic = useHapticFeedback();
  const { enterFullscreen } = useFullscreen();
  const { config: terminalConfig } = useTerminalConfig();
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Use terminal config values or fallbacks
  const title = restaurantName || terminalConfig?.ui?.welcomeScreen?.title || 'Chefia Gourmet';
  const message = welcomeMessage || terminalConfig?.ui?.welcomeScreen?.customMessage || 'Faça seu pedido de forma rápida e prática';
  const _delay = autoStartDelay || (terminalConfig?.ui?.welcomeScreen?.autoStartDelay || 60) * 1000;
  
  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Debug - remover após teste
  useEffect(() => {
    offlineStorage.log('WelcomeScreen mounted', {
      config: terminalConfig,
      hasBackgroundImage: !!terminalConfig?.ui?.welcomeScreen?.backgroundImage
    });
  }, [terminalConfig]);


  const handleStart = () => {
    haptic.medium();
    if (terminalConfig?.features?.enableFullscreen) {
      enterFullscreen();
    }
    onStart();
  };

  // Background style with custom image or gradient
  const hasBackgroundImage = terminalConfig?.ui?.welcomeScreen?.backgroundImage && 
                             terminalConfig.ui.welcomeScreen.backgroundImage !== '';
  
  const backgroundStyle = hasBackgroundImage
    ? {
        backgroundImage: `url(${terminalConfig.ui.welcomeScreen.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {};

  return (
    <motion.div 
      className="min-h-screen relative overflow-hidden bg-gradient-to-br from-orange-400 via-red-500 to-pink-500"
      style={backgroundStyle}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated Background Shapes */}
      {!hasBackgroundImage && (
        <div className="absolute inset-0">
          <motion.div
            className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
            animate={{
              x: [0, -100, 0],
              y: [0, -50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        </div>
      )}

      {/* Overlay for better readability */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"
        style={{ opacity: hasBackgroundImage ? (terminalConfig?.ui?.welcomeScreen?.overlayOpacity || 0.7) : 0.3 }}
      />

      {/* Top Bar with Info */}
      <div className="absolute top-0 left-0 right-0 p-3 md:p-6 flex justify-between items-center z-20">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-white">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
            <Clock className="w-4 md:w-5 h-4 md:h-5" />
            <span className="text-xs md:text-sm font-bold">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
            <MapPin className="w-4 md:w-5 h-4 md:h-5" />
            <span className="text-xs md:text-sm font-bold">
              {terminalConfig?.location || 'Terminal Principal'}
            </span>
          </div>
        </div>
        
        {/* Restaurant Rating - Hidden on small screens */}
        <div className="hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
          <Star className="w-5 h-5 text-yellow-400 fill-current" />
          <span className="text-white font-bold">4.8</span>
          <span className="text-white/80 text-sm">(2.3k avaliações)</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 md:px-8 py-8">
        {/* Logo/Restaurant Name */}
        <motion.div
          className="mb-4 md:mb-8"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-3xl p-4 md:p-8">
            <Text variant="h1" className="text-white text-center text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-2 md:mb-3">
              {title}
            </Text>
            <Text variant="h3" className="text-white text-center text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold">
              {terminalConfig?.ui?.welcomeScreen?.subtitle || 'Sabor e Qualidade'}
            </Text>
          </div>
        </motion.div>

        {/* Welcome Message */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-8 md:mb-12 max-w-2xl px-4"
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 md:p-6">
            <Text variant="h2" className="text-white text-center text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold">
              {message}
            </Text>
          </div>
        </motion.div>

        {/* Start Button */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <button
            onClick={handleStart}
            className="
              relative z-10
              bg-gradient-to-r from-green-500 to-green-600 text-white 
              hover:from-green-600 hover:to-green-700 
              px-8 md:px-12 lg:px-16 py-4 md:py-6 lg:py-8 
              text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black rounded-2xl md:rounded-3xl 
              shadow-2xl flex items-center gap-3 md:gap-4
              min-w-[280px] md:min-w-[350px] lg:min-w-[400px] justify-center
              transform transition-all duration-200
              active:scale-95 cursor-pointer
            "
          >
            <span>INICIAR PEDIDO</span>
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8 lg:w-10 lg:h-10" />
          </button>

          {/* Pulse Animation - pointer-events-none to not block clicks */}
          <motion.div
            className="absolute inset-0 rounded-3xl bg-green-400 pointer-events-none"
            animate={{
              scale: [1, 1.15, 1.15],
              opacity: [0.3, 0, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          />
        </motion.div>

      </div>


    </motion.div>
  );
});

WelcomeScreen.displayName = 'WelcomeScreen';