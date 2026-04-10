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
        defaultValue: "Can you tell me more about the event concept you have in mind?",
        entityMapping: { entityType: "deal", propertyKey: "concept" },
      },
      {
        id: "field-event-purpose",
        name: "Event Purpose",
        type: "richtext",
        defaultValue: `Our most successful events are ones that have depth to it, meaning that there is a larger purpose outside of just promoting the brand. The event needs to have meaning so you're guests leave feeling like the event was impactful. \n\nWith that, what message do you want guests to leave with? What are the brand values that you want to portray with this event? Can you tell me the purpose behind why you are gathering this group of people? \n\nDouble down on the purpose:\n- Why here? Why now?\n- What problem are you trying to solve?\n- Why is this important?\n- What is your desired outcome?`,
      },
      {
        id: "field-marketing-goals",
        name: "Marketing Goals",
        type: "richtext",
        defaultValue: "What are your specific marketing goals for this event?\nIs it Press Coverage, UGC/Social Coverage, Community Building, Etc?",
      },
      {
        id: "field-event-kpis",
        name: "Event KPIs",
        type: "richtext",
        defaultValue: "What is the one thing that would make this event a major success?\nWhen thinking about how you'd recap this event to your team, what elements would you be highlighting as the recap stats?",
      },
      {
        id: "field-event-format",
        name: "Event Format",
        type: "richtext",
        defaultValue: "How are you envisioning guest experience?\nCan you walk me through the high level run of show you're thinking of?",
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
        defaultValue: "Can you confirm the target guest count?\nCan you confirm how many folks from your team will be attending? Confirming they are a part of this final guest count?\nDo you need us to budget for Uber Codes?",
      },
      {
        id: "field-target-demo",
        name: "Target Demo",
        type: "richtext",
        defaultValue: `"Can you confirm if this is an invite only event or an event for public consumers?\nCan you confirm what your target demo is? Do you have some sample names you are hoping to attend?"\nCan you describe the audience that your brand is trying to target?`,
      },
      {
        id: "field-invites-check-in",
        name: "Invites + Check-In",
        type: "richtext",
        defaultValue: `Who is handling invites? Client? PR team? Care of Chan?\nWho is handling check-in? PR team? Care of Chan?\nDo you want us to budget for uber codes?\n\nONLY FOR PRODUCTIONS WE WANT TO INVITE OUR NETWORK TO: For our productions, Care of Chan offers to invite a small amount of our network to the event. Confirming all names will be shared with the client in advance for approval before invites go out. We typically offer 10 invites for standing events and 5 invites for seated.`,
      },
      {
        id: "field-rsvp-management-sow",
        name: "RSVP Management SOW",
        type: "richtext",
        defaultValue: "What percentage of the full list would you like Care of Chan to own?\nDo you need us to facilitate dressing for guests ahead of the event?\nDo you need us to work check-in?\nDo you need us to own the invite graphic? If you are owning, would Care of Chan be able to consult on the invite to ensure its enticing enough for guests?\nCan you walk me through some of the target names you are hoping to secure for this event?",
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
        defaultValue: "Is there a specific way that you'd like your brand to show up at the event? i.e. photo moment, product display, speaking moment, etc.\nIs there specific programming that you'd like? Illustrators, workshops, talks, etc.",
      },
      {
        id: "field-creative-direction-vibe",
        name: "High-level creative direction/vibe",
        type: "richtext",
        defaultValue: `How do you describe the aesthetic of your brand? \nGive us three adjectives, phrases or references to help us understand the look & feel you're going for. Please be as specific as possible, and please send photos if you have them. \n- Example of adjectives, phrases or references: French boulangerie in the countryside, Sex-in-the-City, 1980s, Mid-century modern, undone \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?\nWhat is the vibe that you'd like this event to evoke with guests?\nDo you have lighting preferences?`,
      },
      {
        id: "field-brand-guidelines",
        name: "Brand Guidelines",
        type: "richtext",
        defaultValue: "Can you share official brand guidelines and logo usage?",
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
        defaultValue: "What is your specific serving style for food? Seated Dinner, Passed Canapes, Grazing Table?\nWhat level of service are you expecting? White glove service, family style?\nAre there any dietary restrictions from your team or guests of honor that we need to be aware of as we ideate?",
      },
      {
        id: "field-chef-in-mind",
        name: "Chef in Mind?",
        type: "richtext",
        defaultValue: "Is it important to you that the chef is a known name?\nIf yes, can you tell me if you need that chef to post about the event to social? This affects how much we need to budget for the chef. \nAre there any other social or talent requirements that you would need the chef for?",
      },
      {
        id: "field-decor-needs",
        name: "Decor Needs",
        type: "richtext",
        defaultValue: "Can you share what your decor needs are? Branded buildouts? Photo moments? Printed Collateral Direction?",
      },
      {
        id: "field-florals",
        name: "Florals",
        type: "richtext",
        defaultValue: "Is there a specific floral direction you are looking for? Bountiful vs minimal?",
      },
      {
        id: "field-takeaways",
        name: "Takeaways",
        type: "richtext",
        defaultValue: "Would you like us to ideate a takeaway?\nAre you offering any of your products as a takeaway at the event? \nAre you looking for custom or premium packaging? Please note custom/premium packaging must be confirmed at least 12 to 14 weeks in advance to allow for Creative development, deck build, sampling, and internal approvals. Requests made outside this window may not be feasible. In those cases, Care of Chan will recommend standard packaging or no packaging to ensure quality and alignment.",
      },
      {
        id: "field-music",
        name: "Music",
        type: "richtext",
        defaultValue: "Do you have any specific requests around music?\nPlaylist? DJ? House Music?",
      },
      {
        id: "field-photographer",
        name: "Photographer",
        type: "richtext",
        defaultValue: "Do you need us to budget and source for a photographer?",
      },
      {
        id: "field-bfa-photographer",
        name: "BFA Photographer",
        type: "richtext",
        defaultValue: "Do you need us to budget and source for a wired photographer? Typically BFA is only required if your PR team wants to pitch the event to event press. \nDo you need us to budget and source for an on-site editor? Typically this is required if your PR team needs a less than 24 hour turn around.",
      },
      {
        id: "field-graphic-designer",
        name: "Graphic Designer",
        type: "richtext",
        defaultValue: "Do you need us to budget and source for a graphic designer?",
      },
      {
        id: "field-design-needs",
        name: "Design Needs",
        type: "richtext",
        defaultValue: `Will you need physical samples?\nDo you need us to create a new visual identity for the event graphic design?\nWill you need renderings? Do you need architectural or stylized renderings?\n\nFor context, there are two types of renders:\n- Architectural renders: These are the "not so pretty" renders that fabricators make to show the scale. Think of this as an architectural drawing. Architectural renders are the first step which take about 1-2 weeks including internal feedback from our team. \n- Stylized renders: These are the final, final "pretty" renders, that take all of the architectural drawings from the venue as well as the custom pieces we fabricated and place them to scale so the client can better see. Stylized renders come afterwards which take another 1-2 weeks (this bakes in, internal and external client reviews/edits)`,
      },
      {
        id: "field-videographer",
        name: "Videographer",
        type: "richtext",
        defaultValue: "Do you need us to budget and source for a videographer?\nCan you tell me what the videos will be used for? Full event sizzle reel, social, website, tv?",
      },
      {
        id: "field-other-confirmed-vendors",
        name: "Other Confirmed Vendors",
        type: "richtext",
        defaultValue: "Are there any preferred vendors on your end that you'd like us to work with?",
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
        defaultValue: "Can you tell me what you want the talent to do?\nWhat will be there contractual obligations?\nWill you need them to promo the event on social? If so, what does that specific ask look like?",
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
        defaultValue: "Who is responsible for locking in the talent?\nDoes Talent Fee need to be accounted for in our budget?\nDoes Talent Rider and T&E need to be accounted for in our budget?",
      },
      {
        id: "field-talent-contract-requirements",
        name: "Talent Contract Requirements",
        type: "richtext",
        defaultValue: "If the talent is already locked in, can you please share what their SOW is so we understand their involvement with the event?",
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
        defaultValue: "Please know that on our end, we have a couple of preferred beverage partners. This means that if the beverage partner fits with the overall vision for the event, we ask our venue and/or bar staff to use our preferred beverage partners for the drinks. The two brands we work with are:\n- Doladira - an elevated aperitif insoured by the Italian Alps founded by Meredith Erickson, the author of Alpine Cooking and the Joe Beef Cookbook.",
      },
      {
        id: "field-additional-notes",
        name: "Additional Notes",
        type: "richtext",
      },
    ],
  },
];

const eventProductionV2Schema: FormSection[] = [
  {
    id: "section-overview",
    title: "Overview",
    fields: [
      { id: "field-event-name", name: "Event Name", type: "text" },
      { id: "field-context-concept", name: "Context + Concept", type: "richtext", defaultValue: "Can you tell me more about the event concept you have in mind?" },
      { id: "field-event-purpose", name: "Event Purpose", type: "richtext", defaultValue: "Our most successful events are ones that have depth to it, meaning that there is a larger purpose outside of just promoting the brand. The event needs to have meaning so you're guests leave feeling like the event was impactful. \n\nWith that, what message do you want guests to leave with? What are the brand values that you want to portray with this event? Can you tell me the purpose behind why you are gathering this group of people? \n\nDouble down on the purpose:\n- Why here? Why now?\n- What problem are you trying to solve?\n- Why is this important?\n- What is your desired outcome?" },
      { id: "field-marketing-goals", name: "Marketing Goals", type: "richtext", defaultValue: "What are your specific marketing goals for this event?\nIs it Press Coverage, UGC/Social Coverage, Community Building, Etc?" },
      { id: "field-event-kpis", name: "Event KPIs", type: "richtext", defaultValue: "What is the one thing that would make this event a major success?\nWhen thinking about how you'd recap this event to your team, what elements would you be highlighting as the recap stats?" },
      { id: "field-event-format", name: "Event Format", type: "richtext", defaultValue: "How are you envisioning guest experience?\nCan you walk me through the high level run of show you're thinking of?" },
    ],
  },
  {
    id: "section-guests",
    title: "Guests",
    fields: [
      { id: "field-target-guest-count", name: "Target Guest Count", type: "richtext", defaultValue: "Can you confirm the target guest count?\nCan you confirm how many folks from your team will be attending? Confirming they are a part of this final guest count?\nDo you need us to budget for Uber Codes?" },
      { id: "field-target-demo", name: "Target Demo", type: "richtext", defaultValue: "\"Can you confirm if this is an invite only event or an event for public consumers?\nCan you confirm what your target demo is? Do you have some sample names you are hoping to attend?\"\nCan you describe the audience that your brand is trying to target?" },
      { id: "field-invites-check-in", name: "Invites + Check-In", type: "richtext", defaultValue: "Who is handling invites? Client? PR team? Care of Chan?\nWho is handling check-in? PR team? Care of Chan?\nDo you want us to budget for uber codes?\n\nONLY FOR PRODUCTIONS WE WANT TO INVITE OUR NETWORK TO: For our productions, Care of Chan offers to invite a small amount of our network to the event. Confirming all names will be shared with the client in advance for approval before invites go out. We typically offer 10 invites for standing events and 5 invites for seated." },
      { id: "field-rsvp-management-sow", name: "RSVP Management SOW", type: "richtext", defaultValue: "What percentage of the full list would you like Care of Chan to own?\nDo you need us to facilitate dressing for guests ahead of the event?\nDo you need us to work check-in?\nDo you need us to own the invite graphic? If you are owning, would Care of Chan be able to consult on the invite to ensure its enticing enough for guests?\nCan you walk me through some of the target names you are hoping to secure for this event?" },
    ],
  },
  {
    id: "section-creative",
    title: "Creative",
    fields: [
      { id: "field-programming-brand-moments", name: "Programming & Brand Moments", type: "richtext", defaultValue: "Is there a specific way that you'd like your brand to show up at the event? i.e. photo moment, product display, speaking moment, etc.\nIs there specific programming that you'd like? Illustrators, workshops, talks, etc." },
      { id: "field-creative-direction-vibe", name: "Creative Direction & Vibe", type: "richtext", defaultValue: "How do you describe the aesthetic of your brand? \nGive us three adjectives, phrases or references to help us understand the look & feel you're going for. Please be as specific as possible, and please send photos if you have them. \n- Example of adjectives, phrases or references: French boulangerie in the countryside, Sex-in-the-City, 1980s, Mid-century modern, undone \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?\nWhat is the vibe that you'd like this event to evoke with guests?\nDo you have lighting preferences?" },
      { id: "field-brand-guidelines", name: "Brand Guidelines", type: "richtext", defaultValue: "Can you share official brand guidelines and logo usage?" },
    ],
  },
  {
    id: "section-logistics",
    title: "Logistics",
    fields: [
      { id: "field-event-dates", name: "Event Date(s)", type: "eventSchedule", description: "When are you hoping to host your event?\nAre these dates firm or flexible?\nIf flexible, what are your back up dates?" },
      { id: "field-event-date-notes", name: "Event Date Notes", type: "richtext" },
      { id: "field-start-run-times", name: "Start & Run Times", type: "text", description: "What time do you want to host your event?\nHow long do you want the event to run for?" },
      { id: "field-locations", name: "Location(s)", type: "location", description: "What city are you hosting this in?" },
      { id: "field-location-notes", name: "Location Notes", type: "richtext", defaultValue: "Is there a specific neighborhood that you would like us to host this?\nWhere are most of your guests traveling in from?" },
      { id: "field-venue-type", name: "Venue Type", type: "text", description: "What type of venue are you hoping for?\nRestaurant or Raw Space? (museum, gallery, pop-up shop, etc)?\nWhen doing walkthroughs of the venue options, will client team require they be on a site visit to determine a venue?" },
      { id: "field-venue-preferences", name: "Venue Preferences", type: "richtext" },
    ],
  },
  {
    id: "section-services",
    title: "Services",
    fields: [
      { id: "field-coc-services", name: "CoC Services", type: "services" },
      { id: "field-food-beverage", name: "Food & Beverage", type: "richtext", defaultValue: "What is your specific serving style for food? Seated Dinner, Passed Canapes, Grazing Table?\nWhat level of service are you expecting? White glove service, family style?\nAre there any dietary restrictions from your team or guests of honor that we need to be aware of as we ideate?" },
      { id: "field-chef-preferences", name: "Chef Preferences", type: "richtext", defaultValue: "Is it important to you that the chef is a known name?\nIf yes, can you tell me if you need that chef to post about the event to social? This affects how much we need to budget for the chef. \nAre there any other social or talent requirements that you would need the chef for?" },
      { id: "field-decor-needs", name: "Decor Needs", type: "richtext", defaultValue: "Can you share what your decor needs are? Branded buildouts? Photo moments? Printed Collateral Direction?" },
      { id: "field-florals", name: "Florals", type: "richtext", defaultValue: "Is there a specific floral direction you are looking for? Bountiful vs minimal?" },
      { id: "field-takeaways", name: "Takeaways", type: "richtext", defaultValue: "Would you like us to ideate a takeaway?\nAre you offering any of your products as a takeaway at the event? \nAre you looking for custom or premium packaging? Please note custom/premium packaging must be confirmed at least 12 to 14 weeks in advance to allow for Creative development, deck build, sampling, and internal approvals. Requests made outside this window may not be feasible. In those cases, Care of Chan will recommend standard packaging or no packaging to ensure quality and alignment." },
      { id: "field-music", name: "Music", type: "richtext", defaultValue: "Do you have any specific requests around music?\nPlaylist? DJ? House Music?" },
      { id: "field-photographer", name: "Photographer", type: "richtext", defaultValue: "Do you need us to budget and source for a photographer?" },
      { id: "field-bfa-photographer", name: "BFA Photographer", type: "richtext", defaultValue: "Do you need us to budget and source for a wired photographer? Typically BFA is only required if your PR team wants to pitch the event to event press. \nDo you need us to budget and source for an on-site editor? Typically this is required if your PR team needs a less than 24 hour turn around." },
      { id: "field-graphic-designer", name: "Graphic Designer", type: "richtext", defaultValue: "Do you need us to budget and source for a graphic designer?" },
      { id: "field-design-needs", name: "Design Needs", type: "richtext", defaultValue: "Will you need physical samples?\nDo you need us to create a new visual identity for the event graphic design?\nWill you need renderings? Do you need architectural or stylized renderings?\n\nFor context, there are two types of renders:\n- Architectural renders: These are the \"not so pretty\" renders that fabricators make to show the scale. Think of this as an architectural drawing. Architectural renders are the first step which take about 1-2 weeks including internal feedback from our team. \n- Stylized renders: These are the final, final \"pretty\" renders, that take all of the architectural drawings from the venue as well as the custom pieces we fabricated and place them to scale so the client can better see. Stylized renders come afterwards which take another 1-2 weeks (this bakes in, internal and external client reviews/edits)" },
      { id: "field-videographer", name: "Videographer", type: "richtext", defaultValue: "Do you need us to budget and source for a videographer?\nCan you tell me what the videos will be used for? Full event sizzle reel, social, website, tv?" },
      { id: "field-other-confirmed-vendors", name: "Other Confirmed Vendors", type: "richtext", defaultValue: "Are there any preferred vendors on your end that you'd like us to work with?" },
    ],
  },
  {
    id: "section-talent",
    title: "Talent",
    fields: [
      { id: "field-talent", name: "Talent", type: "richtext", defaultValue: "Can you tell me what you want the talent to do?\nWhat will be there contractual obligations?\nWill you need them to promo the event on social? If so, what does that specific ask look like?" },
      { id: "field-talent-preferences", name: "Talent Preferences", type: "richtext" },
      { id: "field-talent-accommodations", name: "Talent Accommodations", type: "richtext", defaultValue: "Who is responsible for locking in the talent?\nDoes Talent Fee need to be accounted for in our budget?\nDoes Talent Rider and T&E need to be accounted for in our budget?" },
      { id: "field-talent-contract-requirements", name: "Talent Contract Requirements", type: "richtext", defaultValue: "If the talent is already locked in, can you please share what their SOW is so we understand their involvement with the event?" },
    ],
  },
  {
    id: "section-other",
    title: "Other",
    fields: [
      { id: "field-liquor-cabinet-inclusion", name: "Liquor Cabinet Inclusion", type: "richtext", defaultValue: "Please know that on our end, we have a couple of preferred beverage partners. This means that if the beverage partner fits with the overall vision for the event, we ask our venue and/or bar staff to use our preferred beverage partners for the drinks. The two brands we work with are:\n- Doladira - an elevated aperitif insoured by the Italian Alps founded by Meredith Erickson, the author of Alpine Cooking and the Joe Beef Cookbook." },
      { id: "field-additional-notes", name: "Additional Notes", type: "richtext" },
    ],
  },
  {
    id: "section-proposal",
    title: "Proposal",
    fields: [
      { id: "field-event-budget", name: "Event Budget", type: "richtext", defaultValue: "Do you have a budget earmarked for this work? Are there pricing considerations we should know?\nIs that a typical budget for you for this kind of event?\nIf the budget feels tight - Is the budget flexible at all? We ask this to understand how to advise on budget decisions throughout the production." },
      { id: "field-must-haves", name: "Must-Haves", type: "richtext", defaultValue: "If the budget feel tight - What are your event must-haves vs nice to haves?" },
      { id: "field-stakeholders", name: "Stakeholders", type: "richtext", defaultValue: "Can you share who on your team is involved with decision making? What do they care to see in the proposal?\nCan you share insight on what your approval process and timelines typically look like?\nWhat does the review process look like once we submit the proposal?\nI'm curious; is there anything that might get in the way of us working together on this?" },
      { id: "field-agency-partners", name: "Agency Partners", type: "richtext", defaultValue: "Are you talking to other agencies for this event?\nWould you be comfortable sharing with us who else you are talking to?\nWhat are your hoping to see from us in order to help your team make a decision and secure this gig?" },
      { id: "field-timeline", name: "Timeline", type: "richtext", defaultValue: "What's your timeline? By when are you looking to make a decision? Why is the timeline set this way?" },
    ],
  },
];

const tripProductionSchema: FormSection[] = [
  {
    id: "section-event-overview",
    title: "Event Overview",
    fields: [
      { id: "field-event-name", name: "Event Name", type: "text" },
      { id: "field-context-concept", name: "Context + Concept", type: "richtext", defaultValue: "Can you tell me more about the event concept you have in mind?" },
      { id: "field-event-purpose", name: "Event Purpose", type: "richtext", defaultValue: "Our most successful events are ones that have depth to it, meaning that there is a larger purpose outside of just promoting the brand. The event needs to have meaning so you're guests leave feeling like the event was impactful. \n\nWith that, what message do you want guests to leave with? What are the brand values that you want to portray with this event? Can you tell me the purpose behind why you are gathering this group of people? \n\nDouble down on the purpose:\n- Why here? Why now?\n- What problem are you trying to solve?\n- Why is this important?\n- What is your desired outcome?" },
      { id: "field-marketing-goals", name: "Marketing Goals", type: "richtext", defaultValue: "What are your specific marketing goals for this event?\nIs it Press Coverage, UGC/Social Coverage, Community Building, Etc?" },
      { id: "field-event-kpis", name: "Event KPIs", type: "richtext", defaultValue: "What is the one thing that would make this event a major success?\nWhen thinking about how you'd recap this event to your team, what elements would you be highlighting as the recap stats?" },
      { id: "field-event-format", name: "Event Format", type: "richtext", defaultValue: "How are you envisioning guest experience?\nCan you walk me through the high level run of show you're thinking of?\nWhat are they hoping for itinerary wise? What activities do they want?" },
    ],
  },
  {
    id: "section-guests",
    title: "Guests",
    fields: [
      { id: "field-target-guest-count", name: "Target Guest Count", type: "richtext", defaultValue: "Can you confirm the target guest count?\nIn addition to the VIP guests, how many folks from the client team are coming? Do we need to account for the client team's travel in our budget? Confirming they are a part of this final guest count?\nDo we need to cover for guest travel? If so, what level of ticket are you hoping to cover? regular seats, business class, first class? If so, where are the guest traveling in from?" },
      { id: "field-target-demo", name: "Target Demo", type: "richtext", defaultValue: "\"Can you confirm if this is an invite only event or an event for public consumers?\nCan you confirm what your target demo is? Do you have some sample names you are hoping to attend?\"\nCan you describe the audience that your brand is trying to target?" },
      { id: "field-invites-check-in", name: "Invites + Check-In", type: "richtext", defaultValue: "Who is handling invites? Client? PR team? Care of Chan?\nWho is handling check-in? PR team? Care of Chan?\nDo you want us to budget for uber codes?\n\nONLY FOR PRODUCTIONS WE WANT TO INVITE OUR NETWORK TO: For our productions, Care of Chan offers to invite a small amount of our network to the event. Confirming all names will be shared with the client in advance for approval before invites go out. We typically offer 10 invites for standing events and 5 invites for seated." },
      { id: "field-rsvp-management-sow", name: "RSVP Management SOW", type: "richtext", defaultValue: "What percentage of the full list would you like Care of Chan to own?\nDo you need us to facilitate dressing for guests ahead of the event?\nDo you need us to work check-in?\nDo you need us to own the invite graphic? If you are owning, would Care of Chan be able to consult on the invite to ensure its enticing enough for guests?\nCan you walk me through some of the target names you are hoping to secure for this event?" },
    ],
  },
  {
    id: "section-creative",
    title: "Creative",
    fields: [
      { id: "field-programming-brand-moments", name: "Programming & Brand Moments", type: "richtext", defaultValue: "Is there a specific way that you'd like your brand to show up at the event? i.e. photo moment, product display, speaking moment, etc.\nIs there specific programming that you'd like? Illustrators, workshops, talks, etc. \nIf it's an international trip, what is the plan is for getting product overseas?" },
      { id: "field-creative-direction-vibe", name: "Creative Direction & Vibe", type: "richtext", defaultValue: "How do you describe the aesthetic of your brand? \nGive us three adjectives, phrases or references to help us understand the look & feel you're going for. Please be as specific as possible, and please send photos if you have them. \n- Example of adjectives, phrases or references: French boulangerie in the countryside, Sex-in-the-City, 1980s, Mid-century modern, undone \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?\nWhat is the vibe that you'd like this event to evoke with guests?\nDo you have lighting preferences?" },
      { id: "field-brand-guidelines", name: "Brand Guidelines", type: "richtext", defaultValue: "Can you share official brand guidelines and logo usage?" },
    ],
  },
  {
    id: "section-logistics",
    title: "Logistics",
    fields: [
      { id: "field-event-dates", name: "Event Date(s)", type: "eventSchedule", description: "When are you hoping to host your event?\nAre these dates firm or flexible?\nIf flexible, what are your back up dates?" },
      { id: "field-event-date-notes", name: "Event Date Notes", type: "richtext" },
      { id: "field-start-run-times", name: "Start & Run Times", type: "text", description: "What time do you want to host your event?\nHow long do you want the event to run for?" },
      { id: "field-locations", name: "Location(s)", type: "location", description: "What city are you hosting this in?" },
      { id: "field-location-notes", name: "Location Notes", type: "richtext", defaultValue: "Is there a specific neighborhood that you would like us to host this?\nWhere are most of your guests traveling in from?" },
      { id: "field-venue-type", name: "Venue Type", type: "richtext", defaultValue: "What type of venue are you hoping for?\nRestaurant or Raw Space? (museum, gallery, pop-up shop, etc)?\nWhen doing walkthroughs of the venue options, will client team require they be on a site visit to determine a venue?" },
      { id: "field-venue-preferences", name: "Venue Preferences", type: "richtext" },
    ],
  },
  {
    id: "section-services",
    title: "Services",
    fields: [
      { id: "field-coc-services", name: "CoC Services", type: "services" },
      { id: "field-food-beverage", name: "Food & Beverage", type: "richtext", defaultValue: "What is your specific serving style for food? Seated Dinner, Passed Canapes, Grazing Table?\nWhat level of service are you expecting? White glove service, family style?\nAre there any dietary restrictions from your team or guests of honor that we need to be aware of as we ideate?" },
      { id: "field-chef-preferences", name: "Chef Preferences", type: "richtext", defaultValue: "Is it important to you that the chef is a known name?\nIf yes, can you tell me if you need that chef to post about the event to social? This affects how much we need to budget for the chef. \nAre there any other social or talent requirements that you would need the chef for?" },
      { id: "field-decor", name: "Decor", type: "richtext", defaultValue: "Can you share what your decor needs are? Branded buildouts? Photo moments? Printed Collateral Direction?" },
      { id: "field-florals", name: "Florals", type: "richtext", defaultValue: "Is there a specific floral direction you are looking for? Bountiful vs minimal?" },
      { id: "field-takeaways", name: "Takeaways", type: "richtext", defaultValue: "Would you like us to ideate a takeaway?\nAre you offering any of your products as a takeaway at the event? \nAre you looking for custom or premium packaging? Please note custom/premium packaging must be confirmed at least 12 to 14 weeks in advance to allow for Creative development, deck build, sampling, and internal approvals. Requests made outside this window may not be feasible. In those cases, Care of Chan will recommend standard packaging or no packaging to ensure quality and alignment." },
      { id: "field-music", name: "Music", type: "richtext", defaultValue: "Do you have any specific requests around music?\nPlaylist? DJ? House Music?" },
      { id: "field-photographer", name: "Photographer", type: "richtext", defaultValue: "Do you need us to budget and source for a photographer?\nWho owns content production on these trips? Do you need CoC to own and manage the photographer or is that something the client team is fully owning?" },
      { id: "field-bfa-photographer", name: "BFA Photographer", type: "richtext", defaultValue: "Do you need us to budget and source for a wired photographer? Typically BFA is only required if your PR team wants to pitch the event to event press. \nDo you need us to budget and source for an on-site editor? Typically this is required if your PR team needs a less than 24 hour turn around." },
      { id: "field-graphic-designer", name: "Graphic Designer", type: "richtext", defaultValue: "Do you need us to budget and source for a graphic designer?" },
      { id: "field-design-needs", name: "Design Needs", type: "richtext", defaultValue: "Will you need physical samples?\nDo you need us to create a new visual identity for the event graphic design?\nWill you need renderings? Do you need architectural or stylized renderings?\n\nFor context, there are two types of renders:\n- Architectural renders: These are the \"not so pretty\" renders that fabricators make to show the scale. Think of this as an architectural drawing. Architectural renders are the first step which take about 1-2 weeks including internal feedback from our team. \n- Stylized renders: These are the final, final \"pretty\" renders, that take all of the architectural drawings from the venue as well as the custom pieces we fabricated and place them to scale so the client can better see. Stylized renders come afterwards which take another 1-2 weeks (this bakes in, internal and external client reviews/edits)" },
      { id: "field-videographer", name: "Videographer", type: "richtext", defaultValue: "Do you need us to budget and source for a videographer?\nCan you tell me what the videos will be used for? Full event sizzle reel, social, website, tv?" },
      { id: "field-other-confirmed-vendors", name: "Other Confirmed Vendors", type: "richtext", defaultValue: "Are there any preferred vendors on your end that you'd like us to work with?" },
    ],
  },
  {
    id: "section-talent",
    title: "Talent",
    fields: [
      { id: "field-talent", name: "Talent", type: "richtext", defaultValue: "Can you tell me what you want the talent to do?\nWhat will be there contractual obligations?\nWill you need them to promo the event on social? If so, what does that specific ask look like?" },
      { id: "field-talent-preferences", name: "Talent Preferences", type: "richtext" },
      { id: "field-talent-accommodations", name: "Talent Accommodations", type: "richtext", defaultValue: "Who is responsible for locking in the talent?\nDoes Talent Fee need to be accounted for in our budget?\nDoes Talent Rider and T&E need to be accounted for in our budget?" },
      { id: "field-talent-contract-requirements", name: "Talent Contract Requirements", type: "richtext", defaultValue: "If the talent is already locked in, can you please share what their SOW is so we understand their involvement with the event?" },
    ],
  },
  {
    id: "section-other",
    title: "Other",
    fields: [
      { id: "field-liquor-cabinet-inclusion", name: "Liquor Cabinet Inclusion", type: "richtext", defaultValue: "Please know that on our end, we have a couple of preferred beverage partners. This means that if the beverage partner fits with the overall vision for the event, we ask our venue and/or bar staff to use our preferred beverage partners for the drinks. The two brands we work with are:\n- Doladira - an elevated aperitif insoured by the Italian Alps founded by Meredith Erickson, the author of Alpine Cooking and the Joe Beef Cookbook. \n- Villbrygg - a zero proof botanical spirit from Norway." },
      { id: "field-additional-notes", name: "Additional Notes", type: "richtext" },
    ],
  },
  {
    id: "section-proposal",
    title: "Proposal",
    fields: [
      { id: "field-event-budget", name: "Event Budget", type: "richtext", defaultValue: "Do you have a budget earmarked for this work? Are there pricing considerations we should know?\nIs that a typical budget for you for this kind of event?\nIf the budget feels tight - Is the budget flexible at all? We ask this to understand how to advise on budget decisions throughout the production." },
      { id: "field-must-haves", name: "Must-Haves", type: "richtext", defaultValue: "If the budget feel tight - What are your event must-haves vs nice to haves?" },
      { id: "field-stakeholders", name: "Stakeholders", type: "richtext", defaultValue: "Can you share who on your team is involved with decision making? What do they care to see in the proposal?\nCan you share insight on what your approval process and timelines typically look like?\nWhat does the review process look like once we submit the proposal?\nI'm curious; is there anything that might get in the way of us working together on this?" },
      { id: "field-agency-partners", name: "Agency Partners", type: "richtext", defaultValue: "Are you talking to other agencies for this event?\nWould you be comfortable sharing with us who else you are talking to?\nWhat are your hoping to see from us in order to help your team make a decision and secure this gig?" },
      { id: "field-timeline", name: "Timeline", type: "richtext", defaultValue: "What's your timeline? By when are you looking to make a decision? Why is the timeline set this way?" },
    ],
  },
];

const mailerGiftProductionSchema: FormSection[] = [
  {
    id: "section-overview",
    title: "Overview",
    fields: [
      { id: "field-product-gift-name", name: "Product or Gift Name", type: "text" },
      { id: "field-concept-context", name: "Concept & Context", type: "richtext", defaultValue: "Can you tell me more about the event concept you have in mind?" },
      { id: "field-project-purpose", name: "Project Purpose", type: "richtext", defaultValue: "Our most successful events are ones that have depth to it, meaning that there is a larger purpose outside of just promoting the brand. The event needs to have meaning otherwise you risk your guests leaving unimpacted. \n\nWith that, what are the brand values that you want to portray with this event and can you tell me the purpose behind why you are gathering this group of people? \n\nDouble down on the purpose:\n- Why here? Why now?\n- What problem are you trying to solve?\n- Why is this important?\n- What is your desired outcome?" },
      { id: "field-marketing-goals", name: "Marketing Goals", type: "richtext", defaultValue: "What are your specific marketing goals for this event?\nIs it Press Coverage, UGC/Social Coverage, Community Building, Etc?" },
      { id: "field-project-kpis", name: "Project KPIs", type: "richtext", defaultValue: "What is the one thing that would make this event a major success?\nWhen thinking about how you'd recap this event to your team, what elements would you be highlighting as the recap stats?" },
      { id: "field-product-needs", name: "Product Needs", type: "richtext", defaultValue: "Can you walk me through what the recipient experience should be like, from unboxing to takeaway? What's the core product or object being gifted?" },
      { id: "field-target-demo", name: "Target Demo", type: "richtext", defaultValue: "Can you confirm if this is an invite only event or an event for public consumers?\nCan you confirm what your target demo is? Do you have some sample names you are hoping to attend?\nCan you describe the audience that your brand is trying to target?" },
      { id: "field-product-count", name: "Product Count", type: "richtext", defaultValue: "Can you confirm the target number of recipients or total units?" },
      { id: "field-recipient-list-fulfillment", name: "Recipient List & Fulfillment Strategy", type: "richtext", defaultValue: "Who will provide the recipient list? Will CoC be responsible for compiling addresses and managing fulfillment? \nAre there multiple recipient tiers (VIP, Press, Community)?" },
      { id: "field-gifting-sow", name: "Gifting SOW", type: "richtext", defaultValue: "What percentage of the full list would you like Care of Chan to own?\nDo you need us to facilitate dressing for guests ahead of the event?\nDo you need us to work check-in?\nDo you need us to own the invite graphic? If you are owning, would Care of Chan be able to consult on the invite to ensure its enticing enough for guests?\nCan you walk me through some of the target names you are hoping to secure for this event?" },
    ],
  },
  {
    id: "section-creative",
    title: "Creative",
    fields: [
      { id: "field-creative-direction-vibe", name: "Creative Direction & Vibe", type: "richtext", defaultValue: "What do you want the unboxing experience to feel like?\nHow do you describe the aesthetic of your brand? \nCan you share some buzzwords we can work off of? \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?" },
      { id: "field-customization-personalization", name: "Customization & Personalization", type: "richtext", defaultValue: "Are you envisioning any custom treatments such as engraving, embroidery, or monogramming?" },
      { id: "field-product-type-materials", name: "Product Type & Materials", type: "richtext", defaultValue: "Are there any material, sourcing, or regulatory considerations (e.g., edible products, cosmetics, or perishables)?" },
      { id: "field-brand-guidelines", name: "Brand Guidelines", type: "richtext", defaultValue: "Can you share official brand guidelines and logo usage?" },
    ],
  },
  {
    id: "section-logistics",
    title: "Logistics",
    fields: [
      { id: "field-fulfillment-shipping", name: "Fulfillment & Shipping", type: "richtext", defaultValue: "Are gifts shipping domestically or internationally? Will you handle fulfillment or should CoC manage packaging, labeling, and delivery?" },
      { id: "field-arrival-date", name: "Arrival Date", type: "richtext" },
      { id: "field-drop-location", name: "Drop Location", type: "richtext", defaultValue: "What city are you hosting this in?\nIs there a specific neighborhood that you would like us to host this?\nWhere are most of your guests traveling in from?" },
    ],
  },
  {
    id: "section-services",
    title: "Services",
    fields: [
      { id: "field-photographer", name: "Photographer", type: "richtext", defaultValue: "Do you need us to budget and source for a photographer?" },
      { id: "field-graphic-designer", name: "Graphic Designer", type: "richtext", defaultValue: "Do you need us to budget and source for a graphic designer?" },
      { id: "field-design-needs", name: "Design Needs", type: "richtext", defaultValue: "Will you need renderings?\nWill you need physical samples?\nWill you require packaging design, dielines, or prototypes?" },
    ],
  },
  {
    id: "section-proposal",
    title: "Proposal",
    fields: [
      { id: "field-project-budget", name: "Project Budget", type: "richtext", defaultValue: "Budget Tracker Here\nDo you have a budget earmarked for this work? Are there pricing considerations we should know?\nIs that a typical budget for you for this kind of event?\nIf the budget feels tight - Is the budget flexible at all?\nIf budget becomes a constraint, do you have flexibility to increase it?" },
      { id: "field-must-haves", name: "Must-Haves", type: "richtext", defaultValue: "If the budget feel tight - What are your event must-haves vs nice to haves?" },
      { id: "field-stakeholders", name: "Stakeholders", type: "richtext", defaultValue: "Can you share who on your team is involved with decision making? What do they care to see in the proposal?\nCan you share insight on what your approval process and timelines typically look like?\nWhat does the review process look like once we submit the proposal?\nI'm curious; is there anything that might get in the way of us working together on this?" },
      { id: "field-agency-partners", name: "Agency Partners", type: "richtext", defaultValue: "Are you talking to other agencies for this event?\nWould you be comfortable sharing with us who else you are talking to?" },
      { id: "field-timeline", name: "Timeline", type: "richtext", defaultValue: "What's your timeline? By when are you looking to make a decision? Why is the timeline set this way?" },
    ],
  },
];

const conceptingSchema: FormSection[] = [
  {
    id: "section-overview",
    title: "Overview",
    fields: [
      { id: "field-context", name: "Context", type: "richtext", defaultValue: "Can you tell me more about what you are hoping to achieve with this event concept?" },
      { id: "field-event-purpose", name: "Event Purpose", type: "richtext", defaultValue: "Our most successful events are ones that have depth to it, meaning that there is a larger purpose outside of just promoting the brand. The event needs to have meaning otherwise you risk your guests leaving unimpacted. \n\nWith that, what are the brand values that you want to portray with this event and can you tell me the purpose behind why you are gathering this group of people? Essentially, what are you trying to convey with this event?\n\nDouble down on the purpose:\n- Why here? Why now?\n- What problem are you trying to solve?\n- Why is this important?\n- What is your desired outcome?" },
      { id: "field-event-host", name: "Event Host", type: "richtext", defaultValue: "Is there anyone specific that should be identified as a \"host\"?" },
      { id: "field-clients-goals", name: "Client's Goals", type: "richtext", defaultValue: "What are your specific marketing goals for this event?\nIs it Press Coverage, UGC/Social Coverage, Community Building, Etc?" },
      { id: "field-event-kpis", name: "Event KPIs", type: "richtext", defaultValue: "What is the one thing that would make this event a major success?\nWhen thinking about how you'd recap this event to your team, what elements would you be highlighting as the recap stats?" },
      { id: "field-target-demo", name: "Target Demo", type: "richtext", defaultValue: "Can you describe the audience that your brand is trying to target?" },
    ],
  },
  {
    id: "section-guests",
    title: "Guests",
    fields: [
      { id: "field-guest-type", name: "Guest Type", type: "richtext", defaultValue: "Can you confirm if this is an invite only event or an event for public consumers?\nCan you confirm what your target demo is? Do you have some sample names you are hoping to attend?" },
      { id: "field-target-guest-count", name: "Target Guest Count", type: "richtext", defaultValue: "Can you confirm the target guest count?\nCan you confirm how many folks from your team will be attending? Confirming they are a part of this final guest count?" },
      { id: "field-invites-check-in", name: "Invites + Check-In", type: "richtext", defaultValue: "Who is handling invites? Client? PR team? Care of Chan?\nWho is handling check-in? PR team? Care of Chan?" },
      { id: "field-rsvp-management-sow", name: "RSVP Management SOW", type: "richtext", defaultValue: "What percentage of the full list would you like Care of Chan to own?\nDo you need us to facilitate dressing for guests ahead of the event?\nDo you need us to work check-in?\nDo you need us to own the invite graphic? If you are owning, would Care of Chan be able to consult on the invite to ensure its enticing enough for guests?\nCan you walk me through some of the target names you are hoping to secure for this event?" },
    ],
  },
  {
    id: "section-creative",
    title: "Creative",
    fields: [
      { id: "field-programming-brand-moments", name: "Programming & Brand Moments", type: "richtext", defaultValue: "Is there a specific way that you'd like your brand to show up at the event? i.e. photo moment, product display, speaking moment, etc.\nIs there specific programming that you'd like? Illustrators, workshops, talks, etc." },
      { id: "field-creative-direction-vibe", name: "Creative Direction & Vibe", type: "richtext", defaultValue: "How do you describe the aesthetic of your brand? \nCan you share some buzzwords we can work off of? \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?\nWhat is the vibe that you'd like this event to evoke with guests?\nDo you have lighting preferences?" },
      { id: "field-brand-guidelines", name: "Brand Guidelines", type: "richtext", defaultValue: "Can you share official brand guidelines and logo usage?" },
    ],
  },
  {
    id: "section-logistics",
    title: "Logistics",
    fields: [
      { id: "field-event-dates", name: "Event Date(s)", type: "eventSchedule", description: "When are you hoping to host your event?\nAre these dates firm or flexible?\nIf flexible, what are your back up dates?" },
      { id: "field-event-date-notes", name: "Event Date Notes", type: "richtext" },
      { id: "field-start-run-times", name: "Start & Run Times", type: "text", description: "What time do you want to host your event?\nHow long do you want the event to run for?" },
      { id: "field-locations", name: "Location(s)", type: "location", description: "What city are you hosting this in?" },
      { id: "field-location-notes", name: "Location Notes", type: "richtext", defaultValue: "Is there a specific neighborhood that you would like us to host this?\nWhere are most of your guests traveling in from?" },
    ],
  },
  {
    id: "section-services",
    title: "Services",
    fields: [
      { id: "field-coc-services", name: "CoC Services", type: "services" },
      { id: "field-photographer", name: "Photographer", type: "richtext", defaultValue: "Do you need us to budget and source for a photographer?" },
      { id: "field-bfa-photographer", name: "BFA Photographer", type: "richtext", defaultValue: "Do you need us to budget and source for a wired photographer? Typically BFA is only required if your PR team wants to pitch the event to event press. \nDo you need us to budget and source for an on-site editor? Typically this is required if your PR team needs a less than 24 hour turn around." },
      { id: "field-graphic-designer", name: "Graphic Designer", type: "richtext", defaultValue: "Do you need us to budget and source for a graphic designer?" },
      { id: "field-design-needs", name: "Design Needs", type: "richtext", defaultValue: "Will you need physical samples?\nDo you need us to create a new visual identity for the event graphic design?\nWill you need renderings? Do you need architectural or stylized renderings?\n\nFor context, there are two types of renders:\n- Architectural renders: These are the \"not so pretty\" renders that fabricators make to show the scale. Think of this as an architectural drawing. Architectural renders are the first step which take about 1-2 weeks including internal feedback from our team. \n- Stylized renders: These are the final, final \"pretty\" renders, that take all of the architectural drawings from the venue as well as the custom pieces we fabricated and place them to scale so the client can better see. Stylized renders come afterwards which take another 1-2 weeks (this bakes in, internal and external client reviews/edits)" },
      { id: "field-videographer", name: "Videographer", type: "richtext", defaultValue: "Do you need us to budget and source for a videographer?\nCan you tell me what the videos will be used for? Full event sizzle reel, social, website, tv?" },
    ],
  },
  {
    id: "section-talent",
    title: "Talent",
    fields: [
      { id: "field-talent", name: "Talent", type: "richtext", defaultValue: "Can you tell me what you want the talent to do?\nWhat will be there contractual obligations?\nWill you need them to promo the event on social? If so, what does that specific ask look like?" },
      { id: "field-talent-preferences", name: "Talent Preferences", type: "richtext" },
      { id: "field-talent-accommodations", name: "Talent Accommodations", type: "richtext", defaultValue: "Who is responsible for locking in the talent?\nDoes Talent Fee need to be accounted for in our budget?\nDoes Talent Rider and T&E need to be accounted for in our budget?" },
      { id: "field-talent-contract-requirements", name: "Talent Contract Requirements", type: "richtext", defaultValue: "If the talent is already locked in, can you please share what their SOW is so we understand their involvement with the event?" },
    ],
  },
  {
    id: "section-other",
    title: "Other",
    fields: [
      { id: "field-additional-notes", name: "Additional Notes", type: "richtext" },
    ],
  },
  {
    id: "section-proposal",
    title: "Proposal",
    fields: [
      { id: "field-event-budget", name: "Event Budget", type: "richtext", defaultValue: "Do you have a budget earmarked for this work? Are there pricing considerations we should know?\nIs that a typical budget for you for this kind of event?\nIf the budget feels tight - Is the budget flexible at all? We ask this to understand how to advise on budget decisions throughout the production." },
      { id: "field-must-haves", name: "Must-Haves", type: "richtext", defaultValue: "If the budget feel tight - What are your event must-haves vs nice to haves?" },
      { id: "field-stakeholders", name: "Stakeholders", type: "richtext", defaultValue: "Can you share who on your team is involved with decision making? What do they care to see in the proposal?\nCan you share insight on what your approval process and timelines typically look like?\nWhat does the review process look like once we submit the proposal?\nI'm curious; is there anything that might get in the way of us working together on this?" },
      { id: "field-agency-partners", name: "Agency Partners", type: "richtext", defaultValue: "Are you talking to other agencies for this event?\nWould you be comfortable sharing with us who else you are talking to?\nWhat are your hoping to see from us in order to help your team make a decision and secure this gig?" },
      { id: "field-timeline", name: "Timeline", type: "richtext", defaultValue: "What's your timeline? By when are you looking to make a decision? Why is the timeline set this way?" },
    ],
  },
];

const resyProjectSchema: FormSection[] = [
  {
    id: "section-overview",
    title: "Overview",
    fields: [
      { id: "field-event-name", name: "Event Name", type: "text" },
      { id: "field-context-concept", name: "Context + Concept", type: "richtext" },
      { id: "field-goals", name: "Goals", type: "richtext", defaultValue: "Press Coverage, UGC/Social Coverage, Community Building, Etc." },
      { id: "field-event-purpose", name: "Event Purpose", type: "richtext", defaultValue: "Our most successful events are ones that have depth to it, meaning that there is a larger purpose outside of just promoting the brand. The event needs to have meaning so you're guests leave feeling like the event was impactful. \n\nWith that, what message do you want guests to leave with? What are the brand values that you want to portray with this event? Can you tell me the purpose behind why you are gathering this group of people? \n\nDouble down on the purpose:\n- Why here? Why now?\n- What problem are you trying to solve?\n- Why is this important?\n- What is your desired outcome?" },
      { id: "field-event-budget-note", name: "Event Budget", type: "richtext", defaultValue: "Move into budget tab" },
      { id: "field-event-format", name: "Event Format", type: "richtext", defaultValue: "How are you envisioning guest experience?" },
    ],
  },
  {
    id: "section-logistics",
    title: "Logistics",
    fields: [
      { id: "field-event-dates", name: "Event Date(s)", type: "eventSchedule", description: "When are you hoping to host your event?\nAre these dates firm or flexible?\nIf flexible, what are your back up dates?" },
      { id: "field-event-date-notes", name: "Event Date Notes", type: "richtext" },
      { id: "field-start-run-times", name: "Start & Run Times", type: "text", description: "What time do you want to host your event?\nHow long do you want the event to run for?" },
      { id: "field-locations", name: "Location(s)", type: "location", description: "What city are you hosting this in?" },
      { id: "field-location-notes", name: "Location Notes", type: "richtext", defaultValue: "Is there a specific neighborhood that you would like us to host this?\nWhere are most of your guests traveling in from?" },
    ],
  },
  {
    id: "section-guests",
    title: "Guests",
    fields: [
      { id: "field-target-guest-count", name: "Target Guest Count", type: "richtext" },
      { id: "field-client-team", name: "Client Team", type: "richtext", defaultValue: "How many people from your team will be in attendance?\nIs this guest count inclusive of your team?" },
      { id: "field-guest-type", name: "Guest Type", type: "richtext" },
      { id: "field-invites-check-in", name: "Invites & Check-In", type: "richtext", defaultValue: "Who handles this? Client? PR team? Care of Chan?" },
    ],
  },
  {
    id: "section-creative",
    title: "Creative",
    fields: [
      { id: "field-creative-direction-vibe", name: "Creative Direction & Vibe", type: "richtext", defaultValue: "How do you describe the aesthetic of your brand? \nCan you share some buzzwords we can work off of? \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?\nWhat is the vibe that you'd like this event to evoke with guests?\nDo you have lighting preferences?" },
      { id: "field-activations-brand-moments", name: "Activations & Brand Moments", type: "richtext", defaultValue: "Is there a specific way that you'd like your brand to show up at the event? i.e. photo moment, product display, speaking moment, etc." },
      { id: "field-venue-type", name: "Venue Type", type: "richtext" },
      { id: "field-venue-preferences", name: "Venue Preferences", type: "richtext" },
      { id: "field-food-beverage", name: "Food & Beverage", type: "richtext", defaultValue: "What is your specific serving style for food? Seated Dinner, Passed Canapes, Grazing Table?\nWhat level of service are you expecting? White glove service, family style?\nAre there any dietary restrictions from your team or guests of honor that we need to be aware of as we ideate?" },
      { id: "field-chef-preferences", name: "Chef Preferences", type: "richtext", defaultValue: "Is it important to you that the chef is a known name?\nIf yes, can you tell me if you need that chef to post about the event to social? This affects how much we need to budget for the chef. \nAre there any other social or talent requirements that you would need the chef for?" },
      { id: "field-takeaways", name: "Takeaways", type: "richtext", defaultValue: "Would you like us to ideate a takeaway?" },
      { id: "field-brand-item-takeaway", name: "Brand Item Takeaway", type: "richtext", defaultValue: "Will any products from your brand come at cost or will they come complimentary?" },
      { id: "field-florals", name: "Florals", type: "richtext", defaultValue: "Is there a specific floral direction you are looking for?" },
    ],
  },
  {
    id: "section-talent",
    title: "Talent",
    fields: [
      { id: "field-talent", name: "Talent", type: "richtext" },
      { id: "field-talent-preferences", name: "Talent Preferences", type: "richtext" },
      { id: "field-talent-accommodations", name: "Talent Accommodations", type: "richtext", defaultValue: "Who is responsible for locking in the talent?\nDoes Talent Fee need to be accounted for in our budget?\nDoes Talent Rider and T&E need to be accounted for in our budget?" },
      { id: "field-talent-contract-requirements", name: "Talent Contract Requirements", type: "richtext" },
    ],
  },
  {
    id: "section-services",
    title: "Services",
    fields: [
      { id: "field-music", name: "Music", type: "richtext", defaultValue: "Playlist? DJ? House Music?" },
      { id: "field-photographer", name: "Photographer", type: "richtext" },
      { id: "field-bfa-photographer", name: "BFA Photographer", type: "richtext" },
      { id: "field-graphic-designer", name: "Graphic Designer", type: "richtext" },
      { id: "field-design-needs", name: "Design Needs", type: "richtext", defaultValue: "Will you need physical samples?\nWill you need renderings? Do you need architectural or stylized renderings?\n\nFor context, there are two types of renders:\n- Architectural renders: These are the \"not so pretty\" renders that fabricators make to show the scale. Think of this as an architectural drawing. Architectural renders are the first step which take about 1-2 weeks including internal feedback from our team. \n- Stylized renders: These are the final, final \"pretty\" renders, that take all of the architectural drawings from the venue as well as the custom pieces we fabricated and place them to scale so the client can better see. Stylized renders come afterwards which take another 1-2 weeks (this bakes in, internal and external client reviews/edits)" },
      { id: "field-videographer", name: "Videographer", type: "richtext" },
      { id: "field-other-confirmed-vendors", name: "Other Confirmed Vendors", type: "richtext" },
    ],
  },
  {
    id: "section-other",
    title: "Other",
    fields: [
      { id: "field-additional-notes", name: "Additional Notes", type: "richtext" },
    ],
  },
  {
    id: "section-proposal",
    title: "Proposal",
    fields: [
      { id: "field-event-budget", name: "Event Budget", type: "richtext", defaultValue: "Have you given any thought to budget for this event? \nIs that a typical budget for you for this kind of event?\nIf the budget feels tight - Is the budget flexible at all?" },
      { id: "field-must-have", name: "Must-Have", type: "richtext", defaultValue: "If the budget feel tight - What are your event must-haves vs nice to haves?" },
      { id: "field-out-of-scope", name: "Out-of-Scope", type: "richtext", defaultValue: "Items that Client is handling or says they don't want/need" },
      { id: "field-stakeholders", name: "Stakeholders", type: "richtext", defaultValue: "Can you share who on your team is involved with decision making? \nCan you share insight on what your approval process and timelines typically look like?" },
      { id: "field-agency-partners", name: "Agency Partners", type: "richtext", defaultValue: "DKC\nHangerFour" },
      { id: "field-timeline", name: "Timeline", type: "richtext", defaultValue: "What's your timeline? By when are you looking to make a decision?" },
    ],
  },
];

const marketingCpgSchema: FormSection[] = [
  {
    id: "section-overview",
    title: "Overview",
    fields: [
      { id: "field-about-client", name: "About Client", type: "richtext", defaultValue: "How would you describe your brand?\nCan you walk me through what makes you stand out within the market? How would you describe your competitive edge?" },
      { id: "field-goals-objectives", name: "Goals & Objectives", type: "richtext", defaultValue: "Can you give us some insight on your marketing strategy for the year? What are you focusing on? What is the central messaging for this year for the brand? What is your north star for 2025?" },
      { id: "field-kpis", name: "KPIs", type: "richtext", defaultValue: "How are you measuring success with these goals? Is it specific sales goals, press coverage, social coverage, in-person interaction with the product, VIP relations?" },
      { id: "field-target-demo", name: "Target Demo", type: "richtext", defaultValue: "Can you describe the audience that your brand is trying to target?" },
      { id: "field-target-markets", name: "Target Markets", type: "richtext", defaultValue: "What markets are you focusing on?" },
      { id: "field-service-needs", name: "Service Needs", type: "richtext", defaultValue: "What specific services are you looking for in an agency partner?" },
      { id: "field-coc-services", name: "CoC Services", type: "services" },
    ],
  },
  {
    id: "section-details",
    title: "Details",
    fields: [
      { id: "field-goal", name: "Goal", type: "richtext", defaultValue: "You told me your goal is X. With that, can you tell me what are your hurdles in getting to that goal?" },
      { id: "field-strategy", name: "Strategy", type: "richtext", defaultValue: "Offer up what Care of Chan's typical solutions are to the problem they are trying to solve.\n- VIP Gifting\n- VIP Talent Programs\n- Event Placement" },
      { id: "field-dream-partners", name: "Dream Partners", type: "richtext", defaultValue: "Are there specific VIPs that you existing relationships that really champion your product?\nAre their dream partners that you are hoping to court?" },
      { id: "field-frequency", name: "Frequency", type: "richtext", defaultValue: "How often are you hoping to activate? \nHow frequent do you want to activate?" },
      { id: "field-tentpole-moments", name: "Tentpole Moments", type: "richtext", defaultValue: "Are there particular moments in the year that are important to your brand/venue?" },
      { id: "field-partner-requirements", name: "Partner Requirements", type: "richtext", defaultValue: "What are partner expectations? Social Following, IRL influence, etc. " },
      { id: "field-contracting-invoicing", name: "Contracting & Invoicing", type: "richtext", defaultValue: "Would you need us to own contracting and invoicing of the partners?" },
      { id: "field-gifting-infrastructure", name: "Gifting Infrastructure", type: "richtext", defaultValue: "Do you need us to handle shipping and logistics?\nHow much product can you gift at a time?\nIf client can own, can you walk me through your gifting process? What information would you need us to get from the recipient to fulfill? \nHow long does it typically take to ship?" },
      { id: "field-event-placement-infrastructure", name: "Event Placement Infrastructure", type: "richtext", defaultValue: "[IF EVENT PLACEMENT]\nCan you tell me lead time for product?\nWhat are typical quantities for events that you are open to gifting?\nIf we secure sales, what does event sale pricing look like?" },
      { id: "field-talent-program-expectations", name: "Talent Program Expectations", type: "richtext", defaultValue: "[IF TALENT PROGRAM]\nWhat are your desired talent requirements?" },
      { id: "field-pr", name: "PR", type: "richtext", defaultValue: "Do you have a PR agency? What agency do you work with?" },
      { id: "field-social", name: "Social", type: "richtext", defaultValue: "What is your social media strategy? Who owns this?" },
      { id: "field-additional-notes", name: "Additional Notes", type: "richtext" },
    ],
  },
  {
    id: "section-proposal",
    title: "Proposal",
    fields: [
      { id: "field-marketing-budget", name: "Marketing Budget", type: "richtext", defaultValue: "Do you have a budget earmarked for this work? Are there pricing considerations we should know?\nIs that a typical budget for you for this kind of work?\nIf the budget feels tight - Is the budget flexible at all?" },
      { id: "field-samples", name: "Samples", type: "richtext", defaultValue: "We'd love to try samples!" },
      { id: "field-press-kit", name: "Press Kit", type: "richtext", defaultValue: "Do you have a press kit?" },
      { id: "field-stakeholders", name: "Stakeholders", type: "richtext", defaultValue: "Can you share who on your team is involved with decision making? What do they care to see in the proposal?\nCan you share insight on what your approval process and timelines typically look like?\nWhat does the review process look like once we submit the proposal?\nI'm curious; is there anything that might get in the way of us working together on this?" },
      { id: "field-agency-partners", name: "Agency Partners", type: "richtext", defaultValue: "Are you talking to other agencies for this event?\nWould you be comfortable sharing with us who else you are talking to?" },
      { id: "field-timeline", name: "Timeline", type: "richtext", defaultValue: "What\u2019s your timeline? By when are you looking to make a decision? Why is the timeline set this way?" },
    ],
  },
];

const marketingVenuesSchema: FormSection[] = [
  {
    id: "section-overview",
    title: "Overview",
    fields: [
      { id: "field-about-client", name: "About Client", type: "richtext", defaultValue: "How would you describe your brand?\nCan you walk me through what makes you stand out within the market? How would you describe your competitive edge?" },
      { id: "field-goals-objectives", name: "Goals & Objectives", type: "richtext", defaultValue: "Can you give us some insight on your marketing strategy for the year? What are you focusing on? What is the central messaging for this year for the brand? What is your north star for 2026?" },
      { id: "field-kpis", name: "KPIs", type: "richtext", defaultValue: "How are you measuring success with these goals? Is it specific sales goals, press coverage, social coverage, in-person interaction with the product, VIP relations?" },
      { id: "field-target-demo", name: "Target Demo", type: "richtext", defaultValue: "Can you describe the audience that your brand is trying to target?" },
      { id: "field-service-needs", name: "Service Needs", type: "richtext", defaultValue: "What specific services are you looking for in an agency partner?" },
      { id: "field-coc-services", name: "CoC Services", type: "services" },
    ],
  },
  {
    id: "section-details",
    title: "Details",
    fields: [
      { id: "field-goal", name: "Goal", type: "richtext", defaultValue: "You told me your goal is X. With that, can you tell me what are your hurdles in getting to that goal?" },
      { id: "field-strategy", name: "Strategy", type: "richtext", defaultValue: "Offer up what Care of Chan's typical solutions are to the problem they are trying to solve." },
      { id: "field-programming-formats", name: "Programming Formats", type: "richtext", defaultValue: "What type of programming are you looking to secure? Arts & Culture, Culinary, Wellness. \nHave you hosted programming the space before?\nIf yes, what has worked well in your space? What hasn't worked well?\nAre there specific needs or requests your seeing from your patrons?\nAre there specific days or times of the week you are hoping to activate the space?" },
      { id: "field-frequency", name: "Frequency", type: "richtext", defaultValue: "How often are you hoping to program?" },
      { id: "field-tentpole-moments", name: "Tentpole Moments", type: "richtext", defaultValue: "Are there particular moments in the year that are important to your brand/venue?" },
      { id: "field-kpis-details", name: "KPIs", type: "richtext", defaultValue: "How will you measure success of the program? # of attendees, # of ticket sales, quality guests?\nHow would you rank those KPIs?" },
      { id: "field-location", name: "Location", type: "richtext", defaultValue: "Can you specify what rooms in your venue you would like us to program?" },
      { id: "field-day-times-operation", name: "Day & Times of Operation", type: "richtext" },
      { id: "field-capacity", name: "Capacity", type: "richtext", defaultValue: "Can you tell me guest capacity? Seated vs Standing. \nHow many covers a night do you typically see?\nHow many turns do you do a night?" },
      { id: "field-dream-partners", name: "Dream Partners", type: "richtext" },
      { id: "field-partner-requirements", name: "Partner Requirements", type: "richtext", defaultValue: "What are partner expectations? On-Site Needs, Social Post Needs, Guest Invites, etc. " },
      { id: "field-contracting-invoicing", name: "Contracting & Invoicing", type: "richtext", defaultValue: "Would you need us to own contracting and invoicing of the partners?" },
      { id: "field-client-support", name: "Client Support", type: "richtext", defaultValue: "In order to court partners, there needs to be a level of investment in that partner. With that, how are you able to support your partners? Talent Fee, free venue, ingredient sourcing, comp'd hotel stays, marketing, etc. " },
      { id: "field-boh-capabilities", name: "BOH Capabilities", type: "richtext", defaultValue: "Can you specify what BOH support/infrastructure you have?\nDo you have an events team?\nWhat staff will the partner have access to?\nCan you tell me about the kitchen and its capabilties?" },
      { id: "field-foh-capabilities", name: "FOH Capabilities", type: "richtext", defaultValue: "Can you specify what BOH support/infrastructure you have?\nWhat staff will the partner have access to?" },
      { id: "field-ticketing-platform", name: "Ticketing Platform", type: "richtext", defaultValue: "What reservation or ticketing platform do you use?" },
      { id: "field-marketing", name: "Marketing", type: "richtext", defaultValue: "How do you typically market these programs?\nDo you have a PR agency? What agency do you work with?" },
      { id: "field-vip-engagement", name: "VIP Engagement", type: "richtext", defaultValue: "Would you also want us to secure VIP reservations and invite our network to the programs?" },
      { id: "field-additional-notes", name: "Additional Notes", type: "richtext" },
    ],
  },
  {
    id: "section-proposal",
    title: "Proposal",
    fields: [
      { id: "field-marketing-budget", name: "Marketing Budget", type: "richtext", defaultValue: "Do you have a budget earmarked for this work? Are there pricing considerations we should know?" },
      { id: "field-site-visit", name: "Site Visit", type: "richtext", defaultValue: "We'd love to set up a site visit to the see the space we would be programming. \nWe'd also love to set up a reservation to experience the space as a diner and try the food. " },
      { id: "field-events-deck", name: "Events Deck", type: "richtext", defaultValue: "Do you have an events deck with buyout costs? It'd be helpful to have on hand for our event clients as well. " },
      { id: "field-stakeholders", name: "Stakeholders", type: "richtext", defaultValue: "Can you share who on your team is involved with decision making? What do they care to see in the proposal?\nCan you share insight on what your approval process and timelines typically look like?\nWhat does the review process look like once we submit the proposal?\nI'm curious; is there anything that might get in the way of us working together on this?" },
      { id: "field-agency-partners", name: "Agency Partners", type: "richtext", defaultValue: "Are you talking to other agencies?\nWould you be comfortable sharing with us who else you are talking to?" },
      { id: "field-timeline", name: "Timeline", type: "richtext", defaultValue: "What\u2019s your timeline? By when are you looking to make a decision? Why is the timeline set this way?" },
    ],
  },
];

const rsvpSchema: FormSection[] = [
  {
    id: "section-event-details",
    title: "Event Details",
    fields: [
      { id: "field-event-name", name: "Event Name", type: "text" },
      { id: "field-creative-direction-vibe", name: "Creative Direction & Vibe", type: "richtext", defaultValue: "How do you describe the aesthetic of your brand? \nCan you share some buzzwords we can work off of? \nIs there a specific campaign brief we should be working off when we're ideating creative?\nWhat should the event color palette be?\nWhat is the vibe that you'd like this event to evoke with guests?\nDo you have lighting preferences?" },
      { id: "field-event-dates", name: "Event Date(s)", type: "eventSchedule", description: "When are you hoping to host your event?\nAre these dates firm or flexible?\nIf flexible, what are your back up dates?" },
      { id: "field-event-date-notes", name: "Event Date Notes", type: "richtext" },
      { id: "field-start-run-times", name: "Start & Run Times", type: "text", description: "What time do you want to host your event?\nHow long do you want the event to run for?" },
      { id: "field-locations", name: "Location(s)", type: "location", description: "What city are you hosting this in?" },
      { id: "field-location-notes", name: "Location Notes", type: "richtext", defaultValue: "Is there a specific neighborhood that you would like us to host this?\nWhere are most of your guests traveling in from?" },
      { id: "field-venue", name: "Venue", type: "richtext" },
      { id: "field-food-beverage", name: "Food & Beverage", type: "richtext", defaultValue: "What is your specific serving style for food? Seated Dinner, Passed Canapes, Grazing Table?" },
      { id: "field-talent", name: "Talent", type: "richtext", defaultValue: "Do you have special talent that we should denote on the event invite?" },
      { id: "field-sponsors", name: "Sponsors", type: "richtext", defaultValue: "Are there any sponsors that we need to call out in the invite copy + graphic?" },
      { id: "field-liquor-cabinet-inclusion", name: "Liquor Cabinet Inclusion", type: "richtext", defaultValue: "Please know that on our end, we have a couple of preferred beverage partners that would be open to donating product if you'd be interested. \n- Doladira - an elevated aperitif insoured by the Italian Alps founded by Meredith Erickson, the author of Alpine Cooking and the Joe Beef Cookbook. \n- Villbrygg - a zero proof botanical spirit from Norway. " },
      { id: "field-additional-notes", name: "Additional Notes", type: "richtext" },
    ],
  },
  {
    id: "section-overview",
    title: "Overview",
    fields: [
      { id: "field-context-concept", name: "Context + Concept", type: "richtext" },
      { id: "field-event-purpose", name: "Event Purpose", type: "richtext", defaultValue: "We feel strongly that all of our events must have a purpose - a product launch or general brand awareness is not a purpose per se, so if you have something in mind can you share? For instance, are you celebrating a tradition, holiday, or cultural phenomenon? Are you teaching guests a new skill? Are there tentpole moments for your brand that might make sense to build a goal around?" },
      { id: "field-event-host", name: "Event Host", type: "richtext", defaultValue: "Is there anyone specific that should be identified as a \"host\"?" },
      { id: "field-clients-goals", name: "Client's Goals", type: "richtext", defaultValue: "What are your specific marketing goals for this event?\nIs it Press Coverage, UGC/Social Coverage, Community Building, Etc?" },
      { id: "field-event-kpis", name: "Event KPIs", type: "richtext", defaultValue: "What is the one thing that would make this event a major success?\nWhen thinking about how you'd recap this event to your team, what elements would you be highlighting as the recap stats?" },
      { id: "field-event-format", name: "Event Format", type: "richtext", defaultValue: "How are you envisioning guest experience?\nCan you walk me through the high level run of show you're thinking of?" },
    ],
  },
  {
    id: "section-creative",
    title: "Creative",
    fields: [
      { id: "field-programming-brand-moments", name: "Programming & Brand Moments", type: "richtext", defaultValue: "Is there a specific way that you'd like your brand to show up at the event? i.e. photo moment, product display, speaking moment, etc.\nIs there specific programming that you'd like? Illustrators, workshops, talks, etc. " },
    ],
  },
  {
    id: "section-rsvp-details",
    title: "RSVP Details",
    fields: [
      { id: "field-rsvp-management-sow", name: "RSVP Management SOW", type: "richtext" },
      { id: "field-coc-percent", name: "CoC %", type: "richtext", defaultValue: "What percentage of the guest list are we responsible for securing?" },
      { id: "field-invites-check-in", name: "Invites & Check-In", type: "richtext", defaultValue: "Who is handling invites? Client? PR team? Care of Chan?\nWho is handling check-in? PR team? Care of Chan?" },
      { id: "field-graphic-designer", name: "Graphic Designer", type: "richtext", defaultValue: "Will your team own the invite graphic or will you need us to create the invite graphic?\nCan you share brand logos + brand guidelines?\nCan you share any relevant creative/moodboard/campaign imagery that we should use?" },
      { id: "field-brand-guidelines", name: "Brand Guidelines", type: "richtext", defaultValue: "Can you share official brand guidelines and logo usage?" },
      { id: "field-target-guest-count", name: "Target Guest Count", type: "richtext", defaultValue: "Can you confirm the target guest count?\nCan you confirm how many folks from your team will be attending? Confirming they are a part of this final guest count?" },
      { id: "field-max-venue-capacity", name: "Max Venue Capacity", type: "text" },
      { id: "field-guest-type", name: "Guest Type", type: "richtext", defaultValue: "Can you confirm what your target demo is? Do you have some sample names you are hoping to attend?" },
      { id: "field-plus-ones", name: "Plus Ones", type: "text", description: "What is your preferred plus one policy?" },
      { id: "field-seating-chart", name: "Seating Chart", type: "richtext", defaultValue: "Who from your team is sitting? What are your preferences for the client team for the seating chart? " },
      { id: "field-client-team", name: "Client Team", type: "richtext", defaultValue: "How many people from your team will be in attendance?\nIs this guest count inclusive of your team?" },
      { id: "field-dietary-restrictions", name: "Dietary Restrictions", type: "richtext", defaultValue: "Does your chef talent need dietary restrictions for the menu? When do they need this by?" },
      { id: "field-brand-dressing", name: "Brand Dressing", type: "richtext", defaultValue: "Will you need to dress your guests? \nCan you walk me through how you handle that process?\nDoes your team invite guests to pick up in-store or will you need to ship clothes to their homes?\nIf the latter, will your team handle all fulfilling and shipping or do you need our production team to handle this?" },
      { id: "field-photographer", name: "Photographer", type: "richtext", defaultValue: "Will there be a photographer on-site?\nCan they turnaround a few images for our attendee thank you note within 24 hours from the event date?" },
      { id: "field-photo-release", name: "Photo Release", type: "richtext", defaultValue: "Do you need guests to sign a photo release ahead of the event day?" },
      { id: "field-uber-codes", name: "Uber Codes", type: "richtext", defaultValue: "Are you offering guests Uber codes? \nFor events where the venue is not central or easy to get to in relation to where your guests are traveling in from, we highly recommend offering an uber code, as guests will have a stronger sense of obligation to attend and we can avoid drop off and higher attendance. " },
      { id: "field-additional-notes-rsvp", name: "Additional Notes", type: "richtext" },
    ],
  },
];

interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  formSchema: FormSection[];
}

const NEW_TEMPLATES: TemplateDefinition[] = [
  {
    id: "event-production-intake-v2",
    name: "Event Production (v2)",
    description: "Updated comprehensive intake questionnaire for event production deals — covers overview, guests, creative direction, logistics, vendor services, talent, and proposal.",
    formSchema: eventProductionV2Schema,
  },
  {
    id: "trip-production-intake",
    name: "Trip Production",
    description: "Intake questionnaire for trip production deals — covers event overview, guests, creative, logistics including travel and accommodations, services, talent, and proposal.",
    formSchema: tripProductionSchema,
  },
  {
    id: "mailer-gift-production-intake",
    name: "Mailer & Gift Production",
    description: "Intake questionnaire for mailer and gift production projects — covers product overview, creative direction, logistics and fulfillment, services, and proposal.",
    formSchema: mailerGiftProductionSchema,
  },
  {
    id: "concepting-intake",
    name: "Concepting",
    description: "Intake questionnaire for concepting engagements — covers event context, guests, creative direction, logistics, services, talent, and proposal.",
    formSchema: conceptingSchema,
  },
  {
    id: "resy-project-intake",
    name: "Resy Project",
    description: "Intake questionnaire for Resy project deals — covers overview, logistics, guests, creative with venue and F&B details, talent, services, and proposal.",
    formSchema: resyProjectSchema,
  },
  {
    id: "marketing-cpg-intake",
    name: "Marketing CPG",
    description: "Intake questionnaire for marketing CPG deals — covers client overview, marketing details including gifting and talent programs, and proposal.",
    formSchema: marketingCpgSchema,
  },
  {
    id: "marketing-venues-intake",
    name: "Marketing Venues",
    description: "Intake questionnaire for marketing venue deals — covers client overview, venue programming details including BOH/FOH capabilities, and proposal.",
    formSchema: marketingVenuesSchema,
  },
  {
    id: "rsvp-intake",
    name: "RSVP",
    description: "Intake questionnaire for RSVP management — covers event details, overview, creative direction, and comprehensive RSVP logistics.",
    formSchema: rsvpSchema,
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
        .set({
          category: "client_intake",
          formSchema: eventProductionSchema,
          updatedAt: new Date(),
        })
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

export async function seedNewIntakeTemplates(): Promise<void> {
  for (const template of NEW_TEMPLATES) {
    try {
      const existing = await db
        .select({ id: formTemplates.id })
        .from(formTemplates)
        .where(eq(formTemplates.id, template.id));

      if (existing.length > 0) {
        await db
          .update(formTemplates)
          .set({
            name: template.name,
            description: template.description,
            category: "client_intake",
            formSchema: template.formSchema,
            updatedAt: new Date(),
          })
          .where(eq(formTemplates.id, template.id));
        continue;
      }

      await db.insert(formTemplates).values({
        id: template.id,
        name: template.name,
        description: template.description,
        category: "client_intake",
        formSchema: template.formSchema,
      });

      console.log(`Seeded ${template.name} intake template`);
    } catch (error) {
      console.error(`Failed to seed ${template.name} template:`, error);
      throw error;
    }
  }
}
