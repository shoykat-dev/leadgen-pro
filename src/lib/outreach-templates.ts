export interface OutreachTemplate {
  id: string;
  name: string;
  channel: "whatsapp" | "email";
  language: "en" | "bn";
  scenario: "no_website" | "outdated_website" | "general";
  subject?: string;
  body: string;
}

export const DEFAULT_OUTREACH_TEMPLATES: OutreachTemplate[] = [
  // 1. English - No Website (3 templates)
  {
    id: "en-no-web-1",
    name: "EN: Professional Web Proposal (High Conversion)",
    channel: "whatsapp",
    language: "en",
    scenario: "no_website",
    body: "Hi {business_name}, I noticed your business in {area}, {city} doesn't have an official website yet. In 2026, most customers look up a website before visiting. I'm {my_name}, a freelance web developer ({my_service}). I can build you a fast, modern website that brings more direct leads. Check my recent work: {portfolio_link}. Would you like a quick free mock-up?",
  },
  {
    id: "en-no-web-2",
    name: "EN: Quick Online Presence Opportunity",
    channel: "whatsapp",
    language: "en",
    scenario: "no_website",
    body: "Hello {business_name}! I came across your {category} in {area}. You have great customer feedback, but clients searching on Google can't find your direct website or services list. I help local businesses get online with custom, fast sites. Best regards, {my_name} | Portfolio: {portfolio_link}",
  },
  {
    id: "en-no-web-3",
    name: "EN: 3-Day Turnaround & WhatsApp Integration",
    channel: "whatsapp",
    language: "en",
    scenario: "no_website",
    body: "Hello {business_name}! I'm {my_name}, a freelance web designer. I see {business_name} has a strong reputation in {city}, but no active website. I can set up a professional website for you with direct WhatsApp ordering and Google Maps integration in just 3 days. Portfolio: {portfolio_link}. Let me know if you'd like to see a sample!",
  },

  // 2. Bengali - No Website (3 templates)
  {
    id: "bn-no-web-1",
    name: "BN: প্রফেশনাল ওয়েবসাইট প্রপোজাল (হোয়াটসঅ্যাপ সেলস)",
    channel: "whatsapp",
    language: "bn",
    scenario: "no_website",
    body: "আসসালামু আলাইকুম {business_name}। আমি দেখতে পেলাম {area}, {city}-তে আপনার ব্যবসাটি চমৎকার সেবা দিচ্ছে, কিন্তু গুগলে কোনো নিজস্ব ওয়েবসাইট নেই। আমি {my_name}, প্রফেশনাল ওয়েব ডেভেলপার ({my_service})। আপনার ব্যবসার জন্য একটি আধুনিক ও মোবাইল-ফ্রেন্ডলি ওয়েবসাইট তৈরি করে দিতে পারি, যা সরাসরি কাস্টমার কল ও হোয়াটসঅ্যাপ অর্ডার বাড়াবে। আমার পোর্টফোলিও: {portfolio_link}। ফ্রি ডেমো দেখতে চাইলে জানাবেন।",
  },
  {
    id: "bn-no-web-2",
    name: "BN: লোকাল বিজনেস গ্রোথ অফার (বিশ্বাসযোগ্যতা বৃদ্ধি)",
    channel: "whatsapp",
    language: "bn",
    scenario: "no_website",
    body: "নমস্কার / আসসালামু আলাইকুম। {business_name}-এর অনলাইন উপস্থিতি বাড়ানোর জন্য একটি আকর্ষণীয় ওয়েবসাইট খুব কার্যকর হবে। ফেসবুকে গ্রাহক আসলেও নিজস্ব ওয়েবসাইটে কাস্টমারদের বিশ্বাসযোগ্যতা বাড়ে দ্বিগুণ। আমি {my_name}, সাশ্রয়ী মূল্যে ৩ দিনের মধ্যে ওয়েবসাইট তৈরি করে দিতে পারি। পোর্টফোলিও দেখুন: {portfolio_link}। আপনার সুবিধাজনক সময়ে আলোচনা করতে পারি।",
  },
  {
    id: "bn-no-web-3",
    name: "BN: গুগল সার্চ ও সেলস বৃদ্ধি (লোকাল কাস্টমার)",
    channel: "whatsapp",
    language: "bn",
    scenario: "no_website",
    body: "প্রিয় {business_name} টিম, {city}-তে অনেকেই অনলাইনে আপনার {category} সংক্রান্ত সার্ভিস খুঁজছেন। একটি প্রফেশনাল ওয়েবসাইট থাকলে নতুন গ্রাহকরা সরাসরি আপনার সাথে যোগাযোগ করতে পারবে। আমি {my_name} ({my_service})। বিস্তারিত জানতে এবং ডেমো ডিজাইন দেখতে চাইলে মেসেজ দিন। পোর্টফোলিও: {portfolio_link}",
  },

  // 3. Outdated Website (2 templates)
  {
    id: "en-outdated-1",
    name: "EN: Website Redesign & Mobile Speed Optimization",
    channel: "whatsapp",
    language: "en",
    scenario: "outdated_website",
    body: "Hi {business_name}, I checked your current website and noticed it could benefit from a modern UI refresh and mobile speed optimization to convert more visitors into paying customers. I'm {my_name}, a web developer specializing in high-speed, modern redesigns. See my work: {portfolio_link}. Happy to send a free audit!",
  },
  {
    id: "bn-outdated-1",
    name: "BN: ওয়েবসাইট আধুনিকায়ন ও স্পিড অপ্টিমাইজেশন",
    channel: "whatsapp",
    language: "bn",
    scenario: "outdated_website",
    body: "আসসালামু আলাইকুম {business_name}। আপনার বর্তমান ওয়েবসাইটটি দেখলাম। মোবাইল স্পিড ও আধুনিক ডিজাইনে কিছু আপডেট করলে কাস্টমার কনভার্শন অনেক বাড়বে। আমি {my_name}, ওয়েবসাইট রিডিজাইন ও স্পিড অপ্টিমাইজেশন নিয়ে কাজ করি। পোর্টফোলিও: {portfolio_link}। একটি ফ্রি অডিট রিপোর্ট দেখতে চাইলে জানাবেন।",
  },

  // 4. Email Templates (with Unsubscribe line per Section 11)
  {
    id: "en-email-1",
    name: "EN Email: Modern Website Proposal for {business_name}",
    channel: "email",
    language: "en",
    scenario: "no_website",
    subject: "Quick question regarding {business_name}'s online presence in {city}",
    body: `Hi {business_name} Team,

I came across your business in {area}, {city} and was impressed by your local reputation in {category}.

I noticed that you don't currently have an official website listed. Having a clean, mobile-optimized website can dramatically increase your direct phone calls and inquiries from Google search.

I'm {my_name}, a freelance web developer ({my_service}). I've built responsive, modern websites for local businesses. You can check out my portfolio here:
{portfolio_link}

Would you be open to a quick 5-minute chat or seeing a free mockup for {business_name}?

Best regards,
{my_name}
Web Developer

---
To opt out of future emails, reply 'UNSUBSCRIBE'.`,
  },
  {
    id: "bn-email-1",
    name: "BN Email: {business_name}-এর জন্য প্রফেশনাল ওয়েবসাইট অফার",
    channel: "email",
    language: "bn",
    scenario: "no_website",
    subject: "{city}-তে {business_name}-এর অনলাইন কাস্টমার বৃদ্ধির প্রস্তাব",
    body: `আসসালামু আলাইকুম {business_name} টিম,

{area}, {city}-তে আপনাদের {category} ব্যবসাটির সুনাম লক্ষ্য করলাম।

কিন্তু অনলাইনে সার্চ করে দেখলাম আপনাদের কোনো অফিশিয়াল ওয়েবসাইট নেই। একটি আধুনিক ওয়েবসাইট থাকলে গুগল সার্চ থেকে প্রতিদিন নতুন কাস্টমার সরাসরি আপনাদের কল বা হোয়াটসঅ্যাপ করতে পারবে।

আমি {my_name}, একজন ওয়েব ডেভেলপার ({my_service})। আপনাদের ব্যবসার জন্য আকর্ষণীয় ও মোবাইল-ফ্রেন্ডলি ওয়েবসাইট তৈরি করে দিতে পারি।
আমার পোর্টফোলিও লিংক: {portfolio_link}

আপনার সুবিধার সময়ে কি একটি ফ্রি ডেমো দেখতে আগ্রহী হবেন?

ধন্যবাদ,
{my_name}
ওয়েব ডেভেলপার

---
ভবিষ্যতে ইমেইল না পেতে চাইলে 'UNSUBSCRIBE' লিখে রিপ্লাই দিন।`,
  },
];

export function fillTemplate(
  templateText: string,
  variables: {
    business_name: string;
    category: string;
    city: string;
    area: string;
    my_name: string;
    my_service: string;
    portfolio_link: string;
  }
): string {
  let text = templateText;
  for (const [key, val] of Object.entries(variables)) {
    const reg = new RegExp(`\\{${key}\\}`, "g");
    text = text.replace(reg, val || "");
  }
  return text;
}
