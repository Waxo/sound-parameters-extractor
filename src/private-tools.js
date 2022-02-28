/**
 * Convert percent to the right divider
 * @param {String} percentage - Percentage to convert
 * @return {number}
 * @private
 */
const retrievePercent_ = (percentage) => {
  percentage = Number(percentage.replace('%', ''));
  return 100 / percentage;
};

export {retrievePercent_};
