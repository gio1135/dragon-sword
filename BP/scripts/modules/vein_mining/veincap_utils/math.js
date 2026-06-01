function randomWholeNum(min, max) {
  let result = Math.random() * (max - min) + min;
  return Math.round(result);
}
function randomNum(min, max) {
  return Math.random() * (max - min) + min;
}
export {
  randomNum,
  randomWholeNum
};
