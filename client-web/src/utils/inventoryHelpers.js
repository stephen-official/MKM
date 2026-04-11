/**
 * Converts any unit quantity to the Base Unit quantity
 * @param {number} inputQty - The number entered by user
 * @param {object} selectedUnit - The subunit object { factorToBase: 0.001, name: 'Grams' }
 * @returns {number} - The quantity in Base Unit (e.g., KG)
 */
export const calculateBaseQty = (inputQty, selectedUnit) => {
  if (!selectedUnit || !selectedUnit.factorToBase) return inputQty;
  return parseFloat(inputQty) * selectedUnit.factorToBase;
};
