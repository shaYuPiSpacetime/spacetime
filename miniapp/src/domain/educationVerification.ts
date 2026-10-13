import type {
  EducationDetail,
  EducationFormValues,
  EducationMethod,
  ProfileOptions,
} from '@/types/prd01'

export type EducationField =
  | 'method'
  | 'school'
  | 'educationLevel'
  | 'chsiCode'
  | 'diplomaNo'
  | 'certificateName'
  | 'materials'
  | 'agreement'

export interface EducationIssue {
  field: EducationField
  copyKey: string
}

/** Only the enabled dictionary snapshot and the current method govern draft validation. */
export function validateEducationDraft(
  method: EducationMethod,
  draft: EducationFormValues,
  options: ProfileOptions | undefined,
  maxCount: number
): EducationIssue[] {
  const issues: EducationIssue[] = []
  const add = (field: EducationField, copyKey: string) => issues.push({ field, copyKey })
  const supportedMethod = draft.educationUserType === 'STUDENT'
    ? method === 'STUDENT_CARD'
    : draft.educationUserType === 'MAINLAND_GRADUATE'
      && (method === 'CHSI' || method === 'DIPLOMA_NO' || method === 'MATERIAL_UPLOAD')

  if (!supportedMethod
    || !options?.educationUserType?.some(option => option.code === draft.educationUserType)
    || !options?.educationMethod?.some(option => option.code === method)) {
    add('method', 'education_method_unavailable')
  }

  const schoolName = draft.schoolName.trim()
  if (schoolName.length < 2 || schoolName.length > 100) {
    add('school', 'education_school_invalid')
  } else if (!draft.schoolCode?.trim()) {
    add('school', 'education_school_selection_required')
  }

  if (!options?.educationLevel?.some(option => option.code === draft.educationLevel)) {
    add('educationLevel', 'education_level_required')
  }

  if (method === 'CHSI') {
    if (!/^[A-Za-z0-9]{12,18}$/.test(draft.chsiCode?.trim() ?? '')) {
      add('chsiCode', 'education_chsi_invalid')
    }
  } else if (method === 'DIPLOMA_NO') {
    const diplomaNo = draft.diplomaNo?.trim() ?? ''
    const certificateName = draft.certificateName?.trim() ?? ''
    if (!diplomaNo || diplomaNo.length > 64) {
      add('diplomaNo', 'education_diploma_invalid')
    }
    if (!certificateName || certificateName.length > 50) {
      add('certificateName', 'education_certificate_name_invalid')
    }
  } else if (method === 'STUDENT_CARD' || method === 'MATERIAL_UPLOAD') {
    const count = draft.materialUrls?.length ?? 0
    const limit = Number.isFinite(maxCount) && maxCount > 0 ? Math.min(maxCount, 4) : 4
    if (count === 0) {
      add('materials', 'education_material_required')
    } else if (count > limit) {
      add('materials', 'education_material_limit_invalid')
    }
  }

  if (!draft.educationAgreementChecked) {
    add('agreement', 'education_agreement_required')
  }
  return issues
}

/** Preserve common fields, but never carry another method's credentials into a new draft. */
export function createEducationDraft(
  detail: EducationDetail | undefined,
  method: EducationMethod,
  userType: string
): EducationFormValues {
  const sameMethod = detail?.educationMethod === method
  return {
    educationUserType: userType,
    schoolName: detail?.schoolName ?? '',
    schoolCode: detail?.schoolCode ?? '',
    educationLevel: detail?.educationLevel ?? '',
    chsiCode: sameMethod ? detail?.chsiCode ?? '' : '',
    diplomaNo: sameMethod ? detail?.diplomaNo ?? '' : '',
    certificateName: sameMethod ? detail?.certificateName ?? '' : '',
    materialUrls: sameMethod ? [...(detail?.materialUrls ?? [])] : [],
    educationAgreementChecked: false,
  }
}

export function isEducationSubmissionAllowed(detail: EducationDetail | undefined): boolean {
  return detail?.canSubmit === true
    && detail.auditStatus !== 'PENDING'
    && detail.auditStatus !== 'REVIEWING'
}

export function educationSubmitActionKey(detail: EducationDetail | undefined): string {
  return detail?.auditStatus === 'REJECTED' || detail?.auditStatus === 'EXPIRED'
    ? 'education_resubmit_action'
    : 'common_submit_action'
}
