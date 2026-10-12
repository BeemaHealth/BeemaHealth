import type { ComponentType } from "react";
import type { NodeType } from "@/lib/api/portal/questionnaire";
import { AuthNode } from "./nodes/AuthNode";
import { BasicsNode } from "./nodes/BasicsNode";
import { BmiNode } from "./nodes/BmiNode";
import { CheckoutNode } from "./nodes/CheckoutNode";
import { MultiSelectNode, RadioNode } from "./nodes/ChoiceNodes";
import {
  DateNode,
  NumberNode,
  TextNode,
  TextareaNode,
} from "./nodes/FieldNodes";
import { FileNode } from "./nodes/FileNodes";
import {
  AddMedicationNode,
  AllergiesNode,
  MedConditionsNode,
} from "./nodes/ListNodes";
import {
  EmptyPageNode,
  NoProceedNode,
  SafetyConsentNode,
  ThankYouNode,
} from "./nodes/PageNodes";
import type { NodeRendererProps } from "./types";

/** One renderer per server node type. Auto nodes (routers) never reach the client. */
export const NODE_RENDERERS: Record<
  NodeType,
  ComponentType<NodeRendererProps>
> = {
  radio: RadioNode,
  multi_select: MultiSelectNode,
  text: TextNode,
  textarea: TextareaNode,
  number: NumberNode,
  date: DateNode,
  empty_page: EmptyPageNode,
  auth: AuthNode,
  basics: BasicsNode,
  bmi: BmiNode,
  safety_consent: SafetyConsentNode,
  allergies: AllergiesNode,
  add_medication: AddMedicationNode,
  med_conditions: MedConditionsNode,
  file_input: FileNode,
  id_photo: FileNode,
  checkout: CheckoutNode,
  no_proceed: NoProceedNode,
  thank_you: ThankYouNode,
};

export function NodeRenderer(props: NodeRendererProps) {
  const Renderer = NODE_RENDERERS[props.node.type];
  if (!Renderer) {
    return (
      <p role="alert">
        This step is not supported yet. Please contact support.
      </p>
    );
  }
  return <Renderer {...props} />;
}
