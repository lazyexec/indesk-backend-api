import stripe from "../../configs/stripe";
import logger from "../../utils/logger";
const processWebHookStripe = async (event: any) => {
  switch (event.type) {
    case "payment_intent.succeeded":
    case "checkout.session.completed": {
      // await sessionsService.confirmPayment(event);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      break;
    }
  }
};

export default {
  processWebHookStripe,
};
