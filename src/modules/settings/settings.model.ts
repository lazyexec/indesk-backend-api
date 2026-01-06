import mongoose from "mongoose";
import {
  IFAQDoc,
  IFAQModel,
  ISettingsContentDoc,
  ISettingsContentModel,
} from "./settings.interface";

const aboutUsSchema = new mongoose.Schema<
  ISettingsContentDoc,
  ISettingsContentModel
>(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: 10,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const AboutUs = mongoose.model<
  ISettingsContentDoc,
  ISettingsContentModel
>("AboutUs", aboutUsSchema);

const faqSchema = new mongoose.Schema<IFAQDoc, IFAQModel>(
  {
    faqs: [
      {
        question: {
          type: String,
          required: [true, "Question is required"],
        },
        answer: {
          type: String,
          required: [true, "Answer is required"],
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const FAQ = mongoose.model<IFAQDoc, IFAQModel>("FAQ", faqSchema);

const privacySchema = new mongoose.Schema<
  ISettingsContentDoc,
  ISettingsContentModel
>(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: 10,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Privacy = mongoose.model<
  ISettingsContentDoc,
  ISettingsContentModel
>("Privacy", privacySchema);

const termsSchema = new mongoose.Schema<
  ISettingsContentDoc,
  ISettingsContentModel
>(
  {
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: 10,
      maxlength: 5000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const TermsConditions = mongoose.model<
  ISettingsContentDoc,
  ISettingsContentModel
>("TermsConditions", termsSchema);
