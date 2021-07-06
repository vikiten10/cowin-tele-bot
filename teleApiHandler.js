"use strict";
const AWS = require("aws-sdk");
const sendMessage = require("./functions/sendMessage.js");

module.exports.main = async (event) => {
  const eventBody = JSON.parse(event.body);
  console.log(JSON.stringify({ teleApiBody: eventBody }));

  const isStart =
    eventBody.message.text === "/start" &&
    eventBody.message.entities[0].type === "bot_command";

  const isReg =
    eventBody.message.text === "/register" &&
    eventBody.message.entities[0].type === "bot_command";

  const isReply = eventBody.message.reply_to_message;
  const isRegConf = isReply
    ? eventBody.message.reply_to_message.from.id ===
        parseInt(process.env.BOT_ID) &&
      eventBody.message.reply_to_message.from.is_bot === true &&
      eventBody.message.reply_to_message.from.username ===
        process.env.BOT_USERNAME
    : false;

  const userId = eventBody.message.from.id;

  if (isReg || isRegConf) {
    const name = eventBody.message.from.first_name;
    const text = eventBody.message.text;

    if (isReg) {
      const message = `Hello ${name}, Please enter the State and District separated by a comma.\nFor Example: TamilNadu, Coimbatore.`;
      const options = { reply_markup: { force_reply: true } };
      await sendMessage(userId, message, options);
    } else if (isRegConf) {
      if (text.includes(",")) {
        const dynamoDb = new AWS.DynamoDB();
        const state = text.split(",")[0].trim().toLowerCase().replace(".", "");
        const district = text
          .split(",")[1]
          .trim()
          .toLowerCase()
          .replace(".", "")
          .replace(/\s/g, "");

        const getItemTemplate = {
          Key: {
            userId: {
              N: userId.toString(),
            },
          },
          TableName: "users",
        };
        const isUserAlready = await dynamoDb
          .getItem(getItemTemplate)
          .promise()
          .then((res) => (res.Item ? true : false))
          .catch((err) => console.log(err));

        if (!isUserAlready) {
          const message = `Hello ${name}, The state you have entered is ${state} and the district is ${district}`;
          await sendMessage(userId, message);

          const getItemTemplate = {
            Key: {
              districtName: {
                S: district,
              },
            },
            TableName: "districts",
          };
          const dataVerification = await dynamoDb
            .getItem(getItemTemplate)
            .promise()
            .then((res) => ({
              isDistrictExist: res.Item ? true : false,
              districtId: res.Item.districtId.N,
            }))
            .catch((err) => console.log(err));

          if (dataVerification.isDistrictExist) {
            const putItemTemplate = {
              TableName: "users",
              Item: {
                userId: {
                  N: userId.toString(),
                },
                userState: {
                  S: state,
                },
                userDistrict: {
                  S: district,
                },
                districtId: {
                  N: dataVerification.districtId,
                },
              },
            };
            await dynamoDb
              .putItem(putItemTemplate)
              .promise()
              .then(async (_res) => {
                await sendMessage(userId, "User Registered successfully");
              })
              .catch(async (err) => {
                console.log(err);
                await sendMessage(
                  userId,
                  "Some error has occured, cannot register you."
                );
              });
          } else {
            await sendMessage(
              userId,
              "The district you have entered does not exist in our database, please retry /register with correct spelling or a valid district."
            );
          }
        } else {
          await sendMessage(
            userId,
            "Hey you already have a registration. you will be notified when slots are available"
          );
        }
      } else {
        await sendMessage(
          userId,
          "Please retry with /register and enter a valid state and district separated by a comma"
        );
      }
    }
  } else if (isStart) {
    await sendMessage(
      userId,
      "Hello I'm a bot designed to help you out with cowin registration, I can help you with vaccine registration by informing you about the slots availability, go on and register yourself by using the /register command"
    );
  } else {
    await sendMessage(
      userId,
      "Please use the /start command to start and know me better."
    );
  }

  return {
    statusCode: 200,
    body: "Function Executed successfully",
  };
};
