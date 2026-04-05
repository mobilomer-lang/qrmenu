import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface PriceDisplayProps {
  price: number;
  className?: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ price, className = "" }) => {
  const { language, convertPrice } = useLanguage();

  const formatTRY = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const getSecondaryPrice = () => {
    switch (language) {
      case 'en':
        return convertPrice(price, 'USD');
      case 'de':
        return convertPrice(price, 'EUR');
      case 'ar':
        return convertPrice(price, 'SAR');
      default:
        return null;
    }
  };

  const secondaryPrice = getSecondaryPrice();

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="font-bold text-green-600 dark:text-green-400">
        {formatTRY(price)}
      </span>
      {secondaryPrice && (
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          ({secondaryPrice})
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;
