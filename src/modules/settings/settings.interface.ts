import { Model, Document } from "mongoose";

export interface ISettingsContent {
  content: string;
}

export interface ISettingsContentDoc extends ISettingsContent, Document {}

export interface IFAQ {
  question: string;
  answer: string;
}

export interface IFAQDoc extends Document {
  faqs: IFAQ[];
}

export interface ISettingsContentModel extends Model<ISettingsContentDoc> {}
export interface IFAQModel extends Model<IFAQDoc> {}
