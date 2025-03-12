import { ActionFunction, json } from "@remix-run/node";
import { Form, useActionData, useSubmit } from "@remix-run/react";
import { Button, Card, Page, TextField } from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import { useState } from "react";
import  prisma  from "../db.server";

export const action: ActionFunction = async ({ request }) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
  
    const title = formData.get("title");
    console.log("Discount Title:", title);
  
    try {
      const friendReward = await prisma.reward.findFirst({
        where: { rewardType: "FRIEND", status: true },
        select: {
          discount: true,
          discountType: true,
          minOrderAmount: true,
        },
      });
  
      if (!friendReward) {
        console.error("No active FRIEND reward found");
        return json({ error: "No active FRIEND reward found" }, { status: 400 });
      }
  
      const { discount, discountType, minOrderAmount } = friendReward;
  
      const discountCode = `FRIEND${Math.floor(Math.random() * 10000)}`;
      const today = new Date();
      const oneMonthLater = new Date();
      oneMonthLater.setMonth(today.getMonth() + 1);
      const startsAt = today.toISOString();
      const endsAt = oneMonthLater.toISOString();
  
      console.log("Starts at:", startsAt, "Ends at:", endsAt);
  
      // Set discount value format based on type
      let discountValue;
      if (discountType === "percentage") {
        discountValue = discount / 100;  // Convert percentage to decimal
    // Shopify API expects percentage format
      } else if (discountType === "fixed") {
        discountValue = discount/100; // Shopify API expects fixed amount format
      } else {
        return json({ error: "Invalid discount type" }, { status: 400 });
      }
  
      const response = await admin.graphql(
        `
        mutation CreateDiscountCode($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode {
              id
              codeDiscount {
                ... on DiscountCodeBasic {
                  title
                  startsAt
                  endsAt
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            basicCodeDiscount: {
              title,
              code: discountCode,
              startsAt,
              endsAt,
              customerSelection: { all: true },
              customerGets: {
                value: {
                    percentage:discountValue 
                },
                items:{
                    all:true
                }
              },
              minimumRequirement: {
                subtotal: { greaterThanOrEqualToSubtotal: minOrderAmount || 200 },
              },
              usageLimit: 100,
              appliesOncePerCustomer: true,
            },
          },
        }
      );
  
      const responseJson = await response.json();
      console.log("GraphQL Response:", responseJson);
  
      if (responseJson.errors) {
        console.error("Shopify API Error:", responseJson.errors);
        return json({ error: "Shopify API Error", details: responseJson.errors }, { status: 500 });
      }
  
      return json({ discount: responseJson }, { status: 200 });
  
    } catch (err) {
      console.error("Unexpected Error:", err);
      return json({ error: "Internal Server Error", details: err.message }, { status: 500 });
    }
  };
  
export default function Discounts() {
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  console.log(actionData, "actionData");
  const generateDiscount = () => submit({}, { replace: true, method: "POST" });

  const [title, settitle] = useState("");

  return (
    <div>
      <Page>
        <Card>
          <Form onSubmit={generateDiscount} method="post">
            <TextField
              id="title"
              name="title"
              label="Title"
              autoComplete="off"
              value={title}
              onChange={(value) => settitle(value)}
            />
            <Button submit>Create Discount</Button>
          </Form>
        </Card>
      </Page>
    </div>
  );
}
