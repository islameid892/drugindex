import { useState } from 'react';

/**
 * Shared hook for managing Alternative modal state
 * Reusable across DrugGridCard, DrugListCard, and DetailView
 */
export const useAlternativesModal = () => {
  const [showAlternatives, setShowAlternatives] = useState(false);

  const handleOpenAlternatives = () => {
    setShowAlternatives(true);
  };

  const handleCloseAlternatives = () => {
    setShowAlternatives(false);
  };

  return {
    showAlternatives,
    handleOpenAlternatives,
    handleCloseAlternatives,
    setShowAlternatives,
  };
};
