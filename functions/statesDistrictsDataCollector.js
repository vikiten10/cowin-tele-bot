const axios = require("axios");

module.exports = async (
  statesUrl,
  districtUrl,
  options,
  baseUrl = "https://cdn-api.co-vin.in/api"
) => {
  let states = await axios
    .get(baseUrl + statesUrl, options)
    .then((res) => {
      return { isError: false, data: res.data.states };
    })
    .catch((err) => {
      console.log(
        JSON.stringify({ statesApiErrorResponse: err.response.data })
      );
      return { isError: true, data: err.response.data };
    });

  if (!states.isError) {
    const districtsRequest = [];

    for (let i = 0; i < states.data.length; i++) {
      let requestUrl = baseUrl + districtUrl + `/${states.data[i].state_id}`;
      districtsRequest.push(axios.get(requestUrl, options));
    }

    let totalData = await axios
      .all(districtsRequest)
      .then((responses) => {
        if (responses.length === states.data.length) {
          let totalResponseObject = [];
          for (let i = 0; i < responses.length; i++) {
            totalResponseObject = totalResponseObject.concat(
              responses[i].data.districts
            );
          }

          return { isError: false, data: totalResponseObject };
        }

        return {
          isError: true,
          data: "Number of requests and responses does not match",
        };
      })
      .catch((errors) => {
        console.log(errors);
        return { isError: true, data: errors };
      });

    return totalData;
  }
};
