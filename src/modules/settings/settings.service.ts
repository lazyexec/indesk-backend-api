import sanitizeHtml from "sanitize-html";
import { TermsConditions, AboutUs, Privacy, FAQ } from "./settings.model";
import { IFAQ, ISettingsContent } from "./settings.interface";

const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "img",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "span",
    "style",
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ["src", "alt", "title", "width", "height", "loading"],
    a: ["href", "name", "target"],
    "*": ["style", "class"],
  },
};

const modifyTermsAndCondition = async (data: ISettingsContent) => {
  data.content = sanitizeHtml(data.content, sanitizeOptions);
  await TermsConditions.deleteMany();
  return await TermsConditions.create(data);
};

const modifyAboutUs = async (data: ISettingsContent) => {
  data.content = sanitizeHtml(data.content, sanitizeOptions);
  await AboutUs.deleteMany();
  return await AboutUs.create(data);
};

const modifyPrivacyPolicy = async (data: ISettingsContent) => {
  data.content = sanitizeHtml(data.content, sanitizeOptions);
  await Privacy.deleteMany();
  return await Privacy.create(data);
};

const modifyFAQ = async (data: { faqs: IFAQ[] }) => {
  data.faqs = data.faqs.map((faq) => ({
    question: sanitizeHtml(faq.question, sanitizeOptions),
    answer: sanitizeHtml(faq.answer, sanitizeOptions),
  }));
  await FAQ.deleteMany();
  return await FAQ.create(data);
};

const getTermsAndCondition = async () => {
  return await TermsConditions.findOne();
};

const getAboutUs = async () => {
  return await AboutUs.findOne();
};

const getPrivacyPolicy = async () => {
  return await Privacy.findOne();
};

const getFAQ = async () => {
  return await FAQ.findOne();
};

export const settingsService = {
  modifyTermsAndCondition,
  modifyAboutUs,
  modifyPrivacyPolicy,
  modifyFAQ,
  getTermsAndCondition,
  getAboutUs,
  getPrivacyPolicy,
  getFAQ,
};
