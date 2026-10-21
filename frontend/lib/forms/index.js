/**
 * Point d’entrée libs formulaires Lead / Concours (L0).
 */

export {
  FORM_MAX_FIELDS,
  FORM_DEFINITION_VERSION,
  FORM_FIELD_TYPES,
  FORM_FIELD_SLOTS,
  FORM_TEMPLATE_KEYS,
  FORM_TEMPLATE_META,
  FORM_UI_TITLE_LEAD,
  FORM_UI_TITLE_CONTEST,
  FORM_DEFAULT_TEMPLATE_LEAD,
  FORM_DEFAULT_TEMPLATE_CONTEST,
  FORM_LIMITS,
  FORM_RGPD_INFO_TEXT,
  FORM_RGPD_INFO_SHORT,
  FORM_RGPD_MARKETING_CONSENT_LABEL,
  FORM_RGPD_CONSENT_NEVER_PRECHECKED,
  formUiTitleForPollKind,
  defaultFormTemplateKeyForPollKind,
} from "./formConstants.js";

export {
  buildFormDefinitionFromTemplate,
  defaultFormDefinitionForPollKind,
  cloneFormDefinition,
  sortedFormFields,
  formDefinitionSupportsContestRules,
  validateFormDefinition,
  canEditFormDefinitionField,
  listSelectableFormTemplateKeys,
} from "./formTemplates.js";

export {
  isValidEmailFormat,
  isValidPhoneFormat,
  normalizeAndValidateFieldValue,
  projectContactSlots,
  validateFormAnswers,
  buildConsentsProof,
  resolveAnswersForDisplay,
  answersToCsvColumns,
  legacyLeadBodyToAnswers,
  isLeadFormSubmissionOptional,
} from "./formValidation.js";

export {
  resolveParticipantFormDefinition,
  resolvePreviewFormDefinition,
  emptyAnswersForDefinition,
  parseAnswersDraft,
  serializeAnswersDraft,
} from "./resolveParticipantForm.js";

export {
  FORM_BUILDER_FIELD_TYPES,
  FORM_BUILDER_TEMPLATES,
  newFormFieldId,
  definitionFromTemplateKey,
  defaultFormStateForPollKind,
  createBlankFormField,
  addFieldToDefinition,
  removeFieldFromDefinition,
  moveFieldInDefinition,
  patchFieldInDefinition,
  applyTemplateToFormState,
  validateQuestionFormBuilder,
} from "./formBuilder.js";
