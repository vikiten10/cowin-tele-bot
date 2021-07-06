const axios = require("axios");

module.exports = async (
  chatId,
  text,
  otherOptions = undefined,
  teleBaseUrl = `https://api.telegram.org/bot${process.env.TOKEN}`,
  sendMessageEp = "/sendMessage"
) => {
  const data = { chat_id: chatId, text };

  if (otherOptions) {
    for (key in otherOptions) {
      data[key] = otherOptions[key];
    }
  }

  return axios.post(teleBaseUrl + sendMessageEp, data);
};
