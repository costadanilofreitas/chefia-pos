import { memo, useState } from 'react';
import { TouchButton } from '../ui/TouchButton';

interface CustomerInfoFormProps {
  onSubmit: (info: { name: string; phone?: string }) => void;
  className?: string;
}

/**
 * Customer information form component
 */
export const CustomerInfoForm = memo<CustomerInfoFormProps>(({ 
  onSubmit,
  className = ''
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({
        name: name.trim(),
        ...(phone.trim() && { phone: phone.trim() })
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Nome *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Digite seu nome"
          className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-lg"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          Telefone (opcional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(00) 00000-0000"
          className="w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-lg"
        />
      </div>

      <TouchButton
        type="submit"
        variant="primary"
        size="large"
        className="w-full"
        disabled={!name.trim()}
      >
        Continuar para Pagamento
      </TouchButton>
    </form>
  );
});