export const arrAdd = function (arr) {
  // [[1,2], [2,3]]
  return arr.map(function (el) {
    return el[0] + el[1];
  });
};
