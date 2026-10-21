const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateRoomId = () => {
  let result = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * ALPHANUMERIC.length);
    result += ALPHANUMERIC.charAt(randomIndex);
  }
  return result;
};

module.exports = generateRoomId;
