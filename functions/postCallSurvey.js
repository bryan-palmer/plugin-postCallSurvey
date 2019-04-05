exports.handler = function(context, event, callback) {
  let client = context.getTwilioClient(),
    twiml = new Twilio.twiml.VoiceResponse(),
    taskSid = event.TaskSid,
    action = event.action,
    customerCallSid = event.CustomerCallSid || null,
    digits = event.Digits || null,
    baseUrl = `https://${context.DOMAIN_NAME}/postCallSurvey?TaskSid=${taskSid}&action=`;

  switch (action) {
    case "redirectCustomerToSurvey":
      // Set CORS to allow Flex to make request to a different domain
      const response = new Twilio.Response();
      response.appendHeader("Access-Control-Allow-Origin", "*");
      response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST");
      response.appendHeader("Content-Type", "application/json");
      response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

      // update the customer's call to point to some TwiML
      client
        .calls(customerCallSid)
        .update({
          method: "POST",
          url: `${baseUrl}initiateSurvey`
        })
        .then(call => {
          response.setBody("complete");

          callback(null, response);
        });
      break;

    case "initiateSurvey":
      twiml.say("Welcome to the customer survey!");

      // Ask the question, and gather the single digit keypress response.
      // When complete, the response will be sent to this function.
      const gather = twiml.gather({
        action: `${baseUrl}surveyComplete`,
        method: "POST",
        input: "dtmf",
        numDigits: 1
      });

      gather.say('On a scale of 1 to 5, how satisfied were you with your experience?');

      // return TwiML
      callback(null, twiml);

      break;

    case "surveyComplete":
      // Now that the survey is complete, the task attributes need to be updated.
      // To do this, first the current attributes need to be retrieved.
      client.taskrouter
        .workspaces(context.WORKSPACE_SID)
        .tasks(taskSid)
        .fetch()
        .then(task => {
          // define new attributes
          let currentAttributes = JSON.parse(task.attributes);

          // add response
          currentAttributes.assessments = [{
                answer: digits,
                category: "Customer Surveys",
                metric: "CSAT",
                type: "Satisfaction",
                score: digits
            }];

          // update task with new attributes
          client.taskrouter
            .workspaces(context.WORKSPACE_SID)
            .tasks(taskSid)
            .update({
              attributes: JSON.stringify(currentAttributes)
            })
            .then(task => {
              // Thank customer and hang up.
              twiml.say("Thank you for your feedback. Goodbye!");
              callback(null, twiml);
            });
        });

      break;
  }
};
