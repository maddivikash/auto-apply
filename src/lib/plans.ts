/** The free trial and the paid Application Sprint. The plan is offered only once the free applications are used. */
export const FREE_APPLICATIONS = 3;

export type Plan = { region: string; price: string; regular: string; href?: string };

// Stripe Payment Links, set in Vercel. Without them the plan buttons lead to the sprint request form.
export const PLANS: Plan[] = [
  { region: "India", price: "₹250", regular: "₹499", href: process.env.SPRINT_PAY_INR_URL },
  { region: "Everywhere else", price: "$5", regular: "$10", href: process.env.SPRINT_PAY_USD_URL },
];
