import { db } from "../../db";
import { formTemplates, type FormSection } from "@shared/schema";
import { eq } from "drizzle-orm";

const EVENT_PRODUCTION_TEMPLATE_ID = "event-production-intake";

const eventProductionSchema: FormSection[] = [
  {
    id: "section-event-overview",
    title: "Event Overview",
    fields: [
      {
        id: "field-event-name",
        name: "Event Name",
        type: "text",
        required: true,
        entityMapping: { entityType: "deal", propertyKey: "displayName" },
      },
      {
        id: "field-context-concept",
        name: "Context + Concept",
        type: "richtext",
        description: "Can you tell me more about the event concept you have in mind?",
        entityMapping: { entityType: "deal", propertyKey: "concept" },
      },
      {
        id: "field-event-purpose",
        name: "Event Purpose",
        type: "richtext",
        description: `Our most successful events are ones that have depth to it, meaning that there is a larger purpose outside of just promoting the brand. The event needs to have meaning so you're guests leave feeling like the event was impactful. \n\nWith that, what message do you want guests to leave with? What are the brand values that you want to portray with this event? Can you tell me the purpose behind why you are gathering this group of people? \n\nDouble down on the purpose:\n- Why here? Why now?\n- What problem are you trying to solve?\n- Why is this important?\n- What is your desired outcome?`,
      },
      {
        id: "field-marketing-goals",
        name: "Marketing Goals",
        type: "richtext",
        description: "What are your specific marketing goals for this event?\nIs it Press Coverage, UGC/Social Coverage, Community Building, Etc?",
      },
      {
        id: "field-event-kpis",
        name: "Event KPIs",
        type: "richtext",
        description: "What is the one thing that would make this event a major success?\nWhen thinking about how you'd recap this event to your team, what elements would you be highlighting as the recap stats?",
      },
      {
        id: "field-event-format",
        name: "Event Format",
        type: "richtext",
        description: "How are you envisioning guest experience?\nCan you walk me through the high level run of show you're thinking of?",
      },
    ],
  },
  {
    id: "section-guests",
    title: "Guests",
    fields: [
      {
        id: "field-target-guest-count",
        name: "Target Guest Count",
        type: "richtext",
        description: "Can you confirm the target guest count?\nCan you confirm how many folks from your team will be attending? Confirming they are a part of this final guest count?\nDo you need us to budget for Uber Codes?",
      },
      {
        id: "field-target-demo",
        name: "Target Demo",
        type: "richtext",
        description: `"Can you confirm if this is an invite only event or an event for public consumers?\nCan you confirm what your target demo is? Do you have some sample names you are hoping to attend?"\nCan you describe the audience that your brand is trying to target?`,
      },
      {
        id: "field-invites-check-in",
        name: "Invites + Check-In",
        type: "richtext",
        description: `Who is handling invites? Client? PR team? Care of Chan?\nWho is handling check-in? PR team? Care of Chan?\nDo you want us to budget for uber codes?\n\nONLY FOR PRODUCTIONS WE WANT TO INVITE OUR NETWORK TO: For our productions, Care of Chan offers to invite a small amount of our network to the event. Confirming all names will be shared with the client in advance for approval before invites go out. We typically offer 10 invites for standing events and 5 invites for seated.`,
      },
      {
        id: "field-rsvp-management-sow",
        name: "RSVP Management SOW",
        type: "richtext",
        description: "What percentage of the full list would you like Care of Chan to own?\nDo you need us to facilitate dressing for guests ahead of the event?\nDo you need us to work check-in?\nDo you need us to own the invite graphic? If you are owning, would Care of Chan be able to consult on the invite to ensure its enticing enough for guests?\nCan you walk me through some of the target names you are hoping to secure for this event?",
      },
    ],
  },
  {
    id: "section-creative",
    title: "Creative",
    fields: [
      {
        id: "field-programming-brand-moments",
        name: "Programming/Brand Moments",
        type: "richtext",
        description: "Is there a specific way that you'd like your brand to show up at the event? i.e. photo moment, product display, speaking moment, etc.\nIs there specific programming that you'd like? Illustrators, workshops, talks, etc.",
      },
      {
        id: "field-creative-direction-vibe",
        name: "High-level creative direction/vibe",
        type: "richtext",
        description: `How do you describe the aesthetic of your brand? \nGive us three adjectives, phrases or references to help us understand the look & feel you're going for. Please be as specific as possible, and please send photos if you have them. \n- Example of adjectives, phrases or references: French boulangerie in the countryside, Sex-in-the-City, 1980s, Mid-century modern, undone \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?\nWhat is the vibe that you'd like this event to evoke with guests?\nDo you have lighting preferences?`,
      },
      {
        id: "field-brand-guidelines",
        name: "Brand Guidelines",
        type: "richtext",
        description: "Can you share official brand guidelines and logo usage?",
      },
    ],
  },
  {
    id: "section-logistics",
    title: "Logistics",
    fields: [
      {
        id: "field-dates",
        name: "Date(s)",
        type: "eventSchedule",
        description: "When are you hoping to host your event?\nAre these dates firm or flexible?\nIf flexible, what are your back up dates?",
        entityMapping: { entityType: "deal", propertyKey: "eventSchedule" },
      },
      {
        id: "field-times-run-time",
        name: "Time(s)/Run Time",
        type: "text",
        description: "What time do you want to host your event?\nHow long do you want the event to run for?",
      },
      {
        id: "field-locations",
        name: "Location(s)",
        type: "location",
        description: "What city are you hosting this in?\nIs there a specific neighborhood that you would like us to host this?\nWhere are most of your guests traveling in from?",
        entityMapping: { entityType: "deal", propertyKey: "locations" },
      },
      {
        id: "field-venue-type",
        name: "Venue Type",
        type: "text",
        description: "What type of venue are you hoping for?\nRestaurant or Raw Space? (museum, gallery, pop-up shop, etc)?\nWhen doing walkthroughs of the venue options, will client team require they be on a site visit to determine a venue?",
      },
      {
        id: "field-venue-in-mind",
        name: "Venue in Mind",
        type: "richtext",
      },
    ],
  },
  {
    id: "section-services",
    title: "Services",
    fields: [
      {
        id: "field-coc-services",
        name: "CoC Services",
        type: "services",
        entityMapping: { entityType: "deal", propertyKey: "serviceIds" },
      },
      {
        id: "field-food-beverage",
        name: "Food & Beverage",
        type: "richtext",
        description: "What is your specific serving style for food? Seated Dinner, Passed Canapes, Grazing Table?\nWhat level of service are you expecting? White glove service, family style?\nAre there any dietary restrictions from your team or guests of honor that we need to be aware of as we ideate?",
      },
      {
        id: "field-chef-in-mind",
        name: "Chef in Mind?",
        type: "richtext",
        description: "Is it important to you that the chef is a known name?\nIf yes, can you tell me if you need that chef to post about the event to social? This affects how much we need to budget for the chef. \nAre there any other social or talent requirements that you would need the chef for?",
      },
      {
        id: "field-decor-needs",
        name: "Decor Needs",
        type: "richtext",
        description: "Can you share what your decor needs are? Branded buildouts? Photo moments? Printed Collateral Direction?",
      },
      {
        id: "field-florals",
        name: "Florals",
        type: "richtext",
        description: "Is there a specific floral direction you are looking for? Bountiful vs minimal?",
      },
      {
        id: "field-takeaways",
        name: "Takeaways",
        type: "richtext",
        description: "Would you like us to ideate a takeaway?\nAre you offering any of your products as a takeaway at the event? \nAre you looking for custom or premium packaging? Please note custom/premium packaging must be confirmed at least 12 to 14 weeks in advance to allow for Creative development, deck build, sampling, and internal approvals. Requests made outside this window may not be feasible. In those cases, Care of Chan will recommend standard packaging or no packaging to ensure quality and alignment.",
      },
      {
        id: "field-music",
        name: "Music",
        type: "richtext",
        description: "Do you have any specific requests around music?\nPlaylist? DJ? House Music?",
      },
      {
        id: "field-photographer",
        name: "Photographer",
        type: "richtext",
        description: "Do you need us to budget and source for a photographer?",
      },
      {
        id: "field-bfa-photographer",
        name: "BFA Photographer",
        type: "richtext",
        description: "Do you need us to budget and source for a wired photographer? Typically BFA is only required if your PR team wants to pitch the event to event press. \nDo you need us to budget and source for an on-site editor? Typically this is required if your PR team needs a less than 24 hour turn around.",
      },
      {
        id: "field-graphic-designer",
        name: "Graphic Designer",
        type: "richtext",
        description: "Do you need us to budget and source for a graphic designer?",
      },
      {
        id: "field-design-needs",
        name: "Design Needs",
        type: "richtext",
        description: `Will you need physical samples?\nDo you need us to create a new visual identity for the event graphic design?\nWill you need renderings? Do you need architectural or stylized renderings?\n\nFor context, there are two types of renders:\n- Architectural renders: These are the "not so pretty" renders that fabricators make to show the scale. Think of this as an architectural drawing. Architectural renders are the first step which take about 1-2 weeks including internal feedback from our team. \n- Stylized renders: These are the final, final "pretty" renders, that take all of the architectural drawings from the venue as well as the custom pieces we fabricated and place them to scale so the client can better see. Stylized renders come afterwards which take another 1-2 weeks (this bakes in, internal and external client reviews/edits)`,
      },
      {
        id: "field-videographer",
        name: "Videographer",
        type: "richtext",
        description: "Do you need us to budget and source for a videographer?\nCan you tell me what the videos will be used for? Full event sizzle reel, social, website, tv?",
      },
      {
        id: "field-other-confirmed-vendors",
        name: "Other Confirmed Vendors",
        type: "richtext",
        description: "Are there any preferred vendors on your end that you'd like us to work with?",
      },
    ],
  },
  {
    id: "section-talent",
    title: "Talent",
    fields: [
      {
        id: "field-talent",
        name: "Talent",
        type: "richtext",
        description: "Can you tell me what you want the talent to do?\nWhat will be there contractual obligations?\nWill you need them to promo the event on social? If so, what does that specific ask look like?",
      },
      {
        id: "field-talent-in-mind",
        name: "Talent in Mind?",
        type: "richtext",
      },
      {
        id: "field-talent-accommodations",
        name: "Talent Accommodations",
        type: "richtext",
        description: "Who is responsible for locking in the talent?\nDoes Talent Fee need to be accounted for in our budget?\nDoes Talent Rider and T&E need to be accounted for in our budget?",
      },
      {
        id: "field-talent-contract-requirements",
        name: "Talent Contract Requirements",
        type: "richtext",
        description: "If the talent is already locked in, can you please share what their SOW is so we understand their involvement with the event?",
      },
    ],
  },
  {
    id: "section-other",
    title: "Other",
    fields: [
      {
        id: "field-liquor-cabinet-inclusion",
        name: "Liquor Cabinet Inclusion",
        type: "richtext",
        description: "Please know that on our end, we have a couple of preferred beverage partners. This means that if the beverage partner fits with the overall vision for the event, we ask our venue and/or bar staff to use our preferred beverage partners for the drinks. The two brands we work with are:\n- Doladira - an elevated aperitif insoured by the Italian Alps founded by Meredith Erickson, the author of Alpine Cooking and the Joe Beef Cookbook.",
      },
      {
        id: "field-additional-notes",
        name: "Additional Notes",
        type: "richtext",
      },
    ],
  },
];

export async function seedEventProductionTemplate(): Promise<void> {
  try {
    const existing = await db
      .select({ id: formTemplates.id })
      .from(formTemplates)
      .where(eq(formTemplates.id, EVENT_PRODUCTION_TEMPLATE_ID));

    if (existing.length > 0) {
      await db
        .update(formTemplates)
        .set({ category: "client_intake" })
        .where(eq(formTemplates.id, EVENT_PRODUCTION_TEMPLATE_ID));
      return;
    }

    await db.insert(formTemplates).values({
      id: EVENT_PRODUCTION_TEMPLATE_ID,
      name: "Event Production",
      description: "Comprehensive intake questionnaire for onboarding new event production deals — covers event concept, guests, creative direction, logistics, vendor services, talent, and additional notes.",
      category: "client_intake",
      formSchema: eventProductionSchema,
    });

    console.log("Seeded Event Production intake template");
  } catch (error) {
    console.error("Failed to seed Event Production template:", error);
    throw error;
  }
}
