import { FlexPlugin } from "flex-plugin";
const request = require("request");

const PLUGIN_NAME = "PostCallSurveyPlugin";

export default class PostCallSurveyPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */
  init(flex, manager) {
    /**
     * When the agent "hangs up", a request is made to a Function that sends the
     * customer's call to the survey.
     * As a result, the conference completes and the agent call ends.
     */
    flex.Actions.replaceAction("HangupCall", (payload, original) => {
      // only modify action behavior for voice calls with this attribute
      if (
        payload.task.attributes.postCallSurvey &&
        payload.task.channelType === "voice"
      ) {
        let customerCallSid = payload.task.attributes.conference.participants.customer;

        let requestURL = `https://${manager.configuration.serviceBaseUrl}/postCallSurvey?`;
        requestURL += `action=redirectCustomerToSurvey`;
        requestURL += `&CustomerCallSid=${customerCallSid}`;
        requestURL += `&TaskSid=${payload.task.taskSid}`;

        request.post(requestURL, (err, response, body) => {
          /**
           * the customer leaving the conference will end the conference
           * resuling in the agent call ending
           */
        });
      } else {
        // perform the default hangup behavior
        original(payload);
      }
    });
  }
}
