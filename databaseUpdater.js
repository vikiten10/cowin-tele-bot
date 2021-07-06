const AWS = require("aws-sdk");
const dataCollector = require("./functions/statesDistrictsDataCollector.js");

module.exports.main = async (_event) => {
  const dbClient = new AWS.DynamoDB();
  const statesListUrl = "/v2/admin/location/states";
  const districtListUrl = "/v2/admin/location/districts";
  const headers = {
    "Accept-Language": "en_US",
    Accept: "application/json",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
  };
  const options = { headers: headers };
  let details = await dataCollector(statesListUrl, districtListUrl, options);
  console.log(JSON.stringify(details));

  const template = { TableName: "districts", Item: {} };

  if (!details.isError) {
    for (const data of details.data) {
      let itemData = {
        districtId: { N: data.district_id.toString() },
        districtName: {
          S: data.district_name.toLowerCase().replace(/\s/g, "").trim(),
        },
      };

      template.Item = itemData;
      await dbClient
        .putItem(template)
        .promise()
        .then(() => {})
        .catch((err) => console.log(err));
    }
  }

  return {
    statusCode: 200,
    body: "Function Executed successfully",
  };
};
