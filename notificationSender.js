const AWS = require("aws-sdk");
const axios = require("axios");
const sendMessage = require("./functions/sendMessage.js");

module.exports.main = async (_event) => {
  const dynamoDb = new AWS.DynamoDB();

  const params = {
    TableName: "users",
  };

  let users = [];
  let res;

  do {
    res = await dynamoDb
      .scan(params)
      .promise()
      .then((res) => res)
      .catch((err) => {
        console.log(err);
      });
    if (res.Items.length > 0) {
      users = users.concat(res.Items);
      params.ExclusiveStartKey = res.LastEvaluatedKey;
    }
  } while (typeof res.LastEvaluatedKey === undefined);

  const districts = users.map((element) => {
    return element.districtId.N;
  });
  const uniqueDistricts = Array.from(new Set(districts));
  const axiosRequests = [];

  for (let i = 0; i < uniqueDistricts.length; i++) {
    const reqUrl =
      "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict";
    const options = {
      params: {
        district_id: uniqueDistricts[i],
        date: new Date().toLocaleDateString(undefined, {
          timeZone: "Asia/Kolkata",
        }),
      },
    };
    axiosRequests.push(axios.get(reqUrl, options));
  }

  const districtWiseData = await axios
    .all(axiosRequests)
    .then((responses) => {
      return responses.map((element) => element.data);
    })
    .catch((err) => console.log(err));

  const parsedData = [];

  for (const user of users) {
    const combinedData = {};
    combinedData.userId = user.userId.N;
    combinedData.userDistrict = user.userDistrict.S;

    for (const data of districtWiseData) {
      if (
        combinedData.userDistrict ===
        data.centers[0].district_name.toLowerCase().replace(/\s/g, "").trim()
      ) {
        combinedData.centers = data.centers;
      }
    }
    parsedData.push(combinedData);
  }

  for (const data of parsedData) {
    const axiosPosts = [];
    for (const center of data.centers) {
      let messageString = "";
      for (const session of center.sessions) {
        if (session.available_capacity > 0) {
          messageString += `
        <b>Slot date</b>: ${session.date}
        <b>Vaccine</b>: ${session.vaccine}
        <b>Total vaccines available</b>: ${session.available_capacity}
        <b>Minimum age Limit</b>: ${session.min_age_limit}
        <b>Maximum age Limit</b>: ${session.max_age_limit ?? "-"}
`;
        }
      }

      if (messageString.length != 0) {
        messageString =
          `
<b>Hospital Name</b>: ${center.name}
<b>Hospital Address</b>: ${center.address} - ${center.pincode}
<b>Fee type</b>: ${center.fee_type}` + messageString;

        axiosPosts.push(
          sendMessage(data.userId, messageString, { parse_mode: "HTML" })
        );
      }

      await axios
        .all(axiosPosts)
        .then((_res) => {})
        .catch((err) => console.log(err));
    }
  }

  return {
    statusCode: 200,
    body: "Function Executed successfully",
  };
};
